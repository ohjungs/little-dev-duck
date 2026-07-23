import { describe, expect, it } from "vitest";
import { movePlayer, isAdjacent, describeActivity, deskSlots } from "./office-play";

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
