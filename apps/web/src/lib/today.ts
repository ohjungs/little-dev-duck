// 로컬 타임존 기준 오늘 날짜("YYYY-MM-DD"). toISOString()은 UTC라 KST 자정~오전 9시 사이에
// 하루 밀리므로, 사용자가 체감하는 "오늘"과 맞추려면 로컬 달력 기준으로 계산한다.
export function todayIso(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
