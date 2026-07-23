import { describe, expect, it } from "vitest";
import {
  WRITE_ACTIONS,
  buildWriteAssistPrompt,
  writeActionSchema,
} from "./ai-write";

describe("writeActionSchema", () => {
  it("정의된 액션만 통과", () => {
    for (const a of WRITE_ACTIONS) {
      expect(writeActionSchema.parse(a)).toBe(a);
    }
    expect(() => writeActionSchema.parse("bogus")).toThrow();
  });
});

describe("buildWriteAssistPrompt", () => {
  const text = "오늘 회의에서 다음 스프린트 범위를 정했다.";

  it("모든 액션이 원문을 포함한 프롬프트를 만든다", () => {
    for (const a of WRITE_ACTIONS) {
      const p = buildWriteAssistPrompt(a, text);
      expect(p).toContain(text);
      // 설명 없이 결과만 출력하라는 지침이 공통으로 들어간다.
      expect(p).toContain("결과만");
    }
  });

  it("액션별로 다른 지시가 들어간다", () => {
    expect(buildWriteAssistPrompt("summarize", text)).toContain("요약");
    expect(buildWriteAssistPrompt("shorten", text)).toContain("짧");
    expect(buildWriteAssistPrompt("translate_en", text)).toContain("영어");
    expect(buildWriteAssistPrompt("continue", text)).toContain("이어");
    expect(buildWriteAssistPrompt("polish", text)).toContain("다듬");
  });
});
