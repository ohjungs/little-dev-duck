// 게임 밸런스 수치. 조정 시 재배포 없이 이 값만 바꾸면 되도록 코드 로직에서 분리한다
// (FEATURES.md E보완, DECISIONS.md 9절 #7). 시작값은 합리적 추정 — 실사용 후 튜닝한다.

// XP 원천별 획득량. 키가 곧 XpSource 타입.
export const XP_REWARDS = {
  todoComplete: 10,
  commit: 5,
  habitCheck: 8,
  pomodoroComplete: 15,
} as const;

export type XpSource = keyof typeof XP_REWARDS;

// 레벨 곡선 계수. 레벨 L 도달에 필요한 누적 XP = BASE * (L-1) * L / 2 (삼각수 곡선).
// level 1 = 0, 2 = 100, 3 = 300, 4 = 600 ...
export const XP_PER_LEVEL_BASE = 100;

// 먹이(재화): XP 1점당 적립되는 먹이 양(반올림 전). 코스튬 구매 재화.
export const FEED_PER_XP = 0.1;

// 먹이 보유 상한(duck_state.feed는 0~100 제약).
export const FEED_MAX = 100;
