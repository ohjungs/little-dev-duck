import { describe, expect, it } from "vitest";
import {
  timeOfDay,
  timeOverlay,
  shouldWindowsGlow,
  timeOfDayLabel,
  timeOfDayIcon,
  type TimeOfDay,
} from "./office-time";

describe("timeOfDay", () => {
  it("0~5시는 night", () => {
    expect(timeOfDay(0)).toBe("night");
    expect(timeOfDay(3)).toBe("night");
    expect(timeOfDay(5)).toBe("night");
  });

  it("6~7시는 dawn", () => {
    expect(timeOfDay(6)).toBe("dawn");
    expect(timeOfDay(7)).toBe("dawn");
  });

  it("8~11시는 morning", () => {
    expect(timeOfDay(8)).toBe("morning");
    expect(timeOfDay(11)).toBe("morning");
  });

  it("12~16시는 afternoon", () => {
    expect(timeOfDay(12)).toBe("afternoon");
    expect(timeOfDay(16)).toBe("afternoon");
  });

  it("17~19시는 evening", () => {
    expect(timeOfDay(17)).toBe("evening");
    expect(timeOfDay(19)).toBe("evening");
  });

  it("20~23시는 night", () => {
    expect(timeOfDay(20)).toBe("night");
    expect(timeOfDay(23)).toBe("night");
  });
});

describe("timeOverlay", () => {
  it("morning은 알파 0 (오버레이 없음)", () => {
    const overlay = timeOverlay("morning");
    expect(overlay.a).toBe(0);
  });

  it("night는 알파 0.3 — 가장 어두움", () => {
    const overlay = timeOverlay("night");
    expect(overlay.a).toBe(0.3);
    expect(overlay.b).toBeGreaterThan(overlay.r); // 남색: 파랑 채널 우세
  });

  it("evening은 알파 0.15, 오렌지 계열", () => {
    const overlay = timeOverlay("evening");
    expect(overlay.a).toBe(0.15);
    expect(overlay.r).toBe(255);
    expect(overlay.g).toBe(150);
  });

  it("dawn은 알파 0.08, 따뜻한 색조", () => {
    const overlay = timeOverlay("dawn");
    expect(overlay.a).toBe(0.08);
    expect(overlay.r).toBe(255);
  });

  it("afternoon은 알파 0.05", () => {
    const overlay = timeOverlay("afternoon");
    expect(overlay.a).toBe(0.05);
  });

  it("모든 TimeOfDay를 처리함 (누락 없음)", () => {
    const tods: TimeOfDay[] = ["dawn", "morning", "afternoon", "evening", "night"];
    for (const tod of tods) {
      const o = timeOverlay(tod);
      expect(o).toHaveProperty("r");
      expect(o).toHaveProperty("g");
      expect(o).toHaveProperty("b");
      expect(o).toHaveProperty("a");
      expect(o.a).toBeGreaterThanOrEqual(0);
      expect(o.a).toBeLessThanOrEqual(1);
    }
  });
});

describe("shouldWindowsGlow", () => {
  it("evening과 night는 창문 글로우 활성화", () => {
    expect(shouldWindowsGlow("evening")).toBe(true);
    expect(shouldWindowsGlow("night")).toBe(true);
  });

  it("그 외 시간대는 글로우 없음", () => {
    expect(shouldWindowsGlow("dawn")).toBe(false);
    expect(shouldWindowsGlow("morning")).toBe(false);
    expect(shouldWindowsGlow("afternoon")).toBe(false);
  });
});

describe("timeOfDayLabel", () => {
  it("각 시간대별 한국어 레이블 반환", () => {
    expect(timeOfDayLabel("dawn")).toBe("새벽");
    expect(timeOfDayLabel("morning")).toBe("오전");
    expect(timeOfDayLabel("afternoon")).toBe("오후");
    expect(timeOfDayLabel("evening")).toBe("저녁");
    expect(timeOfDayLabel("night")).toBe("밤");
  });
});

describe("timeOfDayIcon", () => {
  it("dawn/morning은 태양 아이콘", () => {
    expect(timeOfDayIcon("dawn")).toBe("☀️");
    expect(timeOfDayIcon("morning")).toBe("☀️");
  });

  it("afternoon은 구름 있는 태양", () => {
    expect(timeOfDayIcon("afternoon")).toBe("🌤️");
  });

  it("evening은 노을", () => {
    expect(timeOfDayIcon("evening")).toBe("🌅");
  });

  it("night는 달", () => {
    expect(timeOfDayIcon("night")).toBe("🌙");
  });
});
