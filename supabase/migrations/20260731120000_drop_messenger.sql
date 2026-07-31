-- 2026-07-31 : 메신저 - 전면 제거 (사용자 결정 B-9)
--
-- 사용자 결정: "메신저 확장은 굳이 필요 없고, 오리랑 대화하는 건 대시보드에서 할 거라
-- 기존에 구현한 건 없애도 된다" → 범위를 물었을 때 **"DB까지 전부 삭제"**를 골랐고,
-- 이후 "메신저 db 상관없으니까 지워", "실행해도 상관없어", "데이터 백업 필요없어"로
-- 세 번 재확인했다.
--
-- **되돌릴 수 없다.** 삭제 직전 실측: 방 2 · 멤버 4 · 메시지 12 · 첨부 0건.
-- 이 데이터는 사라진다. 사용자가 백업을 명시적으로 거절했다.
--
-- 기능 손실 확인: 오리와의 멀티턴 대화는 **대시보드 패널이 이미 갖고 있다**
-- (`packages/ai`의 useDuckChat이 history를 함께 보낸다 — 코드로 확인). 메신저 오리 방에만
-- 있던 기능은 없다. 그래서 이 제거로 오리 대화 기능이 후퇴하지 않는다.
--
-- 순서가 중요하다: 자식 → 부모(FK), 그리고 함수는 그 함수를 쓰는 정책·트리거가 사라진 뒤에.

-- ---------------------------------------------------------------------------
-- 1. 스토리지 — 정책만 걷어낸다
-- ---------------------------------------------------------------------------
-- **버킷 자체는 SQL로 못 지운다**(실측): Supabase의 `storage.protect_delete()` 트리거가
-- `storage.buckets`·`storage.objects` 직접 삭제를 거부한다 — "Use the Storage API instead".
-- 정책을 전부 없애면 `authenticated`에게 select·insert·delete 경로가 하나도 남지 않아
-- 빈 껍데기가 된다(삭제 시점 객체 0건 확인). 껍데기까지 지우려면 대시보드
-- Storage → message-attachments → Delete bucket, 또는 service_role로 Storage API를 부른다.
drop policy if exists "message-attachments member select" on storage.objects;
drop policy if exists "message-attachments member insert" on storage.objects;
drop policy if exists "message-attachments owner delete" on storage.objects;
drop policy if exists "message-attachments member delete" on storage.objects;

-- ---------------------------------------------------------------------------
-- 2. 테이블 — cascade로 정책·트리거·인덱스·publication 등록이 함께 사라진다
-- ---------------------------------------------------------------------------
drop table if exists public.message_reactions cascade;
drop table if exists public.messages cascade;
drop table if exists public.room_members cascade;
drop table if exists public.rooms cascade;

-- ---------------------------------------------------------------------------
-- 3. 함수 — 위 테이블 전용이라 남으면 죽은 코드이자 노출 표면이다
-- ---------------------------------------------------------------------------
drop function if exists public.guard_message_sender_immutable();
drop function if exists public.guard_room_id_immutable();
drop function if exists public.touch_room_on_message();
drop function if exists public.is_room_member(uuid);
drop function if exists public.can_access_room_folder(text);

-- ---------------------------------------------------------------------------
-- 4. 전체 데이터 파기 함수에서 메신저 4줄을 뺀다
-- ---------------------------------------------------------------------------
-- **이걸 빠뜨리면 계정 삭제가 통째로 실패한다** — 없는 테이블을 지우려 하기 때문이다.
-- 나머지 줄은 원본 그대로다(순서 포함).
create or replace function public.delete_all_my_data()
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;
  delete from articles where user_id = uid;
  delete from feeds where user_id = uid;
  delete from action_log where user_id = uid;
  delete from embeddings where user_id = uid;
  delete from page_versions where user_id = uid;
  delete from pages where user_id = uid;
  delete from habit_checks where user_id = uid;
  delete from habits where user_id = uid;
  delete from pomodoro_sessions where user_id = uid;
  delete from calendar_events where user_id = uid;
  delete from activity_daily where user_id = uid;
  delete from duck_state where user_id = uid;
  delete from memos where user_id = uid;
  delete from todos where user_id = uid;
  delete from user_google_tokens where user_id = uid;
  delete from user_github_tokens where user_id = uid;
  delete from user_gmail_tokens where user_id = uid;
end;
$$;
