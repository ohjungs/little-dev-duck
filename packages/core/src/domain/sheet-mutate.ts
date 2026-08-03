import { formatFormula, parseFormula, type Node } from "./formula-parse";
import {
  MAX_COLS,
  MAX_ROWS,
  formatCellRef,
  normalizeRange,
  parseCellRange,
  type Cell,
  type CellRef,
  type SheetMeta,
} from "./sheet";

// 2026-08-02 : 스프레드시트 - 행·열 삽입삭제 (SPEC-2026-08-02-spreadsheet-a1 T8 / AC-12)
//
// 표를 옮기는 것보다 **수식을 따라 옮기는 것**이 어렵다. 여기가 틀리면 표는 멀쩡해 보이는데
// 수식이 조용히 다른 칸을 가리킨다 — 값이 그럴듯하게 나오므로 아무도 알아채지 못한다.
//
// 복사·붙여넣기(sheet-shift.ts)와 규칙이 **다르다**:
//   복사: 수식이 이사한다 → 상대참조만 따라간다($A$1은 그대로).
//   삽입/삭제: 가리키던 **칸 자체가** 이사한다 → 절대참조도 따라간다.
// 두 규칙을 한 함수로 합치려다 보면 반드시 한쪽이 틀린다. 그래서 파일을 나눠 둔다.
//
// **DB에서 한 문장으로 옮기지 않는 이유**(스펙 D-1-a는 `update ... set r = r + 1`을 적어 뒀다):
// 그 한 문장은 셀의 좌표만 옮기고 **수식 원문은 그대로 둔다.** 수식을 고치려면 어차피 전부
// 읽어 와 파싱해야 하므로, 좌표 이동도 같은 자리에서 함께 하는 편이 어긋날 여지가 없다.

export type Axis = "row" | "col";

export interface AdjustOptions {
  axis: Axis;
  /** 삽입·삭제가 시작되는 인덱스(0-based). */
  at: number;
  /** 양수면 삽입, 음수면 삭제. */
  delta: number;
  /** 지금 바꾸고 있는 시트 이름. 다른 시트를 가리키는 참조는 건드리지 않는다. */
  sheetName?: string;
}

const REF_ERROR: Node = { kind: "error", value: "#REF!" };

function posOf(ref: CellRef, axis: Axis): number {
  return axis === "row" ? ref.r : ref.c;
}

function withPos(ref: CellRef, axis: Axis, pos: number): CellRef {
  return axis === "row" ? { ...ref, r: pos } : { ...ref, c: pos };
}

function limitOf(axis: Axis): number {
  return axis === "row" ? MAX_ROWS : MAX_COLS;
}

/** 이 참조가 이번 변경의 대상인가(같은 시트인가). */
function targets(ref: CellRef, opts: AdjustOptions): boolean {
  if (ref.sheet === null) return true;
  return opts.sheetName !== undefined && ref.sheet === opts.sheetName;
}

/** 한 좌표를 옮긴다. 지워진 자리를 가리키면 null(호출부가 #REF!로 만든다). */
function movePos(pos: number, opts: AdjustOptions): number | null {
  const { at, delta } = opts;
  if (delta > 0) {
    // 삽입: 지점 이후는 밀린다. 격자 끝을 넘으면 갈 곳이 없다.
    if (pos < at) return pos;
    const next = pos + delta;
    return next < limitOf(opts.axis) ? next : null;
  }
  const n = -delta;
  if (pos < at) return pos;
  if (pos < at + n) return null; // 지워진 자리
  return pos - n;
}

function adjustNode(node: Node, opts: AdjustOptions): Node {
  switch (node.kind) {
    case "ref": {
      if (!targets(node.ref, opts)) return node;
      const moved = movePos(posOf(node.ref, opts.axis), opts);
      return moved === null ? REF_ERROR : { kind: "ref", ref: withPos(node.ref, opts.axis, moved) };
    }
    case "range": {
      const n = normalizeRange(node.range);
      if (!targets(n.start, opts)) return node;
      const startPos = posOf(n.start, opts.axis);
      const endPos = posOf(n.end, opts.axis);

      if (opts.delta > 0) {
        // 삽입: 범위 **안쪽**에 끼워 넣으면 범위가 늘어난다(끝만 밀린다).
        const s = startPos < opts.at ? startPos : startPos + opts.delta;
        const e = endPos < opts.at ? endPos : endPos + opts.delta;
        if (s >= limitOf(opts.axis) || e >= limitOf(opts.axis)) return REF_ERROR;
        return {
          kind: "range",
          range: {
            start: withPos(n.start, opts.axis, s),
            end: withPos(n.end, opts.axis, e),
          },
        };
      }

      const del = -opts.delta;
      const delEnd = opts.at + del - 1;
      // 범위가 통째로 지워졌다.
      if (startPos >= opts.at && endPos <= delEnd) return REF_ERROR;
      // 앞이 잘리면 시작은 삭제 지점으로, 뒤가 잘리면 끝만 당겨진다.
      const s = startPos < opts.at ? startPos : Math.max(opts.at, startPos - del);
      const e = endPos <= delEnd ? opts.at - 1 : endPos - del;
      return {
        kind: "range",
        range: {
          start: withPos(n.start, opts.axis, s),
          end: withPos(n.end, opts.axis, e),
        },
      };
    }
    case "unary":
    case "percent":
      return { ...node, operand: adjustNode(node.operand, opts) };
    case "binary":
      return {
        ...node,
        left: adjustNode(node.left, opts),
        right: adjustNode(node.right, opts),
      };
    case "call":
      return { ...node, args: node.args.map((a) => adjustNode(a, opts)) };
    default:
      return node;
  }
}

