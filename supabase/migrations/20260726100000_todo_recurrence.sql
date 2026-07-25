-- 2026-07-26 : 할일 - 반복규칙 - 컬럼추가
-- 반복 할 일을 RRULE 어휘 문자열로 저장한다(예: FREQ=WEEKLY;BYDAY=TU). 파싱은 core
-- recurrence.ts가 하고, 파싱 실패는 던지지 않고 "반복 없음"으로 취급하므로 DB에서 문법까지
-- 강제하지 않는다 -- CHECK로 문법을 잠그면 파서와 두 곳에서 규칙이 갈라진다.
-- 길이 상한만 둔다(todos.title의 char_length 검사와 같은 관례). 실제 규칙은 60자를 넘지 않는다.
--
-- 반복 회차를 미리 만들어 두지 않는 이유: 이 프로젝트는 무료 원칙상 서버 스케줄러가 없어서
-- 미리 생성한 미래 행을 정리해 줄 주체가 없다. 완료 시 due_date를 다음 발생일로 옮기는
-- 방식이라 행은 계속 1개다(별도 인덱스도 불필요 -- todos_user_id_idx로 충분).
ALTER TABLE public.todos
  ADD COLUMN recurrence TEXT
  CHECK (recurrence IS NULL OR char_length(recurrence) BETWEEN 1 AND 100);
