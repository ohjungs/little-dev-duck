-- Phase 9 T5: 페이지 버전 스냅샷. 사용자가 "버전 저장"으로 명시 체크포인트를 남기고 나중에 복원한다.
-- content는 그 시점 pages.content jsonb 통짜 복사. page 삭제 시 cascade로 함께 정리.
create table public.page_versions (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.pages (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  content jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.page_versions enable row level security;

-- 스냅샷은 불변(update 없음): 본인 것만 select/insert/delete.
create policy "own page_versions select"
  on public.page_versions for select using ((select auth.uid()) = user_id);
create policy "own page_versions insert"
  on public.page_versions for insert with check ((select auth.uid()) = user_id);
create policy "own page_versions delete"
  on public.page_versions for delete using ((select auth.uid()) = user_id);

create index page_versions_page_idx
  on public.page_versions (page_id, created_at desc);
