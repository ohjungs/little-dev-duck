import {
  BACKUP_FORMAT_VERSION,
  type Backup,
  type BackupCollectionKey,
} from "./backup";
import { parseLocalPrefs } from "./local-prefs";

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

// v1부터 있던 컬렉션 — 없으면 백업 파일이 아니라고 본다.
const REQUIRED_KEYS: BackupCollectionKey[] = [
  "todos",
  "memos",
  "habits",
  "habitChecks",
  "calendarEvents",
  "pages",
];

// v2에서 늘어난 컬렉션 — **없으면 빈 배열**로 받는다.
// 필수로 두면 Phase 29가 내보낸 v1 파일을 우리 손으로 거부하게 된다. 버전을 올린 이유는
// "이 파일에 무엇이 들어 있는지" 구분하기 위해서지 옛 파일을 막기 위해서가 아니다.
const OPTIONAL_KEYS: BackupCollectionKey[] = [
  "feeds",
  "duckState",
  "pomodoroSessions",
  "activityDaily",
  // v5 추가. 보관 전용(자동 복원 없음) — backup.ts 버전 주석 참조.
  "messageRooms",
  "messages",
];

const KEYS: BackupCollectionKey[] = [...REQUIRED_KEYS, ...OPTIONAL_KEYS];

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

  const missing = REQUIRED_KEYS.filter((k) => raw[k] === undefined);
  if (missing.length > 0) {
    return { ok: false, reason: `백업에 ${missing.join(", ")}이(가) 없습니다.` };
  }

  // 선택 컬렉션은 없으면 빈 배열로 채운다(옛 백업 하위호환). 있는데 모양이 틀리면 그건 거부한다 —
  // "없음"과 "깨짐"은 다르고, 깨진 걸 조용히 버리면 사용자는 넣었다고 믿은 것을 잃는다.
  const collections = new Map<BackupCollectionKey, unknown[]>();
  for (const key of KEYS) {
    const value = raw[key];
    if (value === undefined && OPTIONAL_KEYS.includes(key)) {
      collections.set(key, []);
      continue;
    }
    if (!Array.isArray(value)) {
      return { ok: false, reason: `${key}이(가) 목록 형태가 아닙니다.` };
    }
    // 항목이 객체가 아니면 복원 단계에서 정체 모를 실패가 난다. 입구에서 막는다.
    if (value.some((item) => !isRecord(item))) {
      return { ok: false, reason: `${key}에 항목이 아닌 값이 섞여 있습니다.` };
    }
    collections.set(key, value);
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
      // v4 이전 파일에는 없다. parseLocalPrefs가 허용 목록으로 걸러내므로 **낯선 키는 들어오지
      // 못한다** — 백업 파일은 외부에서 오고, 그대로 믿으면 브라우저의 아무 키나 덮어쓸 수 있다.
      localPrefs: parseLocalPrefs(raw.localPrefs),
      todos: collections.get("todos") ?? [],
      memos: collections.get("memos") ?? [],
      habits: collections.get("habits") ?? [],
      habitChecks: collections.get("habitChecks") ?? [],
      calendarEvents: collections.get("calendarEvents") ?? [],
      pages: collections.get("pages") ?? [],
      feeds: collections.get("feeds") ?? [],
      duckState: collections.get("duckState") ?? [],
      pomodoroSessions: collections.get("pomodoroSessions") ?? [],
      activityDaily: collections.get("activityDaily") ?? [],
      messageRooms: collections.get("messageRooms") ?? [],
      messages: collections.get("messages") ?? [],
    },
  };
}
