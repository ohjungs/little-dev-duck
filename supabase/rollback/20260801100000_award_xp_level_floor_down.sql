-- 20260801100000_award_xp_level_floor.sql 되돌리기.
--
-- award_xp를 20260726110000 시점 정의(선형 `xp / p_xp_per_level`)로 되돌리고 헬퍼 함수를 내린다.
-- **되돌리면 원래 버그가 그대로 돌아온다** — 누적 xp가 100 미만인 사용자의 XP 적립이
-- duck_state_level_check 위반으로 실패한다. 레벨 곡선 결정을 뒤집을 때만 쓰고, 그때는 곡선을
-- 다시 정하는 마이그레이션을 뒤에 붙이는 편이 낫다.
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
  if p_user_id is distinct from auth.uid() then
    raise exception 'award_xp: 본인 계정에만 적립할 수 있습니다';
  end if;

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

revoke all on function public.award_xp(uuid, int, int, int, int) from public, anon;
grant execute on function public.award_xp(uuid, int, int, int, int) to authenticated;

drop function if exists public.duck_level_for_xp(int, int);
