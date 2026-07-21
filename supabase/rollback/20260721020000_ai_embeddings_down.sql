-- Phase 8 RAG 인덱스 롤백. vector 확장은 다른 기능이 쓸 수 있어 drop하지 않는다.
drop function if exists public.match_embeddings(vector, int);
drop table if exists public.embeddings;
