-- 20260726130000_user_roles_and_layout.sql 되돌리기.
--
-- 주의: 컬럼을 지우면 그 안의 값(역할·기능 토글·대시보드 배치)이 함께 사라진다.
-- 되돌리기 전에 필요하면 먼저 백업한다:
--   create table profiles_access_backup as
--     select id, role, disabled_features, dashboard_layout from public.profiles;

drop policy if exists "profiles_update_admin" on public.profiles;
drop policy if exists "profiles_select_admin" on public.profiles;

drop index if exists public.profiles_role_idx;

-- 정책이 이 함수를 참조하므로 정책을 먼저 지운 뒤에 함수를 지운다.
drop function if exists public.is_admin();

alter table public.profiles drop column if exists dashboard_layout;
alter table public.profiles drop column if exists disabled_features;
alter table public.profiles drop column if exists role;
