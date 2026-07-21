import { describe, expect, it } from "vitest";
import { resolveDuckReply, type ChatResponse } from "./useChat";

describe("resolveDuckReply", () => {
  it("llm 답변이 있으면 그대로 사용", () => {
    const res: ChatResponse = { route: "llm", answer: "할 일은 2개야 꽥" };
    expect(resolveDuckReply(res)).toBe("할 일은 2개야 꽥");
  });

  it("rule 분기면 주입된 룰 대사 사용", () => {
    const res: ChatResponse = { route: "rule", answer: null };
    expect(resolveDuckReply(res, () => "안녕! 반가워 꽥")).toBe("안녕! 반가워 꽥");
  });

  it("llm인데 답변이 공백이면 폴백", () => {
    const res: ChatResponse = { route: "llm", answer: "   " };
    expect(resolveDuckReply(res, () => "룰대사")).toBe("룰대사");
  });

  it("룰 대사 주입이 없으면 기본 문구", () => {
    const res: ChatResponse = { route: "rule", answer: null };
    expect(resolveDuckReply(res)).toContain("잘 모르겠어요");
  });
});
