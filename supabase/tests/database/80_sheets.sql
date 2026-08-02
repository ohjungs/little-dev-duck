-- 2026-08-02 : 테스트 - pgTAP - 시트 저장 계약 (SPEC-2026-08-02-spreadsheet-a1 T1)
--
-- 20260802100000_sheets.sql이 만든 두 테이블의 계약을 검증한다. 검사 대상은 넷이다:
--   1. RLS가 켜져 있고 남의 시트·셀이 안 보인다
--   2. user_id 비정규화의 대가 — 남의 페이지에 내 시트를 못 만든다(트리거)
--   3. cascade — 페이지를 지우면 시트와 셀이 함께 사라진다
--      (이게 delete_all_my_data를 손대지 않은 근거다. 마이그레이션 주석 참조 —
--       "어차피 되겠지"를 검사로 바꾸는 것이 이 절의 목적이다)
--   4. anon은 시트를 못 읽는다 — 페이지를 공개로 바꿔도 그렇다(현재 설계. 아래 4절 참조)
--
-- 사용자 id는 10_profiles_rls.sql과 같은 관례로 set_config에 담는다(psql 메타명령을 쓰지 않는다 —
-- pg_prove가 파일을 그대로 흘려보내므로 SQL만으로 끝나야 한다).
begin;
select plan(17);

select set_config('tests.sheet_owner', tests.create_user('sheet_owner@example.com')::text, true);
select set_config('tests.sheet_other', tests.create_user('sheet_other@example.com')::text, true);
select set_config('tests.page_id', '11111111-1111-1111-1111-111111111111', true);
select set_config('tests.sheet_id', '22222222-2222-2222-2222-222222222222', true);

-- ---------------------------------------------------------------------------
-- 준비: 소유자의 페이지 · 시트 · 셀 3개(값 2 + 수식 1)
-- ---------------------------------------------------------------------------
select tests.authenticate_as(current_setting('tests.sheet_owner')::uuid);

insert into public.pages (id, user_id, title)
values (current_setting('tests.page_id')::uuid,
        current_setting('tests.sheet_owner')::uuid, '내 시트 문서');

insert into public.sheets (id, page_id, user_id, name, position)
values (current_setting('tests.sheet_id')::uuid,
        current_setting('tests.page_id')::uuid,
        current_setting('tests.sheet_owner')::uuid, 'Sheet1', 0);

insert into public.sheet_cells (sheet_id, user_id, r, c, v, f)
values (current_setting('tests.sheet_id')::uuid, current_setting('tests.sheet_owner')::uuid, 0, 0, '10'::jsonb, null),
       (current_setting('tests.sheet_id')::uuid, current_setting('tests.sheet_owner')::uuid, 1, 0, '20'::jsonb, null),
       (current_setting('tests.sheet_id')::uuid, current_setting('tests.sheet_owner')::uuid, 2, 0, null, '=SUM(A1:A2)');

-- ---------------------------------------------------------------------------
-- 1. 구조
-- ---------------------------------------------------------------------------
select has_table('public', 'sheets', 'sheets 테이블이 있다');
select has_table('public', 'sheet_cells', 'sheet_cells 테이블이 있다');
select col_is_pk('public', 'sheet_cells', array['sheet_id', 'r', 'c'],
  'sheet_cells의 기본키는 (sheet_id, r, c)다 — 좌표 하나에 셀 하나');

-- ---------------------------------------------------------------------------
-- 2. 소유자 본인은 읽고 쓴다
-- ---------------------------------------------------------------------------
select is(
  (select count(*)::int from public.sheet_cells
    where sheet_id = current_setting('tests.sheet_id')::uuid),
  3, '소유자는 자기 셀 3개를 읽는다');

select is(
  (select f from public.sheet_cells
    where sheet_id = current_setting('tests.sheet_id')::uuid and r = 2 and c = 0),
  '=SUM(A1:A2)', '수식은 원문 그대로 저장된다(계산 결과가 아니다)');

-- 수식은 '='로 시작해야 한다 — 값과 수식이 섞이면 평가기가 무엇을 계산할지 알 수 없다.
select throws_ok(
  $$ insert into public.sheet_cells (sheet_id, user_id, r, c, f)
     values (current_setting('tests.sheet_id')::uuid,
             current_setting('tests.sheet_owner')::uuid, 5, 5, 'SUM(A1:A2)') $$,
  '23514', null::text, '= 없이 시작하는 수식은 체크 제약으로 거부된다');

select throws_ok(
  $$ insert into public.sheet_cells (sheet_id, user_id, r, c, v)
     values (current_setting('tests.sheet_id')::uuid,
             current_setting('tests.sheet_owner')::uuid, -1, 0, '1'::jsonb) $$,
  '23514', null::text, '음수 행은 체크 제약으로 거부된다');

