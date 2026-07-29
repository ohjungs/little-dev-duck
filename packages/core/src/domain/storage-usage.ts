// 2026-07-29 : 메신저 - 저장 공간 사용량 (Phase 55 T2 Q-022)
//
// Phase 55의 착수 기준이 "스토리지 사용량이 50%를 넘었는가"인데 그 숫자를 볼 수단이
// 없었다 — 이 모듈이 그 계기판의 순수 계산부다. 합산·조회는 api가 한다.

/** Supabase 무료 티어 파일 스토리지 한도(1GB). 요금제가 바뀌면 여기 한 곳만 고친다. */
export const STORAGE_FREE_TIER_BYTES = 1024 ** 3;

/** 사람이 읽는 용량. 표시용이라 비정상 입력에 던지지 않고 0B로 둔다. */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "0B";
  if (bytes < 1024) return `${Math.round(bytes)}B`;
  const units = ["KB", "MB", "GB", "TB"] as const;
  let value = bytes;
  for (const unit of units) {
    value /= 1024;
    if (value < 1024 || unit === "TB") return `${value.toFixed(1)}${unit}`;
  }
  /* istanbul ignore next -- 위 루프가 TB에서 반드시 반환한다 */
  return `${value.toFixed(1)}TB`;
}

/**
 * 한도 대비 백분율(소수 1자리). 100을 넘으면 **그대로 넘겨서** 보여준다 — 자르면 초과를
 * 숨긴다. 작은 사용량도 0으로 뭉개지 않는다(소수 1자리까지 보존).
 */
export function storageUsagePercent(
  totalBytes: number,
  limitBytes: number = STORAGE_FREE_TIER_BYTES,
): number {
  if (!Number.isFinite(totalBytes) || totalBytes <= 0 || limitBytes <= 0) return 0;
  return Math.round((totalBytes / limitBytes) * 1000) / 10;
}
