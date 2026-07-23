-- Phase 11 DB 뷰(표/보드). 데이터베이스는 새 테이블이 아니라 pages에 얹는다(ponytail, phase_11.md):
--   db_schema가 설정된 페이지 = 데이터베이스(열 정의 + 뷰 목록),
--   그 자식 페이지(parent_id) = 행,
--   row_props = 행의 속성값 맵(propId -> 값).
-- 일반 페이지는 db_schema=null, row_props={}. 행이 곧 페이지라 트리·검색·휴지통·RAG(Phase 9)를 그대로 물려받는다.
alter table public.pages
  add column db_schema jsonb,
  add column row_props jsonb not null default '{}'::jsonb;
