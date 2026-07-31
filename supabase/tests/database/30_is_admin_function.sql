-- public.is_admin() 자체 회귀 테스트 (20260726130000 정의, 20260726110000에서 anon revoke 확인)
begin;
select plan(3);

select set_config('tests.user_id', tests.create_user('isadmin_user@example.com')::text, true);
select set_config('tests.admin_id', tests.create_user('isadmin_admin@example.com', 'admin')::text, true);

-- 1. anon은 is_admin()을 직접 호출조차 못 한다(schemaGuard가 정적으로만 확인하던 것을 여기서
-- 동적으로 확인 — revoke all ... from anon이 실제로 걸려 있는지)
select tests.authenticate_as_anon();
select throws_ok(
  $$ select public.is_admin() $$,
  '42501',
  'anon은 is_admin()을 실행할 권한이 없다'
);

-- 2. 인자 없이 자기 행의 role만 읽는다 — 일반 사용자로 로그인하면 false
select tests.authenticate_as(current_setting('tests.user_id')::uuid);
select is(public.is_admin(), false, '일반 사용자로 로그인하면 is_admin()은 false다');

-- 3. 관리자로 로그인하면 true(다른 사용자로 로그인하면 다른 결과가 나오는지 확인)
select tests.authenticate_as(current_setting('tests.admin_id')::uuid);
select is(public.is_admin(), true, '관리자로 로그인하면 is_admin()은 true다');

select * from finish();
rollback;
