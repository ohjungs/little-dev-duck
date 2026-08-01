-- 20260801110000_public_schema_grants.sql 되돌리기.
--
-- **테이블 grant는 회수하지 않는다.** 운영 DB에는 이 마이그레이션 이전부터 같은 권한이
-- 플랫폼 초기화로 존재했으므로, 여기서 revoke하면 "되돌리기"가 아니라 **앱을 내리는 변경**이
-- 된다(PostgREST의 모든 읽기·쓰기가 42501로 죽는다). 되돌릴 대상은 이 마이그레이션이 실제로
-- 새로 만든 것, 즉 postgres 롤로 건 default privileges뿐이다.
--
-- 새로 세운 DB에서 정말로 권한을 전부 걷어내야 한다면 아래 주석의 revoke를 직접 풀어 쓰되,
-- 그 DB에서는 앱이 동작하지 않는다는 것을 알고 해야 한다.
alter default privileges in schema public
  revoke all on tables from anon, authenticated, service_role;
alter default privileges in schema public
  revoke all on sequences from anon, authenticated, service_role;

-- revoke all on all tables in schema public from anon, authenticated, service_role;
-- revoke all on all sequences in schema public from anon, authenticated, service_role;
-- revoke usage on schema public from anon, authenticated, service_role;
