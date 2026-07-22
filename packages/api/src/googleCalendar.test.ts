import { describe, expect, it } from "vitest";
import { isLddError } from "@ldd/core";
import { createGoogleCalendarAdapter } from "./googleCalendar";

function jsonRes(status: number, body: unknown): Response {
  return {
    ok: status < 400,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

describe("createGoogleCalendarAdapter", () => {
  it("catalog는 조회(readonly)+생성(mutating) 2개 도구를 선언한다", () => {
    const adapter = createGoogleCalendarAdapter("token");
    expect(adapter.catalog.map((d) => [d.name, d.kind])).toEqual([
      ["listUpcomingEvents", "readonly"],
      ["createCalendarEvent", "mutating"],
    ]);
  });

  it("listUpcomingEvents 실행 시 Authorization 헤더를 싣고 이벤트를 정리해 반환한다", async () => {
    let capturedUrl = "";
    let capturedAuth = "";
    const fetchImpl = (async (url: string, init?: RequestInit) => {
      capturedUrl = url;
      capturedAuth = (init?.headers as Record<string, string>).Authorization;
      return jsonRes(200, {
        items: [
          { id: "e1", summary: "회의", start: { dateTime: "2026-07-23T10:00:00+09:00" } },
        ],
      });
    }) as unknown as typeof fetch;

    const adapter = createGoogleCalendarAdapter("secret-token", fetchImpl);
    const result = await adapter.execute({
      id: "c1",
      name: "listUpcomingEvents",
      args: {},
    });

    expect(capturedAuth).toBe("Bearer secret-token");
    expect(capturedUrl).toContain("calendars/primary/events");
    expect(result.response.events).toEqual([
      { id: "e1", title: "회의", start: "2026-07-23T10:00:00+09:00", end: undefined },
    ]);
  });

  it("createCalendarEvent는 필수 필드가 없으면 실행하지 않고 에러 결과를 반환한다(인젝션 방어)", async () => {
    let called = false;
    const fetchImpl = (async () => {
      called = true;
      return jsonRes(200, {});
    }) as unknown as typeof fetch;

    const adapter = createGoogleCalendarAdapter("token", fetchImpl);
    // LLM이 산출했다고 가정한 불완전 args — title 누락.
    const result = await adapter.execute({
      id: "c1",
      name: "createCalendarEvent",
      args: { start: "2026-07-23T10:00:00+09:00", end: "2026-07-23T11:00:00+09:00" },
    });

    expect(called).toBe(false);
    expect(result.response).toHaveProperty("error");
  });

  it("createCalendarEvent는 유효한 args로 POST하고 생성 결과를 반환한다", async () => {
    let capturedBody: unknown;
    const fetchImpl = (async (_url: string, init?: RequestInit) => {
      capturedBody = JSON.parse(init?.body as string);
      return jsonRes(200, { id: "new1", summary: "스탠드업" });
    }) as unknown as typeof fetch;

    const adapter = createGoogleCalendarAdapter("token", fetchImpl);
    const result = await adapter.execute({
      id: "c1",
      name: "createCalendarEvent",
      args: {
        title: "스탠드업",
        start: "2026-07-23T09:00:00+09:00",
        end: "2026-07-23T09:15:00+09:00",
      },
    });

    expect(capturedBody).toEqual({
      summary: "스탠드업",
      start: { dateTime: "2026-07-23T09:00:00+09:00" },
      end: { dateTime: "2026-07-23T09:15:00+09:00" },
    });
    expect(result.response).toEqual({ created: { id: "new1", title: "스탠드업" } });
  });

  it("Google이 401을 주면 unauthorized로 구분해 던진다(access_token 만료 → 재연동 안내용)", async () => {
    const fetchImpl = (async () => jsonRes(401, { error: "invalid_token" })) as unknown as typeof fetch;
    const adapter = createGoogleCalendarAdapter("expired", fetchImpl);
    try {
      await adapter.execute({ id: "c1", name: "listUpcomingEvents", args: {} });
      expect.unreachable();
    } catch (error) {
      expect(isLddError(error) && error.code).toBe("unauthorized");
    }
  });

  it("Google이 401 외 실패 응답을 주면 upstream 에러를 던진다", async () => {
    const fetchImpl = (async () => jsonRes(500, { error: "server_error" })) as unknown as typeof fetch;
    const adapter = createGoogleCalendarAdapter("token", fetchImpl);
    try {
      await adapter.execute({ id: "c1", name: "listUpcomingEvents", args: {} });
      expect.unreachable();
    } catch (error) {
      expect(isLddError(error) && error.code).toBe("upstream");
    }
  });

  it("알 수 없는 도구명이면 에러 결과를 반환한다", async () => {
    const adapter = createGoogleCalendarAdapter("token");
    const result = await adapter.execute({ id: "c1", name: "deleteEverything", args: {} });
    expect(result.response).toHaveProperty("error");
  });
});
