import { z } from "zod";
import { LddError, type ToolCall, type ToolDeclaration, type ToolResult } from "@ldd/core";
import type { Adapter } from "./agent";
import { safeBody, upstreamError } from "./gemini";

// Phase 10 T6 세 번째 어댑터: Gmail. CLAUDE.md 5절 안전 규칙 — 영구삭제는 설계상 금지, 휴지통 이동만
// (mutating, 승인 필요). "1시간 자동 폴링·분류/라벨"(phase_10.md T0-6 초안)은 다중 스텝 자율 워크플로라
// 같은 문서의 "하지 않는 것"(자율 다단계 워크플로는 차기)과 충돌해 이번 MVP에서 의도적으로 제외 —
// Calendar/GitHub와 동일하게 사용자 발화당 단순 도구 호출만 지원한다(phase_10.md/Status.md에 기록).
const GMAIL_API = "https://gmail.googleapis.com/gmail/v1/users/me/messages";

const listDecl: ToolDeclaration = {
  name: "listRecentEmails",
  description: "받은편지함의 최근 이메일 제목·발신자·미리보기를 조회한다.",
  parameters: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Gmail 검색어(예: is:unread, from:example.com). 생략 시 전체 받은편지함.",
      },
      maxResults: { type: "integer", description: "가져올 최대 개수(기본 10, 최대 20)" },
    },
  },
  kind: "readonly",
};

const trashDecl: ToolDeclaration = {
  name: "trashEmail",
  description: "지정한 이메일을 휴지통으로 이동한다(영구 삭제가 아니라 복구 가능한 이동).",
  parameters: {
    type: "object",
    properties: {
      messageId: {
        type: "string",
        description: "휴지통으로 옮길 이메일의 id(listRecentEmails 결과의 id 값)",
      },
      // 실행에는 쓰이지 않는다(messageId만 사용) — 승인 카드가 어느 이메일인지 사람이 알아볼 수 있게
      // listRecentEmails에서 본 제목을 그대로 되돌려 달라는 표시용 필드(DuckChatPanel describeCall).
      subject: {
        type: "string",
        description: "휴지통으로 옮길 이메일의 제목(listRecentEmails 결과에서 본 subject를 그대로 포함)",
      },
    },
    required: ["messageId"],
  },
  kind: "mutating",
};

// LLM 산출 args 재검증(인젝션 방어, T0-5). messageId는 URL 경로에 그대로 삽입되므로(githubIssues.ts와
// 동일 이유로 T5 보안 리뷰에서 지적된 confused-deputy 패턴 재발 방지) 영숫자/-/_만 허용한다.
const listArgs = z.object({
  query: z.string().max(200).optional(),
  maxResults: z.number().int().min(1).max(20).optional(),
});
const trashArgs = z.object({
  messageId: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[A-Za-z0-9_-]+$/, "올바른 이메일 id 형식이 아닙니다"),
});

type GmailHeader = { name?: string; value?: string };
type GmailMessage = { id?: string; snippet?: string; payload?: { headers?: GmailHeader[] } };
// 외부 API 응답이라 실제로 id가 없는 항목이 섞여 올 가능성을 배제하지 않는다(방어적으로 optional).
type GmailListResponse = { messages?: { id?: string }[] };

function headerValue(headers: GmailHeader[] | undefined, name: string): string | undefined {
  return headers?.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value;
}

function errorResult(call: ToolCall, message: string): ToolResult {
  return { id: call.id, name: call.name, response: { error: message } };
}

export function createGmailAdapter(
  accessToken: string,
  fetchImpl: typeof fetch = fetch,
): Adapter {
  async function gmailFetch(url: string, init?: RequestInit): Promise<unknown> {
    const res = await fetchImpl(url, {
      ...init,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        ...init?.headers,
      },
    });
    if (!res.ok) {
      if (res.status === 401) {
        throw new LddError("unauthorized", "Gmail 인증이 만료되었거나 취소되었습니다");
      }
      throw upstreamError(res.status, await safeBody(res), "gmail");
    }
    return res.json();
  }

  return {
    catalog: [listDecl, trashDecl],
    async execute(call: ToolCall): Promise<ToolResult> {
      if (call.name === listDecl.name) {
        const parsed = listArgs.safeParse(call.args);
        if (!parsed.success) return errorResult(call, "조회 파라미터가 올바르지 않습니다.");
        const maxResults = parsed.data.maxResults ?? 10;
        const listParams = new URLSearchParams({ maxResults: String(maxResults) });
        if (parsed.data.query) listParams.set("q", parsed.data.query);
        const listData = (await gmailFetch(`${GMAIL_API}?${listParams}`)) as GmailListResponse;
        const ids = (listData.messages ?? []).filter(
          (m): m is { id: string } => typeof m.id === "string" && m.id.length > 0,
        );
        // list는 id/threadId만 준다(공식 문서 실측) — 제목/발신자/미리보기는 각각 get(format=metadata)으로
        // 채운다. 본문 전체는 가져오지 않아 프롬프트에 불필요한 외부 텍스트가 과도하게 실리는 걸 막는다.
        // allSettled를 쓴다 — list와 get 사이 메일이 삭제/이동되거나 일시적 오류로 일부만 실패해도(코드
        // 리뷰 지적, 2026-07-23) Calendar/GitHub와 달리 N+1 fan-out이라 Promise.all이면 한 건만 실패해도
        // 전체 목록 조회가 죽는다 — 성공한 것만 반환하고 실패는 조용히 제외한다(개별 이메일 조회 실패로
        // 전체 요청을 막지 않음, executeApprovedCalls의 배치 격리와 같은 원칙).
        const settled = await Promise.allSettled(
          ids.map(async ({ id }) => {
            const metaParams = new URLSearchParams({ format: "metadata" });
            metaParams.append("metadataHeaders", "Subject");
            metaParams.append("metadataHeaders", "From");
            const msg = (await gmailFetch(`${GMAIL_API}/${id}?${metaParams}`)) as GmailMessage;
            return {
              id: msg.id,
              subject: headerValue(msg.payload?.headers, "Subject") ?? "(제목 없음)",
              from: headerValue(msg.payload?.headers, "From") ?? "(발신자 불명)",
              snippet: msg.snippet,
            };
          }),
        );
        const emails = settled.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));
        return { id: call.id, name: call.name, response: { emails } };
      }

      if (call.name === trashDecl.name) {
        const parsed = trashArgs.safeParse(call.args);
        if (!parsed.success) return errorResult(call, "이메일 정보가 올바르지 않습니다.");
        const trashed = (await gmailFetch(`${GMAIL_API}/${parsed.data.messageId}/trash`, {
          method: "POST",
        })) as GmailMessage;
        return { id: call.id, name: call.name, response: { trashed: { id: trashed.id } } };
      }

      return errorResult(call, "지원하지 않는 도구입니다.");
    },
  };
}
