-- 2026-07-27 : 메신저 - 방 활동 시각 갱신 (Phase 51 T5)
--
-- **없으면 "최근 대화 순"이 거짓말이 된다.** `rooms.updated_at`은 방을 만들 때 한 번 찍히고
-- 그 뒤로 아무도 갱신하지 않았다 — 메시지가 아무리 오가도 목록 순서는 **방을 만든 순서**
-- 그대로였다. 실측으로 확인한 공백이다(트리거 0건).
--
-- 화면에서 갱신하지 않고 트리거로 두는 이유: 메시지를 넣는 경로가 늘어날 때마다
-- (에이전트 응답·시스템 메시지) 갱신을 잊는 곳이 생긴다. **한 곳에서 자동으로** 한다.
create or replace function public.touch_room_on_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.rooms set updated_at = now() where id = new.room_id;
  return new;
end;
$$;

revoke all on function public.touch_room_on_message() from public;
revoke all on function public.touch_room_on_message() from anon;

-- 소프트 삭제(update)에는 반응하지 않는다 — 메시지를 지웠다고 방이 위로 올라오면 이상하다.
create trigger messages_touch_room
  after insert on public.messages
  for each row execute function public.touch_room_on_message();
