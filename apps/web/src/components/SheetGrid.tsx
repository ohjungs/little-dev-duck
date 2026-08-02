"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  cellKey,
  colToLetters,
  createFormulaFunctions,
  formatCellRef,
  nodeKey,
  parseCellInput,
  parseCellRef,
  recalcAll,
  type Cell,
  type EvalValue,
  type Sheet,
  type SheetCells,
  type Workbook,
} from "@ldd/core";
import { isComposingEnter } from "@/lib/composition";

// 2026-08-02 : 스프레드시트 - 화면 - 격자·셀편집·수식입력줄 (SPEC-2026-08-02-spreadsheet-a1 T5)
//
// **가상 스크롤을 직접 만든다**(스펙 D-5). 보이는 사각형 + 여유분만 DOM에 만든다.
// 열 너비·행 높이·틀 고정·병합은 T7이라 여기서는 **모든 칸이 같은 크기**다 — 가변 크기를 미리
// 감당하면 오프셋 누적합 자료구조가 필요해지는데, 그건 T7이 meta.cols/rows를 실제로 쓰기
// 시작할 때 같이 만드는 것이 맞다(지금 만들면 쓰는 곳 없이 복잡도만 는다).
//
// 이 컴포넌트는 **저장을 모른다**. 확정된 셀을 onCellCommit으로 올려보내고, 불러오기·디바운스
// 저장은 SheetPanel이 맡는다. 그래야 격자를 supabase 없이 렌더 테스트할 수 있다.

const ROW_H = 26;
const COL_W = 104;
const HEAD_H = 26;
const HEAD_W = 52;
// 보이는 사각형 바깥으로 더 그리는 줄 수. 스크롤이 한 프레임 앞서가도 빈칸이 보이지 않게 한다.
const OVERSCAN = 3;
// 격자는 데이터가 끝나는 곳보다 넉넉히 크다(엑셀처럼 빈 칸으로 이어진다).
const MIN_ROWS = 50;
const MIN_COLS = 20;
const PAD_ROWS = 20;
const PAD_COLS = 4;
// 레이아웃 전(jsdom·서버 렌더)에는 clientHeight가 0이다. 0을 그대로 쓰면 아무것도 그리지 않으므로
// 첫 렌더는 이 크기로 그리고, 실제 크기를 잰 뒤(>0) 그 값으로 갈아탄다.
const DEFAULT_VIEWPORT = { w: 900, h: 420 };

function toDisplay(v: EvalValue | undefined): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
  if (typeof v === "number") {
    if (!Number.isFinite(v)) return "#NUM!";
    // 0.1 + 0.2가 "0.30000000000000004"로 보이지 않게 유효숫자 15자리에서 끊는다(엑셀과 같다).
    // 숫자 서식(numFmt) 해석은 T7의 일이고, 여기는 "맨눈에 틀려 보이는 것"만 막는다.
    return String(Number(v.toPrecision(15)));
  }
  return String(v);
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), max);
}

