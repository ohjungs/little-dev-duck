-- 2026-08-01 : 테스트 - pgTAP - RLS/트리거 회귀 헬퍼 (계약 SSOT)
--
-- public을 어지럽히지 않도록 tests 전용 스키마에 둔다.
--
-- **이 파일은 begin/rollback으로 감싸지 않는다.** `supabase test db`는 이 디렉터리의 각 파일을
-- 파일명 순서(00 -> 60)로 실행하는데, 10_..~60_.. 파일은 각자 별도 트랜잭션(begin ... rollback)
-- 안에서 이 헬퍼들을 호출한다. 그 파일들이 실행되는 시점에 tests 스키마·함수가 이미
-- 커밋되어 존재해야 하므로, 여기서는 평범하게 commit되도록 둔다(트랜잭션 안에 넣으면
-- rollback과 함께 헬퍼 자체가 사라져 이후 파일이 전부 실패한다).
create schema if not exists tests;

-- tests.authenticate_as/authenticate_as_anon는 SECURITY DEFINER가 아니라 `set local role`로
-- 실제 role을 authenticated/anon으로 낮춘다. 같은 트랜잭션 안에서 두 번째 이후 호출(예:
-- 10_profiles_rls.sql처럼 한 파일에서 owner -> bare -> admin -> anon으로 여러 번 전환하는 경우)은
-- 이미 낮아진 role로 tests.* 함수를 스키마 한정 호출하게 되므로, tests 스키마에 USAGE grant가
-- 없으면 `permission denied for schema tests`(42501)로 실패한다. public은 클러스터 초기화 시
-- PUBLIC USAGE가 기본 부여되지만 tests는 새로 만든 스키마라 명시적으로 열어줘야 한다.
grant usage on schema tests to authenticated, anon, service_role;

-- ---------------------------------------------------------------------------
-- tests.create_user(email, role) -> uuid
-- ---------------------------------------------------------------------------
-- 가짜 사용자를 auth.users에 심고 uuid를 돌려준다.
--
-- **profiles 행을 직접 insert하지 않는다.** `public.handle_new_user()`
-- (20260720100400_profiles_trigger.sql, `on_auth_user_created` 트리거)가 auth.users insert에
-- 반응해 profiles 행을 이미 자동으로 만든다 — 여기서 또 insert하면 profiles 기본키(id) 충돌로
-- 모든 테스트 파일이 첫 호출부터 깨진다. role만 원하는 값으로 맞춰 준다(기본값 'user'는
-- 트리거가 이미 채워 둔 값과 같아 update가 필요 없다).
--
-- auth.users는 실제로는 Supabase Auth(GoTrue)가 채우지만 로컬 pgTAP 컨텍스트에서는
-- FK와 트리거만 만족하면 되므로 SQL로 직접 insert한다(GoTrue 훅 없이 도는 것은 로컬 테스트
-- 한정 관례 — Supabase 자체 pgTAP 예제·supabase_test_helpers도 같은 방식을 쓴다).
create or replace function tests.create_user(p_email text, p_role text default 'user')
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_id uuid := gen_random_uuid();
begin
  insert into auth.users (id, email) values (v_id, p_email);

  if p_role is distinct from 'user' then
    update public.profiles set role = p_role where id = v_id;
  end if;

  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- tests.create_bare_user(email) -> uuid
-- ---------------------------------------------------------------------------
-- `on_auth_user_created` 트리거를 잠시 끄고 auth.users 행만 만든다 — "가입은 됐지만 아직
-- profiles 행이 없는" 상태를 재현해야 하는 테스트(예: profiles insert RLS 자체를 검증하는
-- 케이스) 전용. 트리거를 끄고 켜는 동작은 테이블 소유자(이 함수를 만든 슈퍼유저) 권한이 필요해
-- SECURITY DEFINER로 감싼다.
create or replace function tests.create_bare_user(p_email text)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_id uuid := gen_random_uuid();
begin
  alter table auth.users disable trigger on_auth_user_created;
  insert into auth.users (id, email) values (v_id, p_email);
  alter table auth.users enable trigger on_auth_user_created;
  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- tests.authenticate_as(uuid) / tests.authenticate_as_anon() / tests.clear_authentication()
-- ---------------------------------------------------------------------------
-- 이후 쿼리를 이 사용자의 RLS 컨텍스트로 실행한다. request.jwt.claims는 PostgREST/Supabase가
-- auth.uid()를 파생시키는 실제 경로(auth.uid() = current_setting('request.jwt.claims',
-- true)::json->>'sub')와 동일하다. set_config(..., true)는 트랜잭션 범위(LOCAL)라
-- 각 테스트 파일의 begin/rollback이 끝나면 자동으로 원복된다.
create or replace function tests.authenticate_as(p_user_id uuid)
returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_user_id::text, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
end;
$$;

create or replace function tests.authenticate_as_anon()
returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claims', '{}', true);
  execute 'set local role anon';
end;
$$;

create or replace function tests.clear_authentication()
returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claims', null, true);
  reset role;
end;
$$;

-- ---------------------------------------------------------------------------
-- tests._anon_can_read_profile(uuid) -> boolean
-- ---------------------------------------------------------------------------
-- 10_profiles_rls.sql 전용 헬퍼지만, 이 파일(00_helpers.sql)에 정의해야 한다. 이유:
-- 10_profiles_rls.sql은 한 트랜잭션 안에서 owner -> bare -> admin -> anon 순으로 여러 번
-- authenticate_as*를 호출하는데, `create or replace function`을 그 파일 중간(admin 로그인 이후)에
-- 두면 그 시점 DB role이 이미 authenticated로 낮아져 있어 tests 스키마에 대한 CREATE 권한이 없는
-- role로 신규 함수 생성을 시도하게 되고 `permission denied for schema tests`(42501)로 파일 전체가
-- 실패한다. 이 파일은 role 다운그레이드 전(tests 스키마 소유자 권한)에 실행되므로 다른 tests.*
-- 헬퍼와 동일하게 여기서 정의한다.
--
-- [추정] profiles_select_admin이 `using (public.is_admin())`이고 is_admin()의 EXECUTE 권한은
-- anon에게 회수돼 있다(20260726110000). profiles_select_own(`id = auth.uid()`)은 anon에게
-- auth.uid()가 NULL이라 매 행 NULL로 평가되고, OR로 묶인 두 정책을 Postgres가 단축평가로
-- 완전히 건너뛴다는 보장이 없어 is_admin() 호출 자체가 "permission denied"로 막힐 수도, 정책이
-- 단순히 0행으로 걸러질 수도 있다 — 어느 쪽이든 "anon이 남의 프로필 데이터를 읽지 못한다"는
-- 보안 계약은 동일하므로, 두 결과를 모두 통과로 인정하는 방식으로 검증한다.
create or replace function tests._anon_can_read_profile(p_id uuid)
returns boolean
language plpgsql
as $$
declare
  v_found boolean;
begin
  select exists(select 1 from public.profiles where id = p_id) into v_found;
  return v_found;
exception
  when insufficient_privilege then
    return false;
end;
$$;
