import { describe, it, expect } from "vitest";
import {
  OFFICE_CHARACTERS,
  CHAR_FRAME_W,
  CHAR_FRAMES_PER_DIR,
  CHAR_DIR_ORDER,
  charDirSlot,
  charSourceX,
  assignLook,
} from "./office-character";

describe("office-character 프레임 기하", () => {
  it("방향 슬롯은 스트립 순서를 따른다", () => {
    expect(charDirSlot("down")).toBe(0);
    expect(charDirSlot("up")).toBe(1);
    expect(charDirSlot("left")).toBe(2);
    expect(charDirSlot("right")).toBe(3);
  });

  it("charSourceX는 방향*6 + 프레임 위치를 픽셀로 환산한다", () => {
    // down, frame 0 -> 0px
    expect(charSourceX("down", 0)).toBe(0);
    // down, frame 5 -> 5*16
    expect(charSourceX("down", 5)).toBe(5 * CHAR_FRAME_W);
    // up 시작 = 6프레임 뒤
    expect(charSourceX("up", 0)).toBe(CHAR_FRAMES_PER_DIR * CHAR_FRAME_W);
    // right 시작 = 18프레임
    expect(charSourceX("right", 0)).toBe(3 * CHAR_FRAMES_PER_DIR * CHAR_FRAME_W);
  });

  it("프레임 인덱스는 방향 내에서 래핑된다(음수·초과 안전)", () => {
    expect(charSourceX("down", CHAR_FRAMES_PER_DIR)).toBe(0); // 6 -> 0
    expect(charSourceX("down", -1)).toBe((CHAR_FRAMES_PER_DIR - 1) * CHAR_FRAME_W);
  });

  it("스트립은 24프레임(4방향 x 6)이다", () => {
    expect(CHAR_DIR_ORDER.length * CHAR_FRAMES_PER_DIR).toBe(24);
  });
});

describe("assignLook 결정적 외형 배분", () => {
  it("같은 입력은 항상 같은 외형을 준다(결정적)", () => {
    const a = assignLook("engineering", 0, 0);
    const b = assignLook("engineering", 0, 0);
    expect(a).toEqual(b);
  });

  it("같은 부서 내에서 캐릭터가 순환해 이웃이 겹치지 않는다", () => {
    const looks = [0, 1, 2, 3].map((i) => assignLook("engineering", i, i).character);
    // 4연속은 4종 모두 서로 다름
    expect(new Set(looks).size).toBe(4);
  });

  it("배정 캐릭터는 항상 유효한 캐릭터 ID다", () => {
    for (let i = 0; i < 35; i++) {
      const look = assignLook("sales", i, i);
      expect(OFFICE_CHARACTERS).toContain(look.character);
      expect(look.hue).toBeGreaterThanOrEqual(0);
    }
  });

  it("hue는 전역 순번으로 돌아 이웃과 다르게 배분된다", () => {
    const h0 = assignLook("hr", 0, 0).hue;
    const h1 = assignLook("hr", 1, 1).hue;
    expect(h0).not.toBe(h1);
  });
});
