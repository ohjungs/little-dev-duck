create table public.duck_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  xp integer not null default 0 check (xp >= 0),
  level integer not null default 1 check (level >= 1),
  feed integer not null default 100 check (feed between 0 and 100),
  costume text not null default 'default' check (char_length(costume) between 1 and 50),
  updated_at timestamptz not null default now()
);

alter table public.duck_state enable row level security;

create policy "duck_state_select_own" on public.duck_state
  for select using (user_id = auth.uid());

create policy "duck_state_insert_own" on public.duck_state
  for insert with check (user_id = auth.uid());

create policy "duck_state_update_own" on public.duck_state
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
