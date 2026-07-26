-- 20260727080000_message_reactions.sql 되돌리기.
-- **경고: 달린 반응이 전부 사라진다.** 필요하면 먼저 백업한다:
--   create table message_reactions_backup as select * from public.message_reactions;
--
-- 파기 함수는 되돌리지 않는다 — 없는 테이블을 지우려 하면 그때 오류가 난다.
-- 이 마이그레이션을 되돌린다면 파기 함수도 이전 버전으로 함께 되돌려야 한다.

alter publication supabase_realtime drop table if exists public.message_reactions;
drop table if exists public.message_reactions;
