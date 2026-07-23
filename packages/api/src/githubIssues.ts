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
    catalog: [listDecl, createDecl],
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

      return errorResult(call, "지원하지 않는 도구입니다.");
    },
  };
}
