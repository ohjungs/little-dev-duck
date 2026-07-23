// 읽은 뉴스 기사 id를 localStorage에 보관 — 읽은 것 흐리게/필터용(무료 원칙, DB 없음). favorites.ts 패턴.
// 상한(MAX)으로 무한 증가 방지(오래된 것부터 버림). 순수 목록 연산(markInList)은 UI에서 분리해 재사용.

const KEY = "ldd:read-articles";
const EVENT = "ldd:read-articles-changed";
const MAX = 500;

// id를 읽음 목록에 추가(맨 앞, 중복 제거, 상한 유지). 순수 함수.
export function markInList(ids: readonly string[], id: string): string[] {
  if (ids[0] === id) return [...ids];
  return [id, ...ids.filter((x) => x !== id)].slice(0, MAX);
}

// 여러 id를 한 번에 읽음 목록 앞에 추가(중복 제거, 상한 유지). 순수 함수.
export function markManyInList(
  ids: readonly string[],
  add: readonly string[],
): string[] {
  const addSet = new Set(add);
  return [...add, ...ids.filter((x) => !addSet.has(x))].slice(0, MAX);
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

export function getReadArticles(): string[] {
  return read();
}

export function markArticleRead(id: string): void {
  if (typeof window === "undefined") return;
  try {
    const next = markInList(read(), id);
    window.localStorage.setItem(KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(EVENT));
  } catch {
    // 저장 실패는 무시(부가 기능).
  }
}

// 여러 기사를 한 번에 읽음 처리(1회 저장 + 1회 이벤트).
export function markArticlesRead(ids: readonly string[]): void {
  if (typeof window === "undefined" || ids.length === 0) return;
  try {
    const next = markManyInList(read(), ids);
    window.localStorage.setItem(KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(EVENT));
  } catch {
    // 저장 실패는 무시(부가 기능).
  }
}

export function subscribeReadArticles(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}
