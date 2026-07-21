import type { ContributionDay } from "./github-contribution";

// 오리의 데이터 반응 기분. Phase 6 T1의 클라이언트 파생 상태 — DB에 저장하지 않고
// 이미 로드된 투두/커밋 데이터에서 매번 파생한다. (게임화 duck_state는 Phase 7 별개.)
export type DuckMood = "happy" | "sad" | "neutral";

export const DUCK_MOODS = ["happy", "sad", "neutral"] as const;

// 마지막 커밋일로부터 이 일수 이상 지나면 시무룩(sad)해진다. (기준일 포함)
export const STALE_COMMIT_DAYS = 3;

export interface TodayTodoTally {
  total: number;
  done: number;
}

export interface DuckMoodInput {
  todayTodos: TodayTodoTally;
  daysSinceLastCommit: number | null;
}

export function deriveDuckMood(input: DuckMoodInput): DuckMood {
  const { todayTodos, daysSinceLastCommit } = input;
  // 오늘 할 일이 있고 전부 끝냈으면 기뻐함 — 즉각적인 긍정 신호라 최우선.
  if (todayTodos.total > 0 && todayTodos.done >= todayTodos.total) {
    return "happy";
  }
  // 며칠째 커밋이 없으면 시무룩. (기록 없음(null)은 sad로 몰지 않는다.)
  if (daysSinceLastCommit !== null && daysSinceLastCommit >= STALE_COMMIT_DAYS) {
    return "sad";
  }
  return "neutral";
}

// "YYYY-MM-DD" → UTC 자정 기준 epoch day 수. 로컬 타임존 영향 없이 날짜 차이만 계산.
function toEpochDay(isoDate: string): number {
  const [year, month, day] = isoDate.split("-").map(Number);
  return Math.floor(Date.UTC(year, month - 1, day) / 86_400_000);
}

// 오늘(today, "YYYY-MM-DD") 기준 마지막 커밋일로부터 지난 일수. 커밋 기록이 없으면 null.
export function daysSinceLastCommit(
  days: readonly ContributionDay[],
  today: string,
): number | null {
  const commitDates = days.filter((d) => d.count > 0).map((d) => d.date);
  if (commitDates.length === 0) return null;
  // ISO 날짜 문자열의 사전식 비교 = 시간순 비교.
  const latest = commitDates.reduce((a, b) => (a > b ? a : b));
  return toEpochDay(today) - toEpochDay(latest);
}
