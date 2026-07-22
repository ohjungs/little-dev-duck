-- 롤백: embeddings.source_type CHECK에서 'page' 제거.
-- 'page' 소스 행이 남아 있으면 좁힌 제약 추가가 실패하므로 먼저 해당 임베딩을 삭제한다(RAG 부가 데이터라
-- 손실 허용 — 페이지 원본은 pages 테이블에 보존됨).
delete from public.embeddings where source_type = 'page';

alter table public.embeddings
  drop constraint embeddings_source_type_check;

alter table public.embeddings
  add constraint embeddings_source_type_check check (
    source_type in ('memo', 'todo', 'habit', 'calendar_event', 'activity')
  );
