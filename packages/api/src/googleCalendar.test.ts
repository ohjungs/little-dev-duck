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
  it("catalog는 조회(readonly)+생성·수정(mutating) 3개 도구를 선언한다", () => {
    // 2026-07-30: 수정 도구 추가로 2 → 3. 삭제는 의도적으로 없다(어댑터 주석의 근거 참조).
    const adapter = createGoogleCalendarAdapter("token");
    expect(adapter.catalog.map((d) => [d.name, d.kind])).toEqual([
      ["listUpcomingEvents", "readonly"],
      ["createCalendarEvent", "mutating"],
      ["updateCalendarEvent", "mutating"],
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

  it("종료 시각이 없으면 시작+1시간을 기본값으로 사용한다", async () => {
    let capturedBody: unknown;
    const fetchImpl = (async (_url: string, init?: RequestInit) => {
      capturedBody = JSON.parse(init?.body as string);
      return jsonRes(200, { id: "new2", summary: "집가기" });
    }) as unknown as typeof fetch;

    const adapter = createGoogleCalendarAdapter("token", fetchImpl);
    await adapter.execute({
      id: "c1",
      name: "createCalendarEvent",
      args: { title: "집가기", start: "2026-07-24T09:00:00+09:00" },
    });

    expect(capturedBody).toEqual({
      summary: "집가기",
      start: { dateTime: "2026-07-24T09:00:00+09:00" },
      end: { dateTime: "2026-07-24T01:00:00.000Z" }, // = 07-24T10:00+09:00, 같은 시각의 UTC 표기
    });
  });

  it("종료 시각이 시작 이후가 아니면(0초 일정 등) 시작+1시간으로 보정한다", async () => {
    let capturedBody: unknown;
    const fetchImpl = (async (_url: string, init?: RequestInit) => {
      capturedBody = JSON.parse(init?.body as string);
      return jsonRes(200, { id: "new3", summary: "집가기" });
    }) as unknown as typeof fetch;

    const adapter = createGoogleCalendarAdapter("token", fetchImpl);
    await adapter.execute({
      id: "c1",
      name: "createCalendarEvent",
      args: {
        title: "집가기",
        start: "2026-08-03T09:00:00+09:00",
        end: "2026-08-03T09:00:00+09:00",
      },
    });

    expect(capturedBody).toEqual({
      summary: "집가기",
      start: { dateTime: "2026-08-03T09:00:00+09:00" },
      end: { dateTime: "2026-08-03T01:00:00.000Z" }, // = 08-03T10:00+09:00, 같은 시각의 UTC 표기
    });
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

// 2026-07-30 : 캘린더 - 일정 수정 (감사 발견: 어댑터에 수정·삭제가 없어 "그 회의 3시로
// 바꿔줘"가 성립하지 않았다). 삭제는 이번 범위 밖 — 어댑터 주석의 근거 참조.
describe("updateCalendarEvent", () => {
  // 시작만 바꿀 때 원래 길이를 알아야 하므로 어댑터가 먼저 GET을 한다. 그 GET에 응답하는 헬퍼.
  function patchFetch(original: unknown) {
    const calls: { url: string; method?: string; body?: unknown }[] = [];
    const fetchImpl = (async (url: string, init?: RequestInit) => {
      calls.push({
        url,
        method: init?.method,
        body: init?.body ? JSON.parse(init.body as string) : undefined,
      });
      if (!init?.method || init.method === "GET") return jsonRes(200, original);
      return jsonRes(200, { id: "e1", summary: "수정됨" });
    }) as unknown as typeof fetch;
    return { calls, fetchImpl };
  }

  it("catalog에 수정 도구가 mutating으로 선언된다", () => {
    const adapter = createGoogleCalendarAdapter("token");
    expect(adapter.catalog.map((d) => [d.name, d.kind])).toEqual([
      ["listUpcomingEvents", "readonly"],
      ["createCalendarEvent", "mutating"],
      ["updateCalendarEvent", "mutating"],
    ]);
  });

  it("eventId가 없으면 실행하지 않는다", async () => {
    let called = false;
    const fetchImpl = (async () => {
      called = true;
      return jsonRes(200, {});
    }) as unknown as typeof fetch;
    const adapter = createGoogleCalendarAdapter("token", fetchImpl);
    const result = await adapter.execute({
      id: "c1",
      name: "updateCalendarEvent",
      args: { newTitle: "새 제목" },
    });
    expect(called).toBe(false);
    expect(result.response).toHaveProperty("error");
  });

  it("eventId에 경로 조작 문자가 섞이면 실행하지 않는다 (인젝션 방어)", async () => {
    // eventId는 URL 경로에 그대로 들어간다 — Gmail messageId와 같은 confused-deputy 방어.
    let called = false;
    const fetchImpl = (async () => {
      called = true;
      return jsonRes(200, {});
    }) as unknown as typeof fetch;
    const adapter = createGoogleCalendarAdapter("token", fetchImpl);
    for (const bad of ["../../calendars/other/events/x", "e1/cancel", "e1?sendUpdates=all"]) {
      const result = await adapter.execute({
        id: "c1",
        name: "updateCalendarEvent",
        args: { eventId: bad, newTitle: "x" },
      });
      expect(called, `${bad}가 통과했다`).toBe(false);
      expect(result.response).toHaveProperty("error");
    }
  });

  it("바꿀 내용이 하나도 없으면 실행하지 않는다", async () => {
    // 빈 PATCH를 보내면 Google은 200을 주고 아무것도 안 바뀐다 — "됐다"는 거짓 보고가 된다.
    let called = false;
    const fetchImpl = (async () => {
      called = true;
      return jsonRes(200, {});
    }) as unknown as typeof fetch;
    const adapter = createGoogleCalendarAdapter("token", fetchImpl);
    const result = await adapter.execute({
      id: "c1",
      name: "updateCalendarEvent",
      args: { eventId: "e1", title: "현재 제목만 표시용으로 준 경우" },
    });
    expect(called).toBe(false);
    expect(result.response).toHaveProperty("error");
  });

  it("제목만 바꾸면 시각은 건드리지 않는다 (PATCH, 부분 수정)", async () => {
    const { calls, fetchImpl } = patchFetch({});
    const adapter = createGoogleCalendarAdapter("token", fetchImpl);
    const result = await adapter.execute({
      id: "c1",
      name: "updateCalendarEvent",
      args: { eventId: "e1", newTitle: "이름 바뀐 회의" },
    });

    // 시각을 안 바꾸므로 원래 길이를 알 필요가 없다 — GET 없이 PATCH 한 번.
    expect(calls).toHaveLength(1);
    expect(calls[0].method).toBe("PATCH");
    expect(calls[0].url).toContain("/events/e1");
    expect(calls[0].body).toEqual({ summary: "이름 바뀐 회의" });
    expect(result.response).toEqual({ updated: { id: "e1", title: "수정됨" } });
  });

  it("시작만 바꾸면 원래 일정 길이를 유지한다", async () => {
    // 2시간 회의를 옮겼는데 조용히 1시간이 되면 사용자가 요청하지 않은 데이터 손실이다.
    const { calls, fetchImpl } = patchFetch({
      start: { dateTime: "2026-07-30T10:00:00+09:00" },
      end: { dateTime: "2026-07-30T12:00:00+09:00" },
    });
    const adapter = createGoogleCalendarAdapter("token", fetchImpl);
    await adapter.execute({
      id: "c1",
      name: "updateCalendarEvent",
      args: { eventId: "e1", start: "2026-07-30T15:00:00+09:00" },
    });

    expect(calls).toHaveLength(2); // 원래 길이를 알려고 GET → PATCH
    expect(calls[0].method).toBeUndefined();
    const body = calls[1].body as { start: { dateTime: string }; end: { dateTime: string } };
    expect(body.start.dateTime).toBe("2026-07-30T15:00:00+09:00");
    // 15:00 + 2시간 = 17:00 (KST) → UTC 08:00
    expect(new Date(body.end.dateTime).toISOString()).toBe("2026-07-30T08:00:00.000Z");
  });

  it("종료 시각을 명시하면 그 값을 그대로 쓴다 (GET 불필요)", async () => {
    const { calls, fetchImpl } = patchFetch({});
    const adapter = createGoogleCalendarAdapter("token", fetchImpl);
    await adapter.execute({
      id: "c1",
      name: "updateCalendarEvent",
      args: {
        eventId: "e1",
        start: "2026-07-30T15:00:00+09:00",
        end: "2026-07-30T15:30:00+09:00",
      },
    });
    expect(calls).toHaveLength(1);
    expect(calls[0].body).toEqual({
      start: { dateTime: "2026-07-30T15:00:00+09:00" },
      end: { dateTime: "2026-07-30T15:30:00+09:00" },
    });
  });

  it("원래 일정의 시각을 읽을 수 없으면 1시간으로 떨어진다", async () => {
    // 종일 일정(date만 있음)이나 GET 응답이 예상과 다를 때 — 멈추지 않고 안전한 기본값으로.
    const { calls, fetchImpl } = patchFetch({ start: { date: "2026-07-30" } });
    const adapter = createGoogleCalendarAdapter("token", fetchImpl);
    await adapter.execute({
      id: "c1",
      name: "updateCalendarEvent",
      args: { eventId: "e1", start: "2026-07-30T15:00:00+09:00" },
    });
    const body = calls[1].body as { end: { dateTime: string } };
    expect(new Date(body.end.dateTime).toISOString()).toBe("2026-07-30T07:00:00.000Z");
  });

  it("Google이 401을 주면 unauthorized로 구분해 던진다", async () => {
    const fetchImpl = (async () => jsonRes(401, { error: "invalid" })) as unknown as typeof fetch;
    const adapter = createGoogleCalendarAdapter("token", fetchImpl);
    try {
      await adapter.execute({
        id: "c1",
        name: "updateCalendarEvent",
        args: { eventId: "e1", newTitle: "x" },
      });
      expect.unreachable("던져야 한다");
    } catch (err) {
      expect(isLddError(err) && err.code).toBe("unauthorized");
    }
  });
});