export function SheetGrid({
  sheet,
  cells,
  onCellCommit,
}: {
  sheet: Sheet;
  cells: readonly Cell[];
  /** 확정된 셀 하나. 값이 비면 v·f가 모두 null이다(저장 계층이 행을 지운다). */
  onCellCommit: (cell: Cell) => void;
}) {
  const gridId = useId();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [sel, setSel] = useState({ r: 0, c: 0 });
  const [edit, setEdit] = useState<{ r: number; c: number; draft: string } | null>(null);
  // 입력줄·이름 상자는 **평소에 선택 셀에서 파생된다**. 사용자가 거기에 직접 타이핑하는 동안만
  // 그 값이 화면을 이긴다. 선택이 바뀔 때 effect로 되돌리는 방식(setState in effect)을 쓰면
  // 렌더가 한 번 더 도는 데다, 그 사이 한 프레임 동안 **남의 셀 값이 내 입력줄에 보인다.**
  // 그래서 초안에 "어느 셀의 것인가"를 함께 들고 다니고, 선택이 다르면 그냥 파생값을 쓴다.
  const [barDraft, setBarDraft] = useState<{ r: number; c: number; text: string } | null>(
    null,
  );
  const [nameDraft, setNameDraft] = useState<string | null>(null);
  const [scroll, setScroll] = useState({ top: 0, left: 0 });
  const [viewport, setViewport] = useState(DEFAULT_VIEWPORT);

  const byKey = useMemo(() => {
    const m = new Map<string, Cell>();
    for (const cell of cells) m.set(cellKey(cell.r, cell.c), cell);
    return m;
  }, [cells]);

  // 계산은 셀이 바뀔 때마다 **전부** 다시 센다. 엔진은 부분 재계산(AC-10)을 지원하지만, 화면이
  // 그걸 쓰려면 이전 값 맵과 그래프를 편집 사이에 들고 있어야 한다 — 셀 목록이 통째로 갈리는
  // 지금 구조에서는 이득 없이 상태만 는다. 붙여넣기·행열 삽입으로 한 번에 수백 셀이 바뀌는
  // T6·T8에서 그래프를 들고 있게 바꾼다.
  const values = useMemo(() => {
    const sheetCells: SheetCells = new Map();
    for (const cell of cells) {
      sheetCells.set(cellKey(cell.r, cell.c), { v: cell.v, f: cell.f });
    }
    const wb: Workbook = new Map([[sheet.name, sheetCells]]);
    return recalcAll(wb, createFormulaFunctions()).values;
  }, [cells, sheet.name]);

  const { rows, cols } = useMemo(() => {
    let maxR = 0;
    let maxC = 0;
    for (const cell of cells) {
      if (cell.r > maxR) maxR = cell.r;
      if (cell.c > maxC) maxC = cell.c;
    }
    // 선택 칸을 포함시킨다 — 이름 상자로 데이터 바깥(예: Z100)으로 이동하면 격자가 거기까지 자란다.
    return {
      rows: Math.max(MIN_ROWS, maxR + 1 + PAD_ROWS, sel.r + 1 + PAD_ROWS),
      cols: Math.max(MIN_COLS, maxC + 1 + PAD_COLS, sel.c + 1 + PAD_COLS),
    };
  }, [cells, sel]);

  const firstRow = Math.max(0, Math.floor(scroll.top / ROW_H) - OVERSCAN);
  const lastRow = Math.min(
    rows - 1,
    Math.ceil((scroll.top + viewport.h) / ROW_H) + OVERSCAN,
  );
  const firstCol = Math.max(0, Math.floor(scroll.left / COL_W) - OVERSCAN);
  const lastCol = Math.min(
    cols - 1,
    Math.ceil((scroll.left + viewport.w) / COL_W) + OVERSCAN,
  );

  const visibleRows: number[] = [];
  for (let r = firstRow; r <= lastRow; r += 1) visibleRows.push(r);
  const visibleCols: number[] = [];
  for (let c = firstCol; c <= lastCol; c += 1) visibleCols.push(c);

  function measure(el: HTMLDivElement): void {
    // 0은 "아직 레이아웃 전"이다(jsdom은 언제나 0). 0으로 갈아타면 화면이 비므로 무시한다.
    if (el.clientWidth > 0 && el.clientHeight > 0) {
      setViewport({ w: el.clientWidth, h: el.clientHeight });
    }
  }

  useEffect(() => {
    const el = scrollRef.current;
    if (el) measure(el);
  }, []);

  const selAddress = formatCellRef({
    r: sel.r,
    c: sel.c,
    absR: false,
    absC: false,
    sheet: null,
  });

  function rawOf(r: number, c: number): string {
    const cell = byKey.get(cellKey(r, c));
    if (!cell) return "";
    if (cell.f) return cell.f;
    if (cell.v === null) return "";
    if (typeof cell.v === "boolean") return cell.v ? "TRUE" : "FALSE";
    return String(cell.v);
  }

  function textOf(r: number, c: number): string {
    const cell = byKey.get(cellKey(r, c));
    if (!cell) return "";
    if (cell.f) return toDisplay(values.get(nodeKey(sheet.name, r, c)));
    return toDisplay(cell.v);
  }

  function commit(r: number, c: number, raw: string): void {
    const input = parseCellInput(raw);
    // 서식(s)은 값과 함께 지워지지 않는다 — 값을 비웠다고 굵게·배경색까지 사라지면 엑셀과 다르다.
    const prev = byKey.get(cellKey(r, c));
    onCellCommit({ r, c, v: input.v, f: input.f, s: prev?.s ?? null });
  }

  // blur는 "다른 칸을 눌러 빠져나가도 입력이 살아남게" 확정하는 경로다. Enter·Tab·Esc가 이미
  // 끝낸 편집에서 blur가 한 번 더 확정하면 Enter는 두 번 저장하고 Esc는 취소가 아니라 저장이
  // 된다. 그래서 "편집이 아직 살아 있는가"를 ref로 들고 blur가 그것만 본다
  // (edit 상태는 다음 렌더에나 반영돼서 이 판정에 못 쓴다).
  const editLive = useRef(false);

  function focusInput(): void {
    inputRef.current?.focus();
  }

  function endEdit(): void {
    editLive.current = false;
    setEdit(null);
    focusInput();
  }

  function moveTo(r: number, c: number): void {
    setSel({ r: Math.max(0, r), c: Math.max(0, c) });
    endEdit();
  }

  // 편집 시작은 반드시 여기를 지난다(F2·타이핑·더블클릭). 한 곳이라도 editLive를 빠뜨리면
  // 그 경로만 blur 저장이 안 돼 "가끔 입력이 사라지는" 모양이 된다.
  function beginEdit(r: number, c: number, draft: string): void {
    editLive.current = true;
    setEdit({ r, c, draft });
  }

  // 입력칸에 글자가 들어오면 그것이 편집의 시작이다. **키 코드로 판정하지 않는다** —
  // 한글 IME는 조합 중 keydown에 key="Process"(keyCode 229)를 주므로 "한 글자짜리 key면
  // 편집 시작"으로 보면 한글은 영영 시작되지 않고, 조합을 붙일 입력칸도 없어 첫 글자가 날아간다.
  function onInputChange(e: React.ChangeEvent<HTMLInputElement>): void {
    const text = e.target.value;
    if (edit) setEdit({ r: edit.r, c: edit.c, draft: text });
    else beginEdit(sel.r, sel.c, text);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>): void {
    const { key, ctrlKey, metaKey } = e;
    const mod = ctrlKey || metaKey;

    if (edit) {
      if (key === "Escape") {
        e.preventDefault();
        endEdit();
        return;
      }
      // 한글 조합 중의 Enter는 **조합 확정**이다. 여기서 셀까지 확정하면 마지막 글자가 잘린다(AC-21).
      // **nativeEvent를 넘긴다** — React 합성 키보드 이벤트에는 isComposing이 없어서 합성 이벤트를
      // 그대로 넘기면 조합 중에도 언제나 false가 된다(DuckChatPanel이 세운 선례).
      if (key === "Enter" && !isComposingEnter(e.nativeEvent)) {
        e.preventDefault();
        commit(edit.r, edit.c, edit.draft);
        moveTo(edit.r + (e.shiftKey ? -1 : 1), edit.c);
        return;
      }
      if (key === "Tab") {
        e.preventDefault();
        commit(edit.r, edit.c, edit.draft);
        moveTo(edit.r, edit.c + (e.shiftKey ? -1 : 1));
        return;
      }
      // 나머지는 입력칸에 맡긴다 — 편집 중의 방향키는 칸 이동이 아니라 캐럿 이동이다(엑셀과 같다).
      return;
    }

    switch (key) {
      case "ArrowUp":
        e.preventDefault();
        moveTo(mod ? 0 : sel.r - 1, sel.c);
        return;
      case "ArrowDown":
        e.preventDefault();
        moveTo(mod ? rows - 1 : sel.r + 1, sel.c);
        return;
      case "ArrowLeft":
        e.preventDefault();
        moveTo(sel.r, mod ? 0 : sel.c - 1);
        return;
      case "ArrowRight":
        e.preventDefault();
        moveTo(sel.r, mod ? cols - 1 : sel.c + 1);
        return;
      case "Tab":
        e.preventDefault();
        moveTo(sel.r, e.shiftKey ? sel.c - 1 : sel.c + 1);
        return;
      case "Enter":
        e.preventDefault();
        moveTo(sel.r + (e.shiftKey ? -1 : 1), sel.c);
        return;
      case "Home":
        e.preventDefault();
        moveTo(mod ? 0 : sel.r, 0);
        return;
      case "F2":
        e.preventDefault();
        beginEdit(sel.r, sel.c, rawOf(sel.r, sel.c));
        return;
      case "Delete":
      case "Backspace":
        e.preventDefault();
        commit(sel.r, sel.c, "");
        return;
      default:
        break;
    }
  }

  function onNameKeyDown(e: React.KeyboardEvent<HTMLInputElement>): void {
    if (e.key !== "Enter" || isComposingEnter(e.nativeEvent)) return;
    e.preventDefault();
    const ref = parseCellRef(nameDraft ?? selAddress);
    // 알아볼 수 없는 주소면 초안을 버려 선택 셀 주소로 되돌아간다(조용히 엉뚱한 칸으로 가지 않는다).
    setNameDraft(null);
    if (!ref || ref.sheet !== null) return;
    moveTo(ref.r, ref.c);
  }

  function onBarKeyDown(e: React.KeyboardEvent<HTMLInputElement>): void {
    if (e.key === "Escape") {
      setBarDraft(null);
      return;
    }
    if (e.key !== "Enter" || isComposingEnter(e.nativeEvent)) return;
    e.preventDefault();
    commit(sel.r, sel.c, barValue);
    setBarDraft(null);
    moveTo(sel.r + 1, sel.c);
  }

  // 초안이 선택 셀의 것일 때만 초안을 보여준다 — 선택이 옮겨가면 새 셀의 값이 보인다.
  const barValue =
    barDraft && barDraft.r === sel.r && barDraft.c === sel.c
      ? barDraft.text
      : edit
        ? edit.draft
        : rawOf(sel.r, sel.c);

  const cellDomId = (r: number, c: number) => `${gridId}-cell-${r}-${c}`;
  const totalW = HEAD_W + cols * COL_W;
  const totalH = HEAD_H + rows * ROW_H;

  return (
    <div className="mt-6 flex flex-col gap-2 px-4">
      <div className="flex items-center gap-2">
        <input
          aria-label="이름 상자"
          value={nameDraft ?? selAddress}
          onChange={(e) => setNameDraft(e.target.value)}
          onKeyDown={onNameKeyDown}
          onBlur={() => setNameDraft(null)}
          className="w-20 rounded border border-border bg-transparent px-2 py-1 text-xs tabular-nums outline-none focus:ring-1 focus:ring-primary/40"
        />
        <span className="text-xs text-muted-foreground" aria-hidden>
          fx
        </span>
        <input
          aria-label="수식 입력줄"
          value={barValue}
          onChange={(e) => setBarDraft({ r: sel.r, c: sel.c, text: e.target.value })}
          onKeyDown={onBarKeyDown}
          className="flex-1 rounded border border-border bg-transparent px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-primary/40"
        />
      </div>

      <div
        ref={scrollRef}
        role="grid"
        aria-label={`${sheet.name} 시트`}
        aria-rowcount={rows + 1}
        aria-colcount={cols + 1}
        onScroll={(e) => {
          const el = e.currentTarget;
          setScroll({ top: el.scrollTop, left: el.scrollLeft });
          measure(el);
        }}
        className="relative h-[420px] overflow-auto rounded-lg border border-border bg-card outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        <div className="relative" style={{ width: totalW, height: totalH }}>
          {/* 열 머리글. 스크롤 값만큼 내려 붙여 화면 위에 고정한다(sticky 대신 — 칸이 절대배치라
              sticky는 이 안에서 기준을 잃는다). */}
          <div
            role="row"
            aria-rowindex={1}
            className="absolute z-20"
            style={{ top: scroll.top, left: 0, height: HEAD_H, width: totalW }}
          >
            <div
              className="absolute z-10 border-b border-r border-border bg-muted/60"
              style={{ left: scroll.left, top: 0, width: HEAD_W, height: HEAD_H }}
              aria-hidden
            />
            {visibleCols.map((c) => (
              <div
                key={c}
                role="columnheader"
                aria-colindex={c + 2}
                className={`absolute flex items-center justify-center border-b border-r border-border text-xs ${
                  c === sel.c
                    ? "bg-primary/15 font-medium text-foreground"
                    : "bg-muted/60 text-muted-foreground"
                }`}
                style={{
                  left: HEAD_W + c * COL_W,
                  top: 0,
                  width: COL_W,
                  height: HEAD_H,
                }}
              >
                {colToLetters(c)}
              </div>
            ))}
          </div>

          {visibleRows.map((r) => (
            <div key={r} role="row" aria-rowindex={r + 2}>
              <div
                role="rowheader"
                aria-colindex={1}
                className={`absolute z-10 flex items-center justify-center border-b border-r border-border text-xs tabular-nums ${
                  r === sel.r
                    ? "bg-primary/15 font-medium text-foreground"
                    : "bg-muted/60 text-muted-foreground"
                }`}
                style={{
                  left: scroll.left,
                  top: HEAD_H + r * ROW_H,
                  width: HEAD_W,
                  height: ROW_H,
                }}
              >
                {r + 1}
              </div>
              {visibleCols.map((c) => {
                const selected = r === sel.r && c === sel.c;
                const editing = edit?.r === r && edit?.c === c;
                const cell = byKey.get(cellKey(r, c));
                const text = textOf(r, c);
                const numeric =
                  cell !== undefined &&
                  (cell.f
                    ? typeof values.get(nodeKey(sheet.name, r, c)) === "number"
                    : typeof cell.v === "number");
                return (
                  <div
                    key={c}
                    id={cellDomId(r, c)}
                    role="gridcell"
                    aria-colindex={c + 2}
                    aria-selected={selected}
                    // 선택은 click으로 받는다. mousedown이 스프레드시트답지만, 그건 끌어서
                    // 범위를 잡는 T6에서 필요해지는 것이고 지금 쓰면 보조기술이 만들어내는
                    // click(마우스 없는 경로)이 선택을 못 하게 된다.
                    onClick={() => {
                      if (editing) return;
                      setSel({ r, c });
                      focusInput();
                    }}
                    onDoubleClick={() => beginEdit(r, c, rawOf(r, c))}
                    className={`absolute overflow-hidden border-b border-r border-border px-1.5 text-sm leading-[26px] whitespace-nowrap ${
                      numeric ? "text-right tabular-nums" : "text-left"
                    } ${text.startsWith("#") ? "text-destructive" : ""} ${
                      selected ? "z-10 ring-2 ring-inset ring-primary" : ""
                    }`}
                    style={{
                      left: HEAD_W + c * COL_W,
                      top: HEAD_H + r * ROW_H,
                      width: COL_W,
                      height: ROW_H,
                    }}
                  >
                    {editing ? "" : text}
                  </div>
                );
              })}
            </div>
          ))}

          {/* 선택 칸에 **늘 떠 있는 입력칸**. 편집 중일 때만 만들면 한글을 칠 수 없다 —
              IME는 조합을 걸 편집 가능한 요소가 필요한데, 격자 div는 편집 대상이 아니라
              첫 글자가 갈 곳이 없다. 늘 여기 있으면 조합이 처음부터 이 칸에 붙는다.
              편집 중이 아닐 때는 값이 비어 투명하고, 뒤에 있는 셀 텍스트가 그대로 보인다. */}
          <input
            ref={inputRef}
            aria-label="셀 편집"
            aria-activedescendant={cellDomId(sel.r, sel.c)}
            value={edit ? edit.draft : ""}
            onChange={onInputChange}
            onKeyDown={onKeyDown}
            // 이 입력칸이 선택 칸을 덮고 있으므로, **선택된 칸의 더블클릭은 셀이 아니라 여기로 온다.**
            // 여기 없으면 "이미 고른 칸을 더블클릭해 고치기"만 되지 않는다.
            onDoubleClick={() => {
              if (!edit) beginEdit(sel.r, sel.c, rawOf(sel.r, sel.c));
            }}
            onBlur={() => {
              // 다른 칸을 눌러 빠져나가도 엑셀처럼 입력이 살아남는다.
              // 이미 Enter·Tab·Esc가 끝낸 편집이면(editLive=false) 다시 확정하지 않는다.
              if (!editLive.current || !edit) return;
              editLive.current = false;
              commit(edit.r, edit.c, edit.draft);
              setEdit(null);
            }}
            className={`absolute z-30 border-0 px-1.5 text-sm outline-none ${
              edit
                ? "bg-card ring-2 ring-inset ring-primary"
                : "bg-transparent text-transparent caret-transparent"
            }`}
            style={{
              left: HEAD_W + (edit ? edit.c : sel.c) * COL_W,
              top: HEAD_H + (edit ? edit.r : sel.r) * ROW_H,
              width: COL_W,
              height: ROW_H,
            }}
          />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        {`${clamp(sel.r + 1, 1, rows)}행 ${colToLetters(sel.c)}열 · F2 편집 · Enter 확정 · Esc 취소`}
      </p>
    </div>
  );
}
