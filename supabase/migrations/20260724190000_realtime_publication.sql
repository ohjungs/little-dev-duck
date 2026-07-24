-- Realtime 활성화: 변경 사항을 구독하려면 테이블이 publication에 포함되어야 함.
-- supabase_realtime은 Supabase가 기본 생성하는 publication.
ALTER PUBLICATION supabase_realtime ADD TABLE public.todos;
ALTER PUBLICATION supabase_realtime ADD TABLE public.memos;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.habits;
ALTER PUBLICATION supabase_realtime ADD TABLE public.habit_checks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.duck_state;
