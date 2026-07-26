import { describe, expect, it } from "vitest";
import { movePlayer, isAdjacent, describeActivity, deskSlots,
  bubbleText,
  BUBBLE_MAX_CHARS,
} from "./office-play";

const noBlock = () => false;

describe("movePlayer", () => {
  it("빈 타일이면 방향대로 한 칸 스냅 이동", () => {
    expect(movePlayer({ x: 2, y: 2 }, "right", 10, 10, noBlock)).toEqual({
      x: 3,
      y: 2,
    });
    expect(movePlayer({ x: 2, y: 2 }, "up", 10, 10, noBlock)).toEqual({
      x: 2,
      y: 1,
    });
  });

  it("충돌 타일이면 제자리", () => {
    const blocked = (x: number, y: number) => x === 3 && y === 2;
    expect(movePlayer({ x: 2, y: 2 }, "right", 10, 10, blocked)).toEqual({
      x: 2,
      y: 2,
    });
  });

  it("경계를 넘으면 제자리", () => {
    expect(movePlayer({ x: 0, y: 0 }, "left", 10, 10, noBlock)).toEqual({
      x: 0,
      y: 0,
    });
    expect(movePlayer({ x: 9, y: 0 }, "right", 10, 10, noBlock)).toEqual({
      x: 9,
      y: 0,
    });
  });
});

describe("isAdjacent", () => {
  it("상하좌우 1칸은 인접", () => {
    expect(isAdjacent({ x: 1, y: 1 }, { x: 2, y: 1 })).toBe(true);
    expect(isAdjacent({ x: 1, y: 1 }, { x: 1, y: 0 })).toBe(true);
  });
  it("대각선·2칸·자기자신은 미인접", () => {
    expect(isAdjacent({ x: 1, y: 1 }, { x: 2, y: 2 })).toBe(false);
    expect(isAdjacent({ x: 1, y: 1 }, { x: 3, y: 1 })).toBe(false);
    expect(isAdjacent({ x: 1, y: 1 }, { x: 1, y: 1 })).toBe(false);
  });
});

describe("describeActivity", () => {
  it("상태별 템플릿", () => {
    expect(describeActivity({ state: "offwork", label: "" })).toContain("퇴근");
    expect(describeActivity({ state: "idle", label: "" })).toContain("쉬는");
    expect(describeActivity({ state: "typing", label: "Edit · x.ts" })).toBe(
      "지금 Edit · x.ts 하는 중이에요.",
    );
  });
});

describe("deskSlots", () => {
  it("0명이면 빈 배열", () => {
    expect(deskSlots(0, 15, 9)).toHaveLength(0);
  });
  it("책상 좌표가 방 경계 안이고 개수만큼 생성", () => {
    const slots = deskSlots(3, 15, 9);
    expect(slots).toHaveLength(3);
    for (const s of slots) {
      expect(s.x).toBeGreaterThan(0);
      expect(s.x).toBeLessThan(15);
      expect(s.y).toBeGreaterThan(0);
      expect(s.y).toBeLessThan(9);
    }
  });
  it("4명이면 두 줄로 나뉜다(한 줄 최대 3)", () => {
    const slots = deskSlots(4, 15, 9);
    expect(slots).toHaveLength(4);
    // 4번째는 두번째 줄 → y가 첫 줄과 다르다.
    expect(slots[3].y).not.toBe(slots[0].y);
  });
});

// 2026-07-27 : 오피스 - 상시 말풍선 (2차 피드백 5-4, Phase 48 T3)
// 요청은 "계속 말하게"였지만, **말풍선을 채우려고 문장을 생성하면 그게 1차 5-7의 "일하는 척"**이다.
// 여기서 잠그는 성질: 실제 업무가 있을 때만 그 업무를 말한다. 없으면 지어내지 않는다.
describe("상시 말풍선 문구", () => {
  it("업무가 있으면 그 업무를 말한다", () => {
    expect(bubbleText({ state: "typing", label: "로그인 고치기" })).toBe("로그인 고치기");
  });

  it("쉬는 중이면 쉬는 중이라고 한다 (없는 일을 만들지 않는다)", () => {
    expect(bubbleText({ state: "idle", label: "무엇이든" })).toBe("쉬는 중");
  });

  it("퇴근했으면 말풍선을 띄우지 않는다", () => {
    // 퇴근한 오리 위에 말풍선이 뜨면 이상하다 — null이면 호출부가 안 그린다.
    expect(bubbleText({ state: "offwork", label: "일" })).toBeNull();
  });

  it("업무명이 비면 지어내지 않고 쉬는 중으로 본다", () => {
    expect(bubbleText({ state: "typing", label: "   " })).toBe("쉬는 중");
  });

  it("긴 업무명은 잘라서 말줄임을 붙인다 (말풍선이 겹치면 못 읽는다)", () => {
    const out = bubbleText({ state: "typing", label: "아주아주아주아주아주아주 긴 업무 이름" })!;
    expect([...out].length).toBeLessThanOrEqual(BUBBLE_MAX_CHARS);
    expect(out.endsWith("…")).toBe(true);
  });

  it("이모지가 섞여도 글자가 깨지지 않는다", () => {
    // slice로 자르면 이모지 중간이 끊겨 깨진 글자가 나온다.
    const out = bubbleText({ state: "typing", label: "🦆".repeat(20) })!;
    expect([...out].every((ch) => ch === "🦆" || ch === "…")).toBe(true);
  });

  it("상한과 정확히 같은 길이는 자르지 않는다", () => {
    const exact = "가".repeat(BUBBLE_MAX_CHARS);
    expect(bubbleText({ state: "typing", label: exact })).toBe(exact);
  });
});
