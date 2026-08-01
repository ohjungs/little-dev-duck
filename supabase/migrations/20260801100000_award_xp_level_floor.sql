-- 2026-08-01 : 버그 - award_xp - 레벨0으로 체크제약 위반 (pgTAP 40_ 파일이 잡아냄)
--
-- `award_xp`는 레벨을 `level = (xp + p_xp_amount) / p_xp_per_level`로 계산했다. 정수 나눗셈이라
-- 누적 xp가 100 미만이면 **0**이 나오는데, duck_state에는 `check (level >= 1)`
-- (20260720100300)이 걸려 있다. 즉 xp가 100을 넘기 전까지는 XP 적립이 통째로
-- `duck_state_level_check` 위반으로 실패한다 — 습관 체크·뽀모도로 완료 보상이 신규 사용자에게
-- 전부 실패했다는 뜻이다. 2026-08-01 운영 DB에서 함수 정의와 제약이 모두 위 상태 그대로임을
-- 확인했다(운영 duck_state 4행, 최대 xp 26 · level 전부 1).
--
-- 여기서 고치면서 곡선 자체를 core에 맞춘다. 레벨 산식의 단일 출처는
-- packages/core/src/domain/duck-xp.ts의 `deriveLevel`/`xpForLevel`(삼각수 곡선: L레벨 도달에
-- base*(L-1)*L/2 누적 xp)인데, DB는 선형 `xp/100`이라는 **다른 산식을 따로 구현**하고 있었다.
-- 위젯이 게이지는 core의 levelProgress(xp)로, 배지는 DB의 level 컬럼으로 그리므로 두 값이
-- 갈라진다(xp 600에서 core 4 vs DB 6). 지금 최대 xp가 26이라 실사용 영향은 없다.
--
-- 부동소수 역함수(sqrt) 대신 core와 같은 정수 루프를 쓴다 — 경계값(xp=100, 300)에서 반올림으로
-- 갈리지 않게. base*L*(L+1)은 항상 짝수라 /2가 정확하다.
create or replace function public.duck_level_for_xp(
  p_xp int,
  p_xp_per_level int default 100
)
returns int
language plpgsql
immutable
set search_path = public
as $$
declare
  v_level int := 1;
begin
  -- p_xp_per_level이 0 이하면 루프 조건이 영원히 참이 된다(무한 루프). 방어적으로 막는다.
  if p_xp is null or p_xp <= 0 or p_xp_per_level is null or p_xp_per_level <= 0 then
    return 1;
  end if;

  -- core의 deriveLevel과 같은 조건: xpForLevel(level+1) <= xp인 동안 레벨을 올린다.
  while (p_xp_per_level * v_level * (v_level + 1)) / 2 <= p_xp loop
    v_level := v_level + 1;
  end loop;

  return v_level;
end;
$$;

-- 순수 산술 함수(SECURITY INVOKER)라 RLS 우회 위험은 없지만, 클라이언트에서 부를 이유도 없다.
-- Supabase가 public 스키마 함수에 anon·authenticated 실행 권한을 기본 부여하므로 명시적으로
-- 회수한다(20260726110000과 같은 이유 — 의사 롤 public만 회수하면 개별 롤 권한이 남는다).
revoke all on function public.duck_level_for_xp(int, int) from public, anon, authenticated;

-- award_xp 본문은 레벨 계산 한 줄만 바뀐다. 나머지(본인 확인 가드, 단일 UPDATE 원자성,
-- search_path 고정)는 20260726110000 그대로 유지한다.
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
  -- auth.uid()는 스키마를 붙여 부른다(search_path=public이라 붙이지 않으면 못 찾는다).
  -- 비로그인이면 auth.uid()가 null이라 이 검사에서 걸린다.
  if p_user_id is distinct from auth.uid() then
    raise exception 'award_xp: 본인 계정에만 적립할 수 있습니다';
  end if;

  update duck_state
  set
    xp = xp + p_xp_amount,
    level = public.duck_level_for_xp(xp + p_xp_amount, p_xp_per_level),
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
