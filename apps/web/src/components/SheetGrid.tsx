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
import {
  buildCopyBlock,
  buildCopyText,
  buildFill,
  buildPasteFromCells,
  buildPasteFromText,
  inRange,
  invert,
  normalize,
  type SheetRange,
} from "@/lib/sheetEdit";

// 2026-08-02 : 스프레드시트 - 화면 - 격자·셀편집·수식입력줄 (SPEC-2026-08-02-spreadsheet-a1 T5)
//
// **가상 스크롤을 직접 만든다**(스펙 D-5). 보이는 사각형 + 여유분만 DOM에 만든다.
// 열 너비·행 높이·틀 고정·병합은 T7이라 여기서는 **모든 칸이 같은 크기**다 — 가변 크기를 미리
// 감당하면 오프셋 누적합 자료구조가 필요해지는데, 그건 T7이 meta.cols/rows를 실제로 쓰기
// 시작할 때 같이 만드는 것이 맞다(지금 만들면 쓰는 곳 없이 복잡도만 는다).
//
// 이 컴포넌트는 **저장을 모른다**. 확정된 셀을 onCellsCommit으로 올려보내고, 불러오기·디바운스
// 저장은 SheetPanel이 맡는다. 그래야 격자를 supabase 없이 렌더 테스트할 수 있다.
//
// 2026-08-02 T6: 범위 선택·복사붙여넣기·채우기 핸들·실행취소가 붙었다. "무엇을 쓸 것인가"의
// 계산은 전부 lib/sheetEdit.ts의 순수 함수다 — 여기 있는 것은 상태와 이벤트뿐이다.

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
  onCellsCommit,
}: {
  sheet: Sheet;
  cells: readonly Cell[];
  /**
   * 확정된 셀들. 셀 하나를 고쳐도 배열이다 — 붙여넣기·채우기·실행취소는 한 번에 여러 칸을
   * 바꾸고, 그것들이 **한 덩어리로** 저장돼야 실행취소가 한 번에 되돌아간다.
   * 값이 빈 셀은 v·f·s가 모두 null이다(저장 계층이 행을 지운다).
   */
  onCellsCommit: (cells: Cell[]) => void;
}) {
  const gridId = useId();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [sel, setSel] = useState({ r: 0, c: 0 });
  // 범위의 반대쪽 끝. 엑셀처럼 **활성 칸(sel)은 고정**되고 이쪽만 움직인다 —
  // 입력칸이 활성 칸에 상주하므로 범위를 늘리는 동안 입력 위치가 떠돌면 안 된다.
  const [focus, setFocus] = useState({ r: 0, c: 0 });
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
  // 채우기 핸들을 끄는 동안의 목표 칸. 끌지 않을 때는 null이다.
  const [fillTo, setFillTo] = useState<{ r: number; c: number } | null>(null);

  // 우리끼리의 복사. 시스템 클립보드에는 **보이는 값**이 실리므로(엑셀이 그걸 기대한다) 수식을
  // 보존하려면 원본 셀을 따로 들고 있어야 한다. 붙여넣을 때 시스템 클립보드 글자가 우리가 실은
  // 것과 같으면 이쪽을 쓰고, 다르면 바깥에서 온 것이므로 TSV로 읽는다.
  const clip = useRef<{ block: Cell[][]; from: { r: number; c: number }; text: string } | null>(
    null,
  );
  // 실행취소 더미. 되돌림 값을 **절대값으로** 담는다(차분이 아니라) — 사이에 다른 편집이 끼어도
  // 그 자리의 값이 무엇이어야 하는지가 흔들리지 않는다.
  const undoStack = useRef<{ before: Cell[]; after: Cell[] }[]>([]);
  const redoStack = useRef<{ before: Cell[]; after: Cell[] }[]>([]);

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

  const range: SheetRange = normalize(sel, focus);

  /**
   * 셀 묶음을 확정하면서 **되돌림 값을 함께 기록한다.** 편집·붙여넣기·채우기·범위 지우기가
   * 전부 여기를 지나므로 실행취소가 빠지는 경로가 생기지 않는다(AC-15).
   */
  function applyCells(next: Cell[]): void {
    if (next.length === 0) return;
    undoStack.current.push({ before: invert(next, byKey), after: next });
    // 새 편집이 들어오면 앞으로 갈 길은 사라진다(엑셀·에디터의 공통 관례).
    redoStack.current = [];
    onCellsCommit(next);
  }

  function commit(r: number, c: number, raw: string): void {
    const input = parseCellInput(raw);
    // 서식(s)은 값과 함께 지워지지 않는다 — 값을 비웠다고 굵게·배경색까지 사라지면 엑셀과 다르다.
    const prev = byKey.get(cellKey(r, c));
    applyCells([{ r, c, v: input.v, f: input.f, s: prev?.s ?? null }]);
  }

  function undo(): void {
    const entry = undoStack.current.pop();
    if (!entry) return;
    redoStack.current.push(entry);
    onCellsCommit(entry.before);
  }

  function redo(): void {
    const entry = redoStack.current.pop();
    if (!entry) return;
    undoStack.current.push(entry);
    onCellsCommit(entry.after);
  }

  /** 범위를 통째로 비운다. 서식은 남긴다(값만 지우는 것이 엑셀의 Delete다). */
  function clearRange(): void {
    const out: Cell[] = [];
    for (let r = range.r0; r <= range.r1; r += 1) {
      for (let c = range.c0; c <= range.c1; c += 1) {
        const prev = byKey.get(cellKey(r, c));
        // 이미 빈 칸은 건드리지 않는다 — 빈 칸 수백 개를 지우는 요청을 보내지 않기 위해서다.
        if (!prev && !(range.r0 === range.r1 && range.c0 === range.c1)) continue;
        out.push({ r, c, v: null, f: null, s: prev?.s ?? null });
      }
    }
    applyCells(out);
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
    const at = { r: Math.max(0, r), c: Math.max(0, c) };
    setSel(at);
    // 그냥 이동하면 범위는 한 칸으로 접힌다(엑셀과 같다).
    setFocus(at);
    endEdit();
  }

  /** 활성 칸은 그대로 두고 범위의 반대쪽 끝만 옮긴다(Shift+방향·Shift+클릭). */
  function extendTo(r: number, c: number): void {
    setFocus({ r: Math.max(0, r), c: Math.max(0, c) });
  }

  /**
   * Ctrl+방향: 데이터의 끝으로 건너뛴다. 규칙은 엑셀과 같다 —
   * 지금 칸에 값이 있으면 값이 이어지는 마지막 칸까지, 비어 있으면 다음 값이 있는 칸까지.
   */
  function edgeIn(dr: number, dc: number): { r: number; c: number } {
    const has = (r: number, c: number): boolean => byKey.has(cellKey(r, c));
    const limitR = rows - 1;
    const limitC = cols - 1;
    let r = sel.r;
    let c = sel.c;
    const step = (): boolean => {
      const nr = r + dr;
      const nc = c + dc;
      if (nr < 0 || nc < 0 || nr > limitR || nc > limitC) return false;
      r = nr;
      c = nc;
      return true;
    };

    if (has(sel.r, sel.c) && has(sel.r + dr, sel.c + dc)) {
      // 값이 이어지는 동안 간다.
      while (has(r + dr, c + dc)) {
        if (!step()) break;
      }
      return { r, c };
    }
    // 빈 칸을 건너뛰어 다음 값까지 간다. 끝까지 없으면 격자 끝이다.
    while (step()) {
      if (has(r, c)) return { r, c };
    }
    return { r, c };
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

    // 실행취소는 편집 중이 아닐 때만 격자의 것이다(편집 중에는 입력칸의 글자 되돌리기가 맞다).
    if (mod && (key === "z" || key === "Z")) {
      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
      return;
    }
    if (mod && (key === "y" || key === "Y")) {
      e.preventDefault();
      redo();
      return;
    }

    // 방향키: Shift는 범위를 늘리고, Ctrl은 데이터 끝으로 건너뛴다(AC-20).
    const ARROWS: Record<string, [number, number]> = {
      ArrowUp: [-1, 0],
      ArrowDown: [1, 0],
      ArrowLeft: [0, -1],
      ArrowRight: [0, 1],
    };
    const delta = ARROWS[key];
    if (delta) {
      e.preventDefault();
      const [dr, dc] = delta;
      const to = mod
        ? edgeIn(dr, dc)
        : e.shiftKey
          ? { r: focus.r + dr, c: focus.c + dc }
          : { r: sel.r + dr, c: sel.c + dc };
      if (e.shiftKey) extendTo(to.r, to.c);
      else moveTo(to.r, to.c);
      return;
    }

    switch (key) {
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
        clearRange();
        return;
      default:
        break;
    }
  }

  // ── 클립보드 ────────────────────────────────────────────────────────────────
  // 브라우저의 copy/cut/paste 이벤트를 그대로 쓴다(비동기 Clipboard API + 권한 요청 없이).
  // 입력칸이 늘 포커스를 쥐고 있어서 이벤트가 여기로 온다.
  //
  // **편집 중에는 가로채지 않는다.** 그때의 복사·붙여넣기는 글자 단위여야 한다.

  function onCopy(e: React.ClipboardEvent<HTMLInputElement>): void {
    if (edit) return;
    e.preventDefault();
    const text = buildCopyText(range, textOf);
    e.clipboardData.setData("text/plain", text);
    clip.current = {
      block: buildCopyBlock(byKey, range),
      from: { r: range.r0, c: range.c0 },
      text,
    };
  }

  function onCut(e: React.ClipboardEvent<HTMLInputElement>): void {
    if (edit) return;
    onCopy(e);
    clearRange();
  }

  function onPaste(e: React.ClipboardEvent<HTMLInputElement>): void {
    if (edit) return;
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain");
    const at = { r: range.r0, c: range.c0 };
    // 우리가 실은 글자 그대로면 우리 복사다 — 그때만 수식이 살아 있고 참조가 따라 움직인다(E2).
    const mine = clip.current && clip.current.text === text ? clip.current : null;
    const next = mine
      ? buildPasteFromCells(mine.block, mine.from, at)
      : buildPasteFromText(text, at);
    if (next.length === 0) return;
    applyCells(next);
    // 붙여넣은 만큼이 선택된다(엑셀과 같다 — 바로 이어서 지우거나 다시 복사할 수 있게).
    const last = next[next.length - 1];
    setFocus({ r: last.r, c: last.c });
  }

  // ── 채우기 핸들 ────────────────────────────────────────────────────────────
  // 끄는 동안 목표 칸을 상태로 들고, 손을 떼는 순간 계산해서 확정한다. 목표 칸 갱신은 셀의
  // onMouseEnter가 한다 — 좌표를 픽셀에서 되계산하지 않아도 되고, 가상 스크롤과도 어긋나지 않는다.
  useEffect(() => {
    if (fillTo === null) return;
    const done = (): void => {
      const filled = buildFill(byKey, range, fillTo);
      setFillTo(null);
      if (filled.length > 0) {
        applyCells(filled);
        setFocus(fillTo);
      }
    };
    window.addEventListener("mouseup", done);
    return () => window.removeEventListener("mouseup", done);
  });

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
                  c >= range.c0 && c <= range.c1
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
                  r >= range.r0 && r <= range.r1
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
                // 범위 안의 칸은 모두 선택된 것으로 알린다(다중 선택 격자의 ARIA 계약).
                const selected = inRange(range, r, c);
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
                    // 선택은 click으로 받는다. mousedown이 스프레드시트답지만, 그걸 쓰면
                    // 보조기술이 만들어내는 click(마우스 없는 경로)이 선택을 못 하게 된다.
                    // Shift+클릭은 활성 칸을 두고 반대쪽 끝만 옮긴다(엑셀과 같다).
                    onClick={(e) => {
                      if (editing) return;
                      if (e.shiftKey) extendTo(r, c);
                      else moveTo(r, c);
                      focusInput();
                    }}
                    // 채우기 핸들을 끄는 동안 지나간 칸이 목표가 된다.
                    onMouseEnter={() => {
                      if (fillTo !== null) setFillTo({ r, c });
                    }}
                    onDoubleClick={() => beginEdit(r, c, rawOf(r, c))}
                    className={`absolute overflow-hidden border-b border-r border-border px-1.5 text-sm leading-[26px] whitespace-nowrap ${
                      numeric ? "text-right tabular-nums" : "text-left"
                    } ${text.startsWith("#") ? "text-destructive" : ""} ${
                      // 활성 칸은 음영에서 뺀다 — 엑셀처럼 "지금 어디를 치고 있는지"가 범위
                      // 안에서도 또렷하게 보여야 한다.
                      selected && !(r === sel.r && c === sel.c) ? "bg-primary/10" : ""
                    } ${
                      fillTo && inRange(normalize(fillTo, { r: range.r1, c: range.c1 }), r, c)
                        ? "bg-primary/5 ring-1 ring-inset ring-primary/40"
                        : ""
                    } ${
                      r === sel.r && c === sel.c ? "z-10 ring-2 ring-inset ring-primary" : ""
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
            onCopy={onCopy}
            onCut={onCut}
            onPaste={onPaste}
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

          {/* 채우기 핸들 — 범위 오른쪽 아래 모서리의 작은 사각형. 끌면 연속 데이터가 채워진다.
              button이 아니라 div인 이유: 누르는 순간부터 끌기가 시작되고 클릭으로 끝나는 동작이
              아니다. 키보드 사용자를 위한 대체 경로는 복사 + 범위 붙여넣기다. */}
          <div
            aria-label="채우기 핸들"
            role="presentation"
            onMouseDown={(e) => {
              e.preventDefault();
              setFillTo({ r: range.r1, c: range.c1 });
            }}
            className="absolute z-40 size-2 cursor-crosshair rounded-[1px] bg-primary"
            style={{
              left: HEAD_W + (range.c1 + 1) * COL_W - 4,
              top: HEAD_H + (range.r1 + 1) * ROW_H - 4,
            }}
          />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        {`${clamp(sel.r + 1, 1, rows)}행 ${colToLetters(sel.c)}열` +
          (range.r0 !== range.r1 || range.c0 !== range.c1
            ? ` · ${(range.r1 - range.r0 + 1) * (range.c1 - range.c0 + 1)}칸 선택`
            : "") +
          " · F2 편집 · Enter 확정 · Esc 취소 · Ctrl+Z 실행취소"}
      </p>
    </div>
  );
}
