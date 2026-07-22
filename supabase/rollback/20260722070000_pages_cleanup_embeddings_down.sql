-- 롤백: 페이지 임베딩 정리 트리거·함수 제거.
drop trigger if exists pages_cleanup_embeddings on public.pages;
drop function if exists public.cleanup_page_embeddings();
