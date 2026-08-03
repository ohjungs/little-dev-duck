import { describe, expect, it } from "vitest";
import { buildAxis } from "@/lib/sheetAxis";

// 2026-08-02 : 스프레드시트 - 축 계산 (SPEC-2026-08-02-spreadsheet-a1 T7)
// 열 너비·행 높이가 칸마다 다를 수 있게 되면서 "n번째 칸이 몇 px에서 시작하나"가 더 이상
// 곱셈이 아니다. 100만 행을 매번 누적할 수는 없으므로 **기본 크기 × n + 예외들의 차이 합**으로
// 센다. 예외(사용자가 끌어 바꾼 칸)는 실제로 몇 개 안 된다.

describe("buildAxis — 예외가 없을 때", () => {
  const axis = buildAxis({}, 100);

  it("곱셈과 같다", () => {
    expect(axis.at(0)).toBe(0);
    expect(axis.at(3)).toBe(300);
    expect(axis.size(7)).toBe(100);
  });

  it("픽셀 위치에서 칸 번호를 되찾는다", () => {
    expect(axis.indexAt(0)).toBe(0);
    expect(axis.indexAt(99)).toBe(0);
    expect(axis.indexAt(100)).toBe(1);
    expect(axis.indexAt(-50)).toBe(0);
  });
});

describe("buildAxis — 예외가 있을 때", () => {
  const axis = buildAxis({ "0": { w: 200 }, "2": { w: 50 } }, 100);

  it("예외 칸의 크기를 그대로 쓴다", () => {
    expect(axis.size(0)).toBe(200);
    expect(axis.size(1)).toBe(100);
    expect(axis.size(2)).toBe(50);
  });

  it("뒤 칸의 시작 위치가 앞의 차이만큼 밀린다", () => {
    expect(axis.at(1)).toBe(200);
    expect(axis.at(2)).toBe(300);
    expect(axis.at(3)).toBe(350);
    expect(axis.at(10)).toBe(1050); // 100*10 + (100 - 50)
  });

  it("픽셀 위치도 예외를 반영해 되찾는다", () => {
    expect(axis.indexAt(199)).toBe(0);
    expect(axis.indexAt(200)).toBe(1);
    expect(axis.indexAt(349)).toBe(2);
    expect(axis.indexAt(350)).toBe(3);
  });

  it("높이 키(h)도 같은 규칙으로 읽는다(행 축)", () => {
    const rows = buildAxis({ "1": { h: 40 } }, 26);
    expect(rows.size(1)).toBe(40);
    expect(rows.at(2)).toBe(66);
  });
});
