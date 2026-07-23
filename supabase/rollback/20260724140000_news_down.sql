-- Phase 15 T1 rollback: 뉴스 테이블 제거 + delete_all_my_data를 news 이전 버전으로 복원.
-- (함수가 사라진 feeds/articles를 참조하면 런타임 오류가 나므로 먼저 함수를 재정의한 뒤 테이블 드롭.)
create or replace function public.delete_all_my_data()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;
  delete from action_log where user_id = uid;
  delete from embeddings where user_id = uid;
  delete from page_versions where user_id = uid;
  delete from pages where user_id = uid;
  delete from habit_checks where user_id = uid;
  delete from habits where user_id = uid;
  delete from pomodoro_sessions where user_id = uid;
  delete from calendar_events where user_id = uid;
  delete from activity_daily where user_id = uid;
  delete from duck_state where user_id = uid;
  delete from memos where user_id = uid;
  delete from todos where user_id = uid;
  delete from user_google_tokens where user_id = uid;
  delete from user_github_tokens where user_id = uid;
  delete from user_gmail_tokens where user_id = uid;
end;
$$;

drop table if exists public.articles;
drop table if exists public.feeds;
