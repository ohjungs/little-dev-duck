-- 2026-07-30 : 메신저 - 방 생성이 매번 실패하던 RLS 버그 수정 (mv #98)
--
-- 실측(프로덕션 DB, 롤백 트랜잭션으로 재현): ensureAgentRoom의 첫 INSERT —
--   insert into rooms (type, created_by) values (...) .select().single()
-- 가 매번 "new row violates row-level security policy for table rooms"로 실패했다.
-- 서비스 오픈(Phase 50, 2026-07-27) 이후 지금까지 **어떤 계정도 방을 만든 적이 없다**
-- (전 계정 rooms 0건으로 직접 확인).
--
-- 원인: Postgres는 INSERT ... RETURNING의 반환 행에 그 테이블의 SELECT 정책을 다시 적용한다.
-- 기존 rooms_select_member 정책은 `is_room_member(id)`만 본다 — 그런데 방금 만든 방은
-- **아직 room_members에 아무도 없다**(멤버 INSERT는 그 다음 별도 문장). 그래서 방금 만든
-- 본인 행조차 SELECT 정책을 통과 못 해 RETURNING이 막히고, INSERT 전체가 실패로 보인다.
-- room_members_insert_self 정책의 agent 분기(`exists(select 1 from rooms where ...)`)도
-- 같은 이유로 막힌다 — rooms를 참조하는 순간 rooms의 SELECT 정책이 다시 걸린다.
--
-- 고침: "만든 사람은 자기 방을 항상 본다"를 SELECT 정책에 추가한다. 멤버가 아직 없어도
-- created_by 본인은 통과하므로, 방 생성 직후의 RETURNING과 후속 멤버 INSERT의 EXISTS 확인이
-- 모두 정상 통과한다. is_room_member 조건은 그대로 유지 — 다른 멤버(오리 외 향후 참여자)는
-- 기존 방식대로 멤버십으로 판정한다.

drop policy if exists "rooms_select_member" on public.rooms;
create policy "rooms_select_member" on public.rooms
  for select using (
    created_by = (select auth.uid())
    or public.is_room_member(id)
  );
