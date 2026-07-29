// 2026-07-29 : 알림 - 히스토리 (Phase 56 T1 M-028)
// "아까 알림이 왜 안 왔지?"의 사후 기록. M-031(지금 왜 막히나)의 짝이다.
// 기기별 localStorage 링 — 알림 상한·권한이 기기별이므로 기록도 기기별이 맞고,
// 새 로그 테이블은 만들지 않는다(계획 M-034의 결). 백업에도 안 담는다(파생 기록).
// 기록은 어떤 경우에도 알림 자체를 막으면 안 된다 — 실패는 전부 조용히 삼킨다.

import type { NotifyBlockReason } from "./notify";

const HISTORY_KEY = "ldd:notify-history";
export const NOTIFY_HISTORY_CAP = 50;

export type NotifyOutcome = "fired" | NotifyBlockReason;

export type NotifyHistoryEntry = {
  at: string; // ISO
  title: string;
  outcome: NotifyOutcome;
};

export const NOTIFY_OUTCOME_LABELS: Record<NotifyOutcome, string> = {
  fired: "보냄",
  unsupported: "미지원 브라우저",
  permission: "권한 없음",
  focus: "집중 모드",
  quiet: "방해금지 시간",
  cap: "하루 상한 소진",
};

type MinimalStorage = Pick<Storage, "getItem" | "setItem">;

function defaultStorage(): MinimalStorage | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

function isEntry(v: unknown): v is NotifyHistoryEntry {
  return (
    typeof v === "object" &&
    v !== null &&
    typeof (v as NotifyHistoryEntry).at === "string" &&
    typeof (v as NotifyHistoryEntry).title === "string" &&
    typeof (v as NotifyHistoryEntry).outcome === "string" &&
    (v as NotifyHistoryEntry).outcome in NOTIFY_OUTCOME_LABELS
  );
}

export function readNotifyHistory(
  storage: MinimalStorage | null = defaultStorage(),
): NotifyHistoryEntry[] {
  try {
    const raw = storage?.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isEntry);
  } catch {
    return [];
  }
}

/** 맨 앞에 넣고 상한으로 자른다(최신 먼저). 실패해도 던지지 않는다. */
export function recordNotifyHistory(
  entry: NotifyHistoryEntry,
  storage: MinimalStorage | null = defaultStorage(),
): void {
  try {
    const next = [entry, ...readNotifyHistory(storage)].slice(0, NOTIFY_HISTORY_CAP);
    storage?.setItem(HISTORY_KEY, JSON.stringify(next));
  } catch {
    // 기록 실패가 알림을 막으면 안 된다.
  }
}

export function clearNotifyHistory(
  storage: MinimalStorage | null = defaultStorage(),
): void {
  try {
    storage?.setItem(HISTORY_KEY, "[]");
  } catch {
    // 위와 같다.
  }
}
