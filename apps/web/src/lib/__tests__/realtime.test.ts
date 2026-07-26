import { describe, expect, it, vi } from "vitest";
import { subscribeRoomMessages, subscribeTable } from "../realtime";

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

describe("subscribeRoomMessages", () => {
  it("room_id로 거른다 (messages에는 user_id 컬럼이 없다)", () => {
    const { client, calls } = fakeSupabase();
    subscribeRoomMessages(client, "room-1", () => {});
    expect(calls[0]!.config.filter).toBe("room_id=eq.room-1");
    expect(calls[0]!.config.table).toBe("messages");
  });

  it("방마다 채널 이름이 다르다 (같은 이름이면 한쪽이 조용히 덮인다)", () => {
    const { client, calls } = fakeSupabase();
    subscribeRoomMessages(client, "a", () => {});
    subscribeRoomMessages(client, "b", () => {});
    expect(calls[0]!.channel).not.toBe(calls[1]!.channel);
  });

  it("해제하면 채널을 제거한다 (안 하면 방을 옮길 때마다 쌓인다)", () => {
    const { client } = fakeSupabase();
    subscribeRoomMessages(client, "room-1", () => {})();
    expect(client.removeChannel).toHaveBeenCalled();
  });
});

describe("subscribeTable", () => {
  it("기존 계약(user_id 필터)이 그대로다 — 위젯 5개가 이 방식에 의존한다", () => {
    const { client, calls } = fakeSupabase();
    subscribeTable(client, "todos", "user-1", () => {});
    expect(calls[0]!.config.filter).toBe("user_id=eq.user-1");
  });
});
