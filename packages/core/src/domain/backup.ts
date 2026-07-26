// 2026-07-26 : 백업 - 내보내기 - 번들조립
// "내 데이터 내보내기"가 실제로 복원 가능한 백업이 되도록 파일 형태를 한곳에서 정한다.
// 이 모듈이 생기기 전 내보내기는 페이지의 **제목·아이콘만** 담고 본문(content jsonb)을 버렸고,
// 캘린더 일정·습관 체크 기록은 아예 조회하지도 않았다 — 사용자는 그걸 알 방법이 없었다.
//
// 순수함수다. 조회는 api가, 파일 다운로드는 UI가 맡는다(db-export.ts의 CSV와 같은 분업).

import type { LocalPrefs } from "./local-prefs";

// 형식이 바뀌었을 때 옛 파일을 거부할지 변환할지 정하려면 파일 자신이 버전을 알아야 한다.
// 가져오기(복원)를 붙일 때 이 값이 판정 기준이 된다.
//
// v2(2026-07-26): feeds·duckState 추가. **버전을 올린 건 구분용이지 차단용이 아니다** —
// v1 파일에는 두 컬렉션이 없을 뿐이고 나머지는 그대로 복원된다(parseBackup이 선택으로 받는다).
// v3(2026-07-26): pomodoroSessions·activityDaily 추가. v1·v2도 계속 읽는다(선택 키).
// v4(2026-07-26): localPrefs 추가 — 브라우저에만 있던 값(할 일 순서·즐겨찾기·방해금지 등).
// 컬렉션이 아니라 **키→값 맵**이라 BackupCollections에 넣지 않는다(상한·복원계획 로직이 전부
// 배열 전제다). v1~v3 파일에는 없을 뿐이고 나머지는 그대로 복원된다.
export const BACKUP_FORMAT_VERSION = 4;

export type BackupCollections = {
  todos: unknown[];
  memos: unknown[];
  habits: unknown[];
  habitChecks: unknown[];
  calendarEvents: unknown[];
  pages: unknown[];
  // v2 추가. 사용자가 직접 등록한 RSS 피드 — 잃으면 하나씩 다시 넣어야 한다.
  feeds: unknown[];
  // v2 추가. 오리 진행도(xp·레벨·먹이·코스튬). user_id가 기본키라 **행이 최대 1개**지만,
  // 다른 컬렉션과 모양을 맞춰 배열로 둔다(없으면 빈 배열 = 특수 분기가 필요 없다).
  duckState: unknown[];
  // v3 추가. 집중 기록 — 통계 이력이라 잃으면 다시 만들 방법이 없다.
  pomodoroSessions: unknown[];
  // v3 추가. github는 재수집되지만 **claude_code는 로컬 수집기라 재수집이 어렵다** — 유일본이다.
  activityDaily: unknown[];
};

export type BackupCollectionKey = keyof BackupCollections;

export type Backup = BackupCollections & {
  formatVersion: number;
  exportedAt: string;
  // 조회 상한에 닿아 뒤가 잘렸을 수 있는 컬렉션. 비어 있으면 전부 온전하다.
  truncated: BackupCollectionKey[];
  // v4 추가. 브라우저(localStorage)에만 있던 설정. DB 조회가 아니므로 truncated 판정 대상이 아니다.
  localPrefs: LocalPrefs;
};

const KEYS: BackupCollectionKey[] = [
  "activityDaily",
  "calendarEvents",
  "duckState",
  "feeds",
  "habitChecks",
  "habits",
  "memos",
  "pages",
  "pomodoroSessions",
  "todos",
];

// caps는 각 조회가 건 상한(예: .limit(500)). 돌아온 개수가 상한과 같으면 그 뒤에 더 있는지
// 여기서는 알 수 없다 — "잘렸다"가 아니라 "잘렸을 수 있다"로 다루고 호출부가 사용자에게 알린다.
// 상한을 주지 않은 컬렉션은 판정하지 않는다(모르는 것을 아는 척하지 않는다).
export function buildBackup(
  collections: BackupCollections,
  exportedAt: string,
  caps: Partial<Record<BackupCollectionKey, number>>,
  // 브라우저에서만 읽을 수 있는 값이라 호출부가 넣어 준다. 서버·테스트에서는 없는 게 정상이다.
  localPrefs: LocalPrefs = {},
): Backup {
  const truncated = KEYS.filter((key) => {
    const cap = caps[key];
    // 상한 0은 "상한 없음"이 아니라 잘못된 입력이다. 0건인 빈 컬렉션을 잘렸다고 하지 않는다.
    if (cap === undefined || cap <= 0) return false;
    return collections[key].length >= cap;
  });

  return {
    formatVersion: BACKUP_FORMAT_VERSION,
    exportedAt,
    truncated,
    localPrefs: { ...localPrefs },
    todos: [...collections.todos],
    memos: [...collections.memos],
    habits: [...collections.habits],
    habitChecks: [...collections.habitChecks],
    calendarEvents: [...collections.calendarEvents],
    pages: [...collections.pages],
    feeds: [...collections.feeds],
    duckState: [...collections.duckState],
    pomodoroSessions: [...collections.pomodoroSessions],
    activityDaily: [...collections.activityDaily],
  };
}
