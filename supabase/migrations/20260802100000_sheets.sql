-- 2026-08-02 : 스프레드시트 - 저장 - 셀 전용 테이블 (SPEC-2026-08-02-spreadsheet-a1 T1)
--
-- 시트는 페이지의 자식이다(문서 하나에 탭 여러 개). 셀은 **비어 있지 않은 것만** 행으로 둔다.
--
-- 왜 pages.jsonb 한 덩어리가 아닌가(사용자 결정 Q1): 한 글자 고칠 때마다 문서 전체를 다시 쓰게
-- 되고, 그건 2만 셀부터 타이핑 지연으로 드러난다. 셀 행이면 편집 1회 = upsert 1행이다.
-- 대신 jsonb였으면 공짜였을 것(계정 삭제·백업·공개공유·검색)을 직접 배선해야 한다 — 스펙 D-1-a.

create table public.sheets (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.pages (id) on delete cascade,
  -- **비정규화**: RLS가 조인 없이 끝나고(이 저장소의 다른 정책과 같은 모양), 셀 대량 조회에서
  -- 조인 비용이 사라진다. page_id의 소유자와 어긋나지 않게 아래 트리거가 강제한다.
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  position int not null default 0 check (position >= 0),
  -- 열 너비·행 높이·틀 고정·병합·이름정의·서식 팔레트. 셀 개수만큼 커지는 것은 절대 넣지 않는다.
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- 한 문서 안에서 시트 이름은 유일하다(수식 Sheet2!A1이 가리킬 대상이 하나여야 한다).
  unique (page_id, name)
);

create index sheets_page_idx on public.sheets (page_id, position);
create index sheets_user_idx on public.sheets (user_id);

