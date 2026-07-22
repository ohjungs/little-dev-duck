-- 롤백: page_versions 테이블 제거(정책·인덱스는 테이블과 함께 삭제).
drop table if exists public.page_versions;
