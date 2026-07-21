// "YYYY-MM-DD" → UTC 자정 기준 epoch day 수. 로컬 타임존 영향 없이 날짜 차이만 계산하기 위한
// 공용 헬퍼. 날짜 문자열은 이미 호출부에서 로컬 기준으로 만들어 넘긴다(저장은 UTC, 계산은 로컬 —
// Phase 7 T0 TZ 정책). 시각(datetime)을 받으면 날짜 부분만 쓴다.
export function epochDay(isoDate: string): number {
  const [year, month, day] = isoDate.slice(0, 10).split("-").map(Number);
  return Math.floor(Date.UTC(year, month - 1, day) / 86_400_000);
}
