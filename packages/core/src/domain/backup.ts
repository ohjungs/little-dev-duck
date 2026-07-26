// 2026-07-26 : 백업 - 내보내기 - 번들조립
// "내 데이터 내보내기"가 실제로 복원 가능한 백업이 되도록 파일 형태를 한곳에서 정한다.
// 이 모듈이 생기기 전 내보내기는 페이지의 **제목·아이콘만** 담고 본문(content jsonb)을 버렸고,
// 캘린더 일정·습관 체크 기록은 아예 조회하지도 않았다 — 사용자는 그걸 알 방법이 없었다.
//
// 순수함수다. 조회는 api가, 파일 다운로드는 UI가 맡는다(db-export.ts의 CSV와 같은 분업).

// 형식이 바뀌었을 때 옛 파일을 거부할지 변환할지 정하려면 파일 자신이 버전을 알아야 한다.
// 가져오기(복원)를 붙일 때 이 값이 판정 기준이 된다.
export const BACKUP_FORMAT_VERSION = 1;

export type BackupCollections = {
  todos: unknown[];
  memos: unknown[];
  habits: unknown[];
  habitChecks: unknown[];
  calendarEvents: unknown[];
  pages: unknown[];
};

export type BackupCollectionKey = keyof BackupCollections;

export type Backup = BackupCollections & {
  formatVersion: number;
  exportedAt: string;
  // 조회 상한에 닿아 뒤가 잘렸을 수 있는 컬렉션. 비어 있으면 전부 온전하다.
  truncated: BackupCollectionKey[];
};

const KEYS: BackupCollectionKey[] = [
  "calendarEvents",
  "habitChecks",
  "habits",
  "memos",
  "pages",
  "todos",
];

// caps는 각 조회가 건 상한(예: .limit(500)). 돌아온 개수가 상한과 같으면 그 뒤에 더 있는지
// 여기서는 알 수 없다 — "잘렸다"가 아니라 "잘렸을 수 있다"로 다루고 호출부가 사용자에게 알린다.
// 상한을 주지 않은 컬렉션은 판정하지 않는다(모르는 것을 아는 척하지 않는다).
export function buildBackup(
  collections: BackupCollections,
  exportedAt: string,
  caps: Partial<Record<BackupCollectionKey, number>>,
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
    todos: [...collections.todos],
    memos: [...collections.memos],
    habits: [...collections.habits],
    habitChecks: [...collections.habitChecks],
    calendarEvents: [...collections.calendarEvents],
    pages: [...collections.pages],
  };
}
