-- 20260727030000_messenger_rooms.sql 되돌리기.
--
-- **경고: 되돌리면 주고받은 메시지가 전부 사라진다.** 방·멤버·메시지는 이 마이그레이션이
-- 처음 만든 테이블이라 되돌리기 = 삭제다. 필요하면 먼저 백업한다:
--   create table messages_backup as select * from public.messages;
--   create table rooms_backup as select * from public.rooms;
--   create table room_members_backup as select * from public.room_members;

-- publication에서 먼저 뺀다(테이블을 지우면 자동으로 빠지지만, 순서를 명시해 둔다).
alter publication supabase_realtime drop table if exists public.room_members;
alter publication supabase_realtime drop table if exists public.messages;

-- 정책이 함수를 참조하므로 테이블(→정책)을 먼저 지운 뒤 함수를 지운다.
-- messages·room_members가 rooms를 참조하므로 자식부터.
drop table if exists public.messages;
drop table if exists public.room_members;
drop table if exists public.rooms;

drop function if exists public.is_room_member(uuid);
