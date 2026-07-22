-- Phase 10 T7. 실행된 mutating 도구 호출 감사 로그(되돌리기 어려운 외부 액션 추적/디버깅, CLAUDE.md 5절).
-- args/response 전체가 아니라 요약(summarizeForLog, core)만 저장 — 원문 보관은 과도한 노출 표면.
create table public.action_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  tool_name text not null,
  args_summary text not null,
  status text not null check (status in ('success', 'error')),
  result_summary text not null,
  created_at timestamptz not null default now()
);

alter table public.action_log enable row level security;

-- 감사 로그는 조회+기록만(불변 레코드, update/delete 없음 — 삭제는 auth.users cascade로만).
create policy "own action_log select"
  on public.action_log for select using ((select auth.uid()) = user_id);
create policy "own action_log insert"
  on public.action_log for insert with check ((select auth.uid()) = user_id);

create index action_log_user_created_idx
  on public.action_log (user_id, created_at desc);
