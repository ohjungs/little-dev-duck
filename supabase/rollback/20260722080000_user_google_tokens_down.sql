-- 롤백: user_google_tokens 테이블 제거(정책은 테이블과 함께 자동 삭제).
drop table if exists public.user_google_tokens;
