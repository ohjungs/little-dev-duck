-- 2026-07-27 : 메신저 - 메시지 반응 (Phase 51)
--
-- 한 사람이 같은 메시지에 같은 이모지를 두 번 달 수 없다(유니크). **다시 누르면 해제**가
-- 자연스러운 동작이라, 중복을 막지 않으면 누를 때마다 숫자만 늘어난다.
--
-- 이모지 길이 상한 8: 사람 이모지 하나가 여러 코드 포인트로 이뤄질 수 있다(피부색·성별 조합).
-- 1로 잡으면 그런 이모지가 통째로 막힌다.
create table public.message_reactions (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  emoji text not null check (char_length(emoji) between 1 and 8),
  created_at timestamptz not null default now(),
  constraint message_reactions_once unique (message_id, user_id, emoji)
);

create index message_reactions_message_id_idx on public.message_reactions (message_id);

alter table public.message_reactions enable row level security;

-- 읽기: **그 메시지가 있는 방의 멤버만.** 메시지를 볼 수 없는 사람이 반응을 세는 것만으로도
-- 대화가 있었다는 사실이 샌다.
create policy "message_reactions_select_member" on public.message_reactions
  for select using (
    exists (
      select 1 from public.messages m
      where m.id = message_id and public.is_room_member(m.room_id)
    )
  );

-- 달기: 그 방 멤버여야 하고, **자기 이름으로만** 단다.
create policy "message_reactions_insert_self" on public.message_reactions
  for insert with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.messages m
      where m.id = message_id and public.is_room_member(m.room_id)
    )
  );

-- 떼기: 자기 것만. 남의 반응을 지울 수 있으면 안 된다.
create policy "message_reactions_delete_self" on public.message_reactions
  for delete using (user_id = (select auth.uid()));

alter publication supabase_realtime add table public.message_reactions;

-- ---------------------------------------------------------------------------
-- 계정 데이터 파기에 새 테이블을 넣는다
-- ---------------------------------------------------------------------------
-- **이 본문은 가장 최근 정의를 스크립트로 뽑아 이어받았다**(교훈 L-18: 첫 정의를 복사했다가
-- articles·feeds 두 줄을 잃은 적이 있다). 손으로 옮겨 적지 않았다.
create or replace function public.delete_all_my_data()
returns void
language plpgsql
security definer
set search_path = public
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
  delete from pages where user_id = uid;               -- self-ref cascade로 하위 페이지까지 정리
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
  -- 2026-07-27 (Phase 50 T1): 메신저.
  -- 2026-07-27 (Phase 51): 반응. 메시지보다 먼저 지운다(자식→부모).
  delete from message_reactions where user_id = uid;
  delete from messages where sender_user_id = uid;
  delete from room_members where user_id = uid;
  delete from rooms where created_by = uid;
end;
$$;

revoke all on function public.delete_all_my_data() from public;
revoke all on function public.delete_all_my_data() from anon;
grant execute on function public.delete_all_my_data() to authenticated;