select throws_ok(
  $$ insert into public.sheet_cells (sheet_id, user_id, r, c, v)
     values (current_setting('tests.sheet_id')::uuid,
             current_setting('tests.sheet_owner')::uuid, 0, 16384, '1'::jsonb) $$,
  '23514', null::text, '엑셀 마지막 열을 넘는 좌표는 거부된다');

-- 한 문서 안에서 시트 이름은 유일하다(수식 Sheet2!A1이 가리킬 대상이 하나여야 한다).
select throws_ok(
  $$ insert into public.sheets (page_id, user_id, name, position)
     values (current_setting('tests.page_id')::uuid,
             current_setting('tests.sheet_owner')::uuid, 'Sheet1', 1) $$,
  '23505', null::text, '같은 문서에 같은 이름의 시트를 두 번 만들 수 없다');

-- ---------------------------------------------------------------------------
-- 3. 남의 것은 안 보이고, 남의 페이지에 못 붙인다
-- ---------------------------------------------------------------------------
select tests.authenticate_as(current_setting('tests.sheet_other')::uuid);

select is((select count(*)::int from public.sheets), 0,
  '남의 시트는 보이지 않는다(RLS)');
select is((select count(*)::int from public.sheet_cells), 0,
  '남의 셀은 보이지 않는다(RLS)');

-- user_id를 비정규화한 대가 — RLS는 "내 user_id인가"만 보므로 이 경우를 혼자 막지 못한다.
-- 트리거가 페이지 소유자와 대조해 막는다. 막지 않으면 **남의 문서에 내 탭이 생긴다.**
-- 이 메시지는 우리가 raise로 직접 쓴 문구라 계약이다(20_의 P0001과 같은 판단).
select throws_ok(
  $$ insert into public.sheets (page_id, user_id, name, position)
     values (current_setting('tests.page_id')::uuid,
             current_setting('tests.sheet_other')::uuid, '침입', 0) $$,
  'P0001', '이 페이지에 시트를 만들 수 없습니다.',
  '남의 페이지에 내 소유로 시트를 만들 수 없다(트리거)');

-- ---------------------------------------------------------------------------
-- 4. 공개 공유
-- ---------------------------------------------------------------------------
select tests.authenticate_as_anon();
select is((select count(*)::int from public.sheet_cells), 0,
  '비공개 페이지의 셀은 anon에게 보이지 않는다');

select tests.authenticate_as(current_setting('tests.sheet_owner')::uuid);
update public.pages set is_public = true
  where id = current_setting('tests.page_id')::uuid;

-- **공개로 바꿔도 anon은 읽지 못한다.** 이건 결함이 아니라 현재 설계다 — 이 저장소의 공개
-- 공유는 RLS가 아니라 get_public_page() SECURITY DEFINER RPC로 한다(pages에는 공개용 select
-- 정책이 아예 없다). 처음엔 여기에 공개 정책을 넣었다가 이 검사가 죽은 정책임을 잡아냈다.
-- 시트 공개 보기는 화면이 생기는 시점에 같은 RPC 방식으로 만든다. 그때 이 두 줄이 뒤집힌다.
select tests.authenticate_as_anon();
select is((select count(*)::int from public.sheet_cells), 0,
  '공개 페이지여도 anon은 셀을 못 읽는다 — 시트 공개 보기는 아직 배선되지 않았다');
select is((select count(*)::int from public.sheets), 0,
  '공개 페이지여도 anon은 시트 목록을 못 읽는다 — RPC 경로로 후속');

-- ---------------------------------------------------------------------------
-- 5. cascade — delete_all_my_data를 손대지 않은 근거
-- ---------------------------------------------------------------------------
-- 그 함수는 pages를 지운다. sheets.page_id가 on delete cascade이므로 시트가 따라 사라지고,
-- sheet_cells.sheet_id도 cascade이므로 셀까지 사라진다. 두 단계가 실제로 도는지 확인한다.
select tests.authenticate_as(current_setting('tests.sheet_owner')::uuid);
delete from public.pages where id = current_setting('tests.page_id')::uuid;

select is(
  (select count(*)::int from public.sheets
    where id = current_setting('tests.sheet_id')::uuid),
  0, '페이지를 지우면 시트가 cascade로 사라진다');
select is(
  (select count(*)::int from public.sheet_cells
    where sheet_id = current_setting('tests.sheet_id')::uuid),
  0, '시트가 사라지면 셀도 cascade로 사라진다 — 고아 셀 0건');

select * from finish();
rollback;
