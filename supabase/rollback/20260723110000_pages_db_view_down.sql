-- Phase 11 롤백. db_schema/row_props 컬럼 제거.
-- 데이터베이스 스키마와 행 속성값은 손실되지만 pages 원본 문서(title/content)는 보존된다.
alter table public.pages
  drop column if exists db_schema,
  drop column if exists row_props;
