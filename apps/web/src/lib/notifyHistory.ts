// 2026-07-29 : 알림 - 히스토리 (Phase 56 T1 M-028)
// "아까 알림이 왜 안 왔지?"의 사후 기록. M-031(지금 왜 막히나)의 짝이다.
// 기기별 localStorage 링 — 알림 상한·권한이 기기별이므로 기록도 기기별이 맞고,
// 새 로그 테이블은 만들지 않는다(계획 M-034의 결). 백업에도 안 담는다(파생 기록).
// 기록은 어떤 경우에도 알림 자체를 막으면 안 된다 — 실패는 전부 조용히 삼킨다.

import type { NotifyBlockReason } from "./notify";
import { readRing, pushRing, clearRing } from "./localRing";

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

// 저장은 공용 localRing 한 벌(Phase 58 T2에서 승격) — 에러 기록(V-007)과 같은 계약을 쓴다.
export function readNotifyHistory(
  storage?: MinimalStorage | null,
): NotifyHistoryEntry[] {
  return storage === undefined
    ? readRing(HISTORY_KEY, isEntry)
    : readRing(HISTORY_KEY, isEntry, storage);
}

export function recordNotifyHistory(
  entry: NotifyHistoryEntry,
  storage?: MinimalStorage | null,
): void {
  if (storage === undefined) pushRing(HISTORY_KEY, entry, NOTIFY_HISTORY_CAP, isEntry);
  else pushRing(HISTORY_KEY, entry, NOTIFY_HISTORY_CAP, isEntry, storage);
}

export function clearNotifyHistory(storage?: MinimalStorage | null): void {
  if (storage === undefined) clearRing(HISTORY_KEY);
  else clearRing(HISTORY_KEY, storage);
}
