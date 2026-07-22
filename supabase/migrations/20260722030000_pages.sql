-- Phase 9 워크스페이스 코어. 페이지(계층) + BlockNote content jsonb 통짜 저장(ARCHITECTURE 154행).
-- plain_text는 extractPlainText(content) 결과를 앱이 저장 시 채운다(전역 검색·RAG 인덱싱 공용).
create extension if not exists pg_trgm;

create table public.pages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  -- 계층(자기참조). 부모 하드삭제 시 자식 subtree cascade. soft delete는 앱이 별도 처리.
  parent_id uuid references public.pages (id) on delete cascade,
  title text not null default '' check (char_length(title) <= 200),
  -- BlockNote 문서(블록 배열). 빈 문서 = [].
  content jsonb not null default '[]'::jsonb,
  -- extractPlainText(content) 결과. 앱 계층(packages/api)이 저장 시 채운다. 검색/RAG 인덱싱용.
  plain_text text not null default '' check (char_length(plain_text) <= 100000),
  icon text check (char_length(icon) <= 16),
  is_trashed boolean not null default false,
  trashed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 트리 조회(부모별 자식 목록) + 휴지통 필터.
create index pages_user_parent_idx on public.pages (user_id, parent_id);
create index pages_user_trashed_idx on public.pages (user_id, is_trashed);
-- 전역 검색(제목/본문 부분일치, ilike). trgm GIN.
create index pages_title_trgm_idx on public.pages using gin (title gin_trgm_ops);
create index pages_plain_text_trgm_idx on public.pages using gin (plain_text gin_trgm_ops);

alter table public.pages enable row level security;

-- (select auth.uid())로 감싸 statement당 1회 initplan 평가·캐시(auth_rls_initplan advisor 권장).
-- trgm 전역검색이 다수 행을 반환하는 pages에선 행별 재평가 회피 이득이 크다.
create policy "pages_select_own" on public.pages
  for select using (user_id = (select auth.uid()));
create policy "pages_insert_own" on public.pages
  for insert with check (user_id = (select auth.uid()));
create policy "pages_update_own" on public.pages
  for update using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "pages_delete_own" on public.pages
  for delete using (user_id = (select auth.uid()));
