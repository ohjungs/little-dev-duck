// 2026-07-26 : 백업 - 브라우저 로컬 설정 - 담을 것 판단
// 브라우저에만 있는 값(localStorage)은 **계정을 옮기거나 브라우저를 바꾸면 그냥 사라진다.**
// DB에 없으니 백업에도 없었다 — 사용자가 손으로 정렬한 할 일 순서가 대표적이다.
//
// **DB로 옮기지 않기로 했다(Phase 31 T3 판단).**
//  1) 마이그레이션 4건이 권한 게이트에 막혀 미적용이다. 다섯 번째를 쌓으면 검증 못 하는 코드만 는다.
//  2) 이 값들은 드래그 정렬·카드 접기처럼 **즉시 반응이 요구되는 화면 상태**다. DB로 옮기면
//     조작 한 번에 네트워크 왕복이 붙는다.
//  3) 일부는 기기별로 다른 게 자연스럽다(테마·사이드바 접힘) — 동기화가 오히려 손해다.
// 대신 **백업 파일에 담는다.** 내보내기·가져오기는 이미 전부 브라우저에서 돈다
// (ExportDataButton은 "use client"), 그래서 새 계층도 새 테이블도 마이그레이션도 필요 없다.
//
// 이 모듈은 순수하다. 읽기 함수를 받아 조립하고, 쓰기 목록을 돌려줄 뿐 localStorage를 모른다.

// 2026-07-29 (Phase 56 T1 M-011): days(0=일~6=토) 추가 — 없으면 매일(하위호환, v4 이전 파일 그대로 복원).
export type QuietHoursPref = { start: number; end: number; days?: number[] };
export type LocalPrefValue = string[] | QuietHoursPref;
export type LocalPrefs = Record<string, LocalPrefValue>;

export type LocalPrefSpec = {
  // 앱이 실제로 쓰는 localStorage 키. 어긋나면 백업이 빈 값을 담고도 성공했다고 말한다.
  key: string;
  label: string;
  kind: "idList" | "quietHours";
};

// 목록 하나의 상한. 백업 파일이 무한정 커지는 걸 막는다(기사 북마크는 앱에서 이미 200 상한).
export const LOCAL_PREF_LIST_CAP = 1000;

// **담는 것** — 사용자가 손으로 정한 값이라 잃으면 다시 손이 간다.
//
// 담지 않기로 한 것과 근거(근거 없는 누락이 Phase 29의 원인이었다):
// - `ldd-theme` · `sidebar-collapsed` — 기기별 취향이다. 밝은 사무실 데스크톱과 어두운 침실
//   노트북에 같은 테마를 강제하는 건 개선이 아니다.
// - 읽음 표시·최근 페이지·최근 검색어·최근 이모지 — 파생값이라 쓰면 다시 쌓인다.
// - 오리 발화 카운터·알림 상한·주간 다이제스트 주차 — **복원하면 오히려 해롭다.**
//   하루/주 단위 카운터를 백업 시점 값으로 되돌리면 상한 계산이 틀어진다.
// - 온보딩 완료 여부 — 새 브라우저에서 한 번 더 보는 게 손해가 아니다.
export const LOCAL_PREF_SPECS: readonly LocalPrefSpec[] = [
  { key: "ldd-todo-order", label: "할 일 순서", kind: "idList" },
  { key: "ldd-habit-order", label: "습관 순서", kind: "idList" },
  { key: "ldd-pinned-memos", label: "고정한 메모", kind: "idList" },
  { key: "ldd-bookmarked-articles", label: "기사 북마크", kind: "idList" },
  { key: "ldd:favorites", label: "즐겨찾기", kind: "idList" },
  { key: "ldd-collapsed-widgets", label: "접어 둔 카드", kind: "idList" },
  { key: "ldd-pomodoro-tags", label: "집중 태그", kind: "idList" },
  { key: "ldd:quietHours", label: "방해금지 시간", kind: "quietHours" },
  // 2026-07-29 (Phase 56 T1 M-008): 알림 키워드 — 사용자가 고른 낱말 목록이라 파생값이 아니다.
  // (알림 방식 모드는 담지 않는다 — 한 번 클릭으로 되돌리는 값이다.)
  { key: "ldd:notify-keywords", label: "알림 키워드", kind: "idList" },
];

const SPEC_BY_KEY = new Map(LOCAL_PREF_SPECS.map((s) => [s.key, s]));

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

