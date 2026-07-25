-- 페이지 커버 컬럼 롤백. 설정된 커버 이미지 URL은 소실되고 페이지 본문은 보존된다.
-- Storage에 올라간 실제 이미지 파일은 지우지 않는다(다른 곳에서 참조 중일 수 있다).
alter table public.pages
  drop column if exists cover_url;
