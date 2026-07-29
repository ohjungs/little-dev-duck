// 2026-07-29 : 뉴스 - 방문 시 자동 수집 (Phase 61 후속)
// "매일 10개"가 성립하려면 수집이 돌아야 하는데 지금은 수동 버튼뿐이다. 서버 예약 실행은
// CRON_SECRET(PENDING 6번) 대기라, 그때까지는 **뉴스 화면 방문이 트리거**다: 마지막 수집이
// 오래됐으면(6시간) 들어올 때 한 번 자동 수집한다. 기록은 기기별 localStorage —
// 수집 자체는 서버가 계정 기준으로 하므로 기기마다 한 번 더 돌아도 중복 저장은 없다
// (url_hash 유니크). 판정을 순수 함수로 둬 테스트가 시각과 무관하게 성립한다.

const KEY = "ldd:news-last-collect";
export const AUTO_COLLECT_STALE_MS = 6 * 60 * 60 * 1000;

type MinimalStorage = Pick<Storage, "getItem" | "setItem">;

function storageOrDefault(storage?: MinimalStorage): MinimalStorage | null {
  if (storage) return storage;
  return typeof window === "undefined" ? null : window.localStorage;
}

export function shouldAutoCollect(nowMs: number, storage?: MinimalStorage): boolean {
  try {
    const s = storageOrDefault(storage);
    if (!s) return false; // SSR에선 돌리지 않는다
    const raw = s.getItem(KEY);
    if (raw === null) return true;
    const last = Number(raw);
    if (!Number.isFinite(last)) return true;
    return nowMs - last > AUTO_COLLECT_STALE_MS;
  } catch {
    return false; // 저장소 접근 불가면 자동은 포기 — 수동 버튼이 있다
  }
}

/** 수집 성공 시각 기록 — 수동·자동 어느 쪽이든 성공하면 부른다(둘을 나누면 두 벌이 된다). */
export function recordCollectDone(nowMs: number, storage?: MinimalStorage): void {
  try {
    storageOrDefault(storage)?.setItem(KEY, String(nowMs));
  } catch {
    // 기록 실패는 다음 방문에 한 번 더 수집될 뿐이다.
  }
}
