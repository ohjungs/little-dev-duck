create table public.activity_daily (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  source text not null check (source in ('github', 'claude_code')),
  count integer not null default 0 check (count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, date, source)
);

create index activity_daily_user_id_idx on public.activity_daily (user_id);

alter table public.activity_daily enable row level security;

create policy "activity_daily_select_own" on public.activity_daily
  for select using (user_id = auth.uid());

create policy "activity_daily_insert_own" on public.activity_daily
  for insert with check (user_id = auth.uid());

create policy "activity_daily_update_own" on public.activity_daily
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "activity_daily_delete_own" on public.activity_daily
  for delete using (user_id = auth.uid());
