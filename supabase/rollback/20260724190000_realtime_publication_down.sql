-- Realtime publication 롤백. 테이블을 publication에서 빼면 변경 구독이 끊기고 화면 간
-- 실시간 동기화가 멈춘다(데이터는 그대로, 새로고침하면 보인다).
-- publication 자체는 Supabase가 기본 생성한 것이라 지우지 않는다.
alter publication supabase_realtime drop table public.todos;
alter publication supabase_realtime drop table public.memos;
alter publication supabase_realtime drop table public.pages;
alter publication supabase_realtime drop table public.habits;
alter publication supabase_realtime drop table public.habit_checks;
alter publication supabase_realtime drop table public.duck_state;
