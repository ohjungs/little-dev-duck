create table public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 100),
  frequency text not null default 'daily' check (frequency in ('daily', 'weekly')),
  times_per_week integer check (times_per_week between 1 and 7),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index habits_user_id_idx on public.habits (user_id);

alter table public.habits enable row level security;

create policy "habits_select_own" on public.habits
  for select using (user_id = auth.uid());

create policy "habits_insert_own" on public.habits
  for insert with check (user_id = auth.uid());

create policy "habits_update_own" on public.habits
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "habits_delete_own" on public.habits
  for delete using (user_id = auth.uid());
