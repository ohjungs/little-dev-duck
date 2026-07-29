-- 2026-07-29 : 메신저 - 메시지 수정 (Phase 51 T4 잔여 I-010·I-011)
--
-- 수정 시각. null이면 수정된 적 없다. 본문만 바꾸고 흔적을 안 남기면
-- **읽은 사람이 본 것과 다른 말이 소리 없이 남는다** — "수정됨" 표시의 근거 컬럼이다.
-- 수정 이력 전체(버전) 보관은 하지 않는다: 개인 워크스페이스 메신저에서 이력 테이블은
-- 저장 공간(무료 500MB)을 상시 소모하는 과잉이다. 필요해지면 그때 별도 테이블로.

alter table public.messages
  add column edited_at timestamptz;

comment on column public.messages.edited_at is
  '마지막 수정 시각. null = 수정된 적 없음. 화면은 이 값으로 "수정됨"을 표시한다.';
