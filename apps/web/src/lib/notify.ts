// Phase 12 T4 브라우저 알림 채널. 오리가 주요 이벤트(레벨 업 등)를 OS 네이티브 알림으로 알린다.
// 방해금지 시간대(T2)와 하루 총량 상한을 준수한다. 프로필/서버 없이 localStorage로 상태 관리(ponytail).
import { isQuietHour, nextDailyCount, type DailyCount } from "@ldd/core";
import { readQuietHours } from "./quietHours";

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

// 오리 알림 발송. 권한·방해금지·일일 상한을 모두 통과할 때만 브라우저 알림을 띄운다.
export function notifyDuck(title: string, body: string): void {
  if (notifyPermission() !== "granted") return;
  const now = new Date();
  const q = readQuietHours();
  if (q && isQuietHour(now.getHours(), q.start, q.end)) return; // 밤엔 조용
  if (!consumeDailyBudget(localDate(now))) return;
  try {
    new Notification(title, { body, icon: "/duck-logo.png" });
  } catch {
    // 일부 환경(모바일 등)은 Notification 생성자 직접 호출을 막음 — 조용히 무시
  }
}
