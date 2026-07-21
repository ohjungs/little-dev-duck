import { XP_PER_LEVEL_BASE, XP_REWARDS, type XpSource } from "./balance";

// 레벨 L에 도달하는 데 필요한 누적 XP(삼각수 곡선). level 1 = 0.
export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  return (XP_PER_LEVEL_BASE * (level - 1) * level) / 2;
}

// 누적 XP로부터 현재 레벨 도출. 정수 산술만 사용(부동소수 경계 오차 회피).
export function deriveLevel(xp: number): number {
  if (xp <= 0) return 1;
  let level = 1;
  while (xpForLevel(level + 1) <= xp) level += 1;
  return level;
}

// 원천에서 얻는 XP를 더한 새 누적 XP. 부수효과 없음 — DB 반영은 api가 담당.
export function xpAfterAward(currentXp: number, source: XpSource): number {
  return currentXp + XP_REWARDS[source];
}

// 다음 레벨까지 남은 XP와 현재 레벨 구간 진행도(0~1). 위젯 게이지용.
export function levelProgress(xp: number): {
  level: number;
  intoLevel: number;
  span: number;
  ratio: number;
} {
  const level = deriveLevel(xp);
  const floor = xpForLevel(level);
  const ceil = xpForLevel(level + 1);
  const span = ceil - floor;
  const intoLevel = xp - floor;
  return { level, intoLevel, span, ratio: span === 0 ? 0 : intoLevel / span };
}
