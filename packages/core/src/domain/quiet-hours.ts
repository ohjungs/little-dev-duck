// Phase 12 T2 방해금지(DND). 오리가 조용 시간대엔 혼잣말을 안 한다(밤엔 오리도 잔다).
// hour(0-23, 로컬 시각)가 [startHour, endHour) 구간이면 조용. startHour>endHour면 자정을 넘는
// 구간(예: 22시~7시). start===end는 빈 구간(항상 false)으로 본다.
export function isQuietHour(
  hour: number,
  startHour: number,
  endHour: number,
): boolean {
  if (startHour === endHour) return false;
  if (startHour < endHour) return hour >= startHour && hour < endHour;
  return hour >= startHour || hour < endHour;
}
