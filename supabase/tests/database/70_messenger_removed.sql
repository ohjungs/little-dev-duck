-- 2026-08-01 : 테스트 - pgTAP - 메신저 완전 제거 회귀 (734f1c7 사용자 결정 B-9)
--
-- supabase/migrations/20260731120000_drop_messenger.sql이 rooms/room_members/messages/
-- message_reactions 테이블과 전용 함수 5개·트리거 4개를 drop하고, cascade로 정책·
-- publication 등록까지 함께 제거했다고 주장한다(마이그레이션 주석 "2. 테이블 — cascade로
-- 정책·트리거·인덱스·publication 등록이 함께 사라진다"). 이 파일은 그 주장이 실제로
-- 로컬 스택에서도 참인지 pg_catalog 조회로 재확인한다 — "SQL에 그렇게 쓰여 있는지"가
-- 아니라 "그렇게 됐는지"를 검증하는 것이 이 스위트의 목적(README.md)과 같다.
--
-- 이 데이터는 삭제됐고 백업이 없다(734f1c7 커밋 메시지) — 되돌릴 수 없으므로, 여기서
-- 확인하는 것은 "제거가 완결됐는가"이지 "제거를 되돌릴 수 있는가"가 아니다.
--
-- role 전환이 필요 없다(catalog 조회는 어떤 role에서도 동일하게 보인다) — 00_helpers.sql의
-- authenticate_as* 호출도, 그로 인한 tests 스키마 USAGE grant 함정(00_helpers.sql:12-18)도
-- 여기서는 관련이 없다.
begin;
select plan(14);

-- ---------------------------------------------------------------------------
-- 1. 테이블 4개 부재
-- ---------------------------------------------------------------------------
select hasnt_table('public', 'rooms',
  'rooms 테이블은 734f1c7에서 drop되어 더 이상 존재하지 않는다');
select hasnt_table('public', 'room_members',
  'room_members 테이블은 734f1c7에서 drop되어 더 이상 존재하지 않는다');
select hasnt_table('public', 'messages',
  'messages 테이블은 734f1c7에서 drop되어 더 이상 존재하지 않는다');
select hasnt_table('public', 'message_reactions',
  'message_reactions 테이블은 734f1c7에서 drop되어 더 이상 존재하지 않는다');

-- ---------------------------------------------------------------------------
-- 2. 전용 함수 5개 부재 (남으면 죽은 코드이자 노출 표면 — 마이그레이션 주석 3번)
-- ---------------------------------------------------------------------------
select hasnt_function('public', 'guard_message_sender_immutable',
  'guard_message_sender_immutable()는 messages와 함께 drop되어 더 이상 존재하지 않는다');
select hasnt_function('public', 'guard_room_id_immutable',
  'guard_room_id_immutable()는 room_members/messages와 함께 drop되어 더 이상 존재하지 않는다');
select hasnt_function('public', 'touch_room_on_message',
  'touch_room_on_message()는 rooms/messages와 함께 drop되어 더 이상 존재하지 않는다');
select hasnt_function('public', 'is_room_member',
  'is_room_member(uuid)는 room_members와 함께 drop되어 더 이상 존재하지 않는다(재귀 방지용 SECURITY DEFINER 함수)');
select hasnt_function('public', 'can_access_room_folder',
  'can_access_room_folder(text)는 메신저 첨부 정책 전용 함수로 drop되어 더 이상 존재하지 않는다');

-- ---------------------------------------------------------------------------
-- 3. 트리거 4개 부재 — 테이블이 없으므로 hasnt_trigger(schema, table, ...)로 relation을
-- 지정할 수 없다. 이름으로 pg_catalog.pg_trigger를 직접 조회한다(tgisinternal 제외 —
-- FK 제약이 내부적으로 만드는 constraint trigger와 혼동하지 않기 위해).
-- ---------------------------------------------------------------------------
select ok(
  not exists(select 1 from pg_catalog.pg_trigger where tgname = 'messages_touch_room' and not tgisinternal),
  'messages_touch_room 트리거는 messages 테이블과 함께 사라졌다'
);
select ok(
  not exists(select 1 from pg_catalog.pg_trigger where tgname = 'messages_guard_sender' and not tgisinternal),
  'messages_guard_sender 트리거는 messages 테이블과 함께 사라졌다'
);
select ok(
  not exists(select 1 from pg_catalog.pg_trigger where tgname = 'room_members_guard_room_id' and not tgisinternal),
  'room_members_guard_room_id 트리거는 room_members 테이블과 함께 사라졌다'
);
select ok(
  not exists(select 1 from pg_catalog.pg_trigger where tgname = 'messages_guard_room_id' and not tgisinternal),
  'messages_guard_room_id 트리거는 messages 테이블과 함께 사라졌다'
);

-- ---------------------------------------------------------------------------
-- 4. supabase_realtime publication에 메신저 테이블 등록이 남아있지 않다 —
-- messages/room_members/message_reactions는 각각 20260727030000·20260727080000에서
-- ALTER PUBLICATION ... ADD TABLE로 등록됐었다(rooms 자체는 publication에 등록된 적이
-- 없다 — 저장소 전체 grep으로 확인, "add table public.rooms" 매치 0건). DROP TABLE은
-- publication 등록도 자동으로 함께 제거하므로(Postgres 표준 동작), 여기서는 그 결과만
-- 재확인한다.
-- ---------------------------------------------------------------------------
select ok(
  not exists(
    select 1 from pg_catalog.pg_publication_tables
    where pubname = 'supabase_realtime'
      and tablename in ('rooms', 'room_members', 'messages', 'message_reactions')
  ),
  'supabase_realtime publication에 메신저 테이블(rooms/room_members/messages/message_reactions) 등록이 남아있지 않다'
);

select * from finish();
rollback;
