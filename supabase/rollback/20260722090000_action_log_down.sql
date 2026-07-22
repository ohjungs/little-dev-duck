-- 롤백: action_log 테이블 제거(정책은 테이블과 함께 자동 삭제).
drop table if exists public.action_log;
