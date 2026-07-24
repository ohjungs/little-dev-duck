// 북마크(나중에 읽기) 기사 id를 localStorage에 보관 — DB 없음, readArticles.ts 패턴과 동일.
// 상한(MAX)으로 무한 증가 방지(오래된 것부터 버림).

const KEY = "ldd-bookmarked-articles";
const EVENT = "ldd:bookmarked-articles-changed";
const MAX = 200;

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
    const current = read();
    const next = current.includes(id)
      ? current.filter((b) => b !== id)
      : [id, ...current].slice(0, MAX);
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
