-- public.is_admin() 자체 회귀 테스트 (20260726130000 정의, 20260726110000에서 anon revoke 확인)
begin;
select plan(3);

select set_config('tests.user_id', tests.create_user('isadmin_user@example.com')::text, true);
select set_config('tests.admin_id', tests.create_user('isadmin_admin@example.com', 'admin')::text, true);

-- 1. anon은 is_admin()을 직접 호출조차 못 한다(schemaGuard가 정적으로만 확인하던 것을 여기서
-- 동적으로 확인 — revoke all ... from anon이 실제로 걸려 있는지)
select tests.authenticate_as_anon();
-- throws_ok의 3인자 형태는 (sql, errcode, **errmsg**)다 — 설명문(description)이 아니다.
-- 한국어 설명을 3번째에 두면 pgTAP이 그걸 기대 에러 메시지로 알아듣고 "wanted: 42501: anon은
-- ..." 대 "caught: 42501: permission denied for function is_admin"으로 어긋난다.
-- 에러 메시지 문구는 Postgres 판본에 딸린 문자열이라 계약이 아니므로 null(검사 안 함)로 두고,
-- 4번째 인자에 설명을 준다. 계약은 "42501로 막힌다"까지다.
select throws_ok(
  $$ select public.is_admin() $$,
  '42501',
  null::text,
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
