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
