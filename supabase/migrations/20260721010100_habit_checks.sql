create table public.habit_checks (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null references public.habits (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  checked_date date not null,
  created_at timestamptz not null default now(),
  unique (habit_id, checked_date)
);

create index habit_checks_user_id_idx on public.habit_checks (user_id);
create index habit_checks_habit_id_idx on public.habit_checks (habit_id);

alter table public.habit_checks enable row level security;

create policy "habit_checks_select_own" on public.habit_checks
  for select using (user_id = auth.uid());

create policy "habit_checks_insert_own" on public.habit_checks
  for insert with check (user_id = auth.uid());

create policy "habit_checks_delete_own" on public.habit_checks
  for delete using (user_id = auth.uid());