// 문자열만 남기고 상한으로 자른다. 기존 read()들(favorites·bookmarkedArticles)이 쓰는 관례와 같다 —
// 값 하나가 깨졌다고 목록 전체를 버리면 사용자는 멀쩡한 나머지까지 잃는다.
function toIdList(v: unknown): string[] | null {
  if (!Array.isArray(v)) return null;
  return v.filter((x): x is string => typeof x === "string").slice(0, LOCAL_PREF_LIST_CAP);
}

// 시각은 0-23이다(core isQuietHour의 계약). 범위 밖이면 조용히 고치지 않고 버린다 —
// 외부 파일이 주는 값이라 "아마 이 뜻이겠지"로 해석하면 사용자가 모르는 설정이 생긴다.
function toQuietHours(v: unknown): QuietHoursPref | null {
  if (!isRecord(v)) return null;
  const { start, end, days } = v;
  const ok = (n: unknown): n is number =>
    typeof n === "number" && Number.isInteger(n) && n >= 0 && n <= 23;
  if (!ok(start) || !ok(end)) return null;
  // days는 선택(없으면 매일). 있으면 0-6 정수만, 중복 제거 — 범위 밖은 버린다(아는 척 금지).
  if (days === undefined) return { start, end };
  if (!Array.isArray(days)) return { start, end };
  const validDays = [
    ...new Set(
      days.filter(
        (d): d is number => typeof d === "number" && Number.isInteger(d) && d >= 0 && d <= 6,
      ),
    ),
  ];
  return { start, end, days: validDays };
}

function coerce(spec: LocalPrefSpec, v: unknown): LocalPrefValue | null {
  if (spec.kind === "quietHours") return toQuietHours(v);
  const list = toIdList(v);
  // 빈 목록은 담지 않는다. 담으면 복원 때 "설정이 있다"고 오인해 새 기기의 기본값을 덮을 여지가 생긴다.
  return list && list.length > 0 ? list : null;
}

// 내보내기. read는 브라우저의 localStorage.getItem을 감싼 함수다.
export function collectLocalPrefs(read: (key: string) => string | null): LocalPrefs {
  const out: LocalPrefs = {};
  for (const spec of LOCAL_PREF_SPECS) {
    let raw: string | null;
    try {
      raw = read(spec.key);
    } catch {
      // 저장소 접근이 막힌 브라우저(사생활 보호 모드 등)에서도 나머지는 담는다.
      continue;
    }
    if (!raw) continue;
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      // 브라우저에 든 값이 깨졌다고 내보내기 전체를 실패시키면 나머지 데이터까지 못 받는다.
      continue;
    }
    const value = coerce(spec, parsed);
    if (value !== null) out[spec.key] = value;
  }
  return out;
}

// 가져오기 입구. **허용 목록이 보안 성질이다** — 백업 파일은 외부에서 온다.
// 목록이 없으면 남이 만든 파일이 브라우저의 아무 키나 덮어쓸 수 있다.
export function parseLocalPrefs(raw: unknown): LocalPrefs {
  if (!isRecord(raw)) return {};
  const out: LocalPrefs = {};
  for (const [key, value] of Object.entries(raw)) {
    const spec = SPEC_BY_KEY.get(key);
    if (!spec) continue;
    const coerced = coerce(spec, value);
    if (coerced !== null) out[key] = coerced;
  }
  return out;
}

// 복원 계획. **이미 있으면 건드리지 않는다** — Phase 29부터의 "지금 데이터를 바꾸지 않는다" 계약
// 그대로다. 실제 사용 사례(브라우저를 바꿈)에서는 키가 없으므로 그대로 복원된다.
// 쓰기는 호출부(브라우저)가 한다. 여기서는 무엇을 쓸지만 정한다.
export function planLocalPrefsRestore(
  prefs: LocalPrefs,
  read: (key: string) => string | null,
): { key: string; value: string }[] {
  const writes: { key: string; value: string }[] = [];
  for (const spec of LOCAL_PREF_SPECS) {
    const value = prefs[spec.key];
    if (value === undefined) continue;
    let existing: string | null;
    try {
      existing = read(spec.key);
    } catch {
      continue;
    }
    // null만 "없음"이다. 빈 문자열은 사용자가 지운 흔적일 수 있어 되살리지 않는다.
    if (existing !== null) continue;
    writes.push({ key: spec.key, value: JSON.stringify(value) });
  }
  return writes;
}
