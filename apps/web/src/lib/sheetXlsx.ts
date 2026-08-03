import * as XLSX from "xlsx";
import {
  MAX_COLS,
  MAX_ROWS,
  parseFormula,
  toLocalDateString,
  type Cell,
  type SheetMeta,
} from "@ldd/core";

// 2026-08-02 : 스프레드시트 - xlsx 입출력 (SPEC-2026-08-02-spreadsheet-a1 T9 / AC-16·17)
//
// **이 파일은 동적으로만 불러온다**(SheetPanel의 `await import(...)`). SheetJS는 수백 KB라
// 첫 화면 번들에 들어가면 시트를 안 쓰는 사람까지 그 값을 치른다.
//
// 의존성 선택 경위(사용자 결정 Q2는 "SheetJS, 라이선스 확인 후"였다):
// npm의 `xlsx`는 0.18.5에서 멈춰 있고 HIGH 권고 2건이 걸려 있다(프로토타입 오염 <0.19.3,
// ReDoS <0.20.2). 패치판은 SheetJS **자체 CDN**에만 올라온다. 그래서 package.json이
// `https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz`를 가리킨다 — 권고 두 건을 모두
// 넘긴 판이고 라이선스는 Apache-2.0이다. 대가는 설치 때 그 CDN에 닿아야 한다는 것이고,
// 닿지 못하면 CI가 그 자리에서 빨갛게 실패하므로 조용히 옛 판으로 내려가지는 않는다.

export interface XlsxSheetInput {
  name: string;
  cells: readonly Cell[];
  meta: SheetMeta;
}

export interface XlsxReadResult {
  sheets: { name: string; cells: Cell[] }[];
  /** 가져오면서 놓친 것. 조용히 버리지 않고 화면이 알린다(AC-16). */
  lost: { formulas: number; macros: boolean };
}

/** 우리 셀 값을 SheetJS 셀로. 계산 결과도 함께 실어야 엑셀이 열자마자 값을 보여준다(AC-17). */
function toXlsxCell(cell: Cell, computed: unknown): XLSX.CellObject | null {
  const value = cell.f ? computed : cell.v;
  const base: Partial<XLSX.CellObject> = {};
  if (cell.f) {
    // SheetJS는 '=' 없이 원문만 받는다.
    base.f = cell.f.slice(1);
  }
  if (typeof value === "number") return { t: "n", v: value, ...base };
  if (typeof value === "boolean") return { t: "b", v: value, ...base };
  if (typeof value === "string") return { t: "s", v: value, ...base };
  // 값이 없고 수식만 있는 경우(계산 전)에도 수식은 실어 보낸다.
  return base.f ? ({ t: "n", v: 0, ...base } as XLSX.CellObject) : null;
}

/**
 * 시트들을 xlsx 바이트로 만든다. 계산된 값은 호출부가 `computed`로 넘긴다 —
 * 여기서 엔진을 돌리지 않는 이유는 화면이 이미 계산해 두었기 때문이다(두 번 세지 않는다).
 */
export function buildXlsx(
  sheets: readonly XlsxSheetInput[],
  computed?: ReadonlyMap<string, unknown>,
): Uint8Array {
  const wb = XLSX.utils.book_new();

  for (const input of sheets) {
    const ws: XLSX.WorkSheet = {};
    let maxR = 0;
    let maxC = 0;

    for (const cell of input.cells) {
      const value = computed?.get(`${input.name}!${cell.r}:${cell.c}`) ?? cell.v;
      const out = toXlsxCell(cell, value);
      if (!out) continue;
      ws[XLSX.utils.encode_cell({ r: cell.r, c: cell.c })] = out;
      if (cell.r > maxR) maxR = cell.r;
      if (cell.c > maxC) maxC = cell.c;
    }

    ws["!ref"] = XLSX.utils.encode_range({
      s: { r: 0, c: 0 },
      e: { r: maxR, c: maxC },
    });
    // 열 너비를 함께 싣는다. 엑셀의 단위는 글자 수라 픽셀을 대략 7로 나눈다(SheetJS 관례).
    const cols = Object.entries(input.meta.cols);
    if (cols.length > 0) {
      const widths: XLSX.ColInfo[] = [];
      for (const [key, value] of cols) {
        const i = Number(key);
        if (!Number.isInteger(i) || i < 0) continue;
        widths[i] = { wch: Math.max(2, Math.round(value.w / 7)) };
      }
      ws["!cols"] = widths;
    }

    XLSX.utils.book_append_sheet(wb, ws, input.name.slice(0, 31));
  }

  return XLSX.write(wb, { bookType: "xlsx", type: "array" }) as Uint8Array;
}

/** xlsx 바이트에서 시트와 셀을 읽는다. 우리가 못 읽는 수식은 값으로 떨어뜨리고 센다. */
export function readXlsx(data: ArrayBuffer | Uint8Array): XlsxReadResult {
  const wb = XLSX.read(data, { type: "array", cellFormula: true, cellNF: false });
  const lost = { formulas: 0, macros: Boolean((wb as { vbaraw?: unknown }).vbaraw) };
  const sheets: { name: string; cells: Cell[] }[] = [];

  for (const name of wb.SheetNames) {
    const ws = wb.Sheets[name];
    const cells: Cell[] = [];
    for (const [addr, raw] of Object.entries(ws)) {
      if (addr.startsWith("!")) continue;
      const cellObj = raw as XLSX.CellObject;
      const pos = XLSX.utils.decode_cell(addr);
      if (pos.r < 0 || pos.r >= MAX_ROWS || pos.c < 0 || pos.c >= MAX_COLS) continue;

      let formula: string | null = null;
      if (typeof cellObj.f === "string" && cellObj.f !== "") {
        const text = `=${cellObj.f}`;
        // 우리 엔진이 읽을 수 있는 수식만 수식으로 들인다. 못 읽는 것을 그대로 넣으면
        // 셀이 통째로 #NAME?이 되어 **엑셀에서 보이던 값마저 사라진다.**
        if (parseFormula(text).ok) formula = text;
        else lost.formulas += 1;
      }

      const v = cellObj.v;
      const value =
        typeof v === "number" || typeof v === "boolean" || typeof v === "string"
          ? v
          : v instanceof Date
            ? // 날짜는 우리 표현(YYYY-MM-DD)으로 (스펙 D-4). **로컬 기준으로 자른다** —
              // SheetJS는 엑셀 일련번호를 로컬 시간의 Date로 만들어 주므로 UTC로 자르면
              // 시간대만큼 하루가 밀린다(저장소 린트 규칙이 잡아 준 자리다).
              toLocalDateString(v)
            : null;

      if (formula === null && value === null) continue;
      cells.push({ r: pos.r, c: pos.c, v: formula ? null : value, f: formula, s: null });
    }
    sheets.push({ name, cells });
  }

  return { sheets, lost };
}
