// Phase 12 T4 알림 하루 총량 상한. 저장된 {date,count}와 오늘 날짜(로컬)로, 알림을 하나 더 보낼 수
// 있는지(allowed)와 갱신된 카운트(next)를 반환한다. 날짜가 바뀌면 카운트를 리셋한다.
export interface DailyCount {
  date: string; // 'YYYY-MM-DD'(로컬)
  count: number;
}

export function nextDailyCount(
  stored: DailyCount | null,
  today: string,
  cap: number,
): { allowed: boolean; next: DailyCount } {
  const count = stored && stored.date === today ? stored.count : 0;
  if (count >= cap) return { allowed: false, next: { date: today, count } };
  return { allowed: true, next: { date: today, count: count + 1 } };
}