/** 수식 원문의 참조를 삽입·삭제에 맞춰 고친다. 읽을 수 없는 수식은 원문 그대로 둔다. */
export function adjustFormula(formula: string, opts: AdjustOptions): string {
  const parsed = parseFormula(formula);
  if (!parsed.ok) return formula;
  return formatFormula(adjustNode(parsed.ast, opts));
}

export interface MutateInput {
  cells: readonly Cell[];
  meta: SheetMeta;
  sheetName: string;
  axis: Axis;
  at: number;
  /** 몇 줄을 넣거나 지울 것인가. 삭제는 음수가 아니라 count로 받고 axis+deleting으로 가른다. */
  count: number;
}

export interface MutateResult {
  cells: Cell[];
  meta: SheetMeta;
}

// 값 타입을 제네릭으로 받는다. 열은 {w}, 행은 {h}로 서로 다른 타입이라 하나로 좁혀 쓰면
// 돌려줄 때 타입이 넓어져 호출부와 어긋난다(apps/web 빌드의 더 엄한 타입체크가 잡았다).
function shiftKeyMap<T>(map: Record<string, T>, opts: AdjustOptions): Record<string, T> {
  const out: Record<string, T> = {};
  for (const [key, value] of Object.entries(map)) {
    const moved = movePos(Number(key), opts);
    if (moved === null) continue; // 지워진 줄의 너비·높이는 함께 사라진다
    out[String(moved)] = value;
  }
  return out;
}

function shiftMerges(merges: readonly string[], opts: AdjustOptions): string[] {
  const out: string[] = [];
  for (const text of merges) {
    const parsed = parseCellRange(text);
    if (!parsed) continue;
    const n = normalizeRange(parsed);
    const s = movePos(posOf(n.start, opts.axis), opts);
    const e = movePos(posOf(n.end, opts.axis), opts);
    // 병합이 삭제 범위에 걸리면 통째로 없앤다. 반쯤 남은 병합은 화면에서 어긋난 사각형이 된다.
    if (s === null || e === null) continue;
    out.push(
      `${formatCellRef(withPos(n.start, opts.axis, s))}:${formatCellRef(
        withPos(n.end, opts.axis, e),
      )}`,
    );
  }
  return out;
}

/**
 * 행·열을 넣거나 지운다. 셀 좌표와 **수식 참조**, 그리고 meta(너비·높이·병합)를 함께 옮긴다.
 * 돌려주는 것은 바뀐 셀이 아니라 **시트 전체의 새 셀 목록**이다 — 무엇이 지워졌는지는
 * 호출부가 옛 목록과 견줘 판단한다(그 비교가 저장 계층의 관심사다).
 *
 * 넣기와 지우기를 **다른 함수로** 내보낸다(insertLines·deleteLines). 하나로 두고 boolean을
 * 받으면 호출부에서 그 인자를 빠뜨렸을 때 조용히 반대 동작을 한다 — 실제로 이 함수의
 * 첫 테스트가 그렇게 통과해 버렸다.
 */
function mutateSheet(input: MutateInput, delta: number): MutateResult {
  const opts: AdjustOptions = {
    axis: input.axis,
    at: input.at,
    delta,
    sheetName: input.sheetName,
  };

  const cells: Cell[] = [];
  for (const cell of input.cells) {
    const pos = input.axis === "row" ? cell.r : cell.c;
    const moved = movePos(pos, opts);
    if (moved === null) continue; // 지워진 줄의 셀
    const next: Cell = {
      ...cell,
      ...(input.axis === "row" ? { r: moved } : { c: moved }),
    };
    cells.push(next.f ? { ...next, f: adjustFormula(next.f, opts) } : next);
  }

  return {
    cells,
    meta: {
      ...input.meta,
      cols: input.axis === "col" ? shiftKeyMap(input.meta.cols, opts) : input.meta.cols,
      rows: input.axis === "row" ? shiftKeyMap(input.meta.rows, opts) : input.meta.rows,
      merges: shiftMerges(input.meta.merges, opts),
    },
  };
}

/** 행·열을 끼워 넣는다. */
export function insertLines(input: MutateInput): MutateResult {
  return mutateSheet(input, input.count);
}

/** 행·열을 지운다. 지워진 줄의 셀은 사라지고, 그 줄을 가리키던 수식은 #REF!가 된다. */
export function deleteLines(input: MutateInput): MutateResult {
  return mutateSheet(input, -input.count);
}
