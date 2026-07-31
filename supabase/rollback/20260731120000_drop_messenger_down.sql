-- 되돌리기: 메신저 스키마 복구.
--
-- **데이터는 복구할 수 없다.** 삭제 시점에 방 2 · 멤버 4 · 메시지 12건이 있었고 백업을
-- 남기지 않았다(사용자가 명시적으로 거절). 이 스크립트가 되살리는 것은 **구조뿐**이다.
--
-- 구조 복구는 원본 마이그레이션을 순서대로 다시 적용하는 것이 정확하다 — 여기에 200줄을
-- 복사하면 원본과 갈라지고, 갈라진 down은 없느니만 못하다(이 저장소의 L-21 복사-드리프트).
--
--   supabase/migrations/20260727030000_messenger_rooms.sql
--   supabase/migrations/20260727040000_message_attachments_bucket.sql
--   supabase/migrations/20260727050000_message_attachment_column.sql
--   supabase/migrations/20260727060000_room_activity_trigger.sql
--   supabase/migrations/20260727070000_message_reply.sql
--   supabase/migrations/20260727080000_message_reactions.sql
--   supabase/migrations/20260729010000_message_edit.sql
--   supabase/migrations/20260730150000_fix_rooms_select_own.sql
--   supabase/migrations/20260730170000_room_id_immutable.sql
--   supabase/migrations/20260730180000_message_sender_immutable.sql
--   supabase/migrations/20260731100000_message_attachment_delete_owner.sql
--
-- 그 파일들은 지우지 않고 그대로 둔다 — 적용 이력이자 복구 경로다.
-- 앱 코드는 git에서 되살린다: `git revert <이 커밋>`.
--
-- 아래는 그 뒤에 돌려 전체 파기 함수에 메신저 4줄을 되돌려 놓는 부분이다.
create or replace function public.delete_all_my_data()
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;
  delete from articles where user_id = uid;
  delete from feeds where user_id = uid;
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
  delete from message_reactions where user_id = uid;
  delete from messages where sender_user_id = uid;
  delete from room_members where user_id = uid;
  delete from rooms where created_by = uid;
end;
$$;
