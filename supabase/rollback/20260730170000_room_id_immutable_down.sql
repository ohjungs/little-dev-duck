-- 20260730170000_room_id_immutable.sql 되돌리기.
--
-- 주의: 되돌리면 자기 소유 room_members·messages 행의 room_id를 PATCH로 바꿀 수 있게 된다
-- (멤버십 위조 → 남의 대화 열람, 메시지 이동). 되돌린 뒤에는 즉시 대안 방어책이 필요하다.

drop trigger if exists messages_guard_room_id on public.messages;
drop trigger if exists room_members_guard_room_id on public.room_members;
drop function if exists public.guard_room_id_immutable();
