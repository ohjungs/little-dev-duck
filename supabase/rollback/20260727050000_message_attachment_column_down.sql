-- 20260727050000_message_attachment_column.sql 되돌리기.
--
-- **주의: 컬럼을 지우면 이미지가 어느 메시지의 것인지 알 수 없게 된다.**
-- 버킷의 파일은 남지만 연결이 끊긴다. 되돌리기 전에 필요하면 먼저 백업한다:
--   create table message_attachment_backup as
--     select id, attachment_path from public.messages where attachment_path is not null;

alter table public.messages drop column if exists attachment_path;
