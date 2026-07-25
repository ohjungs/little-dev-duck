import { describe, expect, it } from "vitest";
import { calendarEventEmbedText, todoEmbedText } from "./embed-text";

// 이 테스트의 요지: **오리에게 가는 자료에 사용자가 물어볼 정보가 들어 있어야 한다.**
// 2026-07-26에 확인해 보니 할 일은 "제목 (미완료)", 일정은 "제목"뿐이었다. 그 상태로는
// "이번 주 마감 뭐 있어?" "내일 몇 시에 회의야?"에 오리가 답할 근거 자체가 없다
// (대화창 예시 칩에 걸어 둔 문장이 바로 그거였다).
//
// 오리 프롬프트에는 오늘 날짜가 주입되므로(agent.ts) 절대 날짜만 넣으면 상대 표현을 계산할 수 있다.
// "내일" 같은 상대 표현을 임베딩에 넣으면 다음 날 거짓이 되므로 절대 넣지 않는다.

describe("todoEmbedText", () => {
  it("완료 여부를 담는다(기존 계약)", () => {
    expect(todoEmbedText("장보기", false)).toContain("미완료");
    expect(todoEmbedText("장보기", true)).toContain("완료");
    expect(todoEmbedText("장보기", false)).toContain("장보기");
  });

  it("마감일이 없으면 기존과 같은 결과다(하위호환)", () => {
    expect(todoEmbedText("장보기", false)).toBe("장보기 (미완료)");
    expect(todoEmbedText("장보기", false, null)).toBe("장보기 (미완료)");
  });

  it("마감일이 있으면 절대 날짜로 담는다", () => {
    const text = todoEmbedText("보고서", false, "2026-07-27T00:00:00.000Z");
    expect(text).toContain("2026-07-27");
    expect(text).toContain("마감");
  });

  // 마감일은 UTC 자정으로 저장된다(Phase 23 규약). 로컬 변환에 태우면 하루가 밀린다 —
  // 이 세션에서 실제로 낸 회귀라 규약을 테스트로 못박는다.
  it("UTC 자정 저장값을 로컬 변환 없이 그대로 읽는다", () => {
    expect(todoEmbedText("x", false, "2026-07-27T00:00:00.000Z")).toContain("2026-07-27");
  });

  it("해석할 수 없는 마감일은 넣지 않는다", () => {
    expect(todoEmbedText("장보기", false, "언젠가")).toBe("장보기 (미완료)");
    expect(todoEmbedText("장보기", false, "")).toBe("장보기 (미완료)");
  });
});

describe("calendarEventEmbedText", () => {
  // 일정은 **로컬 자정**으로 저장된다(Phase 27 규약 — 할 일과 반대다). slice(0,10)으로 자르면
  // UTC 날짜가 나와 KST에서 전날이 된다. 두 규약이 다르다는 게 이 세션 버그의 단골 원인이었다.
  it("종일 일정은 날짜만 담는다", () => {
    const midnight = new Date(2026, 6, 27, 0, 0, 0);
    const text = calendarEventEmbedText("워크숍", midnight.toISOString());
    expect(text).toContain("워크숍");
    expect(text).toContain("2026-07-27");
    expect(text).not.toContain("00:00");
  });

  it("시각이 있으면 시각도 담는다", () => {
    const at3pm = new Date(2026, 6, 27, 15, 30, 0);
    const text = calendarEventEmbedText("회의", at3pm.toISOString());
    expect(text).toContain("2026-07-27");
    expect(text).toContain("15:30");
  });

  it("종료 시각이 있으면 범위로 담는다", () => {
    const start = new Date(2026, 6, 27, 15, 0, 0);
    const end = new Date(2026, 6, 27, 16, 0, 0);
    const text = calendarEventEmbedText("회의", start.toISOString(), end.toISOString());
    expect(text).toContain("15:00");
    expect(text).toContain("16:00");
  });

  it("해석할 수 없는 시각이면 제목만 남긴다 — 임베딩이 통째로 깨지지 않게", () => {
    expect(calendarEventEmbedText("회의", "언제였더라")).toBe("회의");
  });

  it("종료 시각만 이상하면 시작 정보는 살린다", () => {
    const start = new Date(2026, 6, 27, 15, 0, 0);
    const text = calendarEventEmbedText("회의", start.toISOString(), "이상한값");
    expect(text).toContain("15:00");
    expect(text).not.toContain("이상한값");
  });

  it("빈 제목이어도 날짜 정보는 남는다", () => {
    const at3pm = new Date(2026, 6, 27, 15, 0, 0);
    expect(calendarEventEmbedText("", at3pm.toISOString())).toContain("2026-07-27");
  });
});
