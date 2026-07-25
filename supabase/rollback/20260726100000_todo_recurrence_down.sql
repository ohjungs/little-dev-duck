-- Phase 20 T2 롤백. 반복 규칙 컬럼 제거(설정된 반복 주기는 소실, 할 일 자체는 보존).
-- CHECK 제약은 컬럼에 딸려 있어 같이 사라진다.
alter table public.todos
  drop column if exists recurrence;
