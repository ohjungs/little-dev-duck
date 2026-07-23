-- Phase 10 T5: GitHub Issues 어댑터가 쓸 access token 보관(user_google_tokens와 동형). GitHub OAuth App
-- 기본 발급 토큰은 만료가 없어(refresh_token 개념도 없음) expires_at/refresh_token을 nullable로 둔다.
create table public.user_github_tokens (
  user_id uuid primary key references auth.users (id) on delete cascade,
  access_token text not null,
  refresh_token text,
  scope text not null,
  expires_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.user_github_tokens enable row level security;

create policy "own github token select"
  on public.user_github_tokens for select using ((select auth.uid()) = user_id);
create policy "own github token insert"
  on public.user_github_tokens for insert with check ((select auth.uid()) = user_id);
create policy "own github token update"
  on public.user_github_tokens for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "own github token delete"
  on public.user_github_tokens for delete using ((select auth.uid()) = user_id);
