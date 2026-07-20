create table public.memos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  content text not null default '' check (char_length(content) <= 10000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index memos_user_id_idx on public.memos (user_id);

alter table public.memos enable row level security;

create policy "memos_select_own" on public.memos
  for select using (user_id = auth.uid());

create policy "memos_insert_own" on public.memos
  for insert with check (user_id = auth.uid());

create policy "memos_update_own" on public.memos
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "memos_delete_own" on public.memos
  for delete using (user_id = auth.uid());
