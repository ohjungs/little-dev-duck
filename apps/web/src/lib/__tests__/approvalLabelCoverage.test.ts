import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  createAppActionsAdapter,
  createGitHubIssuesAdapter,
  createGmailAdapter,
  createGoogleCalendarAdapter,
} from "@ldd/api";
import { TOOL_LABELS, describeCall } from "../approvalLabel";

// 2026-07-30 : 오리 - 승인카드 - 라벨 누락 방지 (updateCalendarEvent 추가 중 발견)
//
// 승인 카드는 되돌리기 어려운 작업 앞의 **마지막 방어선**이다(CLAUDE.md 5절). 그런데
// `TOOL_LABELS`에 없는 도구는 `describeCall`이 도구명을 그대로 보여준다 — 사용자에게
// "updateCalendarEvent: ..." 같은 영어 식별자가 뜨고, 무엇을 승인하는지 판단하기 어려워진다.
// 새 mutating 도구를 어댑터에 추가하면서 라벨을 잊는 것은 조용히 일어나는 회귀라 검사로 막는다.
//
// 카탈로그는 정적이라 더미 인자로 어댑터를 만들어도 안전하다(execute를 호출하지 않는다).

function allCatalogs() {
  return [
    createGoogleCalendarAdapter("dummy-token"),
    createGitHubIssuesAdapter("dummy-token"),
    createGmailAdapter("dummy-token"),
    createAppActionsAdapter({} as unknown as SupabaseClient),
  ].flatMap((a) => a.catalog);
}

describe("승인 카드 라벨 커버리지", () => {
  it("검사가 실제로 카탈로그를 읽었다", () => {
    // 0개를 읽고 아래 검사가 공짜로 통과하는 상황을 먼저 배제한다.
    const catalog = allCatalogs();
    expect(catalog.length).toBeGreaterThan(8);
    expect(catalog.filter((d) => d.kind === "mutating").length).toBeGreaterThan(3);
  });

  it("모든 mutating 도구에 한국어 라벨이 있다", () => {
    // readonly는 승인 카드를 타지 않으므로 대상이 아니다.
    const missing = allCatalogs()
      .filter((d) => d.kind === "mutating")
      .map((d) => d.name)
      .filter((name) => !(name in TOOL_LABELS))
      .sort();
    expect(missing).toEqual([]);
  });

  it("라벨이 없으면 도구명이 그대로 노출된다 (이 검사의 존재 이유)", () => {
    // 검사가 막고 있는 실패 모양을 못박는다 — 라벨 없는 도구는 영어 식별자가 그대로 보인다.
    expect(describeCall({ name: "someNewToolNobodyLabeled", args: {} })).toBe(
      "someNewToolNobodyLabeled",
    );
  });

  it("캘린더 수정 카드가 현재 제목과 새 제목을 함께 보여준다", () => {
    // eventId만으론 어느 일정인지 알 수 없다 — title(현재)·newTitle(새)이 모두 드러나야
    // 사용자가 무엇을 승인하는지 판단할 수 있다.
    const text = describeCall({
      name: "updateCalendarEvent",
      args: { eventId: "e1", title: "주간 회의", newTitle: "주간 회의(연기)" },
    });
    expect(text).toContain("캘린더 일정 수정");
    expect(text).toContain("주간 회의");
    expect(text).toContain("주간 회의(연기)");
    expect(text).not.toContain("e1"); // 내부 id는 판단에 도움이 안 되므로 노출하지 않는다
  });
});
