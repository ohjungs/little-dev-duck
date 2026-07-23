import { describe, expect, it } from "vitest";
import { rowsToCsv } from "./db-export";
import type { PropertyDef } from "./database-view";

const PROPS: PropertyDef[] = [
  {
    id: "status",
    name: "상태",
    type: "select",
    options: [
      { id: "todo", name: "할 일", color: "gray" },
      { id: "done", name: "완료", color: "green" },
    ],
  },
  { id: "done", name: "완료여부", type: "checkbox", options: [] },
  { id: "score", name: "점수", type: "number", options: [] },
];

describe("rowsToCsv", () => {
  it("헤더는 제목 + 속성명 순서", () => {
    const csv = rowsToCsv([], PROPS);
    expect(csv).toBe("제목,상태,완료여부,점수");
  });

  it("select는 옵션 이름, checkbox는 예/빈칸, number는 값으로 출력", () => {
    const csv = rowsToCsv(
      [{ title: "작업A", rowProps: { status: "done", done: true, score: 10 } }],
      PROPS,
    );
    expect(csv.split("\n")[1]).toBe("작업A,완료,예,10");
  });

  it("값이 없으면 빈 칸, 미지의 optionId는 빈 칸", () => {
    const csv = rowsToCsv(
      [{ title: "작업B", rowProps: { status: "unknown-opt" } }],
      PROPS,
    );
    expect(csv.split("\n")[1]).toBe("작업B,,,");
  });

  it("콤마·따옴표·개행이 있으면 따옴표로 감싸고 내부 따옴표는 이중화", () => {
    const csv = rowsToCsv(
      [{ title: 'a,b "c"\nd', rowProps: {} }],
      [],
    );
    // 제목만 있는 스키마(속성 0): 헤더 "제목", 값은 이스케이프된 제목
    expect(csv).toBe('제목\n"a,b ""c""\nd"');
  });

  it("수식 인젝션 방어: =,+,@로 시작하면 작은따옴표 접두", () => {
    expect(rowsToCsv([{ title: "=SUM(A1)", rowProps: {} }], []).split("\n")[1]).toBe(
      "'=SUM(A1)",
    );
    expect(rowsToCsv([{ title: "@cmd", rowProps: {} }], []).split("\n")[1]).toBe(
      "'@cmd",
    );
    // 음수(-)는 오탐이 잦아 접두하지 않는다
    expect(rowsToCsv([{ title: "-5", rowProps: {} }], []).split("\n")[1]).toBe(
      "-5",
    );
  });
});
