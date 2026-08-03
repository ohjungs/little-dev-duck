import { describe, expect, it } from "vitest";
import { createDefaultSheetMeta, type Cell } from "@ldd/core";
import { buildXlsx, readXlsx } from "@/lib/sheetXlsx";

// 2026-08-02 : 스프레드시트 - xlsx 입출력 (SPEC-2026-08-02-spreadsheet-a1 T9 / AC-16·17, E5)
// 진짜 라이브러리로 왕복시킨다 — 목으로 가짜 통과를 만들면 "엑셀에서 열린다"는 약속을
// 아무도 확인하지 않은 채로 남는다.

function cell(r: number, c: number, v: Cell["v"], f: string | null = null): Cell {
  return { r, c, v, f, s: null };
}

const META = createDefaultSheetMeta();

describe("buildXlsx → readXlsx 왕복 (E5)", () => {
  it("값과 수식이 보존된다", () => {
    const cells = [cell(0, 0, 10), cell(1, 0, 20), cell(2, 0, null, "=SUM(A1:A2)")];
    const bytes = buildXlsx([{ name: "Sheet1", cells, meta: META }]);
    const back = readXlsx(bytes);

    expect(back.sheets).toHaveLength(1);
    expect(back.sheets[0].name).toBe("Sheet1");
    const byPos = new Map(back.sheets[0].cells.map((x) => [`${x.r}:${x.c}`, x]));
    expect(byPos.get("0:0")?.v).toBe(10);
    expect(byPos.get("2:0")?.f).toBe("=SUM(A1:A2)");
  });

  it("글자·불리언도 그대로 돌아온다", () => {
    const cells = [cell(0, 0, "한글 값"), cell(0, 1, true)];
    const back = readXlsx(buildXlsx([{ name: "Sheet1", cells, meta: META }]));
    const byPos = new Map(back.sheets[0].cells.map((x) => [`${x.r}:${x.c}`, x]));
    expect(byPos.get("0:0")?.v).toBe("한글 값");
    expect(byPos.get("0:1")?.v).toBe(true);
  });

  it("여러 시트가 이름과 함께 오간다", () => {
    const bytes = buildXlsx([
      { name: "매출", cells: [cell(0, 0, 1)], meta: META },
      { name: "단가", cells: [cell(0, 0, 2)], meta: META },
    ]);
    const back = readXlsx(bytes);
    expect(back.sheets.map((s) => s.name)).toEqual(["매출", "단가"]);
  });

  it("빈 시트도 이름을 잃지 않는다", () => {
    const back = readXlsx(buildXlsx([{ name: "빈시트", cells: [], meta: META }]));
    expect(back.sheets[0].name).toBe("빈시트");
    expect(back.sheets[0].cells).toEqual([]);
  });

  it("열 너비가 실린다(엑셀에서 열었을 때 눌린 표로 보이지 않게)", () => {
    const meta = { ...META, cols: { "0": { w: 240 } } };
    const bytes = buildXlsx([{ name: "Sheet1", cells: [cell(0, 0, "긴 제목")], meta }]);
    // 왕복 뒤에도 파일이 읽히는지까지만 본다(너비는 우리 meta가 단일 출처다).
    expect(readXlsx(bytes).sheets[0].cells[0].v).toBe("긴 제목");
  });
});

describe("readXlsx — 잃은 것 알리기 (AC-16)", () => {
  it("우리 파서가 못 읽는 수식은 값으로 떨어뜨리고 센다", () => {
    // SheetJS가 실어 주는 형태 그대로: 우리가 모르는 함수(피벗 계열 등)를 쓴 수식.
    const bytes = buildXlsx([
      {
        name: "Sheet1",
        cells: [{ r: 0, c: 0, v: 7, f: "=GETPIVOTDATA(", s: null }],
        meta: META,
      },
    ]);
    const back = readXlsx(bytes);
    expect(back.lost.formulas).toBe(1);
    // 값은 남는다 — 조용히 버리지 않는다.
    expect(back.sheets[0].cells[0].v).toBe(7);
    expect(back.sheets[0].cells[0].f).toBeNull();
  });

  it("읽을 수 있는 수식은 잃은 것으로 세지 않는다", () => {
    const back = readXlsx(
      buildXlsx([{ name: "Sheet1", cells: [cell(0, 0, 3, "=1+2")], meta: META }]),
    );
    expect(back.lost.formulas).toBe(0);
  });
});
