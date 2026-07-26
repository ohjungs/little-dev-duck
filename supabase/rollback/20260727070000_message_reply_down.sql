-- 20260727070000_message_reply.sql 되돌리기.
-- **주의: 어느 메시지에 대한 답장이었는지가 사라진다.** 필요하면 먼저 백업한다:
--   create table message_reply_backup as
--     select id, reply_to_id from public.messages where reply_to_id is not null;

alter table public.messages drop column if exists reply_to_id;
