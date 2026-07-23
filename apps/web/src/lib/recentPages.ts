// 최근 연 페이지(MRU) 스냅샷을 localStorage에 보관 — 명령 팔레트에서 빠른 재접근용(무료 원칙, DB 없음).
// 제목/아이콘 스냅샷을 함께 저장해 팔레트가 추가 조회 없이 렌더한다(방문할 때마다 최신값으로 갱신).
// favorites.ts와 동일 패턴(SSR 가드 + 안전 파싱). 순수 목록 연산(pushEntry)은 UI에서 분리해 재사용.

const KEY = "ldd:recent-pages";
const MAX = 8;

export interface RecentPage {
  id: string;
  title: string;
  icon: string | null;
}

// entry를 맨 앞으로(중복 id 제거) 두고 상한까지 자른 새 목록. 순수 함수.
export function pushEntry(
  list: readonly RecentPage[],
  entry: RecentPage,
): RecentPage[] {
  return [entry, ...list.filter((e) => e.id !== entry.id)].slice(0, MAX);
}

function isRecentPage(v: unknown): v is RecentPage {
  if (v === null || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    typeof o.title === "string" &&
    (o.icon === null || typeof o.icon === "string")
  );
}

function read(): RecentPage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter(isRecentPage) : [];
  } catch {
    return [];
  }
}

export function getRecentPages(): RecentPage[] {
  return read();
}

export function recordRecentPage(entry: RecentPage): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(pushEntry(read(), entry)));
  } catch {
    // 저장 실패(quota 등)는 무시 — 부가 기능이라 흐름을 막지 않는다.
  }
}
