import { describe, it, expect } from "vitest";
import { findResumablePomodoro } from "./pomodoro-resume";

const T0 = Date.parse("2026-07-26T10:00:00.000Z");
const min = (n: number) => n * 60_000;

const session = (over: Partial<{
  id: string;
  durationMinutes: number;
  startedAt: string;
  completedAt: string | null;
}> = {}) => ({
  id: "s1",
  userId: "u",
  durationMinutes: 25,
  tag: null,
  startedAt: new Date(T0).toISOString(),
  completedAt: null,
  createdAt: new Date(T0).toISOString(),
  ...over,
});

describe("findResumablePomodoro", () => {
  it("아직 시간이 남은 세션을 이어받는다", () => {
    // 새로고침만 해도 진행 중이던 뽀모도로가 통째로 사라지던 것을 막는다.
    const r = findResumablePomodoro([session()], T0 + min(10));
    expect(r).toEqual({ id: "s1", remainingSeconds: 15 * 60 });
  });

  it("완료된 세션은 이어받지 않는다", () => {
    const done = session({ completedAt: new Date(T0 + min(25)).toISOString() });
    expect(findResumablePomodoro([done], T0 + min(26))).toBeNull();
  });

  it("이미 시간이 다 지난 세션은 되살리지 않는다", () => {
    // 자리를 비운 사이 끝났을 세션을 자동 완료하면 하지 않은 집중에 XP가 붙는다.
    expect(findResumablePomodoro([session()], T0 + min(30))).toBeNull();
  });

  it("정확히 만료된 순간도 되살리지 않는다 (경계)", () => {
    expect(findResumablePomodoro([session()], T0 + min(25))).toBeNull();
  });

  it("미완료가 여러 개면 가장 최근에 시작한 것을 쓴다", () => {
    const older = session({ id: "old", startedAt: new Date(T0 - min(5)).toISOString() });
    const newer = session({ id: "new", startedAt: new Date(T0).toISOString() });
    expect(findResumablePomodoro([older, newer], T0 + min(1))?.id).toBe("new");
  });

  it("목록이 비면 null", () => {
    expect(findResumablePomodoro([], T0)).toBeNull();
  });

  it("시작 시각이 깨져 있으면 건너뛴다", () => {
    expect(findResumablePomodoro([session({ startedAt: "이상한값" })], T0)).toBeNull();
  });

  it("기기 시계가 뒤로 가 있어도 원래 길이를 넘겨 주지 않는다", () => {
    // 시계 오차로 elapsed가 음수가 되면 남은 시간이 duration보다 커진다 — 상한을 건다.
    const r = findResumablePomodoro([session()], T0 - min(5));
    expect(r?.remainingSeconds).toBe(25 * 60);
  });

  it("남은 초는 올림한다 (1초 미만이 0으로 사라지지 않게)", () => {
    const r = findResumablePomodoro([session()], T0 + min(25) - 500);
    expect(r?.remainingSeconds).toBe(1);
  });
});
