-- delete_all_my_data() 회귀 테스트 (20260724130000, 20260731120000이 메신저 4줄을 뺀 뒤에도
-- 정상 동작하는지 — 이걸 빠뜨리면 계정 삭제가 통째로 실패했다, 734f1c7 커밋 메시지)
begin;
select plan(2);

select set_config('tests.user_id', tests.create_user('delete_all_user@example.com')::text, true);

select tests.authenticate_as(current_setting('tests.user_id')::uuid);

insert into public.todos (user_id, title)
  values (current_setting('tests.user_id')::uuid, '테스트 할 일');
insert into public.memos (user_id, title, content)
  values (current_setting('tests.user_id')::uuid, '테스트 메모', '내용');
insert into public.duck_state (user_id)
  values (current_setting('tests.user_id')::uuid);

-- 1. 메신저 테이블 제거 후에도 에러 없이 끝난다(734f1c7의 직접 회귀 테스트)
select lives_ok(
  $$ select public.delete_all_my_data() $$,
  '메신저 테이블 제거 후에도 delete_all_my_data가 에러 없이 끝난다'
);

-- 2. 도메인 데이터는 전부 삭제되고, profiles(계정) 행은 남아 있다(콘텐츠만 파기, 계정 유지 설계)
select ok(
  (select count(*) from public.todos where user_id = current_setting('tests.user_id')::uuid) = 0
  and (select count(*) from public.memos where user_id = current_setting('tests.user_id')::uuid) = 0
  and (select count(*) from public.duck_state where user_id = current_setting('tests.user_id')::uuid) = 0
  and (select count(*) from public.profiles where id = current_setting('tests.user_id')::uuid) = 1,
  '도메인 데이터는 모두 삭제되고 profiles 행(계정)은 남아 있다'
);

select * from finish();
rollback;
