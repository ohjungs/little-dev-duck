import { z } from "zod";
import type { ToolCall, ToolDeclaration, ToolResult } from "@ldd/core";
import type { Adapter } from "./agent";
import { safeBody, upstreamError } from "./gemini";

// Phase 10 T3 첫 어댑터: Google Calendar. 승인 게이트 검증용으로 조회(readonly)/생성(mutating) 2개 도구.
// 액세스 토큰은 Supabase가 로그인 시 캡처한 provider_token을 주입한다(어댑터는 토큰 획득/갱신을 모른다).
const CAL_BASE =
  "https://www.googleapis.com/calendar/v3/calendars/primary/events";

const listDecl: ToolDeclaration = {
  name: "listUpcomingEvents",
  description: "사용자의 다가오는 캘린더 일정을 조회한다.",
  parameters: {
    type: "object",
    properties: {
      maxResults: {
        type: "integer",
        description: "가져올 최대 개수(기본 10, 최대 50)",
      },
    },
  },
  kind: "readonly",
};

const createDecl: ToolDeclaration = {
  name: "createCalendarEvent",
  description: "새 캘린더 일정을 만든다. 시작/종료는 ISO 8601(예: 2026-07-23T10:00:00+09:00).",
  parameters: {
    type: "object",
    properties: {
      title: { type: "string", description: "일정 제목" },
      start: { type: "string", description: "시작 시각(ISO 8601)" },
      end: { type: "string", description: "종료 시각(ISO 8601)" },
    },
    required: ["title", "start", "end"],
  },
  kind: "mutating",
};

// LLM 산출 args 재검증(인젝션/할루시네이션 방어, T0-5). 실행 직전 도구별 스키마로 파싱한다.
const listArgs = z.object({ maxResults: z.number().int().min(1).max(50).optional() });
const createArgs = z.object({
  title: z.string().min(1),
  start: z.string().min(1),
  end: z.string().min(1),
});

// Google Calendar 이벤트 응답 중 우리가 모델에 되먹일 최소 필드만 추린다.
type GCalEvent = {
  id?: string;
  summary?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
};

function errorResult(call: ToolCall, message: string): ToolResult {
  return { id: call.id, name: call.name, response: { error: message } };
}

export function createGoogleCalendarAdapter(
  accessToken: string,
  fetchImpl: typeof fetch = fetch,
): Adapter {
  async function gcalFetch(url: string, init?: RequestInit): Promise<unknown> {
    const res = await fetchImpl(url, {
      ...init,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        ...init?.headers,
      },
    });
    if (!res.ok) throw upstreamError(res.status, await safeBody(res));
    return res.json();
  }

  return {
    catalog: [listDecl, createDecl],
    async execute(call: ToolCall): Promise<ToolResult> {
      if (call.name === listDecl.name) {
        const parsed = listArgs.safeParse(call.args);
        if (!parsed.success) return errorResult(call, "조회 파라미터가 올바르지 않습니다.");
        const maxResults = parsed.data.maxResults ?? 10;
        const params = new URLSearchParams({
          maxResults: String(maxResults),
          singleEvents: "true",
          orderBy: "startTime",
          timeMin: new Date().toISOString(),
        });
        const data = (await gcalFetch(`${CAL_BASE}?${params}`)) as {
          items?: GCalEvent[];
        };
        const events = (data.items ?? []).map((e) => ({
          id: e.id,
          title: e.summary ?? "(제목 없음)",
          start: e.start?.dateTime ?? e.start?.date,
          end: e.end?.dateTime ?? e.end?.date,
        }));
        return { id: call.id, name: call.name, response: { events } };
      }

      if (call.name === createDecl.name) {
        const parsed = createArgs.safeParse(call.args);
        if (!parsed.success) return errorResult(call, "일정 정보가 올바르지 않습니다.");
        const { title, start, end } = parsed.data;
        const created = (await gcalFetch(CAL_BASE, {
          method: "POST",
          body: JSON.stringify({
            summary: title,
            start: { dateTime: start },
            end: { dateTime: end },
          }),
        })) as GCalEvent;
        return {
          id: call.id,
          name: call.name,
          response: { created: { id: created.id, title: created.summary ?? title } },
        };
      }

      return errorResult(call, "지원하지 않는 도구입니다.");
    },
  };
}
