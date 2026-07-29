import { describe, expect, it } from "vitest";
import { codeFenceParts } from "./code-fence";

describe("codeFenceParts (``` 코드 블록 분리)", () => {
  it("코드가 없으면 전체가 글", () => {
    expect(codeFenceParts("안녕하세요")).toEqual([
      { kind: "text", text: "안녕하세요" },
    ]);
  });

  it("펜스 블록을 코드로 분리한다", () => {
    expect(codeFenceParts("이거 봐\n```\nconst a = 1;\n```\n좋지")).toEqual([
      { kind: "text", text: "이거 봐\n" },
      { kind: "code", text: "const a = 1;", lang: null },
      { kind: "text", text: "\n좋지" },
    ]);
  });

  it("언어 태그를 읽는다", () => {
    expect(codeFenceParts("```ts\nlet x = 1;\n```")).toEqual([
      { kind: "code", text: "let x = 1;", lang: "ts" },
    ]);
  });

  it("블록 두 개도 각각 분리한다", () => {
    const parts = codeFenceParts("```\na\n```\n중간\n```\nb\n```");
    expect(parts.filter((p) => p.kind === "code")).toHaveLength(2);
  });

  it("닫히지 않은 펜스는 끝까지 코드다 (마크다운 관례 — 자르다 만 것보다 낫다)", () => {
    expect(codeFenceParts("설명\n```\nconst a = 1;")).toEqual([
      { kind: "text", text: "설명\n" },
      { kind: "code", text: "const a = 1;", lang: null },
    ]);
  });

  it("빈 코드 블록은 조각을 만들지 않는다 (복사할 것이 없다)", () => {
    expect(codeFenceParts("```\n```")).toEqual([]);
  });

  it("코드 안의 URL·마크다운은 건드리지 않는다 (코드는 코드 그대로)", () => {
    const parts = codeFenceParts("```\nfetch(\"https://a.com\")\n```");
    expect(parts[0]).toEqual({ kind: "code", text: 'fetch("https://a.com")', lang: null });
  });

  it("빈 문자열은 빈 배열", () => {
    expect(codeFenceParts("")).toEqual([]);
  });
});
