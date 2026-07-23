-- Phase 15 T1 뉴스 브리핑 파이프라인 — 피드/기사 테이블.
-- 저작권: articles는 3줄 요약(summary)+원문 링크만 저장, 본문 전문은 애초에 저장하지 않는다.
-- 중복 차단: url_hash(정규화 URL의 SHA-256)에 사용자별 UNIQUE — 재수집해도 1건만.
create table public.feeds (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  url text not null,
  title text,
  folder text,
  status text not null default 'active' check (status in ('active', 'paused')),
  fail_count integer not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, url)
);

create table public.articles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  feed_id uuid not null references public.feeds (id) on delete cascade,
  url_hash text not null,
  title text not null,
  link text not null,
  -- snippet: RSS <description>(발행자 제공 신디케이션 요약, 최대 500자). 본문 전문이 아니며 요약 입력·
  -- 리더 미리보기로 쓴다. summary: Gemini 3줄 요약(생성 전 null).
  snippet text,
  summary text,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, url_hash)
);

create index articles_user_created_idx on public.articles (user_id, created_at desc);

alter table public.feeds enable row level security;
alter table public.articles enable row level security;

create policy "own feeds select" on public.feeds for select using ((select auth.uid()) = user_id);
create policy "own feeds insert" on public.feeds for insert with check ((select auth.uid()) = user_id);
create policy "own feeds update" on public.feeds for update
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own feeds delete" on public.feeds for delete using ((select auth.uid()) = user_id);

create policy "own articles select" on public.articles for select using ((select auth.uid()) = user_id);
create policy "own articles insert" on public.articles for insert with check ((select auth.uid()) = user_id);
create policy "own articles update" on public.articles for update
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own articles delete" on public.articles for delete using ((select auth.uid()) = user_id);

-- 전체 데이터 파기(Phase 13 T3)에 신규 두 테이블을 포함하도록 함수를 재정의(create or replace).
-- 새 사용자 데이터 테이블을 추가할 때마다 여기에 delete 한 줄을 더한다.
create or replace function public.delete_all_my_data()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;
  delete from articles where user_id = uid;
  delete from feeds where user_id = uid;
  delete from action_log where user_id = uid;
  delete from embeddings where user_id = uid;
  delete from page_versions where user_id = uid;
  delete from pages where user_id = uid;
  delete from habit_checks where user_id = uid;
  delete from habits where user_id = uid;
  delete from pomodoro_sessions where user_id = uid;
  delete from calendar_events where user_id = uid;
  delete from activity_daily where user_id = uid;
  delete from duck_state where user_id = uid;
  delete from memos where user_id = uid;
  delete from todos where user_id = uid;
  delete from user_google_tokens where user_id = uid;
  delete from user_github_tokens where user_id = uid;
  delete from user_gmail_tokens where user_id = uid;
end;
$$;
