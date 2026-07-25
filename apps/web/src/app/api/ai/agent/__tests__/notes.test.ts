import { describe, expect, it } from "vitest";
import { NO_CALENDAR_NOTE } from "../route";

// 2026-07-26 : 오리 - 미연동안내 - 되는기능까지막던문구
// 원래 문구는 "캘린더/일정 관련 작업을 요청하면 **실행하려 들지 말고** 연동 안내만 하라"였다.
// 그런데 앱 자체 캘린더 도구(addCalendarEvent·listCalendarEvents)는 연동과 무관하게 항상 켜져 있다.
// 즉 구글을 안 붙인 사용자(기본 상태)가 "내일 3시 회의 잡아줘"라고 하면 — 대화창 예시 칩에
// 걸어 둔 바로 그 문장이다 — 되는 기능을 두고 "연동하세요"라고 답하게 만드는 문구였다.
describe("Google Calendar 미연동 안내문", () => {
  it("앱 자체 캘린더는 쓸 수 있다고 알려준다", () => {
    expect(NO_CALENDAR_NOTE).toContain("앱 자체 캘린더");
  });

  it("일정 작업 자체를 막지 않는다", () => {
    // 이 문구가 다시 들어오면 되는 기능이 막힌다.
    expect(NO_CALENDAR_NOTE).not.toContain("실행하려 들지 말고");
  });

  it("구글을 콕 집어 요구할 때만 연동을 안내하도록 조건을 붙인다", () => {
    expect(NO_CALENDAR_NOTE).toContain("구글 캘린더를 콕 집어");
  });
});
