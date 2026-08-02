-- 2026-08-02 : 스프레드시트 - 저장 - 되돌리기 (20260802100000_sheets.sql의 짝)
--
-- **되돌리면 시트 데이터가 사라진다.** 표 하나가 통째로 없어지는 것이므로 실행 전에 반드시
-- 사용자 확인을 받는다(CLAUDE.md 5절). 되돌릴 일이 생기면 먼저 내보내기부터 권한다.
--
-- delete_all_my_data는 이 마이그레이션이 건드리지 않았으므로 여기서도 손대지 않는다.

drop trigger if exists sheet_cells_guard_owner on public.sheet_cells;
drop trigger if exists sheets_guard_owner on public.sheets;
drop function if exists public.sheet_cells_guard_owner();
drop function if exists public.sheets_guard_owner();

-- 정책은 테이블과 함께 사라지지만, 테이블만 남기고 되돌리는 부분 실패에 대비해 명시한다.
drop policy if exists "sheet_cells_select_public" on public.sheet_cells;
drop policy if exists "sheet_cells_delete_own" on public.sheet_cells;
drop policy if exists "sheet_cells_update_own" on public.sheet_cells;
drop policy if exists "sheet_cells_insert_own" on public.sheet_cells;
drop policy if exists "sheet_cells_select_own" on public.sheet_cells;

drop policy if exists "sheets_select_public" on public.sheets;
drop policy if exists "sheets_delete_own" on public.sheets;
drop policy if exists "sheets_update_own" on public.sheets;
drop policy if exists "sheets_insert_own" on public.sheets;
drop policy if exists "sheets_select_own" on public.sheets;

-- sheet_cells가 sheets를 참조하므로 자식부터 내린다.
drop table if exists public.sheet_cells;
drop table if exists public.sheets;
