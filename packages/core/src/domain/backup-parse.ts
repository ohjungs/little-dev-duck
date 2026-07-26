import {
  BACKUP_FORMAT_VERSION,
  type Backup,
  type BackupCollectionKey,
} from "./backup";

// 2026-07-26 : 백업 - 가져오기 - 파일검증
// 사용자가 고른 파일이 실제로 우리 백업인지 판정하는 입구. 복원은 데이터를 쓰는 일이라
// **여기서 막지 못한 것은 DB까지 간다** — 정체 모를 실패 대신 왜 안 되는지 말한다.
//
// zod를 쓰지 않았다: 각 컬렉션의 항목 타입은 복원 단계에서 도메인별로 검사하고(이미 스키마가
// 있다), 여기서 볼 것은 봉투(버전 + 여섯 배열)뿐이다. zod로 감싸면 검사 세 개를 다시 쓰면서
// 사용자에게 보일 한국어 사유를 만들기만 더 어려워진다.

export type BackupParseResult =
  | { ok: true; backup: Backup }
  | { ok: false; reason: string };

const KEYS: BackupCollectionKey[] = [
  "todos",
  "memos",
  "habits",
  "habitChecks",
  "calendarEvents",
  "pages",
];

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function parseBackup(raw: unknown): BackupParseResult {
  if (!isRecord(raw)) {
    return { ok: false, reason: "백업 파일이 아닙니다. JSON 객체가 아닙니다." };
  }

  const version = raw.formatVersion;
  if (typeof version !== "number" || !Number.isInteger(version) || version < 1) {
    return {
      ok: false,
      reason: "백업 파일이 아닙니다. 형식 버전(formatVersion)이 없거나 올바르지 않습니다.",
    };
  }
  // 모르는 형식을 아는 척 읽으면 데이터가 조용히 어긋난 채 들어간다.
  if (version > BACKUP_FORMAT_VERSION) {
    return {
      ok: false,
      reason: `더 새로운 버전(${version})의 백업입니다. 이 앱은 ${BACKUP_FORMAT_VERSION}까지 읽습니다.`,
    };
  }

  const missing = KEYS.filter((k) => raw[k] === undefined);
  if (missing.length > 0) {
    return { ok: false, reason: `백업에 ${missing.join(", ")}이(가) 없습니다.` };
  }

  const notArray = KEYS.filter((k) => !Array.isArray(raw[k]));
  if (notArray.length > 0) {
    return { ok: false, reason: `${notArray.join(", ")}이(가) 목록 형태가 아닙니다.` };
  }

  // 항목이 객체가 아니면 복원 단계에서 정체 모를 실패가 난다. 입구에서 막는다.
  for (const key of KEYS) {
    const items = raw[key] as unknown[];
    if (items.some((item) => !isRecord(item))) {
      return { ok: false, reason: `${key}에 항목이 아닌 값이 섞여 있습니다.` };
    }
  }

  return {
    ok: true,
    backup: {
      formatVersion: version,
      // 표시용이고 복원에 쓰이지 않는다. 없거나 깨졌다고 복원을 막을 이유가 없다.
      exportedAt: typeof raw.exportedAt === "string" ? raw.exportedAt : "",
      // 잘린 백업이라도 복원 가치가 있다. 다만 그 사실은 호출부가 알려야 하므로 보존한다.
      truncated: Array.isArray(raw.truncated)
        ? (raw.truncated.filter(
            (k): k is BackupCollectionKey =>
              typeof k === "string" && (KEYS as string[]).includes(k),
          ))
        : [],
      todos: raw.todos as unknown[],
      memos: raw.memos as unknown[],
      habits: raw.habits as unknown[],
      habitChecks: raw.habitChecks as unknown[],
      calendarEvents: raw.calendarEvents as unknown[],
      pages: raw.pages as unknown[],
    },
  };
}
