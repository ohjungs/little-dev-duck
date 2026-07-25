import { describe, expect, it } from "vitest";
import { formatWeeklyDigestLines } from "@ldd/core";
import { digestLinesToBlocks } from "../weeklyDigest";

const LINES = formatWeeklyDigestLines(
  {
    todosCompleted: 9,
    todosTotal: 12,
    habitsChecked: 15,
    habitsTotal: 15,
    pomodoroSessions: 8,
    pomodoroMinutes: 200,
    calendarEvents: ["팀 회의"],
    pagesEdited: 23,
  },
  { start: "2026-07-13", end: "2026-07-19" },
);

type Block = { type: string; content?: { text: string }[] };

describe("digestLinesToBlocks", () => {
  const blocks = digestLinesToBlocks(LINES) as Block[];

  it("줄 수만큼 블록을 만든다", () => {
    expect(blocks).toHaveLength(LINES.length);
  });

  it("소제목은 heading이 된다", () => {
    const headings = blocks.filter((b) => b.type === "heading");
    expect(headings.map((h) => h.content?.[0].text)).toEqual([
      "지난 주 요약",
      "이번 주 계획",
    ]);
  });

  it("첫 줄 인사는 문단이다(불릿이 아니라)", () => {
    expect(blocks[0].type).toBe("paragraph");
  });

  it("수치 줄은 불릿이 된다", () => {
    const bullets = blocks.filter((b) => b.type === "bulletListItem");
    expect(bullets.length).toBeGreaterThanOrEqual(5);
    expect(bullets.some((b) => b.content?.[0].text.includes("할 일"))).toBe(true);
  });

  it("빈 줄은 빈 문단이 된다(사용자가 이어 쓸 자리)", () => {
    const last = blocks[blocks.length - 1];
    expect(last.type).toBe("paragraph");
    expect(last.content).toBeUndefined();
  });

  it("빈 배열을 주면 빈 배열이다", () => {
    expect(digestLinesToBlocks([])).toEqual([]);
  });

  it("모든 블록에 type이 있다(BlockNote 최소 요건)", () => {
    for (const b of blocks) expect(typeof b.type).toBe("string");
  });
});
