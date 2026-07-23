import { describe, expect, it } from "vitest";
import { isLddError } from "@ldd/core";
import { createGitHubIssuesAdapter } from "./githubIssues";

function jsonRes(status: number, body: unknown): Response {
  return {
    ok: status < 400,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

describe("createGitHubIssuesAdapter", () => {
  it("catalog는 조회(readonly)+생성(mutating) 2개 도구를 선언한다", () => {
    const adapter = createGitHubIssuesAdapter("token");
    expect(adapter.catalog.map((d) => [d.name, d.kind])).toEqual([
      ["listGithubIssues", "readonly"],
      ["createGithubIssue", "mutating"],
    ]);
  });

  it("listGithubIssues 실행 시 Authorization 헤더를 싣고 이슈를 정리해 반환한다", async () => {
    let capturedUrl = "";
    let capturedAuth = "";
    const fetchImpl = (async (url: string, init?: RequestInit) => {
      capturedUrl = url;
      capturedAuth = (init?.headers as Record<string, string>).Authorization;
      return jsonRes(200, [
        { number: 1, title: "버그 발견", html_url: "https://github.com/o/r/issues/1", state: "open" },
      ]);
    }) as unknown as typeof fetch;

    const adapter = createGitHubIssuesAdapter("secret-token", fetchImpl);
    const result = await adapter.execute({
      id: "c1",
      name: "listGithubIssues",
      args: { owner: "o", repo: "r" },
    });

    expect(capturedAuth).toBe("Bearer secret-token");
    expect(capturedUrl).toContain("repos/o/r/issues");
    expect(result.response.issues).toEqual([
      { number: 1, title: "버그 발견", url: "https://github.com/o/r/issues/1", state: "open" },
    ]);
  });

  it("listGithubIssues는 owner/repo가 없으면 실행하지 않고 에러 결과를 반환한다(인젝션 방어)", async () => {
    let called = false;
    const fetchImpl = (async () => {
      called = true;
      return jsonRes(200, []);
    }) as unknown as typeof fetch;

    const adapter = createGitHubIssuesAdapter("token", fetchImpl);
    const result = await adapter.execute({ id: "c1", name: "listGithubIssues", args: {} });

    expect(called).toBe(false);
    expect(result.response).toHaveProperty("error");
  });

  it("owner/repo에 경로 구분자나 '..'가 섞이면 실행하지 않는다(승인 카드-실제 요청 대상 불일치 방지)", async () => {
    let called = false;
    const fetchImpl = (async () => {
      called = true;
      return jsonRes(200, []);
    }) as unknown as typeof fetch;

    const adapter = createGitHubIssuesAdapter("token", fetchImpl);
    const traversal = await adapter.execute({
      id: "c1",
      name: "listGithubIssues",
      args: { owner: "o", repo: "../other-repo" },
    });
    const slash = await adapter.execute({
      id: "c2",
      name: "listGithubIssues",
      args: { owner: "o/x", repo: "r" },
    });

    expect(called).toBe(false);
    expect(traversal.response).toHaveProperty("error");
    expect(slash.response).toHaveProperty("error");
  });

  it("createGithubIssue는 title이 없으면 실행하지 않고 에러 결과를 반환한다(인젝션 방어)", async () => {
    let called = false;
    const fetchImpl = (async () => {
      called = true;
      return jsonRes(200, {});
    }) as unknown as typeof fetch;

    const adapter = createGitHubIssuesAdapter("token", fetchImpl);
    const result = await adapter.execute({
      id: "c1",
      name: "createGithubIssue",
      args: { owner: "o", repo: "r" },
    });

    expect(called).toBe(false);
    expect(result.response).toHaveProperty("error");
  });

  it("createGithubIssue는 유효한 args로 POST하고 생성 결과를 반환한다", async () => {
    let capturedBody: unknown;
    const fetchImpl = (async (_url: string, init?: RequestInit) => {
      capturedBody = JSON.parse(init?.body as string);
      return jsonRes(201, { number: 5, title: "새 이슈", html_url: "https://github.com/o/r/issues/5" });
    }) as unknown as typeof fetch;

    const adapter = createGitHubIssuesAdapter("token", fetchImpl);
    const result = await adapter.execute({
      id: "c1",
      name: "createGithubIssue",
      args: { owner: "o", repo: "r", title: "새 이슈", body: "내용" },
    });

    expect(capturedBody).toEqual({ title: "새 이슈", body: "내용" });
    expect(result.response).toEqual({
      created: { number: 5, title: "새 이슈", url: "https://github.com/o/r/issues/5" },
    });
  });

  it("GitHub이 401을 주면 unauthorized로 구분해 던진다(연동 해제/scope 부족 → 재연동 안내용)", async () => {
    const fetchImpl = (async () => jsonRes(401, { message: "Bad credentials" })) as unknown as typeof fetch;
    const adapter = createGitHubIssuesAdapter("expired", fetchImpl);
    try {
      await adapter.execute({ id: "c1", name: "listGithubIssues", args: { owner: "o", repo: "r" } });
      expect.unreachable();
    } catch (error) {
      expect(isLddError(error) && error.code).toBe("unauthorized");
    }
  });

  it("GitHub이 401 외 실패 응답을 주면 upstream 에러를 던진다", async () => {
    const fetchImpl = (async () => jsonRes(404, { message: "Not Found" })) as unknown as typeof fetch;
    const adapter = createGitHubIssuesAdapter("token", fetchImpl);
    try {
      await adapter.execute({ id: "c1", name: "listGithubIssues", args: { owner: "o", repo: "r" } });
      expect.unreachable();
    } catch (error) {
      expect(isLddError(error) && error.code).toBe("upstream");
    }
  });

  it("알 수 없는 도구명이면 에러 결과를 반환한다", async () => {
    const adapter = createGitHubIssuesAdapter("token");
    const result = await adapter.execute({ id: "c1", name: "deleteEverything", args: {} });
    expect(result.response).toHaveProperty("error");
  });
});
