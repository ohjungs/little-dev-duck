create table public.pomodoro_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  duration_minutes integer not null check (duration_minutes between 1 and 180),
  tag text check (char_length(tag) <= 50),
  started_at timestamptz not null,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index pomodoro_sessions_user_id_idx on public.pomodoro_sessions (user_id);

alter table public.pomodoro_sessions enable row level security;

create policy "pomodoro_sessions_select_own" on public.pomodoro_sessions
  for select using (user_id = auth.uid());

create policy "pomodoro_sessions_insert_own" on public.pomodoro_sessions
  for insert with check (user_id = auth.uid());

create policy "pomodoro_sessions_update_own" on public.pomodoro_sessions
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "pomodoro_sessions_delete_own" on public.pomodoro_sessions
  for delete using (user_id = auth.uid());
