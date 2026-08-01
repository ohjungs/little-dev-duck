-- message-attachments 버킷 "빈 껍데기" 회귀 테스트 (20260731120000이 정책 4개를 전부 drop한 뒤
-- 버킷 자체는 SQL로 못 지운다는 진술 검증 + 정책 0건 상태에서 아무도 접근 못 하는지 확인)
begin;
select plan(3);

-- 1. 버킷 자체는 여전히 존재한다(storage.protect_delete 트리거가 SQL drop을 막는다는
-- 커밋 메시지 진술 확인 — 정책만 사라졌지 버킷 행은 그대로다)
select ok(
  exists(select 1 from storage.buckets where id = 'message-attachments'),
  'message-attachments 버킷은 정책이 사라진 뒤에도 여전히 존재한다'
);

select set_config('tests.bucket_user', tests.create_user('bucket_user@example.com')::text, true);

-- 회귀 가드용 가짜 오브젝트를 슈퍼유저 권한으로 심는다(실제 파일 바이트는 없다 — RLS는
-- storage.objects 테이블 행 기준으로 판정되므로 DB 레벨 테스트에는 이걸로 충분하다. 오브젝트가
-- 0건이면 "0행"이 RLS 거부 때문인지 그냥 데이터가 없어서인지 구분이 안 되므로 미리 심어 둔다).
insert into storage.objects (bucket_id, name, owner)
  values ('message-attachments', 'deadroom/leftover.png', current_setting('tests.bucket_user')::uuid);

select tests.authenticate_as(current_setting('tests.bucket_user')::uuid);

-- 2. authenticated 사용자는 정책이 하나도 없어 기존 오브젝트조차 select로 못 본다(0행)
select is(
  (select count(*)::int from storage.objects where bucket_id = 'message-attachments'),
  0,
  'authenticated 사용자는 message-attachments의 어떤 오브젝트도 볼 수 없다(정책 0건)'
);

-- 3. insert도 거부된다(정책이 없으므로 RLS 기본값은 거부)
select throws_ok(
  $$ insert into storage.objects (bucket_id, name, owner)
     values ('message-attachments', 'deadroom/new.png', current_setting('tests.bucket_user')::uuid) $$,
  '42501',
  -- 3인자 throws_ok는 (sql, errcode, errmsg)다. RLS 거부 메시지('new row violates row-level
  -- security policy for table "objects"')는 Postgres 문자열이라 계약이 아니므로 검사하지 않고,
  -- "42501로 막힌다"까지만 계약으로 본다.
  null::text,
  'authenticated 사용자는 message-attachments에 insert할 수 없다(정책 0건)'
);

select * from finish();
rollback;
