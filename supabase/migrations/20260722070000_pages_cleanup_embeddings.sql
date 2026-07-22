-- Phase 9 리뷰 수정(H2/M8): 페이지 삭제 시 그 페이지의 RAG 임베딩을 같은 트랜잭션에서 정리한다.
-- embeddings.source_id는 pages로의 FK 없는 polymorphic text라 DB cascade가 임베딩을 못 지운다. purge 시
-- parent_id ON DELETE CASCADE로 하위 페이지가 하드삭제될 때 앱은 자식 id를 몰라 정리를 놓치므로, pages에
-- BEFORE DELETE 행 트리거를 두면 직접 삭제·cascade 삭제·미래의 모든 삭제 경로가 단일 지점에서 커버된다.
create or replace function public.cleanup_page_embeddings()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.embeddings
  where source_type = 'page'
    and source_id = old.id::text
    and user_id = old.user_id;
  return old;
end;
$$;

create trigger pages_cleanup_embeddings
  before delete on public.pages
  for each row
  execute function public.cleanup_page_embeddings();
