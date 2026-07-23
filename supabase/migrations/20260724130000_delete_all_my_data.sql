-- Phase 13 T3 1단계: 로그인 사용자가 자기 모든 콘텐츠(전 데이터 테이블 행)를 원자적으로 삭제한다.
-- 계정(auth.users) 자체 삭제는 service_role/Edge Function이 필요해 2단계로 이월 — 이 함수는 콘텐츠만
-- 지우고 profiles(계정 프로필)는 남겨 계정을 계속 쓸 수 있게 한다. 스토리지 첨부는 백엔드 바이트
-- 정리를 위해 클라이언트 storage API에서 별도 처리(api deleteAllMyData).
-- security definer로 RLS를 우회하되 오직 호출자(auth.uid())의 행만 지운다 — 파라미터가 없어 주입면이
-- 없고, search_path 고정으로 정의자 권한 남용(스키마 하이재킹)을 막는다.
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
  -- 자식→부모 순(대부분 on delete cascade지만 순서를 명시해 FK 의존과 무관하게 안전하게).
  delete from action_log where user_id = uid;
  delete from embeddings where user_id = uid;
  delete from page_versions where user_id = uid;
  delete from pages where user_id = uid;               -- self-ref cascade로 하위 페이지까지 정리
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

-- anon/public에는 실행 금지, 로그인 사용자에게만.
revoke all on function public.delete_all_my_data() from public;
revoke all on function public.delete_all_my_data() from anon;
grant execute on function public.delete_all_my_data() to authenticated;
