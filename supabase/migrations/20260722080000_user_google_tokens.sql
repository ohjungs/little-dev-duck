-- Phase 10 T3: Google Calendar 어댑터가 쓸 access/refresh token 보관. Supabase 세션의 provider_token은
-- 최초 로그인 시점에만 응답에 노출되므로(공식 문서 실측, phase_10.md) 콜백(서버)에서 즉시 이 테이블로
-- 옮겨 담는다. user_id당 최신 1행(단일 Google 계정 연동 모델 — 개인 워크스페이스라 다중 계정은 YAGNI).
create table public.user_google_tokens (
  user_id uuid primary key references auth.users (id) on delete cascade,
  access_token text not null,
  -- Google이 access_type=offline 없이는 refresh_token을 재발급하지 않아(재동의 시 최초 1회만) nullable.
  refresh_token text,
  scope text not null,
  expires_at timestamptz not null,
  updated_at timestamptz not null default now()
);

alter table public.user_google_tokens enable row level security;

-- 본인 토큰만 조회/기록. update도 본인 행만(재로그인 시 갱신).
create policy "own google token select"
  on public.user_google_tokens for select using ((select auth.uid()) = user_id);
create policy "own google token insert"
  on public.user_google_tokens for insert with check ((select auth.uid()) = user_id);
create policy "own google token update"
  on public.user_google_tokens for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "own google token delete"
  on public.user_google_tokens for delete using ((select auth.uid()) = user_id);
