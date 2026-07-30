-- 2026-07-30 : 보안 - 메신저 - sender_type·sender_user_id 불변조건 (Status backlog)
--
-- `messages_insert_member`(20260727030000)는 보낸이 불변조건을 **INSERT에서만** 지킨다:
--
--     (sender_type = 'user'  and sender_user_id = auth.uid())
--  or (sender_type = 'agent' and sender_user_id is null)
--
-- 그런데 `messages_update_sender`는 `sender_user_id = auth.uid()`만 보고 **sender_type을 어디서도
-- 제약하지 않는다.** 그래서 자기 메시지를 UPDATE로 `sender_type = 'agent'`로 바꿀 수 있었다.
--
-- **실제 결과는 "오리 사칭"이 아니라 "방이 열리지 않음"이다** — 백로그 항목명이 사칭이라고
-- 적었지만 그렇게는 안 된다. 이유:
--  · UPDATE의 WITH CHECK가 `sender_user_id = auth.uid()`를 요구하므로 NULL로 바꿀 수 없다
--    (NULL = auth.uid()는 true가 아니다). 즉 **정상 모양의 agent 행을 만들 수 없다.**
--  · 그래서 남는 것은 `sender_type='agent'` + `sender_user_id=<본인>`이라는 **모순된 행**이고,
--    core `messageSchema`의 refine(agent면 senderUserId가 null이어야 한다)이 읽을 때 던진다.
--    `messageFromRow`가 그 스키마로 파싱하므로 **메시지 목록 적재가 통째로 실패한다.**
--
-- 즉 성질은 사칭이 아니라 **데이터 무결성 위반 + 가용성**이다. 그리고 `rooms.type`에
-- 'direct'·'group'이 있어 사람이 여럿인 방이 설계상 가능하므로, 한 멤버가 자기 행 하나를
-- 망가뜨려 **다른 멤버까지 그 방을 못 열게** 만들 수 있다. 지금 존재하는 방이 'agent'뿐이라
-- 해도 정책의 구멍은 그대로다.
--
-- 정적 확인(2026-07-30): rooms.ts의 messages UPDATE는 `deleted_at` · `body`+`edited_at`
-- 두 곳뿐이다. **정상 경로는 보낸이 컬럼을 절대 바꾸지 않으므로 잠가도 기능 손실이 0이다.**
--
-- RLS의 USING/WITH CHECK는 갱신 전/후를 동시에 비교할 수 없어 "이전 값과 같아야 한다"를
-- 정책으로 표현할 수 없다. 그래서 room_id와 같은 선례(20260730170000)대로 BEFORE UPDATE
-- 트리거로 막는다. 별 함수로 두는 이유: `guard_room_id_immutable`은 room_members에도 걸려
-- 있고 그 테이블엔 sender_* 컬럼이 없다.
--
-- SECURITY DEFINER가 아니다: OLD/NEW만 비교하므로 RLS 우회가 필요 없다(최소 권한). 반환형이
-- trigger라 직접 호출이 원리적으로 불가능해 anon revoke도 불필요하다 —
-- 이 사실은 2026-07-30에 실서버에서 확인했다("trigger functions can only be called as triggers").
create or replace function public.guard_message_sender_immutable()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.sender_type is distinct from old.sender_type then
    raise exception 'sender_type은 변경할 수 없어요.';
  end if;
  -- 보낸이도 함께 잠근다. 지금은 WITH CHECK가 auth.uid()로 묶어 두지만, 그 정책이 바뀌면
  -- 짝이 되는 이 불변조건이 조용히 열린다 — 한 줄로 그 의존을 없앤다.
  if new.sender_user_id is distinct from old.sender_user_id then
    raise exception 'sender_user_id는 변경할 수 없어요.';
  end if;
  return new;
end;
$$;

create trigger messages_guard_sender
  before update on public.messages
  for each row execute function public.guard_message_sender_immutable();
