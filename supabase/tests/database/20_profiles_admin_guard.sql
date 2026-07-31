-- profiles_guard_admin_columns 트리거 회귀 테스트 (20260730160000, 감사 발견 S1)
-- role/disabled_features는 관리자만 바꿀 수 있어야 한다 — 이 파일이 스위트의 핵심 회귀 대상.
begin;
select plan(4);

select set_config('tests.owner_id', tests.create_user('guard_owner@example.com')::text, true);
select set_config('tests.admin_id', tests.create_user('guard_admin@example.com', 'admin')::text, true);

-- 사전 준비: disabled_features를 기본값('{}')과 다른 값으로 세팅해 둔다. 기본값과 같은 값으로
-- "되돌리는" update는 `new is distinct from old`가 false가 되어 가드가 아예 평가되지 않으므로,
-- 시작값을 다르게 만들어야 다음 assertion이 실제로 가드를 통과시킨다.
select tests.authenticate_as(current_setting('tests.admin_id')::uuid);
update public.profiles set disabled_features = array['news']
  where id = current_setting('tests.owner_id')::uuid;

-- 1. 일반 사용자가 자기 role을 admin으로 바꾸려는 시도 -> 거부
select tests.authenticate_as(current_setting('tests.owner_id')::uuid);
select throws_ok(
  $$ update public.profiles set role = 'admin'
     where id = current_setting('tests.owner_id')::uuid $$,
  'P0001',
  'role/disabled_features는 관리자만 변경할 수 있어요.',
  '일반 사용자는 자기 role을 admin으로 못 바꾼다'
);

-- 2. 일반 사용자가 disabled_features를 빈 배열로 되돌리려는 시도 -> 거부
select throws_ok(
  $$ update public.profiles set disabled_features = '{}'
     where id = current_setting('tests.owner_id')::uuid $$,
  'P0001',
  'role/disabled_features는 관리자만 변경할 수 있어요.',
  '일반 사용자는 자기 disabled_features를 못 바꾼다'
);

-- 3. 일반 사용자가 display_name처럼 무관한 컬럼을 바꾸는 것은 통과(가드가 관련 없는 컬럼까지
-- 막으면 false positive다)
select lives_ok(
  $$ update public.profiles set display_name = 'guard-owner-renamed'
     where id = current_setting('tests.owner_id')::uuid $$,
  '일반 사용자는 display_name처럼 무관한 컬럼은 자유롭게 바꿀 수 있다'
);

-- 4. 관리자가 남의 role을 바꾸는 것은 통과(profiles_update_admin + is_admin() 가드 모두 허용)
select tests.authenticate_as(current_setting('tests.admin_id')::uuid);
select lives_ok(
  $$ update public.profiles set role = 'admin'
     where id = current_setting('tests.owner_id')::uuid $$,
  '관리자는 남의 role을 바꿀 수 있다'
);

select * from finish();
rollback;
