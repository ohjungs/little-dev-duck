// 2026-07-29 : 뉴스 - 브리핑 완주 XP 하루 1회 게이트 (Phase 61 T2)
// 판정은 대화 XP 상한(msgXpBudget)과 같은 한 벌 — core nextDailyCount, 로컬 날짜.
// 클라이언트 게이트라 콘솔 우회는 가능하다(개인용 제품, RPC는 자기 XP만 — 감수하고 적어 둔다).

import { nextDailyCount, toLocalDateString, type DailyCount } from "@ldd/core";

const KEY = "ldd:briefingXpCount";
const DAILY_CAP = 1;

/** 오늘 브리핑 XP를 아직 안 받았으면 소진하고 true. SSR·저장 불가 환경은 막지 않는다. */
export function consumeBriefingXpBudget(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const raw = window.localStorage.getItem(KEY);
    const stored = raw ? (JSON.parse(raw) as DailyCount) : null;
    const today = toLocalDateString(new Date());
    const { allowed, next } = nextDailyCount(stored, today, DAILY_CAP);
    if (allowed) window.localStorage.setItem(KEY, JSON.stringify(next));
    return allowed;
  } catch {
    return true;
  }
}
