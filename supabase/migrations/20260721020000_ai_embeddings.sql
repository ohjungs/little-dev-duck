-- Phase 8 AI 1단계 RAG 인덱스. pgvector + 본인 데이터 임베딩 저장 + 코사인 top-k 검색 함수.
create extension if not exists vector;

create table public.embeddings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  -- 앱 계층(zod/chunkText) 우회(PostgREST 직접 호출)에 대비한 DB 레벨 방어 — 다른 테이블 컨벤션과 동일.
  source_type text not null check (
    source_type in ('memo', 'todo', 'habit', 'calendar_event', 'activity')
  ),
  source_id text not null check (char_length(source_id) between 1 and 200),
  chunk_index int not null default 0,
  content text not null check (char_length(content) <= 2000),
  embedding vector(768) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- 같은 소스의 같은 청크는 재임베딩 시 upsert(중복 누적 방지).
  unique (user_id, source_type, source_id, chunk_index)
);

create index embeddings_user_source_idx on public.embeddings (user_id, source_type, source_id);
create index embeddings_vector_idx
  on public.embeddings using ivfflat (embedding vector_cosine_ops) with (lists = 100);

alter table public.embeddings enable row level security;

create policy "embeddings_select_own" on public.embeddings
  for select using (user_id = auth.uid());
create policy "embeddings_insert_own" on public.embeddings
  for insert with check (user_id = auth.uid());
create policy "embeddings_update_own" on public.embeddings
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "embeddings_delete_own" on public.embeddings
  for delete using (user_id = auth.uid());

-- RAG 검색: 코사인 유사도 top-k. SECURITY INVOKER(기본)라 RLS가 적용돼 본인 임베딩만 대상이 된다
-- (교차 사용자 노출 불가). similarity = 1 - cosine_distance.
create or replace function public.match_embeddings(
  query_embedding vector(768),
  match_count int default 5
)
returns table (
  source_type text,
  source_id text,
  content text,
  similarity float
)
language sql
stable
as $$
  select
    e.source_type,
    e.source_id,
    e.content,
    1 - (e.embedding <=> query_embedding) as similarity
  from public.embeddings e
  where e.user_id = auth.uid()
  order by e.embedding <=> query_embedding
  limit greatest(1, least(match_count, 20));
$$;
