-- 2026-07-26 : 성능 - RLS initplan - 나머지 테이블
-- Supabase 어드바이저 지적(auth_rls_initplan) 대응. auth.uid()를 그대로 쓰면 **행마다**
-- 재평가된다. (select auth.uid())로 감싸면 구문당 1회로 줄어든다 -- 접근 범위는 완전히
-- 동일하고(판정 결과가 같다) 성능만 달라진다.
-- embeddings·pages에는 20260724150000에서 이미 같은 수정을 적용했다. 나머지를 맞춘다.
-- 정책 목록은 마이그레이션에서 스크립트로 추출했다(손으로 옮겨 적지 않았다).


-- profiles
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (id = (select auth.uid()));
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (id = (select auth.uid()));
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- todos
drop policy if exists "todos_select_own" on public.todos;
create policy "todos_select_own" on public.todos
  for select using (user_id = (select auth.uid()));
drop policy if exists "todos_insert_own" on public.todos;
create policy "todos_insert_own" on public.todos
  for insert with check (user_id = (select auth.uid()));
drop policy if exists "todos_update_own" on public.todos;
create policy "todos_update_own" on public.todos
  for update using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
drop policy if exists "todos_delete_own" on public.todos;
create policy "todos_delete_own" on public.todos
  for delete using (user_id = (select auth.uid()));

-- memos
drop policy if exists "memos_select_own" on public.memos;
create policy "memos_select_own" on public.memos
  for select using (user_id = (select auth.uid()));
drop policy if exists "memos_insert_own" on public.memos;
create policy "memos_insert_own" on public.memos
  for insert with check (user_id = (select auth.uid()));
drop policy if exists "memos_update_own" on public.memos;
create policy "memos_update_own" on public.memos
  for update using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
drop policy if exists "memos_delete_own" on public.memos;
create policy "memos_delete_own" on public.memos
  for delete using (user_id = (select auth.uid()));

-- duck_state
drop policy if exists "duck_state_select_own" on public.duck_state;
create policy "duck_state_select_own" on public.duck_state
  for select using (user_id = (select auth.uid()));
drop policy if exists "duck_state_insert_own" on public.duck_state;
create policy "duck_state_insert_own" on public.duck_state
  for insert with check (user_id = (select auth.uid()));
drop policy if exists "duck_state_update_own" on public.duck_state;
create policy "duck_state_update_own" on public.duck_state
  for update using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- activity_daily
drop policy if exists "activity_daily_select_own" on public.activity_daily;
create policy "activity_daily_select_own" on public.activity_daily
  for select using (user_id = (select auth.uid()));
drop policy if exists "activity_daily_insert_own" on public.activity_daily;
create policy "activity_daily_insert_own" on public.activity_daily
  for insert with check (user_id = (select auth.uid()));
drop policy if exists "activity_daily_update_own" on public.activity_daily;
create policy "activity_daily_update_own" on public.activity_daily
  for update using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
drop policy if exists "activity_daily_delete_own" on public.activity_daily;
create policy "activity_daily_delete_own" on public.activity_daily
  for delete using (user_id = (select auth.uid()));

-- habits
drop policy if exists "habits_select_own" on public.habits;
create policy "habits_select_own" on public.habits
  for select using (user_id = (select auth.uid()));
drop policy if exists "habits_insert_own" on public.habits;
create policy "habits_insert_own" on public.habits
  for insert with check (user_id = (select auth.uid()));
drop policy if exists "habits_update_own" on public.habits;
create policy "habits_update_own" on public.habits
  for update using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
drop policy if exists "habits_delete_own" on public.habits;
create policy "habits_delete_own" on public.habits
  for delete using (user_id = (select auth.uid()));

-- habit_checks
drop policy if exists "habit_checks_select_own" on public.habit_checks;
create policy "habit_checks_select_own" on public.habit_checks
  for select using (user_id = (select auth.uid()));
drop policy if exists "habit_checks_insert_own" on public.habit_checks;
create policy "habit_checks_insert_own" on public.habit_checks
  for insert with check (user_id = (select auth.uid()));
drop policy if exists "habit_checks_delete_own" on public.habit_checks;
create policy "habit_checks_delete_own" on public.habit_checks
  for delete using (user_id = (select auth.uid()));

-- pomodoro_sessions
drop policy if exists "pomodoro_sessions_select_own" on public.pomodoro_sessions;
create policy "pomodoro_sessions_select_own" on public.pomodoro_sessions
  for select using (user_id = (select auth.uid()));
drop policy if exists "pomodoro_sessions_insert_own" on public.pomodoro_sessions;
create policy "pomodoro_sessions_insert_own" on public.pomodoro_sessions
  for insert with check (user_id = (select auth.uid()));
drop policy if exists "pomodoro_sessions_update_own" on public.pomodoro_sessions;
create policy "pomodoro_sessions_update_own" on public.pomodoro_sessions
  for update using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
drop policy if exists "pomodoro_sessions_delete_own" on public.pomodoro_sessions;
create policy "pomodoro_sessions_delete_own" on public.pomodoro_sessions
  for delete using (user_id = (select auth.uid()));

-- calendar_events
drop policy if exists "calendar_events_select_own" on public.calendar_events;
create policy "calendar_events_select_own" on public.calendar_events
  for select using (user_id = (select auth.uid()));
drop policy if exists "calendar_events_insert_own" on public.calendar_events;
create policy "calendar_events_insert_own" on public.calendar_events
  for insert with check (user_id = (select auth.uid()));
drop policy if exists "calendar_events_update_own" on public.calendar_events;
create policy "calendar_events_update_own" on public.calendar_events
  for update using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
drop policy if exists "calendar_events_delete_own" on public.calendar_events;
create policy "calendar_events_delete_own" on public.calendar_events
  for delete using (user_id = (select auth.uid()));

-- 인덱스 없는 외래키(어드바이저 unindexed_foreign_keys). 부모 행을 지울 때 자식 전수 스캔을
-- 막아 준다. concurrently는 트랜잭션 안에서 못 써서 쓰지 않는다(현재 데이터량에선 즉시 끝난다).
create index if not exists articles_feed_id_idx on public.articles (feed_id);
create index if not exists page_links_user_id_idx on public.page_links (user_id);
create index if not exists page_versions_user_id_idx on public.page_versions (user_id);
create index if not exists pages_parent_id_idx on public.pages (parent_id);

