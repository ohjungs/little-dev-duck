import { describe, expect, it, vi } from "vitest";
import { subscribeTable } from "../realtime";

// 2026-07-27 : 실시간 - 필터 계약 (Phase 50 T3)
// 구독 필터가 틀리면 **구독은 성공하는데 이벤트가 안 오는 조용한 실패**가 난다.
// 화면에서는 "실시간이 안 되네" 정도로만 보여서 원인을 찾기 어렵다 — 여기서 잠근다.
function fakeSupabase() {
  const calls: { channel: string; config: Record<string, unknown> }[] = [];
  const client = {
    channel(name: string) {
      const ch = {
        on(_evt: string, config: Record<string, unknown>) {
          calls.push({ channel: name, config });
          return ch;
        },
        subscribe: () => ch,
      };
      return ch;
    },
    removeChannel: vi.fn(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- 테스트용 최소 목
  } as any;
  return { client, calls };
}


describe("subscribeTable", () => {
  it("기존 계약(user_id 필터)이 그대로다 — 위젯 5개가 이 방식에 의존한다", () => {
    const { client, calls } = fakeSupabase();
    subscribeTable(client, "todos", "user-1", () => {});
    expect(calls[0]!.config.filter).toBe("user_id=eq.user-1");
  });
});
