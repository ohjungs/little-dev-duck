-- 2026-07-27 : 메신저 - 방·멤버·메시지 - 테이블추가 (Phase 50 T1)
--
-- 이 저장소의 14개 테이블은 전부 `user_id = auth.uid()` 한 줄로 접근을 판정한다.
-- **메신저는 그 패턴이 통하지 않는다.** 메시지의 주인은 보낸 사람이지만, 볼 수 있어야 하는
-- 사람은 **그 방의 멤버 전원**이다. 계획이 "이 Phase에서 가장 위험한 부분"이라고 지목한
-- 자리이고, 잘못 쓰면 **남의 대화가 보인다.**
--
-- 재귀 함정: `room_members` 정책이 "같은 방 멤버면 보인다"로 자기 자신을 조회하면
-- Postgres가 무한 재귀로 죽는다(에러 42P17). 그래서 멤버 판정을 **SECURITY DEFINER 함수**로
-- 빼서 RLS를 우회해 한 번만 확인한다. 우회는 위험하므로 아래를 지킨다:
--   - `search_path`를 고정한다(20260726110000이 세운 관례).
--   - 인자로 받은 사용자를 믿지 않는다 — 함수 안에서 `auth.uid()`를 직접 읽는다.
--   - STABLE로 선언해 정책 평가 중 재실행을 줄인다.
--
-- `auth.uid()`는 `(select auth.uid())`로 감싼다 — 20260726120000이 세운 관례.
-- 행마다 재평가되지 않고 구문당 1회로 줄어든다(판정 결과는 동일).

-- ---------------------------------------------------------------------------
-- 방
-- ---------------------------------------------------------------------------
create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  -- agent = 오리와의 대화, direct = 1:1, group = 여럿, self = 나와의 채팅.
  -- self는 MemoWidget과 겹쳐서 **기본으로 만들지 않는다**(계획 T2) — 값만 열어 둔다.
  type text not null check (type in ('agent', 'direct', 'group', 'self')),
  title text check (title is null or char_length(title) between 1 and 100),
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 방 멤버
-- ---------------------------------------------------------------------------
create table public.room_members (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id) on delete cascade,
  -- 에이전트(오리)는 auth.users에 없다. 그래서 user_id가 null일 수 있고,
  -- member_type이 무엇인지 말한다. 둘의 일관성은 CHECK로 잠근다.
  member_type text not null check (member_type in ('user', 'agent')),
  user_id uuid references auth.users (id) on delete cascade,
  last_read_message_id uuid,
  muted_until timestamptz,
  pinned_at timestamptz,
  created_at timestamptz not null default now(),
  constraint room_members_user_matches_type check (
    (member_type = 'user' and user_id is not null)
    or (member_type = 'agent' and user_id is null)
  ),
  -- 같은 사람이 같은 방에 두 번 들어가지 않는다.
  constraint room_members_unique_user unique (room_id, user_id)
);

create index room_members_room_id_idx on public.room_members (room_id);
create index room_members_user_id_idx on public.room_members (user_id);

-- ---------------------------------------------------------------------------
-- 메시지
-- ---------------------------------------------------------------------------
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id) on delete cascade,
  -- 보낸 주체. 오리가 보낸 메시지는 sender_user_id가 null이다.
  sender_user_id uuid references auth.users (id) on delete set null,
  sender_type text not null check (sender_type in ('user', 'agent')),
  type text not null default 'text' check (type in ('text', 'system')),
  body text not null check (char_length(body) between 1 and 4000),
  -- 낙관적 UI + 재시도가 있으면 중복 전송은 **반드시** 생긴다.
  -- 화면에서 막는 건 최선을 다하는 것이고, 여기 유니크 제약이 마지막 방어선이다.
  client_msg_id text not null check (char_length(client_msg_id) between 1 and 64),
  -- **순서를 서버가 정한다.** 이 저장소는 시간대·날짜 문제로 여러 번 데였고(eslint 규칙까지
  -- 만들었다), 클라이언트 시계는 사용자가 바꿀 수도 있다. 정렬 기준을 클라이언트에 맡기면
  -- 대화 순서가 사람마다 달라진다.
  seq bigint not null generated always as identity,
  -- 소프트 삭제. 하드 삭제는 정리 잡에서만 — 지운 메시지의 자리를 남겨야 대화가 어긋나지 않는다.
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  constraint messages_client_msg_id_unique unique (room_id, client_msg_id)
);

-- 방을 열면 "그 방의 최신 메시지"를 읽는다. seq 역순 조회가 기본 경로다.
create index messages_room_seq_idx on public.messages (room_id, seq desc);

-- ---------------------------------------------------------------------------
-- 멤버 판정 함수 — RLS 재귀를 끊는 유일한 지점
-- ---------------------------------------------------------------------------
-- 인자로 사용자를 받지 않는다. **받으면 호출자가 남의 id를 넣어 볼 수 있다**(20260726110000이
-- 고친 award_xp가 정확히 그 문제였다). 여기서는 auth.uid()를 함수 안에서 직접 읽는다.
create or replace function public.is_room_member(p_room_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.room_members m
    where m.room_id = p_room_id
      and m.user_id = auth.uid()
  );
$$;

