// 2026-07-29 : 공용 - 최근 목록 (Phase 55 T1 L-017)
// localStorage에 "최근 쓴 것" 목록을 유지하는 한 벌. EmojiPicker의 "자주 쓰는"과
// 검색의 "최근 검색어"가 같이 쓴다 — 각자 들고 있으면 중복 제거·상한 정책이 갈라진다.
// 백업(localPrefs)에는 담지 않는다: 파생값이라 쓰면 다시 쌓인다(local-prefs.ts의 판단).
//
// storage 인자는 테스트 주입용이다. 브라우저 밖(SSR·node 테스트)이나 접근 차단
// 환경(사생활 보호 모드)에서는 조용히 빈 목록/무시 — 이 목록 때문에 기능이 죽으면 안 된다.

type MinimalStorage = Pick<Storage, "getItem" | "setItem">;

function defaultStorage(): MinimalStorage | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

export function readRecentList(
  key: string,
  storage: MinimalStorage | null = defaultStorage(),
): string[] {
  try {
    const raw = storage?.getItem(key);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is string => typeof x === "string");
  } catch {
    return [];
  }
}

/** 목록을 비운다. 지우기는 사용자의 명시 동작이라 실패해도 조용히 — 화면 쪽 상태는 호출부가 비운다. */
export function clearRecentList(
  key: string,
  storage: MinimalStorage | null = defaultStorage(),
): void {
  try {
    storage?.setItem(key, "[]");
  } catch {
    // 저장소 접근 불가 환경 — 어차피 읽기도 빈 목록이다.
  }
}

/** 맨 앞에 넣고(중복은 하나만, 최신이 이긴다) 상한으로 자른 뒤 저장한다. 계산 결과를 돌려줘 화면이 재읽기 없이 반영한다. */
export function pushRecentList(
  key: string,
  item: string,
  cap: number,
  storage: MinimalStorage | null = defaultStorage(),
): string[] {
  const next = [item, ...readRecentList(key, storage).filter((x) => x !== item)].slice(0, cap);
  try {
    storage?.setItem(key, JSON.stringify(next));
  } catch {
    // 저장 실패해도 이번 화면의 목록은 유효하다.
  }
  return next;
}
