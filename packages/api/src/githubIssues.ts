import { z } from "zod";
import { LddError, type ToolCall, type ToolDeclaration, type ToolResult } from "@ldd/core";
import type { Adapter } from "./agent";
import { safeBody, upstreamError } from "./gemini";

// Phase 10 T5 두 번째 어댑터: GitHub 이슈. googleCalendar.ts와 동일 구조(조회 readonly + 생성 mutating).
// 액세스 토큰은 Supabase가 캡처한 provider_token(GitHub OAuth, repo scope)을 주입한다.
const GITHUB_API = "https://api.github.com";

const listDecl: ToolDeclaration = {
  name: "listGithubIssues",
  description: "지정한 GitHub 저장소의 이슈 목록을 조회한다.",
  parameters: {
    type: "object",
    properties: {
      owner: { type: "string", description: "저장소 소유자(사용자 또는 조직명)" },
      repo: { type: "string", description: "저장소 이름" },
      state: {
        type: "string",
        description: "이슈 상태(open/closed/all, 기본 open)",
        enum: ["open", "closed", "all"],
      },
    },
    required: ["owner", "repo"],
  },
  kind: "readonly",
};

const createDecl: ToolDeclaration = {
  name: "createGithubIssue",
  description: "지정한 GitHub 저장소에 새 이슈를 만든다.",
  parameters: {
    type: "object",
    properties: {
      owner: { type: "string", description: "저장소 소유자(사용자 또는 조직명)" },
      repo: { type: "string", description: "저장소 이름" },
      title: { type: "string", description: "이슈 제목" },
      body: { type: "string", description: "이슈 본문(선택)" },
    },
    required: ["owner", "repo", "title"],
  },
  kind: "mutating",
};

// 2026-07-30 : GitHub - 이슈 닫기 (감사 발견)
// 조회·생성만 있어서 "그 이슈 닫아줘"가 성립하지 않았다. issueNumber는 listGithubIssues가 이미
// 돌려주므로(Gmail messageId·캘린더 eventId와 같은 패턴) 새 조회 경로가 필요 없다.
//
// **캘린더 삭제와 달리 이건 넣어도 되는 이유**: 이슈 닫기는 GitHub에서 다시 열 수 있고 제목·본문·
// 댓글이 전부 그대로 남는다 — 되돌릴 수 있으므로 "영구삭제 금지"(CLAUDE.md 5절) 대상이 아니다.
// 다시 열기(reopen)는 수요가 확인되면 추가한다(YAGNI) — GitHub 화면에서 바로 되므로 급하지 않다.
//
// title은 **표시용 현재 제목**이다(승인 카드가 번호만으론 어느 이슈인지 못 보여준다 — Gmail의
// subject와 같은 역할). 요청 본문에는 싣지 않는다(실으면 제목이 의도 없이 바뀐다).
const closeDecl: ToolDeclaration = {
  name: "closeGithubIssue",
  description:
    "지정한 GitHub 이슈를 닫는다(GitHub에서 다시 열 수 있고 내용은 그대로 남는다). " +
    "issueNumber는 listGithubIssues 결과의 number를 쓴다.",
  parameters: {
    type: "object",
    properties: {
      owner: { type: "string", description: "저장소 소유자(사용자 또는 조직명)" },
      repo: { type: "string", description: "저장소 이름" },
      issueNumber: {
        type: "integer",
        description: "닫을 이슈의 번호(listGithubIssues 결과의 number 값)",
      },
      title: {
        type: "string",
        description:
          "닫을 이슈의 제목(listGithubIssues에서 본 title을 그대로 포함 — 승인 카드 표시용)",
      },
    },
    required: ["owner", "repo", "issueNumber"],
  },
  kind: "mutating",
};

