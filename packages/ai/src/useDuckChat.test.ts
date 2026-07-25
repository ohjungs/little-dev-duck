import { describe, expect, it } from "vitest";
import type { ToolResult } from "@ldd/core";
import { resolveDuckMessage, summarizeResults, type DuckChatResponse } from "./useDuckChat";

describe("resolveDuckMessage", () => {
  it("final은 LLM 텍스트를 그대로 사용", () => {
    const res: DuckChatResponse = { status: "final", text: "할 일은 2개야 꽥" };
    expect(resolveDuckMessage(res)).toBe("할 일은 2개야 꽥");
  });

  it("rule은 주입된 룰 대사 사용", () => {
    const res: DuckChatResponse = { status: "rule" };
    expect(resolveDuckMessage(res, () => "안녕! 반가워 꽥")).toBe("안녕! 반가워 꽥");
  });

  it("rule인데 룰 대사 주입이 없으면 기본 문구", () => {
    const res: DuckChatResponse = { status: "rule" };
    expect(resolveDuckMessage(res)).toContain("잘 모르겠어요");
  });

  it("unavailable은 서버가 준 안내 메시지를 그대로 사용", () => {
    const res: DuckChatResponse = { status: "unavailable", message: "지금은 어려워요" };
    expect(resolveDuckMessage(res)).toBe("지금은 어려워요");
  });

  it("approval_pending은 메시지가 아니라 null(승인 카드로 별도 표현)", () => {
    const res: DuckChatResponse = { status: "approval_pending", calls: [] };
    expect(resolveDuckMessage(res)).toBeNull();
  });
});

describe("summarizeResults", () => {
  it("전부 성공이면 완료 문구", () => {
    const results: ToolResult[] = [
      { id: "c1", name: "createCalendarEvent", response: { created: { id: "e1" } } },
    ];
    expect(summarizeResults(results)).toBe("완료했어요!");
  });

  it("빈 배열이면 완료 문구(오류가 없으므로)", () => {
    expect(summarizeResults([])).toBe("완료했어요!");
  });

  // 실패 이유는 appActions.errorResult가 손으로 쓴 한국어 문구뿐이다(외부 API 원문은 바깥
  // catch로 빠져 여기 오지 않는다 — 2026-07-26 확인). 그래서 그대로 보여줘도 안전하고,
  // 버리면 사용자는 **무엇을 고쳐야 할지 알 수 없다.**
  it("실패 이유를 사용자에게 그대로 전한다", () => {
    const results: ToolResult[] = [
      { id: "c1", name: "checkHabit", response: { error: "그런 습관을 찾지 못했어요." } },
    ];
    expect(summarizeResults(results)).toContain("그런 습관을 찾지 못했어요.");
  });

  it("성공과 실패가 섞이면 성공분도 있었음을 알린다", () => {
    const results: ToolResult[] = [
      { id: "c1", name: "createTodo", response: { created: { id: "t1" } } },
      { id: "c2", name: "checkHabit", response: { error: "그런 습관을 찾지 못했어요." } },
    ];
    const msg = summarizeResults(results);
    expect(msg).toContain("1개");
    expect(msg).toContain("그런 습관을 찾지 못했어요.");
  });

  it("같은 이유가 반복되면 한 번만 말한다", () => {
    const results: ToolResult[] = [
      { id: "c1", name: "createTodo", response: { error: "할 일 정보가 올바르지 않습니다." } },
      { id: "c2", name: "createTodo", response: { error: "할 일 정보가 올바르지 않습니다." } },
    ];
    const msg = summarizeResults(results);
    expect(msg.split("할 일 정보가 올바르지 않습니다.").length - 1).toBe(1);
  });

  it("이유가 많아도 화면을 덮지 않게 개수를 제한한다", () => {
    const results: ToolResult[] = Array.from({ length: 8 }, (_, i) => ({
      id: `c${i}`,
      name: "createTodo",
      response: { error: `사유${i}` },
    }));
    const msg = summarizeResults(results);
    expect(msg).toContain("사유0");
    expect(msg).not.toContain("사유7");
  });

  it("이유가 비정상적으로 길면 잘라낸다", () => {
    const results: ToolResult[] = [
      { id: "c1", name: "createTodo", response: { error: "가".repeat(500) } },
    ];
    expect(summarizeResults(results).length).toBeLessThan(300);
  });

  // 계약상 error는 문자열이지만, 아니더라도 성공으로 둔갑하면 안 된다.
  it("error가 문자열이 아니어도 성공으로 보고하지 않는다", () => {
    const results: ToolResult[] = [
      { id: "c1", name: "createTodo", response: { error: { code: 500 } } },
    ];
    const msg = summarizeResults(results);
    expect(msg).not.toBe("완료했어요!");
    expect(msg).not.toContain("500"); // 객체가 그대로 찍히지 않는다
  });

  it("빈 문자열 이유는 이유로 치지 않고 일반 문구로 답한다", () => {
    const results: ToolResult[] = [
      { id: "c1", name: "createTodo", response: { error: "   " } },
    ];
    expect(summarizeResults(results)).toBe("일부 작업을 완료하지 못했어요.");
  });
});

// 2026-07-26 : 오리 - 혼합턴 - 조회답이화면까지
// 서버가 조회 답(text)을 만들어 보내도 훅이 무시하면 사용자 눈에는 여전히 "조회 질문을 씹었다".
// 계약에 text가 있다는 사실만으로는 부족해서, 표시 대상인지를 여기서 잠근다.
describe("approval_pending의 조회 답", () => {
  it("text가 있으면 오리가 말할 내용으로 취급하지 않는다(카드와 별개 경로)", () => {
    const res: DuckChatResponse = {
      status: "approval_pending",
      calls: [{ id: "c1", name: "createTodo", args: { title: "장보기" } }],
      text: "이번 주 마감은 보고서예요.",
    };
    // resolveDuckMessage는 승인 카드용이라 null이 맞다 — text는 훅이 별도 메시지로 낸다.
    expect(resolveDuckMessage(res)).toBeNull();
  });

  it("text 없이도 계약이 성립한다(변경만 있는 턴)", () => {
    const res: DuckChatResponse = {
      status: "approval_pending",
      calls: [{ id: "c1", name: "createTodo", args: { title: "장보기" } }],
    };
    expect(resolveDuckMessage(res)).toBeNull();
  });
});
