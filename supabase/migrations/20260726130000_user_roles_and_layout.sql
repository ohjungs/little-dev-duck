-- 2026-07-26 : 권한 - 스키마 - 역할·기능토글·대시보드배치 (피드백 6-1·6-2·6-3·1-2·1-5)
--
-- 세 컬럼을 profiles에 붙인다. 별도 테이블로 나누지 않은 이유: 셋 다 사용자당 정확히 하나이고
-- profiles는 로그인 직후 어차피 한 번 읽는다. 테이블을 늘리면 조회가 늘고 RLS 정책도 늘어난다.
--
-- role       : ADMIN / USER / CUSTOMER (관리자가 부여)
-- disabled_features : 관리자가 이 사용자에게서 끈 기능 목록.
--   **끄는 목록이다(허용 목록이 아니다).** 허용 목록이면 기능을 새로 만들 때마다 기존 사용자
--   전원이 못 쓰게 되고, 아무도 켜 주지 않으면 조용히 사라진 것과 같다.
--   기본값이 빈 배열이라 이 마이그레이션 적용 전후로 **기존 사용자 동작이 한 글자도 안 바뀐다.**
-- dashboard_layout  : 카드 순서·숨김(사용자 개인화). 형식은 core `dashboard-layout.ts`가 단일 출처.

alter table public.profiles
  add column if not exists role text not null default 'user'
    check (role in ('admin', 'user', 'customer'));

alter table public.profiles
  add column if not exists disabled_features text[] not null default '{}';

alter table public.profiles
  add column if not exists dashboard_layout jsonb;

-- ---------------------------------------------------------------------------
-- 관리자 판정 함수
-- ---------------------------------------------------------------------------
-- profiles 정책 안에서 profiles를 다시 조회하면 정책이 스스로를 호출해 무한 재귀가 된다.
-- SECURITY DEFINER 함수로 감싸 RLS를 우회한 채 **자기 행의 role만** 읽는다.
--
-- 2026-07-26 : Phase 24에서 배운 것 — Supabase는 public 스키마 함수에 anon·authenticated
-- 권한을 기본 부여하고, 의사 롤 public을 회수해도 anon에 직접 부여된 권한은 남는다.
-- 그래서 anon을 **지목해서** 회수한다(schemaGuard가 이 규칙을 검사한다).
-- 인자를 받지 않는 것도 의도다 — 인자를 받으면 남의 id를 넣어 role을 캐낼 수 있다.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role = 'admin' from public.profiles where id = auth.uid()),
    false
  );
$$;

revoke all on function public.is_admin() from public;
revoke all on function public.is_admin() from anon;
grant execute on function public.is_admin() to authenticated;

-- ---------------------------------------------------------------------------
-- 정책
-- ---------------------------------------------------------------------------
-- 기존 3개 정책(본인 select/insert/update)은 그대로 둔다 — 개인 워크스페이스 동작이 우선이다.
-- 아래 둘은 관리자에게만 추가로 열린다.

create policy "profiles_select_admin" on public.profiles
  for select using (public.is_admin());

-- 관리자는 남의 역할·기능 토글을 바꿀 수 있다.
-- dashboard_layout은 개인화 영역이라 관리자가 건드릴 이유가 없지만, 컬럼 단위 제한은
-- RLS로 표현할 수 없다(정책은 행 단위다). 대신 api 쪽에서 바꿀 컬럼을 좁혀 보낸다.
create policy "profiles_update_admin" on public.profiles
  for update using (public.is_admin()) with check (public.is_admin());

-- 관리자 화면이 역할별로 훑으므로 인덱스를 둔다(사용자 수가 적어도 정책 평가에 도움이 된다).
create index if not exists profiles_role_idx on public.profiles (role);
