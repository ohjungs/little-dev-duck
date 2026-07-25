import { describe, expect, it } from "vitest";
import {
  PUBLIC_PAGE_META_LIMITS,
  publicPageMetaCopy,
} from "./public-page-meta";

describe("publicPageMetaCopy", () => {
  it("정상 제목은 그대로 쓰고 설명에도 반영한다", () => {
    const copy = publicPageMetaCopy("주간 회고");
    expect(copy.title).toBe("주간 회고");
    expect(copy.description).toContain("주간 회고");
  });

  it("브랜드 접미는 붙이지 않는다(layout title.template이 붙이므로 중복 방지)", () => {
    const copy = publicPageMetaCopy("주간 회고");
    expect(copy.title).not.toContain("Little Dev Duck");
  });

  it("빈 제목·공백만이면 대체 제목을 쓴다", () => {
    expect(publicPageMetaCopy("").title).toBe("제목 없음");
    expect(publicPageMetaCopy("   \n\t ").title).toBe("제목 없음");
  });

  it("개행·연속 공백은 한 줄로 정규화한다(카드 문구 깨짐 방지)", () => {
    const copy = publicPageMetaCopy("첫 줄\n\n둘째   줄\t끝");
    expect(copy.title).toBe("첫 줄 둘째 줄 끝");
  });

  it("제목이 상한을 넘으면 말줄임표로 자른다", () => {
    const long = "가".repeat(200);
    const copy = publicPageMetaCopy(long);
    expect([...copy.title]).toHaveLength(PUBLIC_PAGE_META_LIMITS.title);
    expect(copy.title.endsWith("…")).toBe(true);
  });

  it("설명도 상한을 넘지 않는다", () => {
    const copy = publicPageMetaCopy("나".repeat(500));
    expect([...copy.description].length).toBeLessThanOrEqual(
      PUBLIC_PAGE_META_LIMITS.description,
    );
  });

  it("이모지를 잘라도 서로게이트 페어가 깨지지 않는다", () => {
    // 코드포인트 단위로 잘라야 반쪽 서로게이트(U+FFFD로 표시됨)가 남지 않는다
    const copy = publicPageMetaCopy("🦆".repeat(200));
    expect(copy.title).toBe(`${"🦆".repeat(PUBLIC_PAGE_META_LIMITS.title - 1)}…`);
  });

  it("상한 이하 제목은 말줄임표를 붙이지 않는다", () => {
    const exact = "다".repeat(PUBLIC_PAGE_META_LIMITS.title);
    expect(publicPageMetaCopy(exact).title).toBe(exact);
  });
});
