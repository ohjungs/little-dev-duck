-- 20260730150000_fix_rooms_select_own 롤백. 되돌리면 **방 생성이 다시 항상 실패한다**
-- (메신저 기능 전체가 다시 막힌다) — 되돌릴 이유가 있을 때만 쓴다.
drop policy if exists "rooms_select_member" on public.rooms;
create policy "rooms_select_member" on public.rooms
  for select using (public.is_room_member(id));
