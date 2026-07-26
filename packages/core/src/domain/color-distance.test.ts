import { describe, expect, it } from "vitest";
import {
  deltaE,
  hexToLab,
  lightness,
  JUST_NOTICEABLE_DELTA_E,
} from "./color-distance";

// 2026-07-27 : 색 - 지각 거리 (Phase 44 T3)
// 이 함수들은 **화면 검사(습관 잔디·메모 색)가 통과/실패를 가르는 잣대**다.
// 잣대 자체가 틀리면 그 검사들이 조용히 아무것도 막지 못한다 — 그래서 여기서 먼저 잠근다.
describe("색 지각 거리", () => {
  it("같은 색은 0이다", () => {
    expect(deltaE("#123456", "#123456")).toBe(0);
  });

  it("흑과 백은 최대에 가깝다", () => {
    expect(deltaE("#000000", "#ffffff")).toBeGreaterThan(99);
  });

  it("대소문자·# 유무에 흔들리지 않는다", () => {
    expect(deltaE("#AABBCC", "aabbcc")).toBe(0);
  });

  it("순서를 바꿔도 같은 값이다", () => {
    expect(deltaE("#ff0000", "#00ff00")).toBeCloseTo(
      deltaE("#00ff00", "#ff0000"),
      10,
    );
  });

  it("명도가 같고 색만 달라도 차이를 잡아낸다", () => {
    // 이게 WCAG 명도 대비 대신 ΔE를 쓰는 이유다 — 명도만 재면 이 둘이 "구분 안 됨"이 된다.
    const a = "#7f7f00";
    const b = "#007f7f";
    expect(deltaE(a, b)).toBeGreaterThan(JUST_NOTICEABLE_DELTA_E * 5);
  });

  it("사람이 겨우 알아채는 차이 근처를 실제로 구분한다", () => {
    // 거의 같은 두 회색은 최소 식별치 아래여야 한다.
    expect(deltaE("#808080", "#818181")).toBeLessThan(JUST_NOTICEABLE_DELTA_E);
  });

  it("흰색의 L*은 100, 검정은 0이다", () => {
    expect(lightness("#ffffff")).toBeCloseTo(100, 1);
    expect(lightness("#000000")).toBeCloseTo(0, 1);
  });

  it("Lab 변환이 세 값을 돌려준다", () => {
    const lab = hexToLab("#336699");
    expect(lab).toHaveLength(3);
    expect(Number.isFinite(lab[0])).toBe(true);
  });
});