revoke all on function public.is_room_member(uuid) from public;
grant execute on function public.is_room_member(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.rooms enable row level security;
alter table public.room_members enable row level security;
alter table public.messages enable row level security;

-- 방: 멤버만 본다. 만들 때는 본인이 created_by여야 한다.
create policy "rooms_select_member" on public.rooms
  for select using (public.is_room_member(id));

create policy "rooms_insert_own" on public.rooms
  for insert with check (created_by = (select auth.uid()));

-- 방 제목 변경·삭제는 만든 사람만. 멤버 전원이 지울 수 있으면 남의 대화가 사라진다.
create policy "rooms_update_creator" on public.rooms
  for update using (created_by = (select auth.uid()))
  with check (created_by = (select auth.uid()));

create policy "rooms_delete_creator" on public.rooms
  for delete using (created_by = (select auth.uid()));

-- 멤버 목록: 같은 방 멤버끼리는 서로 보인다(누구와 대화 중인지 알아야 한다).
create policy "room_members_select_member" on public.room_members
  for select using (public.is_room_member(room_id));

-- 자기 자신만 넣는다. 남을 임의로 방에 넣는 초대는 별도 설계가 필요해 지금은 막는다
-- (에이전트 멤버는 방을 만든 사람이 같은 트랜잭션에서 넣으므로 아래 갈래가 받는다).
create policy "room_members_insert_self" on public.room_members
  for insert with check (
    (member_type = 'user' and user_id = (select auth.uid()))
    or (
      member_type = 'agent'
      and exists (
        select 1 from public.rooms r
        where r.id = room_id and r.created_by = (select auth.uid())
      )
    )
  );

-- 읽음 위치·알림 끄기·고정은 **자기 행만** 고친다. 남의 읽음 위치를 바꿀 수 있으면 안 된다.
create policy "room_members_update_self" on public.room_members
  for update using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "room_members_delete_self" on public.room_members
  for delete using (user_id = (select auth.uid()));

-- 메시지: 방 멤버면 읽는다. 이 한 줄이 "남의 대화가 보이는지"를 결정한다.
create policy "messages_select_member" on public.messages
  for select using (public.is_room_member(room_id));

-- 보내기: 그 방의 멤버여야 하고, 사용자 메시지는 보낸 사람이 본인이어야 한다.
-- 에이전트 메시지는 서버(API Route)가 넣으므로 sender_user_id가 null이다.
create policy "messages_insert_member" on public.messages
  for insert with check (
    public.is_room_member(room_id)
    and (
      (sender_type = 'user' and sender_user_id = (select auth.uid()))
      or (sender_type = 'agent' and sender_user_id is null)
    )
  );

-- 수정·삭제는 보낸 사람만. 소프트 삭제도 update로 처리된다.
create policy "messages_update_sender" on public.messages
  for update using (sender_user_id = (select auth.uid()))
  with check (sender_user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- 실시간
-- ---------------------------------------------------------------------------
-- 20260724190000이 만든 publication에 얹는다. **새 실시간 배관을 만들지 않는다** —
-- lib/realtime.ts의 subscribeTable을 위젯 5개가 이미 쓰고 있고, 테이블만 얹으면 따라온다.
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.room_members;

-- `revoke ... from public`(의사 롤)만으로는 **anon에 직접 부여된 권한이 남는다.**
-- award_xp가 정확히 그 함정에 빠져 로그인 없이 남의 XP를 바꿀 수 있었다(Phase 24).
-- schemaGuard가 "anon을 이름으로 지목해 회수했는가"를 검사한다 — 그 검사가 옳다.
revoke all on function public.is_room_member(uuid) from anon;

-- ---------------------------------------------------------------------------
-- 계정 데이터 파기에 새 테이블을 넣는다
-- ---------------------------------------------------------------------------
-- schemaGuard의 `purgeMissing`이 "user_id를 가졌는데 파기로 사라지지 않는 테이블"을 검사한다.
-- 여기 넣지 않으면 **계정 데이터를 지워도 대화가 남는다.**
-- 방을 지우면 cascade로 그 방의 멤버·메시지가 함께 사라진다. 남이 만든 방에서는 내 멤버십만
-- 빠지고 방 자체는 남는다 — 내가 나갔다고 남의 대화까지 지우면 안 된다.
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
  -- 자식→부모 순(대부분 on delete cascade지만 순서를 명시해 FK 의존과 무관하게 안전하게).
  --
  -- 2026-07-27 주의: 이 목록은 **가장 최근 정의(20260724140000_news.sql)를 그대로 이어받은 것**이다.
  -- 처음엔 20260724130000의 옛 목록을 복사했다가 articles·feeds 두 줄을 잃었고,
  -- schemaGuard의 purgeMissing 검사가 그걸 잡아냈다. **함수를 통째로 replace할 때는
  -- 최신 정의를 봐야 한다** — 이 함수는 여러 마이그레이션에 걸쳐 자라 왔다.
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
  delete from messages where sender_user_id = uid;
  delete from room_members where user_id = uid;
  delete from rooms where created_by = uid;
end;
$$;

revoke all on function public.delete_all_my_data() from public;
revoke all on function public.delete_all_my_data() from anon;
grant execute on function public.delete_all_my_data() to authenticated;
