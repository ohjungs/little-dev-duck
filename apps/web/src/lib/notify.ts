// Phase 12 T4 브라우저 알림 채널. 오리가 주요 이벤트(레벨 업 등)를 OS 네이티브 알림으로 알린다.
// 방해금지 시간대(T2)와 하루 총량 상한을 준수한다. 프로필/서버 없이 localStorage로 상태 관리(ponytail).
import { isQuietHour, nextDailyCount, type DailyCount } from "@ldd/core";
import { readQuietHours } from "./quietHours";
import { isFocusMode } from "./focusMode";
// notifyHistory는 이 파일에서 **타입만** 가져가므로 순환은 런타임에 존재하지 않는다.
import { recordNotifyHistory } from "./notifyHistory";

const CAP_KEY = "ldd:notifyCount";
const DAILY_CAP = 10;

export function notifySupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function notifyPermission(): NotificationPermission {
  return notifySupported() ? Notification.permission : "denied";
}

export async function requestNotifyPermission(): Promise<NotificationPermission> {
  if (!notifySupported()) return "denied";
  return Notification.requestPermission();
}

function localDate(now: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
}

// 오늘 알림 여유가 있으면 카운트를 올리고 true. 없으면 false. 상한 판정은 core(nextDailyCount, 테스트됨).
function consumeDailyBudget(today: string): boolean {
  try {
    const raw = window.localStorage.getItem(CAP_KEY);
    const stored = raw ? (JSON.parse(raw) as DailyCount) : null;
    const { allowed, next } = nextDailyCount(stored, today, DAILY_CAP);
    if (allowed) window.localStorage.setItem(CAP_KEY, JSON.stringify(next));
    return allowed;
  } catch {
    return true; // 저장 접근 실패 시 알림을 막지 않는다
  }
}

// 여유가 있는지 **보기만** 한다(카운트를 올리지 않는다) — 진단이 상한을 소모하면 안 된다.
function peekDailyBudget(today: string): boolean {
  try {
    const raw = window.localStorage.getItem(CAP_KEY);
    const stored = raw ? (JSON.parse(raw) as DailyCount) : null;
    return nextDailyCount(stored, today, DAILY_CAP).allowed;
  } catch {
    return true;
  }
}

// 2026-07-29 : 알림 - 차단 사유 진단 (Phase 56 T1 M-031)
// notifyDuck이 조용히 반환하면 사용자는 "왜 안 오지?"에 답을 못 얻는다.
// 게이트 판정을 여기 한 곳으로 모아 발송(notifyDuck)과 진단(테스트 버튼)이 같은 순서를 본다.
export type NotifyBlockReason = "unsupported" | "permission" | "focus" | "quiet" | "cap";

export const NOTIFY_BLOCK_MESSAGES: Record<NotifyBlockReason, string> = {
  unsupported: "이 브라우저는 알림을 지원하지 않아요.",
  permission: "알림 권한이 허용돼 있지 않아요. 위에서 켜 주세요.",
  focus: "집중 모드가 켜져 있어 알림을 쉬고 있어요.",
  quiet: "지금은 방해금지 시간대라 조용히 있어요.",
  cap: "오늘 알림 상한(10건)을 다 썼어요. 내일 다시 열려요.",
};

/** 지금 알림이 막혀 있으면 그 사유, 나갈 수 있으면 null. 상한을 소모하지 않는다. */
export function notifyBlockReason(now: Date = new Date()): NotifyBlockReason | null {
  if (!notifySupported()) return "unsupported";
  if (notifyPermission() !== "granted") return "permission";
  if (isFocusMode()) return "focus";
  const q = readQuietHours();
  if (q && isQuietHour(now.getHours(), q.start, q.end)) return "quiet";
  if (!peekDailyBudget(localDate(now))) return "cap";
  return null;
}

// 오리 알림 발송. 권한·집중 모드·방해금지·일일 상한을 모두 통과할 때만 브라우저 알림을 띄운다.
// (집중 모드 억제를 **여기서** 한다 — 호출부마다 확인하게 두면 한 곳씩 빠진다. Phase 51 T2의 교훈.)
export function notifyDuck(title: string, body: string): void {
  const now = new Date();
  const reason = notifyBlockReason(now);
  // 2026-07-29 (Phase 56 T1 M-028): 발송이든 차단이든 결과를 기록한다 —
  // "아까 왜 안 왔지?"에 답할 수 있게. 본문은 안 남긴다(제목이면 어떤 알림인지 안다).
  if (reason !== null) {
    recordNotifyHistory({ at: now.toISOString(), title, outcome: reason });
    return;
  }
  if (!consumeDailyBudget(localDate(now))) return; // 진단 직후 소진된 드문 경합 — 기록 없이 조용히
  try {
    new Notification(title, { body, icon: "/duck-logo.png" });
  } catch {
    // 일부 환경(모바일 등)은 Notification 생성자 직접 호출을 막음 — 조용히 무시
  }
  recordNotifyHistory({ at: now.toISOString(), title, outcome: "fired" });
}
