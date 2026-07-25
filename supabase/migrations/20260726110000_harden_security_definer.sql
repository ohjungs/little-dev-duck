-- 2026-07-26 : 보안 - SECURITY DEFINER - 권한강화
-- Supabase 어드바이저(2026-07-26 실행) 지적 대응. 상세 판단 근거는 docs/plans/phase_24.md.

-- ---------------------------------------------------------------------------
-- T1. award_xp — 인자로 받은 user_id를 그대로 믿던 문제
--
-- SECURITY DEFINER라 RLS를 우회하는데, 본문이 p_user_id를 검증 없이 썼다. 게다가 실제
-- 권한이 anon까지 열려 있어 **로그인하지 않아도** 임의 사용자의 XP를 바꿀 수 있었다.
-- 시그니처는 그대로 둔다 — applyXpAward가 이미 p_user_id를 넘기고 있어 인자를 빼면 앱이 깨진다.
-- 대신 호출자 본인인지 확인하고, 아니면 조용히 무시하지 않고 예외를 던진다.
-- ---------------------------------------------------------------------------
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
BEGIN
  -- auth.uid()는 스키마를 붙여 부른다(search_path=public이라 붙이지 않으면 못 찾는다).
  -- 비로그인이면 auth.uid()가 null이라 이 검사에서 걸린다.
  IF p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'award_xp: 본인 계정에만 적립할 수 있습니다';
  END IF;

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

-- Supabase는 public 스키마 함수에 anon·authenticated 개별 권한을 기본 부여한다.
-- `REVOKE ALL FROM public`(의사 롤)만으로는 anon에게 직접 부여된 권한이 남는다 —
-- 원 마이그레이션이 막았다고 의도했지만 실제로는 안 막힌 이유가 이것이다. 롤을 명시해 회수한다.
REVOKE ALL ON FUNCTION public.award_xp(uuid, int, int, int, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.award_xp(uuid, int, int, int, int) TO authenticated;

-- ---------------------------------------------------------------------------
-- T2. 트리거 함수가 REST API로 노출된 것 정리
--
-- 둘 다 트리거 전용이라 RPC로 직접 부르면 Postgres가 거부한다(트리거 문맥 밖에서 old/new를
-- 못 쓴다) — 실제 악용 경로는 확인되지 않았다. 그래도 노출할 이유가 없다.
-- 트리거 자체는 테이블 소유자 권한으로 실행되므로 이 회수는 동작에 영향을 주지 않는다.
-- ---------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.cleanup_page_embeddings() FROM PUBLIC, anon, authenticated;

-- match_embeddings는 SECURITY INVOKER(정의자 권한 아님)라 호출자 권한으로 돌고 embeddings의
-- RLS가 그대로 적용된다 — 위험도는 낮고 강화 차원이다. 본문은 건드리지 않고 설정만 붙인다.
ALTER FUNCTION public.match_embeddings(vector, int) SET search_path = public;
