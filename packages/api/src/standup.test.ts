import { describe, expect, it, vi } from "vitest";
import { generateStandup } from "./standup";

// 체인 끝에서 Promise를 반환하는 범용 프록시 빌더.
// select().gte().not() / select().gte() / select().gte().eq() 형태를 모두 처리한다.
function makeChain(data: unknown[]): unknown {
  const resolved = Promise.resolve({ data, error: null });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handler: ProxyHandler<any> = {
    get(_t, prop) {
      if (prop === "then") return resolved.then.bind(resolved);
      if (prop === "catch") return resolved.catch.bind(resolved);
      return () => new Proxy({}, handler);
    },
  };
  return new Proxy({}, handler);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fakeSupabase(rows: Record<string, unknown[]>): any {
  return {
    from: (table: string) => ({
      select: () => makeChain(rows[table] ?? []),
    }),
  };
}

function fakeGeminiOk(text: string) {
  return vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ candidates: [{ content: { parts: [{ text }] } }] }),
    text: async () => text,
  });
}

describe("generateStandup", () => {
  it("활동 없으면 null 반환", async () => {
    const supabase = fakeSupabase({});
    const result = await generateStandup(supabase, "key", fakeGeminiOk("unused"));
    expect(result).toBeNull();
  });

  it("활동 있으면 Gemini 호출 후 content 반환", async () => {
    const supabase = fakeSupabase({
      pomodoro_sessions: [{ duration_minutes: 25 }],
    });
    const fetchMock = fakeGeminiOk("스탠드업 내용");
    const result = await generateStandup(supabase, "key", fetchMock);
    expect(result).not.toBeNull();
    expect(result?.content).toBe("스탠드업 내용");
    expect(fetchMock).toHaveBeenCalledOnce();
  });
});
