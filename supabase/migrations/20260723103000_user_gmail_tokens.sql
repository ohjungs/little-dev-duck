-- Phase 10 T6: Gmail 어댑터가 쓸 access/refresh token 보관. user_google_tokens와 동형이지만 별도 테이블 —
-- Calendar와 Gmail은 둘 다 Google 로그인이지만 서로 다른 scope를 별도 시점에 동의받으므로, 한 테이블을
-- 공유하면 나중에 연동한 쪽이 먼저 연동된 토큰(및 그 scope)을 덮어써 지운다(어댑터=scope 단위로 테이블 분리).
create table public.user_gmail_tokens (
  user_id uuid primary key references auth.users (id) on delete cascade,
  access_token text not null,
  refresh_token text,
  scope text not null,
  expires_at timestamptz not null,
  updated_at timestamptz not null default now()
);

alter table public.user_gmail_tokens enable row level security;

create policy "own gmail token select"
  on public.user_gmail_tokens for select using ((select auth.uid()) = user_id);
create policy "own gmail token insert"
  on public.user_gmail_tokens for insert with check ((select auth.uid()) = user_id);
create policy "own gmail token update"
  on public.user_gmail_tokens for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "own gmail token delete"
  on public.user_gmail_tokens for delete using ((select auth.uid()) = user_id);
