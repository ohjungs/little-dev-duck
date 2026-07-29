// 2026-07-29 : 공용 - localStorage 링 버퍼 (Phase 58 T2 V-007에서 승격)
// "최신이 앞, 상한 자르기, 깨진 값 무시, 실패는 조용히"가 알림 히스토리(M-028)와
// 에러 기록(V-007) 두 곳에서 필요해졌다 — 세 벌이 되기 전에 한 벌로.
// recentList(문자열 중복 제거 목록)와는 계약이 다르다: 링은 중복 허용·객체 항목.

type MinimalStorage = Pick<Storage, "getItem" | "setItem">;

function defaultStorage(): MinimalStorage | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

export function readRing<T>(
  key: string,
  isEntry: (v: unknown) => v is T,
  storage: MinimalStorage | null = defaultStorage(),
): T[] {
  try {
    const raw = storage?.getItem(key);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isEntry);
  } catch {
    return [];
  }
}

/** 맨 앞에 넣고 상한으로 자른다. 기록 실패가 본 기능을 막으면 안 된다 — 전부 조용히. */
export function pushRing<T>(
  key: string,
  entry: T,
  cap: number,
  isEntry: (v: unknown) => v is T,
  storage: MinimalStorage | null = defaultStorage(),
): void {
  try {
    const next = [entry, ...readRing(key, isEntry, storage)].slice(0, cap);
    storage?.setItem(key, JSON.stringify(next));
  } catch {
    // 위와 같다.
  }
}

export function clearRing(
  key: string,
  storage: MinimalStorage | null = defaultStorage(),
): void {
  try {
    storage?.setItem(key, "[]");
  } catch {
    // 위와 같다.
  }
}
