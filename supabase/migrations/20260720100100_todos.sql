create table public.todos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  is_done boolean not null default false,
  due_date timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index todos_user_id_idx on public.todos (user_id);

alter table public.todos enable row level security;

create policy "todos_select_own" on public.todos
  for select using (user_id = auth.uid());

create policy "todos_insert_own" on public.todos
  for insert with check (user_id = auth.uid());

create policy "todos_update_own" on public.todos
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "todos_delete_own" on public.todos
  for delete using (user_id = auth.uid());
