create table public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  start_at timestamptz not null,
  end_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index calendar_events_user_start_idx on public.calendar_events (user_id, start_at);

alter table public.calendar_events enable row level security;

create policy "calendar_events_select_own" on public.calendar_events
  for select using (user_id = auth.uid());

create policy "calendar_events_insert_own" on public.calendar_events
  for insert with check (user_id = auth.uid());

create policy "calendar_events_update_own" on public.calendar_events
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "calendar_events_delete_own" on public.calendar_events
  for delete using (user_id = auth.uid());
