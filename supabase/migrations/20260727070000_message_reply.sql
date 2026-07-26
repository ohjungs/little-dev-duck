-- 2026-07-27 : 메신저 - 답장 (Phase 51)
--
-- 답장 대상은 **같은 방의 메시지**여야 하지만, 그걸 DB 제약으로 강제하려면 트리거가 필요하다.
-- 여기서는 FK만 걸고 **방이 같은지는 화면·API가 본다** — 남의 방 메시지 id를 넣어도
-- 조회 자체가 RLS에 막혀 미리보기가 비게 되므로, 새는 정보는 없다.
--
-- `on delete set null`: 원본을 하드 삭제해도 답장이 함께 사라지면 안 된다.
-- (평소 삭제는 소프트 삭제라 원본 행은 남고, 화면이 "삭제된 메시지입니다"로 보여 준다.)
alter table public.messages
  add column reply_to_id uuid references public.messages (id) on delete set null;

-- 원본 하나에 달린 답장을 찾는 조회는 아직 없다. 인덱스는 그 조회가 생길 때 넣는다
-- (쓰지 않는 인덱스는 쓰기를 느리게 만들 뿐이다).
