-- 20260727060000_room_activity_trigger.sql 되돌리기.
-- 되돌리면 방 목록이 다시 "만든 순서"로 고정된다(데이터 손실은 없다).

drop trigger if exists messages_touch_room on public.messages;
drop function if exists public.touch_room_on_message();
