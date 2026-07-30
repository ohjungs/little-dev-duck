-- 20260730160000_profiles_admin_column_guard.sql 되돌리기.
--
-- 주의: 되돌리면 role/disabled_features가 다시 본인 PATCH로 자유롭게 바뀐다(권한상승 재개방).
-- 되돌린 뒤에는 즉시 대안 방어책을 마련해야 한다.

drop trigger if exists profiles_guard_admin_columns on public.profiles;
drop function if exists public.guard_profiles_admin_columns();
