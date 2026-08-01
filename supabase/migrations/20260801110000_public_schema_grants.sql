-- 2026-08-01 : 스키마 - 권한 - public 테이블 grant 명시 (db-tests가 드러낸 이식성 구멍)
--
-- 이 저장소의 마이그레이션에는 테이블 grant 문이 하나도 없었다(함수 grant만 있었다).
-- 그런데도 앱이 도는 이유는 Supabase 플랫폼이 **프로젝트를 만들 때** public 스키마에
-- `alter default privileges ... grant all on tables to anon, authenticated, service_role`를
-- 걸어 두기 때문이다. 즉 지금의 권한은 마이그레이션이 아니라 플랫폼 초기화에서 왔다.
-- (2026-08-01 운영 DB information_schema.role_table_grants 확인 — 네 테이블 모두
--  anon/authenticated/service_role에 ALL.)
--
-- 그 차이가 처음 드러난 곳이 CI의 db-tests다. `supabase start`로 만드는 로컬 컨테이너에는
-- 플랫폼 초기화가 없어 authenticated가 public 테이블에 접근조차 못 했고, RLS를 검증하기도 전에
-- `permission denied for table todos`(42501)로 죽었다. 같은 이유로 **이 마이그레이션만으로
-- 새 Supabase 프로젝트를 세우면 앱이 뜨지 않는다** — 재해 복구·프로젝트 이전 경로가 막혀 있었다.
--
-- 운영 DB에는 이미 같은 권한이 있으므로 여기서는 사실상 no-op이고, 새로 세우는 DB에서만
-- 실제로 효과가 있다.
--
-- **왜 anon에게도 주는가**: 권한(GRANT)과 정책(RLS)은 별개 계층이고, PostgREST는 비로그인
-- 요청을 anon 롤로 실행한다. 실제 차단은 RLS가 한다 — 이 저장소는 public 테이블 전부에 대해
-- RLS 활성화와 정책 1개 이상을 schemaGuard(packages/api/src/schemaGuard.ts)가 CI에서 정적으로
-- 강제하므로, grant를 열어도 남의 행이 보이지 않는다는 계약은 그대로다. 운영 DB의 현재 상태와
-- 정확히 같은 모양을 코드로 옮겨 적는 것이지 권한을 새로 넓히는 변경이 아니다.
grant usage on schema public to anon, authenticated, service_role;

grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;

-- 앞으로 추가되는 테이블에도 자동으로 붙게 한다. `alter default privileges`는 **실행한 롤이
-- 만든** 객체에만 적용되므로, 마이그레이션을 적용하는 롤(postgres)로 걸어야 이후 마이그레이션이
-- 만드는 테이블이 덮인다. 이걸 빼면 다음에 테이블을 추가할 때 같은 구멍이 다시 생긴다.
alter default privileges in schema public
  grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on sequences to anon, authenticated, service_role;
