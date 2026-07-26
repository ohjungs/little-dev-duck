import type { PomodoroSession } from "./pomodoro";

// 2026-07-26 : 뽀모도로 - 이어받기
// **새로고침만 해도 진행 중이던 뽀모도로가 사라지고 있었다.** 위젯은 마운트 시 오늘 집계만
// 읽고 `running`은 false로 시작한다 — 시작할 때 만든 행은 `completed_at`이 null인 채로 남고,
// 사용자는 타이머도 XP도 잃는다. 탭을 잘못 닫거나 새로고침 한 번이면 끝이다.
//
// 순수함수로 둔 이유: "지금 몇 시인지"를 호출부가 넘기면 시간대·시계와 무관하게 테스트할 수 있다.

export type ResumablePomodoro = { id: string; remainingSeconds: number };

/**
 * 이어받을 수 있는 진행 중 세션을 찾는다. 없으면 null.
 *
 * **이미 시간이 지난 세션은 되살리지 않는다.** 자리를 비운 사이 끝났을 세션을 자동 완료하면
 * 하지 않은 집중에 XP가 붙는다 — 남은 시간이 있는 것만 이어받고, 지난 것은 그대로 둔다.
 */
export function findResumablePomodoro(
  sessions: PomodoroSession[],
  nowMs: number,
): ResumablePomodoro | null {
  const open = sessions
    .filter((s) => s.completedAt === null)
    .map((s) => ({ s, startedMs: Date.parse(s.startedAt) }))
    .filter(({ startedMs }) => Number.isFinite(startedMs))
    .sort((a, b) => b.startedMs - a.startedMs);

  const latest = open[0];
  if (!latest) return null;

  const totalMs = latest.s.durationMinutes * 60_000;
  // 기기 시계가 뒤로 가 있으면 elapsed가 음수가 되어 남은 시간이 원래 길이를 넘는다 — 상한을 건다.
  const elapsed = Math.max(0, nowMs - latest.startedMs);
  const remainingMs = totalMs - elapsed;
  if (remainingMs <= 0) return null;

  // 올림한다 — 1초 미만이 0으로 사라지면 이어받자마자 완료로 떨어진다.
  return { id: latest.s.id, remainingSeconds: Math.ceil(remainingMs / 1000) };
}
