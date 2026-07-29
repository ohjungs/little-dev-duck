// 2026-07-29 : 오리 - 대화 XP 하루 상한 (Phase 59 T3 Y-007)
// 대화 XP(1점)를 무제한으로 주면 도배가 XP 농사가 된다 — 하루 상한을 건다.
// 판정은 core nextDailyCount(알림 상한과 같은 한 벌), 날짜는 로컬(toLocalDateString).
// 클라이언트 상한이라 콘솔로 우회는 가능하다 — 개인용 제품이고 RPC는 자기 XP만
// 올릴 수 있어(마이그레이션 harden_security_definer 적용됨) 감수한다. 정직하게 적어 둔다.

import { nextDailyCount, toLocalDateString, type DailyCount } from "@ldd/core";

const KEY = "ldd:msgXpCount";
export const MESSAGE_XP_DAILY_CAP = 20;

/** 오늘 대화 XP 여유가 있으면 카운트를 올리고 true. SSR·저장 불가 환경은 막지 않는다. */
export function consumeMessageXpBudget(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const raw = window.localStorage.getItem(KEY);
    const stored = raw ? (JSON.parse(raw) as DailyCount) : null;
    const today = toLocalDateString(new Date());
    const { allowed, next } = nextDailyCount(stored, today, MESSAGE_XP_DAILY_CAP);
    if (allowed) window.localStorage.setItem(KEY, JSON.stringify(next));
    return allowed;
  } catch {
    return true;
  }
}
