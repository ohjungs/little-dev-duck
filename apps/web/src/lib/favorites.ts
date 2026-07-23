// 즐겨찾기 페이지 ID를 localStorage에 저장(무료 원칙 — 프로필 서버/DB 없이). quietHours/notify와 동일
// 패턴: 커스텀 이벤트로 같은 탭 내 컴포넌트 동기화 + storage 이벤트로 다른 탭 동기화. 다른 기기 동기화는
// 후속(프로필 서버 저장). 순수 목록 연산(toggleInList)은 UI에서 분리해 테스트·재사용 가능하게 둔다.

const KEY = "ldd:favorites";
const EVENT = "ldd:favorites-changed";

// 저장된 즐겨찾기 순서를 유지하며 id를 토글(있으면 제거, 없으면 끝에 추가). 순수 함수.
export function toggleInList(ids: readonly string[], id: string): string[] {
  return ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
}

function read(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter((x): x is string => typeof x === "string")
      : [];
  } catch {
    return [];
  }
}

function write(ids: string[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(ids));
  window.dispatchEvent(new Event(EVENT));
}

export function getFavorites(): string[] {
  return read();
}

export function isFavorite(id: string): boolean {
  return read().includes(id);
}

export function toggleFavorite(id: string): void {
  write(toggleInList(read(), id));
}

// 즐겨찾기 변경 구독(같은 탭 커스텀 이벤트 + 다른 탭 storage 이벤트). 해제 함수를 반환.
export function subscribeFavorites(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}
