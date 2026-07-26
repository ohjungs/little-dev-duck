import type { DuckWorkState } from "./office-event";

// Phase 17 픽셀 오피스 플레이어 조작 — 순수 함수(이동·충돌·인접·활동설명·동적배치). 렌더러(web)가 소비.

export type Vec = { x: number; y: number };
export type Dir = "up" | "down" | "left" | "right";

const DELTA: Record<Dir, Vec> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

// 그리드 한 칸 이동: 경계 밖이거나 충돌 타일이면 제자리 유지, 아니면 스냅 이동.
export function movePlayer(
  pos: Vec,
  dir: Dir,
  cols: number,
  rows: number,
  isBlocked: (x: number, y: number) => boolean,
): Vec {
  const d = DELTA[dir];
  const nx = pos.x + d.x;
  const ny = pos.y + d.y;
  if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) return pos;
  if (isBlocked(nx, ny)) return pos;
  return { x: nx, y: ny };
}

// 상하좌우 1칸 인접 판정(대각선/2칸 이상은 미감지).
export function isAdjacent(a: Vec, b: Vec): boolean {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === 1;
}

// "지금 뭐 하는 중?" 응답 — LLM 없이 이벤트 데이터 템플릿.
export function describeActivity(duck: {
  state: DuckWorkState;
  label: string;
}): string {
  if (duck.state === "offwork") return "퇴근했어요. 💤";
  if (duck.state === "idle") return "잠깐 쉬는 중이에요. ☕";
  return `지금 ${duck.label} 하는 중이에요.`;
}

// 2026-07-27 : 오피스 - 상시 말풍선 (2차 피드백 5-4, Phase 48 T3)
// 요청: "직원들은 대화 말풍선으로 **계속** 말하게해주고 상호작용하면 말하게해줘".
//
// **"계속 말하게"의 함정을 피한다.** 말풍선을 채우려고 문장을 **생성**하면 그게 정확히
// 1차 5-7에서 지적받은 "일하는 척"이다. 그래서 규칙은 하나다:
// **실제 업무가 있을 때만 그 업무를 말한다. 없으면 쉬는 중이라고 말하거나 아무 말도 안 한다.**
//
// `describeActivity`(상호작용용 긴 문장)와 **역할이 다르다** — 이건 머리 위에 상시로 뜨는
// 짧은 문구다. 길면 서로 겹쳐 읽을 수 없고, 그게 "UI가 이상해"가 된다(1차 5-2와 같은 부류).
export const BUBBLE_MAX_CHARS = 14;

/**
 * 머리 위 상시 말풍선 문구. **없는 일을 지어내지 않는다** — 할 일이 없으면 `null`이고,
 * 호출부는 그때 말풍선을 그리지 않는다(빈 말풍선을 띄우면 그것도 소음이다).
 */
export function bubbleText(duck: {
  state: DuckWorkState;
  label: string;
}): string | null {
  if (duck.state === "offwork") return null; // 퇴근한 오리 위에 말풍선이 뜨면 이상하다.
  if (duck.state === "idle") return "쉬는 중";
  const label = duck.label.trim();
  if (label === "") return "쉬는 중"; // 업무명이 비면 "무슨 일"인지 말할 수 없다 — 지어내지 않는다.
  // 코드 포인트로 자른다 — `slice`는 이모지·일부 한글 조합의 중간을 끊어 깨진 글자를 만든다.
  const chars = [...label];
  return chars.length > BUBBLE_MAX_CHARS
    ? `${chars.slice(0, BUBBLE_MAX_CHARS - 1).join("")}…`
    : label;
}

// 에이전트 수에 따른 책상 슬롯을 그리드에 절차적으로 배치(코드 분기 아닌 규칙 계산).
// 한 줄 최대 3명, 방 크기(cols/rows) 안에 균등 배치. 카메라·방 확장 없이 슬롯 좌표만 재생성한다.
export function deskSlots(count: number, cols: number, rows: number): Vec[] {
  const n = Math.max(0, count);
  if (n === 0) return [];
  const perRow = Math.min(n, 3);
  const rowsUsed = Math.ceil(n / perRow);
  const gapY = Math.floor(rows / (rowsUsed + 1));
  const slots: Vec[] = [];
  for (let i = 0; i < n; i++) {
    const r = Math.floor(i / perRow);
    const inThisRow = Math.min(perRow, n - r * perRow);
    const gapX = Math.floor(cols / (inThisRow + 1));
    const c = i % perRow;
    slots.push({ x: gapX * (c + 1), y: gapY * (r + 1) });
  }
  return slots;
}
