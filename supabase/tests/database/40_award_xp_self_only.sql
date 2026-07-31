-- award_xp self-only 회귀 테스트 (20260726110000 T1, 2026-07-26 사고 재발 방지)
-- 정적 검사는 "revoke 문장이 있는지"만 보지만, 이 스위트는 "실제로 막히는지"를 확인한다.
begin;
select plan(3);

select set_config('tests.user_id', tests.create_user('xp_user@example.com')::text, true);
select set_config('tests.victim_id', tests.create_user('xp_victim@example.com')::text, true);

insert into public.duck_state (user_id) values (current_setting('tests.user_id')::uuid);
insert into public.duck_state (user_id) values (current_setting('tests.victim_id')::uuid);

-- 1. anon이 award_xp를 호출하면 권한 오류
select tests.authenticate_as_anon();
select throws_ok(
  $$ select public.award_xp(current_setting('tests.user_id')::uuid, 10) $$,
  '42501',
  'anon은 award_xp를 실행할 권한이 없다'
);

-- 2. 로그인 사용자가 p_user_id에 남의 uuid를 넣어 호출하면 거부된다
select tests.authenticate_as(current_setting('tests.user_id')::uuid);
select throws_ok(
  $$ select public.award_xp(current_setting('tests.victim_id')::uuid, 10) $$,
  'P0001',
  'award_xp: 본인 계정에만 적립할 수 있습니다',
  '로그인 사용자는 남의 계정에 award_xp를 호출할 수 없다'
);

-- 3. 본인 uuid로 호출하면 성공하고 xp가 실제로 증가한다
select results_eq(
  $$ select (public.award_xp(current_setting('tests.user_id')::uuid, 10)->>'xp')::int $$,
  $$ values (10) $$,
  '본인 uuid로 award_xp를 호출하면 xp가 실제로 증가한다'
);

select * from finish();
rollback;
