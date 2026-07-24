-- XP를 원자적으로 증가시키고 레벨/피드를 재계산하는 함수.
-- read-modify-write 대신 단일 UPDATE로 race condition 제거.
CREATE OR REPLACE FUNCTION public.award_xp(
  p_user_id uuid,
  p_xp_amount int,
  p_xp_per_level int DEFAULT 100,
  p_feed_per_xp int DEFAULT 2,
  p_feed_max int DEFAULT 100
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_xp int;
  v_new_level int;
  v_new_feed int;
  v_result json;
BEGIN
  UPDATE duck_state
  SET
    xp = xp + p_xp_amount,
    level = (xp + p_xp_amount) / p_xp_per_level,
    feed = LEAST(feed + (p_xp_amount * p_feed_per_xp), p_feed_max),
    updated_at = now()
  WHERE user_id = p_user_id
  RETURNING xp, level, feed INTO v_new_xp, v_new_level, v_new_feed;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'duck_state not found for user';
  END IF;

  RETURN json_build_object('xp', v_new_xp, 'level', v_new_level, 'feed', v_new_feed);
END;
$$;

REVOKE ALL ON FUNCTION public.award_xp(uuid, int, int, int, int) FROM public;
GRANT EXECUTE ON FUNCTION public.award_xp(uuid, int, int, int, int) TO authenticated;
