-- Phase 24 롤백. 되돌리면 **award_xp가 다시 인자로 받은 user_id를 검증 없이 신뢰한다**
-- (비로그인 호출자도 임의 사용자의 XP를 바꿀 수 있는 상태로 돌아간다). 되돌릴 이유가
-- 있을 때만 쓰고, 되돌린 상태를 오래 두지 않는다.
create or replace function public.award_xp(
  p_user_id uuid,
  p_xp_amount int,
  p_xp_per_level int default 100,
  p_feed_per_xp int default 2,
  p_feed_max int default 100
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_xp int;
  v_new_level int;
  v_new_feed int;
begin
  update duck_state
  set
    xp = xp + p_xp_amount,
    level = (xp + p_xp_amount) / p_xp_per_level,
    feed = least(feed + (p_xp_amount * p_feed_per_xp), p_feed_max),
    updated_at = now()
  where user_id = p_user_id
  returning xp, level, feed into v_new_xp, v_new_level, v_new_feed;

  if not found then
    raise exception 'duck_state not found for user';
  end if;

  return json_build_object('xp', v_new_xp, 'level', v_new_level, 'feed', v_new_feed);
end;
$$;

-- 회수했던 권한 복원(Supabase 기본 부여 상태로).
grant execute on function public.award_xp(uuid, int, int, int, int) to anon, authenticated;
grant execute on function public.handle_new_user() to anon, authenticated;
grant execute on function public.cleanup_page_embeddings() to anon, authenticated;

-- search_path 설정 해제.
alter function public.match_embeddings(vector, int) reset search_path;
