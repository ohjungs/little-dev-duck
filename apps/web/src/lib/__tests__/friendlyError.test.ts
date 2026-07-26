import { describe, it, expect } from "vitest";
import { friendlyError } from "../friendlyError";

// 2026-07-26 : 오류 - 화면표시 - 공용 (Phase 37)
// 이 층의 계약은 셋뿐이다: 아는 상태는 한국어로, 모르는 오류는 원문 그대로, 빈 오류는 폴백.

describe("friendlyError", () => {
  it("마이그레이션 대기는 한국어로 바꿔 준다", () => {
    const msg = friendlyError(
      new Error("Could not find the 'dashboard_layout' column of 'profiles'"),
      "저장하지 못했어요.",
    );
    expect(msg).toContain("아직");
    expect(msg).not.toContain("Could not find");
  });

  it("모르는 오류는 원문을 그대로 보여준다", () => {
    // 과하게 감싸면 진짜 원인을 가린다.
    const raw = "new row violates row-level security policy";
    expect(friendlyError(new Error(raw), "실패")).toBe(raw);
  });

  it("Error가 아니면 폴백 문구를 쓴다", () => {
    expect(friendlyError("문자열", "실패했어요.")).toBe("실패했어요.");
    expect(friendlyError(null, "실패했어요.")).toBe("실패했어요.");
    expect(friendlyError(undefined, "실패했어요.")).toBe("실패했어요.");
  });

  it("메시지가 공백뿐이면 폴백 문구를 쓴다", () => {
    // 빈 말풍선만 뜨면 사용자는 무슨 일이 났는지 알 수 없다.
    expect(friendlyError(new Error("   "), "실패했어요.")).toBe("실패했어요.");
  });
});
