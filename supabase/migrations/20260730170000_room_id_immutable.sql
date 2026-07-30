-- 2026-07-30 : 보안 - 메신저 - room_id 불변조건 (감사 발견 S1)
--
-- `room_members_update_self`·`messages_update_sender`(20260727030000)는 **행 소유자만** 검사한다
-- (`user_id = auth.uid()` / `sender_user_id = auth.uid()`). 두 정책 다 `room_id`를 어디서도
-- 제약하지 않아, 자기 소유 행이면 room_id까지 바꿀 수 있었다:
--
--  · 멤버십 위조: 자기 room_members 행의 room_id를 남의 방 id로 PATCH하면 초대·insert 정책을
--    전혀 거치지 않고 그 방 멤버가 된다 → is_room_member()가 참이 되어 **남의 대화가 읽힌다**
--    (20260727030000 머리말이 가장 경계한 실패 모양이 다른 경로로 재현).
--  · 메시지 위조: 자기 메시지의 room_id를 바꾸면(INSERT에만 is_room_member가 걸리고 UPDATE엔
--    없다) 대화 기록이 사후에 다른 방으로 옮겨진다.
--
-- 정적 확인(2026-07-30): rooms.ts의 room_members·messages UPDATE는 전부
-- last_read_message_id·muted_until·pinned_at·body·deleted_at·edited_at만 실어 보낸다 —
-- **정상 경로는 room_id를 절대 바꾸지 않으므로 잠가도 기능 손실이 0이다.**
--
-- RLS의 USING/WITH CHECK는 갱신 전/후 행을 동시에 비교할 수 없어(각각 독립 평가) "이전 값과
-- 같아야 한다"를 정책으로 표현할 수 없다. 그래서 이 저장소의 기존 선례(`touch_room_on_message`,
-- 20260727060000)와 같이 BEFORE UPDATE 트리거로 막는다.
--
-- SECURITY DEFINER가 아니다: OLD/NEW만 비교하므로 RLS 우회가 필요 없다(최소 권한). 반환형이
-- trigger라 직접 호출이 원리적으로 불가능해 anon revoke도 불필요하다.
create or replace function public.guard_room_id_immutable()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.room_id is distinct from old.room_id then
    raise exception 'room_id는 변경할 수 없어요.';
  end if;
  return new;
end;
$$;

create trigger room_members_guard_room_id
  before update on public.room_members
  for each row execute function public.guard_room_id_immutable();

create trigger messages_guard_room_id
  before update on public.messages
  for each row execute function public.guard_room_id_immutable();