create table public.sheet_cells (
  sheet_id uuid not null references public.sheets (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  -- 0-based. core의 CellRef와 같은 좌표계다(1-based를 섞으면 ±1 실수가 반복된다).
  r int not null check (r >= 0 and r < 1048576),
  c int not null check (c >= 0 and c < 16384),
  -- 입력된 값(문자열|숫자|불리언|null). **계산 결과는 저장하지 않는다** —
  -- 저장하면 함수 구현이 바뀌거나 다른 기기에서 편집됐을 때 실제 값과 어긋나고,
  -- 그 어긋남은 "틀린 숫자가 맞는 것처럼 보이는" 형태로 나타난다.
  v jsonb,
  -- 수식 원문('=' 포함). null이면 값 셀.
  f text check (f is null or (char_length(f) <= 8192 and f like '=%')),
  -- sheets.meta.styles 인덱스. null이면 기본 서식.
  s int check (s is null or s >= 0),
  primary key (sheet_id, r, c)
);

-- 화면은 "보이는 사각형"을 읽는다: where sheet_id = ? and r between ? and ? and c between ? and ?
-- PK가 (sheet_id, r, c)라 r 범위 스캔은 이미 덮인다. 열 방향 조회(한 열 전체)를 위해 하나 더 둔다.
create index sheet_cells_col_idx on public.sheet_cells (sheet_id, c, r);

alter table public.sheets enable row level security;
alter table public.sheet_cells enable row level security;

-- (select auth.uid())로 감싸 statement당 1회 평가(auth_rls_initplan advisor 권장).
-- 셀은 한 번에 수천 행이 오가므로 행별 재평가 회피 이득이 이 테이블에서 특히 크다.
create policy "sheets_select_own" on public.sheets
  for select using (user_id = (select auth.uid()));
create policy "sheets_insert_own" on public.sheets
  for insert with check (user_id = (select auth.uid()));
create policy "sheets_update_own" on public.sheets
  for update using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "sheets_delete_own" on public.sheets
  for delete using (user_id = (select auth.uid()));

create policy "sheet_cells_select_own" on public.sheet_cells
  for select using (user_id = (select auth.uid()));
create policy "sheet_cells_insert_own" on public.sheet_cells
  for insert with check (user_id = (select auth.uid()));
create policy "sheet_cells_update_own" on public.sheet_cells
  for update using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "sheet_cells_delete_own" on public.sheet_cells
  for delete using (user_id = (select auth.uid()));

-- 공개 공유된 페이지의 시트는 anon이 읽는다. pages의 공개 공유(is_public)와 같은 계약이고,
-- **읽기만** 연다. 공개가 아니면 위 정책만 남으므로 로그인한 소유자에게만 보인다.
create policy "sheets_select_public" on public.sheets
  for select using (
    exists (
      select 1 from public.pages p
      where p.id = sheets.page_id and p.is_public = true and p.is_trashed = false
    )
  );

create policy "sheet_cells_select_public" on public.sheet_cells
  for select using (
    exists (
      select 1
      from public.sheets s
      join public.pages p on p.id = s.page_id
      where s.id = sheet_cells.sheet_id
        and p.is_public = true
        and p.is_trashed = false
    )
  );

-- ── 소유자 일치 강제 ────────────────────────────────────────────────────────
-- user_id를 비정규화한 대가다. RLS는 "내 user_id인가"만 보므로, 남의 페이지에 내 user_id로
-- 시트를 만드는 것을 RLS 혼자서는 막지 못한다(그러면 남의 문서에 내 탭이 생긴다).
-- SECURITY DEFINER를 쓰지 않는다 — 노출 표면을 늘리지 않는 선택(2026-07-30 선례).
create function public.sheets_guard_owner() returns trigger
-- search_path를 비운다(어드바이저 function_search_path_mutable). 아래 참조가 전부
-- public.으로 완전 수식돼 있어 동작은 그대로다 — 적용 후 정상 경로·차단 경로 양쪽 실측 확인.
language plpgsql set search_path = '' as $$
declare
  page_owner uuid;
begin
  select user_id into page_owner from public.pages where id = new.page_id;
  if page_owner is null then
    raise exception '없는 페이지입니다.';
  end if;
  if page_owner <> new.user_id then
    raise exception '시트의 소유자가 페이지 소유자와 다릅니다.';
  end if;
  return new;
end;
$$;

create trigger sheets_guard_owner
  before insert or update on public.sheets
  for each row execute function public.sheets_guard_owner();

create function public.sheet_cells_guard_owner() returns trigger
language plpgsql set search_path = '' as $$
declare
  sheet_owner uuid;
begin
  select user_id into sheet_owner from public.sheets where id = new.sheet_id;
  if sheet_owner is null then
    raise exception '없는 시트입니다.';
  end if;
  if sheet_owner <> new.user_id then
    raise exception '셀의 소유자가 시트 소유자와 다릅니다.';
  end if;
  return new;
end;
$$;

create trigger sheet_cells_guard_owner
  before insert or update on public.sheet_cells
  for each row execute function public.sheet_cells_guard_owner();

-- ── 계정 삭제 경로 — **이 함수를 건드리지 않는다** ────────────────────────────
-- 처음엔 delete_all_my_data에 sheet_cells·sheets 삭제를 더하려 했으나, 실서버의 현재 정의를
-- 조회해 보고 두 가지를 알았다(2026-08-02):
--
-- ① 이미 cascade로 덮인다. sheets.page_id가 pages를 on delete cascade로 참조하고 그 함수는
--    pages를 지운다 → 시트와 셀이 함께 사라진다. 줄을 더하는 것은 같은 일을 두 번 적는 것이다.
-- ② 이 함수를 손으로 다시 쓰는 것 자체가 위험하다. 실제 정의는 `embeddings`를 지우는데
--    기억에 의존해 다시 쓰면 `ai_embeddings` 같은 없는 이름을 넣기 쉽고, 그러면 **계정 삭제
--    경로 전체가 예외로 죽는다** — 메신저 제거 때 정확히 그 모양으로 깨진 전례가 있다.
--
-- 그래서 함수는 그대로 두고, **cascade가 실제로 도는지를 pgTAP으로 잠근다**
-- (supabase/tests/database/80_sheets.sql). "어차피 되겠지"를 검사로 바꾼다.

-- 20260801110000이 public 스키마에 default privileges를 걸어 뒀지만, 그건 그 시점 이후 생성분에만
-- 적용된다. 이 마이그레이션이 그 뒤에 오므로 자동으로 덮이나, 새 DB에서의 순서 의존을 없애려
-- 명시한다(운영에서는 no-op).
grant all on public.sheets to anon, authenticated, service_role;
grant all on public.sheet_cells to anon, authenticated, service_role;