// LLM 산출 args 재검증(인젝션/할루시네이션 방어, T0-5). owner/repo는 URL 경로에 그대로 삽입되므로
// (`repos/${owner}/${repo}/issues`) "/"나 ".."가 섞이면 승인 카드에 보인 대상과 실제 요청 경로가
// 달라지는 confused-deputy 경로가 생긴다(보안 리뷰 지적, 2026-07-23) — GitHub 소유자/저장소명 규칙(영숫자
// 시작·끝, 중간에 . _ - 허용)으로 화이트리스트 검증한다.
const GITHUB_NAME = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[A-Za-z0-9](?:[A-Za-z0-9._-]*[A-Za-z0-9])?$/, "올바른 GitHub 이름 형식이 아닙니다");
const listArgs = z.object({
  owner: GITHUB_NAME,
  repo: GITHUB_NAME,
  state: z.enum(["open", "closed", "all"]).optional(),
});
const createArgs = z.object({
  owner: GITHUB_NAME,
  repo: GITHUB_NAME,
  title: z.string().min(1),
  body: z.string().optional(),
});
const closeArgs = z.object({
  owner: GITHUB_NAME,
  repo: GITHUB_NAME,
  // 경로에 들어가는 값이라 양의 정수만 받는다 — 0·음수·소수·문자열은 엉뚱한 경로를 만든다.
  // z.number()는 문자열 "7"을 거부하므로(강제변환 없음) 경로 주입도 함께 막힌다.
  issueNumber: z.number().int().positive(),
});

type GithubIssue = {
  number?: number;
  title?: string;
  html_url?: string;
  state?: string;
};

function errorResult(call: ToolCall, message: string): ToolResult {
  return { id: call.id, name: call.name, response: { error: message } };
}

export function createGitHubIssuesAdapter(
  accessToken: string,
  fetchImpl: typeof fetch = fetch,
): Adapter {
  async function ghFetch(url: string, init?: RequestInit): Promise<unknown> {
    const res = await fetchImpl(url, {
      ...init,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        ...init?.headers,
      },
    });
    if (!res.ok) {
      // GitHub 토큰은 기본 만료가 없지만 사용자가 앱 연동을 해제하거나 scope가 부족하면 401을 준다.
      // 401은 "무효/미승인"으로 구분해 라우트가 "재연동 필요" 안내를 줄 수 있게 한다.
      if (res.status === 401) {
        throw new LddError("unauthorized", "GitHub 연동이 만료되었거나 취소되었습니다");
      }
      throw upstreamError(res.status, await safeBody(res), "github");
    }
    return res.json();
  }

  return {
    catalog: [listDecl, createDecl, closeDecl],
    async execute(call: ToolCall): Promise<ToolResult> {
      if (call.name === listDecl.name) {
        const parsed = listArgs.safeParse(call.args);
        if (!parsed.success) return errorResult(call, "조회 파라미터가 올바르지 않습니다.");
        const { owner, repo, state } = parsed.data;
        const params = new URLSearchParams({ state: state ?? "open" });
        const data = (await ghFetch(
          `${GITHUB_API}/repos/${owner}/${repo}/issues?${params}`,
        )) as GithubIssue[];
        const issues = data.map((issue) => ({
          number: issue.number,
          title: issue.title,
          url: issue.html_url,
          state: issue.state,
        }));
        return { id: call.id, name: call.name, response: { issues } };
      }

      if (call.name === createDecl.name) {
        const parsed = createArgs.safeParse(call.args);
        if (!parsed.success) return errorResult(call, "이슈 정보가 올바르지 않습니다.");
        const { owner, repo, title, body } = parsed.data;
        const created = (await ghFetch(`${GITHUB_API}/repos/${owner}/${repo}/issues`, {
          method: "POST",
          body: JSON.stringify({ title, body }),
        })) as GithubIssue;
        return {
          id: call.id,
          name: call.name,
          response: {
            created: { number: created.number, title: created.title, url: created.html_url },
          },
        };
      }

      if (call.name === closeDecl.name) {
        const parsed = closeArgs.safeParse(call.args);
        if (!parsed.success) return errorResult(call, "이슈 정보가 올바르지 않습니다.");
        const { owner, repo, issueNumber } = parsed.data;
        // title은 승인 카드 표시용이라 본문에 싣지 않는다 — 실으면 제목이 의도 없이 바뀐다.
        const closed = (await ghFetch(
          `${GITHUB_API}/repos/${owner}/${repo}/issues/${issueNumber}`,
          { method: "PATCH", body: JSON.stringify({ state: "closed" }) },
        )) as GithubIssue;
        return {
          id: call.id,
          name: call.name,
          response: {
            closed: { number: closed.number, title: closed.title, state: closed.state },
          },
        };
      }

      return errorResult(call, "지원하지 않는 도구입니다.");
    },
  };
}
