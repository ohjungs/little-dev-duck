// 북마크(나중에 읽기) 기사 id를 localStorage에 보관 — DB 없음, readArticles.ts 패턴과 동일.
// 상한(MAX)으로 무한 증가 방지(오래된 것부터 버림).

const KEY = "ldd-bookmarked-articles";
const EVENT = "ldd:bookmarked-articles-changed";
const MAX = 200;

// id를 토글하는 순수 목록 연산(있으면 제거, 없으면 맨 앞에 추가하고 max로 상한). favorites.ts와 동일하게
// UI/스토리지에서 분리해 테스트·재사용 가능하게 둔다. 최신을 앞에 두므로 상한 초과 시 가장 오래된 것이 밀려난다.
export function toggleInList(
  ids: readonly string[],
  id: string,
  max: number,
): string[] {
  return ids.includes(id)
    ? ids.filter((x) => x !== id)
    : [id, ...ids].slice(0, max);
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

export function getBookmarkedIds(): string[] {
  return read();
}

export function toggleBookmark(id: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const next = toggleInList(read(), id, MAX);
    window.localStorage.setItem(KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(EVENT));
    return next;
  } catch {
    return read();
  }
}

export function subscribeBookmarks(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}
