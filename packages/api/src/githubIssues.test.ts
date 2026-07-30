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
  // 2026-07-30: 닫기 도구 추가로 2 → 3. 아래 describe("closeGithubIssue")가 목록 전체를 다시
  // 단정하므로 이 테스트는 조회·생성 두 건의 kind만 확인하도록 좁혔다(같은 사실을 두 곳에서
  // 중복 단정하면 도구가 늘 때마다 두 곳을 고쳐야 한다).
  it("catalog는 조회를 readonly, 생성을 mutating으로 선언한다", () => {
    const adapter = createGitHubIssuesAdapter("token");
    const kinds = new Map(adapter.catalog.map((d) => [d.name, d.kind]));
    expect(kinds.get("listGithubIssues")).toBe("readonly");
    expect(kinds.get("createGithubIssue")).toBe("mutating");
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

// 2026-07-30 : GitHub - 이슈 닫기 (감사 발견: 어댑터에 조회·생성만 있어 "그 이슈 닫아줘"가
// 성립하지 않았다). 캘린더 삭제를 보류한 근거(되돌리기 불확실)가 여기엔 적용되지 않는다 —
// 이슈 닫기는 GitHub에서 다시 열 수 있고 내용도 그대로 남는다.
describe("closeGithubIssue", () => {
  function captureFetch(response: unknown = { number: 7, title: "버그", state: "closed" }) {
    const calls: { url: string; method?: string; body?: unknown }[] = [];
    const fetchImpl = (async (url: string, init?: RequestInit) => {
      calls.push({
        url,
        method: init?.method,
        body: init?.body ? JSON.parse(init.body as string) : undefined,
      });
      return jsonRes(200, response);
    }) as unknown as typeof fetch;
    return { calls, fetchImpl };
  }

  it("catalog에 닫기 도구가 mutating으로 선언된다", () => {
    const adapter = createGitHubIssuesAdapter("token");
    expect(adapter.catalog.map((d) => [d.name, d.kind])).toEqual([
      ["listGithubIssues", "readonly"],
      ["createGithubIssue", "mutating"],
      ["closeGithubIssue", "mutating"],
    ]);
  });

  it("유효한 args로 PATCH해서 state를 closed로 바꾼다", async () => {
    const { calls, fetchImpl } = captureFetch();
    const adapter = createGitHubIssuesAdapter("token", fetchImpl);
    const result = await adapter.execute({
      id: "c1",
      name: "closeGithubIssue",
      args: { owner: "ohjungs", repo: "little-dev-duck", issueNumber: 7 },
    });

    expect(calls).toHaveLength(1);
    expect(calls[0].method).toBe("PATCH");
    expect(calls[0].url).toBe(
      "https://api.github.com/repos/ohjungs/little-dev-duck/issues/7",
    );
    expect(calls[0].body).toEqual({ state: "closed" });
    expect(result.response).toEqual({
      closed: { number: 7, title: "버그", state: "closed" },
    });
  });

  it("issueNumber가 없으면 실행하지 않는다", async () => {
    let called = false;
    const fetchImpl = (async () => {
      called = true;
      return jsonRes(200, {});
    }) as unknown as typeof fetch;
    const adapter = createGitHubIssuesAdapter("token", fetchImpl);
    const result = await adapter.execute({
      id: "c1",
      name: "closeGithubIssue",
      args: { owner: "ohjungs", repo: "little-dev-duck" },
    });
    expect(called).toBe(false);
    expect(result.response).toHaveProperty("error");
  });

  it("issueNumber가 양의 정수가 아니면 실행하지 않는다", async () => {
    // 경로에 들어가는 값이다. 0·음수·소수·문자열은 엉뚱한 경로를 만들거나 GitHub에서 404가 된다.
    let called = false;
    const fetchImpl = (async () => {
      called = true;
      return jsonRes(200, {});
    }) as unknown as typeof fetch;
    const adapter = createGitHubIssuesAdapter("token", fetchImpl);
    for (const bad of [0, -3, 1.5, "7", "7/comments", null]) {
      const result = await adapter.execute({
        id: "c1",
        name: "closeGithubIssue",
        args: { owner: "ohjungs", repo: "little-dev-duck", issueNumber: bad },
      });
      expect(called, `${String(bad)}가 통과했다`).toBe(false);
      expect(result.response).toHaveProperty("error");
    }
  });

  it("owner/repo에 경로 구분자가 섞이면 실행하지 않는다", async () => {
    // 생성·조회와 같은 confused-deputy 방어 — 승인 카드에 보인 대상과 실제 요청 경로가
    // 달라지는 것을 막는다.
    let called = false;
    const fetchImpl = (async () => {
      called = true;
      return jsonRes(200, {});
    }) as unknown as typeof fetch;
    const adapter = createGitHubIssuesAdapter("token", fetchImpl);
    for (const bad of ["../other", "a/b", ".."]) {
      const result = await adapter.execute({
        id: "c1",
        name: "closeGithubIssue",
        args: { owner: bad, repo: "little-dev-duck", issueNumber: 7 },
      });
      expect(called, `owner=${bad}가 통과했다`).toBe(false);
      expect(result.response).toHaveProperty("error");
    }
  });

  it("표시용 title은 요청 본문에 실리지 않는다", async () => {
    // title은 승인 카드가 "어느 이슈인지" 보여주기 위한 표시용이다(Gmail subject와 같은 역할).
    // 이게 본문에 실리면 이슈 제목이 의도 없이 바뀐다.
    const { calls, fetchImpl } = captureFetch();
    const adapter = createGitHubIssuesAdapter("token", fetchImpl);
    await adapter.execute({
      id: "c1",
      name: "closeGithubIssue",
      args: {
        owner: "ohjungs",
        repo: "little-dev-duck",
        issueNumber: 7,
        title: "로그인이 안 됨",
      },
    });
    expect(calls[0].body).toEqual({ state: "closed" });
  });

  it("GitHub이 401을 주면 unauthorized로 구분해 던진다", async () => {
    const fetchImpl = (async () => jsonRes(401, { message: "Bad credentials" })) as unknown as typeof fetch;
    const adapter = createGitHubIssuesAdapter("token", fetchImpl);
    try {
      await adapter.execute({
        id: "c1",
        name: "closeGithubIssue",
        args: { owner: "ohjungs", repo: "little-dev-duck", issueNumber: 7 },
      });
      expect.unreachable("던져야 한다");
    } catch (error) {
      expect(isLddError(error) && error.code).toBe("unauthorized");
    }
  });
});
