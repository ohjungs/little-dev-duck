-- Phase 9: embeddings.source_type CHECK 제약에 'page' 추가(블록 에디터 페이지 RAG 인덱싱).
-- 인라인 컬럼 CHECK는 Postgres가 <table>_<column>_check 규칙으로 embeddings_source_type_check라 명명한다
-- (source_type에 CHECK가 하나뿐이라 결정론적). 앱 계층(zod embeddingSourceSchema)과 DB 방어를 정합시킨다.
alter table public.embeddings
  drop constraint embeddings_source_type_check;

alter table public.embeddings
  add constraint embeddings_source_type_check check (
    source_type in ('memo', 'todo', 'habit', 'calendar_event', 'activity', 'page')
  );
