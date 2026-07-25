-- Phase 24 RLS initplan 롤백. 정책을 (select auth.uid()) 이전 형태로 되돌린다.
-- **접근 범위는 그대로다** -- 행마다 재평가하는 느린 형태로 돌아가는 성능 되돌림일 뿐이다.


-- profiles
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (id = auth.uid());
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (id = auth.uid());
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid())
  with check (id = auth.uid());

-- todos
drop policy if exists "todos_select_own" on public.todos;
create policy "todos_select_own" on public.todos
  for select using (user_id = auth.uid());
drop policy if exists "todos_insert_own" on public.todos;
create policy "todos_insert_own" on public.todos
  for insert with check (user_id = auth.uid());
drop policy if exists "todos_update_own" on public.todos;
create policy "todos_update_own" on public.todos
  for update using (user_id = auth.uid())
  with check (user_id = auth.uid());
drop policy if exists "todos_delete_own" on public.todos;
create policy "todos_delete_own" on public.todos
  for delete using (user_id = auth.uid());

-- memos
drop policy if exists "memos_select_own" on public.memos;
create policy "memos_select_own" on public.memos
  for select using (user_id = auth.uid());
drop policy if exists "memos_insert_own" on public.memos;
create policy "memos_insert_own" on public.memos
  for insert with check (user_id = auth.uid());
drop policy if exists "memos_update_own" on public.memos;
create policy "memos_update_own" on public.memos
  for update using (user_id = auth.uid())
  with check (user_id = auth.uid());
drop policy if exists "memos_delete_own" on public.memos;
create policy "memos_delete_own" on public.memos
  for delete using (user_id = auth.uid());

-- duck_state
drop policy if exists "duck_state_select_own" on public.duck_state;
create policy "duck_state_select_own" on public.duck_state
  for select using (user_id = auth.uid());
drop policy if exists "duck_state_insert_own" on public.duck_state;
create policy "duck_state_insert_own" on public.duck_state
  for insert with check (user_id = auth.uid());
drop policy if exists "duck_state_update_own" on public.duck_state;
create policy "duck_state_update_own" on public.duck_state
  for update using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- activity_daily
drop policy if exists "activity_daily_select_own" on public.activity_daily;
create policy "activity_daily_select_own" on public.activity_daily
  for select using (user_id = auth.uid());
drop policy if exists "activity_daily_insert_own" on public.activity_daily;
create policy "activity_daily_insert_own" on public.activity_daily
  for insert with check (user_id = auth.uid());
drop policy if exists "activity_daily_update_own" on public.activity_daily;
create policy "activity_daily_update_own" on public.activity_daily
  for update using (user_id = auth.uid())
  with check (user_id = auth.uid());
drop policy if exists "activity_daily_delete_own" on public.activity_daily;
create policy "activity_daily_delete_own" on public.activity_daily
  for delete using (user_id = auth.uid());

-- habits
drop policy if exists "habits_select_own" on public.habits;
create policy "habits_select_own" on public.habits
  for select using (user_id = auth.uid());
drop policy if exists "habits_insert_own" on public.habits;
create policy "habits_insert_own" on public.habits
  for insert with check (user_id = auth.uid());
drop policy if exists "habits_update_own" on public.habits;
create policy "habits_update_own" on public.habits
  for update using (user_id = auth.uid())
  with check (user_id = auth.uid());
drop policy if exists "habits_delete_own" on public.habits;
create policy "habits_delete_own" on public.habits
  for delete using (user_id = auth.uid());

-- habit_checks
drop policy if exists "habit_checks_select_own" on public.habit_checks;
create policy "habit_checks_select_own" on public.habit_checks
  for select using (user_id = auth.uid());
drop policy if exists "habit_checks_insert_own" on public.habit_checks;
create policy "habit_checks_insert_own" on public.habit_checks
  for insert with check (user_id = auth.uid());
drop policy if exists "habit_checks_delete_own" on public.habit_checks;
create policy "habit_checks_delete_own" on public.habit_checks
  for delete using (user_id = auth.uid());

-- pomodoro_sessions
drop policy if exists "pomodoro_sessions_select_own" on public.pomodoro_sessions;
create policy "pomodoro_sessions_select_own" on public.pomodoro_sessions
  for select using (user_id = auth.uid());
drop policy if exists "pomodoro_sessions_insert_own" on public.pomodoro_sessions;
create policy "pomodoro_sessions_insert_own" on public.pomodoro_sessions
  for insert with check (user_id = auth.uid());
drop policy if exists "pomodoro_sessions_update_own" on public.pomodoro_sessions;
create policy "pomodoro_sessions_update_own" on public.pomodoro_sessions
  for update using (user_id = auth.uid())
  with check (user_id = auth.uid());
drop policy if exists "pomodoro_sessions_delete_own" on public.pomodoro_sessions;
create policy "pomodoro_sessions_delete_own" on public.pomodoro_sessions
  for delete using (user_id = auth.uid());

-- calendar_events
drop policy if exists "calendar_events_select_own" on public.calendar_events;
create policy "calendar_events_select_own" on public.calendar_events
  for select using (user_id = auth.uid());
drop policy if exists "calendar_events_insert_own" on public.calendar_events;
create policy "calendar_events_insert_own" on public.calendar_events
  for insert with check (user_id = auth.uid());
drop policy if exists "calendar_events_update_own" on public.calendar_events;
create policy "calendar_events_update_own" on public.calendar_events
  for update using (user_id = auth.uid())
  with check (user_id = auth.uid());
drop policy if exists "calendar_events_delete_own" on public.calendar_events;
create policy "calendar_events_delete_own" on public.calendar_events
  for delete using (user_id = auth.uid());

drop index if exists public.articles_feed_id_idx;
drop index if exists public.page_links_user_id_idx;
drop index if exists public.page_versions_user_id_idx;
drop index if exists public.pages_parent_id_idx;

