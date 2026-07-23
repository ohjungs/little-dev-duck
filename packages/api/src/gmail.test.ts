import { describe, expect, it } from "vitest";
import { isLddError } from "@ldd/core";
import { createGmailAdapter } from "./gmail";

function jsonRes(status: number, body: unknown): Response {
  return {
    ok: status < 400,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

describe("createGmailAdapter", () => {
  it("catalog는 조회(readonly)+휴지통 이동(mutating) 2개 도구를 선언한다", () => {
    const adapter = createGmailAdapter("token");
    expect(adapter.catalog.map((d) => [d.name, d.kind])).toEqual([
      ["listRecentEmails", "readonly"],
      ["trashEmail", "mutating"],
    ]);
  });

  it("listRecentEmails는 list 후 각 메시지를 get(metadata)으로 채워 반환한다", async () => {
    const calledUrls: string[] = [];
    let capturedAuth = "";
    const fetchImpl = (async (url: string, init?: RequestInit) => {
      calledUrls.push(url);
      capturedAuth = (init?.headers as Record<string, string>).Authorization;
      if (url.includes("/messages?")) {
        return jsonRes(200, { messages: [{ id: "m1" }] });
      }
      return jsonRes(200, {
        id: "m1",
        snippet: "미리보기 내용",
        payload: {
          headers: [
            { name: "Subject", value: "제목입니다" },
            { name: "From", value: "sender@example.com" },
          ],
        },
      });
    }) as unknown as typeof fetch;

    const adapter = createGmailAdapter("secret-token", fetchImpl);
    const result = await adapter.execute({ id: "c1", name: "listRecentEmails", args: {} });

    expect(capturedAuth).toBe("Bearer secret-token");
    expect(calledUrls[0]).toContain("gmail.googleapis.com/gmail/v1/users/me/messages");
    expect(calledUrls[1]).toContain("format=metadata");
    expect(result.response.emails).toEqual([
      { id: "m1", subject: "제목입니다", from: "sender@example.com", snippet: "미리보기 내용" },
    ]);
  });

  it("일부 메시지 get이 실패해도(삭제됨/일시 오류) 전체가 죽지 않고 성공한 것만 반환한다", async () => {
    const fetchImpl = (async (url: string) => {
      if (url.includes("/messages?")) {
        return jsonRes(200, { messages: [{ id: "m1" }, { id: "m2" }] });
      }
      if (url.includes("/m2")) return jsonRes(404, { error: "not found" });
      return jsonRes(200, {
        id: "m1",
        snippet: "미리보기",
        payload: { headers: [{ name: "Subject", value: "정상 메일" }] },
      });
    }) as unknown as typeof fetch;

    const adapter = createGmailAdapter("token", fetchImpl);
    const result = await adapter.execute({ id: "c1", name: "listRecentEmails", args: {} });

    expect(result.response.emails).toEqual([
      { id: "m1", subject: "정상 메일", from: "(발신자 불명)", snippet: "미리보기" },
    ]);
  });

  it("트래시할 messageId가 목록에 없거나 list 응답에 id 없는 항목이 섞여도 무시한다", async () => {
    const fetchImpl = (async (url: string) => {
      if (url.includes("/messages?")) {
        return jsonRes(200, { messages: [{}, { id: "m1" }] });
      }
      return jsonRes(200, { id: "m1", payload: { headers: [] } });
    }) as unknown as typeof fetch;

    const adapter = createGmailAdapter("token", fetchImpl);
    const result = await adapter.execute({ id: "c1", name: "listRecentEmails", args: {} });

    expect(result.response.emails).toEqual([
      { id: "m1", subject: "(제목 없음)", from: "(발신자 불명)", snippet: undefined },
    ]);
  });

  it("trashEmail는 유효한 messageId로 POST하고 결과를 반환한다", async () => {
    let capturedUrl = "";
    let capturedMethod = "";
    const fetchImpl = (async (url: string, init?: RequestInit) => {
      capturedUrl = url;
      capturedMethod = init?.method ?? "";
      return jsonRes(200, { id: "m1" });
    }) as unknown as typeof fetch;

    const adapter = createGmailAdapter("token", fetchImpl);
    const result = await adapter.execute({
      id: "c1",
      name: "trashEmail",
      args: { messageId: "m1" },
    });

    expect(capturedMethod).toBe("POST");
    expect(capturedUrl).toContain("/messages/m1/trash");
    expect(result.response).toEqual({ trashed: { id: "m1" } });
  });

  it("trashEmail은 messageId가 없으면 실행하지 않고 에러 결과를 반환한다(인젝션 방어)", async () => {
    let called = false;
    const fetchImpl = (async () => {
      called = true;
      return jsonRes(200, {});
    }) as unknown as typeof fetch;

    const adapter = createGmailAdapter("token", fetchImpl);
    const result = await adapter.execute({ id: "c1", name: "trashEmail", args: {} });

    expect(called).toBe(false);
    expect(result.response).toHaveProperty("error");
  });

  it("messageId에 경로 구분자가 섞이면 실행하지 않는다(승인 카드-실제 요청 대상 불일치 방지)", async () => {
    let called = false;
    const fetchImpl = (async () => {
      called = true;
      return jsonRes(200, {});
    }) as unknown as typeof fetch;

    const adapter = createGmailAdapter("token", fetchImpl);
    const result = await adapter.execute({
      id: "c1",
      name: "trashEmail",
      args: { messageId: "../other" },
    });

    expect(called).toBe(false);
    expect(result.response).toHaveProperty("error");
  });

  it("Gmail이 401을 주면 unauthorized로 구분해 던진다(재연동 안내용)", async () => {
    const fetchImpl = (async () => jsonRes(401, { error: "invalid_token" })) as unknown as typeof fetch;
    const adapter = createGmailAdapter("expired", fetchImpl);
    try {
      await adapter.execute({ id: "c1", name: "listRecentEmails", args: {} });
      expect.unreachable();
    } catch (error) {
      expect(isLddError(error) && error.code).toBe("unauthorized");
    }
  });

  it("Gmail이 401 외 실패 응답을 주면 upstream 에러를 던진다(gmail로 라벨링)", async () => {
    const fetchImpl = (async () => jsonRes(500, { error: "server_error" })) as unknown as typeof fetch;
    const adapter = createGmailAdapter("token", fetchImpl);
    try {
      await adapter.execute({ id: "c1", name: "listRecentEmails", args: {} });
      expect.unreachable();
    } catch (error) {
      expect(isLddError(error) && error.code).toBe("upstream");
      expect(isLddError(error) && error.message).toContain("gmail");
    }
  });

  it("알 수 없는 도구명이면 에러 결과를 반환한다", async () => {
    const adapter = createGmailAdapter("token");
    const result = await adapter.execute({ id: "c1", name: "deleteEverything", args: {} });
    expect(result.response).toHaveProperty("error");
  });
});
