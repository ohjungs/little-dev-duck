-- 2026-07-30 : 보안 - profiles - role/disabled_features 권한상승 차단 (감사 발견 S1)
--
-- `profiles_update_own`(20260720100000)은 `using (id = auth.uid()) with check (id = auth.uid())`로
-- **행 단위만** 본다. RLS 정책은 컬럼 단위 제한을 표현할 수 없어, 로그인한 사용자가
-- `PATCH /rest/v1/profiles?id=eq.<자기id>`로 앱 UI를 거치지 않고 `{"role":"admin"}` 또는
-- `{"disabled_features":[]}`를 직접 보내면 그대로 통과한다 — 스스로 관리자가 되거나 자신에게
-- 걸린 기능 제한을 해제할 수 있었다(`updateMyProfile`이 그 키를 안 보내는 건 앱 계층 방어일
-- 뿐이고, 권한의 단일 출처는 RLS여야 한다는 access.ts의 설계 의도가 실제로는 안 지켜졌다).
--
-- RLS의 USING/WITH CHECK는 OLD/NEW를 동시에 비교할 수 없어(행 단위) "이 두 컬럼만은 관리자만
-- 바꿀 수 있다"를 정책으로 표현할 수 없다. 이 저장소는 이미 같은 이유로 트리거를 쓴 선례가
-- 있다(`touch_room_on_message`, 20260727060000) — 이번에도 BEFORE UPDATE 트리거로 막는다.
--
-- SECURITY DEFINER가 아니다: NEW/OLD 값만 비교하고 이미 SECURITY DEFINER인 `is_admin()`을
-- 호출할 뿐이라 RLS를 우회할 이유가 없다(최소 권한). 반환형이 `trigger`라 원리적으로 직접
-- 호출(`select public.guard_...()`)이 불가능하므로 anon revoke도 불필요하다.
create or replace function public.guard_profiles_admin_columns()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if (new.role is distinct from old.role
      or new.disabled_features is distinct from old.disabled_features)
     and not public.is_admin() then
    raise exception 'role/disabled_features는 관리자만 변경할 수 있어요.';
  end if;
  return new;
end;
$$;

create trigger profiles_guard_admin_columns
  before update on public.profiles
  for each row execute function public.guard_profiles_admin_columns();
