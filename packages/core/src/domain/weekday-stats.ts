// 2026-07-27 : 통계 - 요일별 패턴 (2차 피드백 3-3, Phase 46 T4)
// 요청은 "통계에 쓸만한 **모든** 내용"이라는 열린 요구였다. 계획이 후보를 나열하면서
// **"우리 데이터로 만들 수 있는 것만 넣는다"**를 못박았다 — 없는 데이터로 만든 통계는
// 1차 피드백 4-5의 "조회수"와 같은 함정이다(지어낸 수치).
//
// 요일별 패턴은 **날짜 문자열만 있으면 된다**(habit_checks.checked_date). 원천이 확실하다.
//
// **Date 객체로 요일을 구하지 않는다.** `new Date("YYYY-MM-DD")`는 UTC로 파싱돼 KST에서
// 하루 밀린다 — 이 저장소가 eslint 규칙까지 만든 그 함정이다. 산술로 직접 센다.

export const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"] as const;

export interface WeekdayCount {
  // 0=일요일. `Date.getDay()`와 같은 규약이라 다른 코드와 섞여도 어긋나지 않는다.
  weekday: number;
  label: string;
  count: number;
}

// "YYYY-MM-DD" → 요일(0=일). Zeller 합동식(그레고리력) — 시간대가 개입할 여지가 없다.
export function weekdayOf(isoDate: string): number {
  const [y, m, d] = isoDate.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return -1;
  const yy = m < 3 ? y - 1 : y;
  const mm = m < 3 ? m + 12 : m;
  const k = yy % 100;
  const j = Math.floor(yy / 100);
  const h =
    (d +
      Math.floor((13 * (mm + 1)) / 5) +
      k +
      Math.floor(k / 4) +
      Math.floor(j / 4) +
      5 * j) %
    7;
  // Zeller는 0=토요일이다. 0=일요일로 옮긴다.
  return (h + 6) % 7;
}

/**
 * 날짜 목록을 요일별로 센다. **항상 7칸을 돌려준다** — 기록이 없는 요일이 빠지면
 * 화면에서 "그 요일이 사라진" 것처럼 보이고, 막대 그래프의 x축도 어긋난다.
 *
 * 해석할 수 없는 날짜는 조용히 뺀다(통계 하나 때문에 화면이 죽으면 안 된다).
 */
export function weekdayCounts(dates: readonly string[]): WeekdayCount[] {
  const buckets = new Array<number>(7).fill(0);
  for (const date of dates) {
    const w = weekdayOf(date);
    if (w >= 0) buckets[w] += 1;
  }
  return buckets.map((count, weekday) => ({
    weekday,
    label: WEEKDAY_LABELS[weekday]!,
    count,
  }));
}

/** 가장 많이 한 요일. 기록이 하나도 없으면 null — "일요일이 최고"라고 말하면 거짓이다. */
export function busiestWeekday(counts: readonly WeekdayCount[]): WeekdayCount | null {
  let best: WeekdayCount | null = null;
  for (const c of counts) {
    if (c.count === 0) continue;
    if (!best || c.count > best.count) best = c;
  }
  return best;
}
