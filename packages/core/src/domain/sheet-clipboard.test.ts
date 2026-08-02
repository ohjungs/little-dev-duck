import { describe, expect, it } from "vitest";
import { parseDelimited, toDelimited } from "./sheet-clipboard";

// 2026-08-02 : 스프레드시트 - 클립보드 (SPEC-2026-08-02-spreadsheet-a1 T6 / AC-13)
// 엑셀에서 복사한 것이 표로 들어오고, 우리에서 복사한 것이 엑셀에 붙어야 한다.
// 어려운 건 구분자가 아니라 **따옴표 안의 줄바꿈·탭·따옴표**다 — 여기서 틀리면 표가 어긋난다.

describe("parseDelimited (TSV)", () => {
  it("탭과 줄바꿈으로 표를 만든다", () => {
    expect(parseDelimited("a\tb\nc\td", "\t")).toEqual([
      ["a", "b"],
      ["c", "d"],
    ]);
  });

  it("따옴표로 감싼 셀 안의 줄바꿈은 셀 내용이다(행이 갈리지 않는다)", () => {
    expect(parseDelimited('a\t"두\n줄"\nb\tc', "\t")).toEqual([
      ["a", "두\n줄"],
      ["b", "c"],
    ]);
  });

  it("따옴표 안의 구분자는 셀 내용이다", () => {
    expect(parseDelimited('"탭\t포함"\tb', "\t")).toEqual([["탭\t포함", "b"]]);
  });

  it("두 번 쓴 따옴표는 따옴표 한 글자다", () => {
    expect(parseDelimited('"그는 ""안녕"" 했다"\tb', "\t")).toEqual([
      ['그는 "안녕" 했다', "b"],
    ]);
  });

  it("CRLF도 한 줄바꿈으로 읽는다(윈도 엑셀)", () => {
    expect(parseDelimited("a\tb\r\nc\td", "\t")).toEqual([
      ["a", "b"],
      ["c", "d"],
    ]);
  });

  it("빈 셀은 빈 문자열로 자리를 지킨다(열이 밀리지 않는다)", () => {
    expect(parseDelimited("a\t\tc", "\t")).toEqual([["a", "", "c"]]);
  });

  it("마지막 줄바꿈은 빈 행을 만들지 않는다", () => {
    expect(parseDelimited("a\tb\n", "\t")).toEqual([["a", "b"]]);
  });

  it("빈 문자열은 빈 표다", () => {
    expect(parseDelimited("", "\t")).toEqual([]);
  });

  it("쉼표 구분자로도 같은 규칙이 선다(CSV — T9가 쓴다)", () => {
    expect(parseDelimited('a,"b,c"\nd,e', ",")).toEqual([
      ["a", "b,c"],
      ["d", "e"],
    ]);
  });
});

describe("toDelimited", () => {
  it("표를 탭과 줄바꿈으로 잇는다", () => {
    expect(
      toDelimited(
        [
          ["a", "b"],
          ["c", "d"],
        ],
        "\t",
      ),
    ).toBe("a\tb\nc\td");
  });

  it("구분자·줄바꿈·따옴표가 든 셀만 따옴표로 감싼다", () => {
    expect(toDelimited([["보통", "두\n줄", '따"옴', "탭\t"]], "\t")).toBe(
      '보통\t"두\n줄"\t"따""옴"\t"탭\t"',
    );
  });

  it("왕복해도 같은 표다", () => {
    const rows = [
      ["a", '두\n줄과 "따옴표"'],
      ["", "탭\t포함"],
    ];
    expect(parseDelimited(toDelimited(rows, "\t"), "\t")).toEqual(rows);
  });
});
