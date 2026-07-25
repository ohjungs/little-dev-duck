import { describe, it, expect } from "vitest";
import {
  OFFICE_CHARACTERS,
  CHAR_FRAME_W,
  CHAR_FRAMES_PER_DIR,
  CHAR_DIR_ORDER,
  charDirSlot,
  charSourceX,
  characterSheetFileName,
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

describe("characterSheetFileName 에셋 파일명 계약", () => {
  // 디스크의 실제 파일명(apps/web/public/sprites/modern-interiors/characters/)과 1:1 대응.
  // 이 계약이 깨지면 로더가 조용히 폴백해 화면으로만 발견되므로 여기서 고정한다.
  it("idle은 {Name}_idle_anim_16x16.png, run은 {Name}_run_16x16.png다", () => {
    expect(characterSheetFileName("adam", "idle")).toBe("Adam_idle_anim_16x16.png");
    expect(characterSheetFileName("adam", "run")).toBe("Adam_run_16x16.png");
  });

  it("첫 글자를 대문자로 올린다(파일 시스템 대소문자 일치)", () => {
    expect(characterSheetFileName("amelia", "idle")).toBe("Amelia_idle_anim_16x16.png");
    expect(characterSheetFileName("bob", "run")).toBe("Bob_run_16x16.png");
  });

  it("네 캐릭터 전부 실제 존재하는 8개 파일명을 만든다", () => {
    const expected = [
      "Adam_idle_anim_16x16.png",
      "Adam_run_16x16.png",
      "Alex_idle_anim_16x16.png",
      "Alex_run_16x16.png",
      "Amelia_idle_anim_16x16.png",
      "Amelia_run_16x16.png",
      "Bob_idle_anim_16x16.png",
      "Bob_run_16x16.png",
    ];
    const actual = OFFICE_CHARACTERS.flatMap((c) => [
      characterSheetFileName(c, "idle"),
      characterSheetFileName(c, "run"),
    ]);
    expect(actual).toEqual(expected);
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
