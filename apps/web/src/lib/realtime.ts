import type { SupabaseClient, RealtimeChannel } from "@supabase/supabase-js";

// Subscribe to INSERT/UPDATE/DELETE on a table, filtered by user_id.
// Returns cleanup function.
export function subscribeTable(
  supabase: SupabaseClient,
  table: string,
  userId: string,
  onChange: () => void,
): () => void {
  const channel: RealtimeChannel = supabase
    .channel(`${table}-${userId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table,
        filter: `user_id=eq.${userId}`,
      },
      () => {
        onChange();
      },
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// 2026-07-27 : 실시간 - 방 단위 구독 (Phase 50 T3)
//
// **계획의 전제가 틀렸다.** Phase 50 계획은 "publication에 테이블만 얹으면 실시간이
// 따라온다"고 적었는데, 위 `subscribeTable`은 `user_id=eq.<나>`로 거른다.
// **`messages`에는 `user_id` 컬럼이 없다** — `room_id`와 `sender_user_id`뿐이다.
// 그대로 썼으면 구독은 성공하는데 **이벤트가 하나도 안 오는** 조용한 실패가 났을 것이다.
//
// 위 함수를 고치지 않고 옆에 둔다: 호출부 5개(duck_state·habits·habit_checks·memos·pages·todos)가
// 지금 방식에 의존하고, 그 5개는 전부 user_id를 가진 테이블이라 바꿀 이유가 없다.
//
// 채널 이름을 방 단위로 두는 이유: 같은 이름으로 두 번 구독하면 한쪽이 조용히 덮인다.
export function subscribeRoomMessages(
  supabase: SupabaseClient,
  roomId: string,
  onChange: () => void,
): () => void {
  const channel: RealtimeChannel = supabase
    .channel(`messages-room-${roomId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "messages",
        filter: `room_id=eq.${roomId}`,
      },
      () => {
        onChange();
      },
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
