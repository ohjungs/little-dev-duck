-- profiles 기본 RLS 회귀 테스트 (20260720100000_profiles.sql + 20260726130000_user_roles_and_layout.sql)
begin;
select plan(6);

select set_config('tests.owner_id', tests.create_user('rls_owner@example.com')::text, true);
select set_config('tests.other_id', tests.create_user('rls_other@example.com')::text, true);
select set_config('tests.admin_id', tests.create_user('rls_admin@example.com', 'admin')::text, true);
-- 아직 profiles 행이 없는 사용자 — insert 정책(본인/타인)을 검증하려면 대상 행이 비어 있어야 한다.
select set_config('tests.bare_id', tests.create_bare_user('rls_bare@example.com')::text, true);

-- 1. 본인 select 성공
select tests.authenticate_as(current_setting('tests.owner_id')::uuid);
select is(
  (select count(*)::int from public.profiles where id = current_setting('tests.owner_id')::uuid),
  1,
  '본인 프로필은 select로 보인다'
);

-- 2. 남 select 실패(0 rows, 에러 아님)
select is(
  (select count(*)::int from public.profiles where id = current_setting('tests.other_id')::uuid),
  0,
  '남의 프로필은 RLS로 보이지 않는다(0행, 에러 아님)'
);

-- 3. 남 id로 insert 시도 -> RLS 위반으로 거부 (bare_id는 아직 profiles 행이 없어 PK 충돌과
-- 무관하게 순수 RLS 거부만 검증한다)
select throws_ok(
  $$ insert into public.profiles (id, email, display_name)
     values (current_setting('tests.bare_id')::uuid, 'rls_bare@example.com', 'bare') $$,
  '42501',
  'new row violates row-level security policy for table "profiles"',
  '남의 id로 프로필 insert는 RLS 위반으로 거부된다'
);

-- 4. 본인 insert 성공(id = auth.uid())
select tests.authenticate_as(current_setting('tests.bare_id')::uuid);
select lives_ok(
  $$ insert into public.profiles (id, email, display_name)
     values (current_setting('tests.bare_id')::uuid, 'rls_bare@example.com', 'bare') $$,
  '본인 id로 프로필 insert는 허용된다'
);

-- 5. 관리자가 is_admin() 경유로 남의 행 select 성공(profiles_select_admin)
select tests.authenticate_as(current_setting('tests.admin_id')::uuid);
select is(
  (select count(*)::int from public.profiles where id = current_setting('tests.other_id')::uuid),
  1,
  '관리자는 is_admin() 정책으로 남의 프로필을 볼 수 있다'
);

-- 6. anon이 아무 행도 못 봄
--
-- tests._anon_can_read_profile()은 00_helpers.sql에 정의돼 있다(이 파일 안에서 role
-- 다운그레이드 이후 새 함수를 create하면 tests 스키마 CREATE 권한 부재로 42501 에러가 나기
-- 때문 — 00_helpers.sql 주석 참조).
select tests.authenticate_as_anon();
select ok(
  not tests._anon_can_read_profile(current_setting('tests.owner_id')::uuid),
  'anon은 profiles를 전혀 읽을 수 없다(0행 또는 권한 오류 어느 쪽이든 통과)'
);

select * from finish();
rollback;
