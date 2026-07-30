-- 20260730180000_message_sender_immutable.sql 되돌리기.
--
-- 주의: 되돌리면 자기 메시지의 sender_type을 'agent'로 PATCH할 수 있게 된다.
-- 그 행은 core messageSchema의 refine을 위반하므로(agent면 senderUserId가 null이어야 한다)
-- **읽을 때 파싱이 던져 그 방의 메시지 목록이 통째로 적재되지 않는다.** 사람이 여럿인 방
-- ('direct'·'group')이라면 다른 멤버까지 그 방을 못 열게 된다.
-- 되돌린 뒤에는 즉시 대안 방어책이 필요하다.

drop trigger if exists messages_guard_sender on public.messages;
drop function if exists public.guard_message_sender_immutable();
