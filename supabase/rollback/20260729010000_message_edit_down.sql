-- 20260729010000_message_edit 되돌리기.
-- 컬럼을 지우면 "수정됨" 표시가 사라질 뿐 본문은 그대로다 — 데이터 손실은 수정 시각뿐.

alter table public.messages
  drop column if exists edited_at;
