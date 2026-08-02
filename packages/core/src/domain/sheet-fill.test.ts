import { describe, expect, it } from "vitest";
import { fillValues } from "./sheet-fill";

// 2026-08-02 : 스프레드시트 - 채우기 핸들 (SPEC-2026-08-02-spreadsheet-a1 T6 / AC-14)
// 끌면 값·수식·연속 데이터가 채워진다. 판정은 **원본이 무엇이었나**로 갈린다:
// 숫자 여러 개면 등차, 요일·월 이름이면 그 목록의 다음 것, 나머지는 되풀이.

describe("fillValues — 되풀이", () => {
  it("원본이 하나면 그대로 되풀이한다", () => {
    expect(fillValues(["감"], 3)).toEqual(["감", "감", "감"]);
  });

  it("숫자 하나는 늘리지 않고 되풀이한다(엑셀과 같다 — 늘리려면 두 개를 준다)", () => {
    expect(fillValues(["1"], 3)).toEqual(["1", "1", "1"]);
  });

  it("등차가 아닌 여러 개는 순서대로 되풀이한다", () => {
    expect(fillValues(["가", "나"], 5)).toEqual(["가", "나", "가", "나", "가"]);
  });
});

describe("fillValues — 숫자 등차", () => {
  it("1,2를 끌면 3,4,5가 이어진다", () => {
    expect(fillValues(["1", "2"], 3)).toEqual(["3", "4", "5"]);
  });

  it("간격이 1이 아니어도 이어간다", () => {
    expect(fillValues(["10", "20"], 3)).toEqual(["30", "40", "50"]);
  });

  it("거꾸로도 이어간다", () => {
    expect(fillValues(["5", "3"], 2)).toEqual(["1", "-1"]);
  });

  it("소수 간격에서 부동소수 찌꺼기를 남기지 않는다", () => {
    expect(fillValues(["0.1", "0.2"], 2)).toEqual(["0.3", "0.4"]);
  });

  it("간격이 일정하지 않으면 등차로 보지 않고 되풀이한다", () => {
    expect(fillValues(["1", "2", "4"], 2)).toEqual(["1", "2"]);
  });
});

describe("fillValues — 이름 목록", () => {
  it("요일은 다음 요일로 이어지고 한 바퀴 돈다", () => {
    expect(fillValues(["월"], 3)).toEqual(["화", "수", "목"]);
    expect(fillValues(["토"], 2)).toEqual(["일", "월"]);
  });

  it("긴 요일 이름도 같은 목록으로 본다", () => {
    expect(fillValues(["월요일"], 2)).toEqual(["화요일", "수요일"]);
  });

  it("월 이름이 이어진다", () => {
    expect(fillValues(["11월"], 3)).toEqual(["12월", "1월", "2월"]);
  });

  it("영어 요일도 이어진다(엑셀에서 붙여넣은 표)", () => {
    expect(fillValues(["Mon"], 2)).toEqual(["Tue", "Wed"]);
  });

  it("목록에 있는 두 개를 주면 그 간격만큼 건너뛴다", () => {
    expect(fillValues(["월", "수"], 2)).toEqual(["금", "일"]);
  });
});

describe("fillValues — 경계", () => {
  it("채울 칸이 없으면 빈 배열", () => {
    expect(fillValues(["1", "2"], 0)).toEqual([]);
  });

  it("원본이 비면 빈 값으로 채운다", () => {
    expect(fillValues([], 2)).toEqual(["", ""]);
  });
});
