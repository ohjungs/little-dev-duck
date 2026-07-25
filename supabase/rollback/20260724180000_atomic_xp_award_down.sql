-- XP 원자 증가 함수 롤백. 함수만 제거하며 duck_state의 xp/level/feed 값은 건드리지 않는다.
-- 되돌린 뒤에는 호출부가 read-modify-write로 돌아가므로 동시 적립 시 경합이 다시 생긴다.
drop function if exists public.award_xp(uuid, int, int, int, int);
