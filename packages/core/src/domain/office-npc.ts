// Phase E — NPC 프로필 + 행동 시뮬레이션(순수 함수, 사이드이펙트 없음).
// 게임 클럭: 1 실제 초 = 1 게임 분 (24 게임 시간 = 24 실제 분).

import type { DepartmentId } from "./office-department";
import type { OfficeTaskSource } from "./office-tasks";
import type { DuckWorkState } from "./office-event";
import type { TileMap, Vec } from "./office-tilemap";
import { isBlocked } from "./office-tilemap";

export type NpcTask = {
  id: string;
  title: string;
  status: "active" | "done" | "waiting";
  progress: number; // 0-100
  // 2026-07-27 : 오피스 - 작업 원천 (2차 피드백 5-2, Phase 48 T2)
  // 실제 사용자 데이터에서 온 업무만 원천을 갖는다. 선택 필드인 이유가 그것이다 —
  // 원천이 없으면 상세 패널이 **근거 없이 단정하지 않고** 그 사실을 그대로 보여 준다.
  source?: OfficeTaskSource;
  sourceId?: string;
};

export type NpcSchedulePhase =
  | "commuting"
  | "working"
  | "lunch"
  | "break"
  | "leaving"
  | "offwork";

export type Npc = {
  id: string;
  name: string;
  department: DepartmentId;
  role: string;
  accessory: string;
  accessoryColor: string;
  tile: Vec; // 현재 그리드 위치
  deskTile: Vec; // 배정된 책상
  facing: "up" | "down" | "left" | "right";
  workState: DuckWorkState;
  schedulePhase: NpcSchedulePhase;
  tasks: NpcTask[];
  recentDone: NpcTask[];
  mood: "happy" | "neutral" | "stressed" | "tired";
  // 직원 통계 (management panel용)
  productivity: number;    // 0-100
  satisfaction: number;    // 0-100
  salary: number;          // 시간당 급여
  tasksCompleted: number;  // 누적 완료 태스크 수
};

export type GameClock = {
  hour: number;    // 0-23
  minute: number;  // 0-59
  totalMinutes: number; // 시작 이후 누적 분(소수 허용)
};

export function createGameClock(startHour: number = 8): GameClock {
  return { hour: startHour, minute: 0, totalMinutes: startHour * 60 };
}

// 시/분(정수)으로 게임 클럭을 만든다. 오피스를 실제 시각(KST)에 동기화할 때 사용 —
// 빠른 시뮬 대신 현재 시각을 그대로 반영해 "게임처럼 보이지만 게임은 아닌" 실시간 오피스를 만든다.
// 범위를 벗어난 값은 정규화(hour 0-23, minute 0-59).
export function gameClockFromHm(hour: number, minute: number): GameClock {
  const h = ((Math.floor(hour) % 24) + 24) % 24;
  const m = ((Math.floor(minute) % 60) + 60) % 60;
  return { hour: h, minute: m, totalMinutes: h * 60 + m };
}

export function tickClock(clock: GameClock, deltaMs: number): GameClock {
  // 1실초 = 1게임분: deltaMs / 1000 = 추가 게임 분
  const addedMinutes = deltaMs / 1000;
  const total = clock.totalMinutes + addedMinutes;
  // 하루(1440분) 래핑: 항상 0-1439 범위의 dayMinutes
  const dayMinutes = ((total % 1440) + 1440) % 1440;
  return {
    hour: Math.floor(dayMinutes / 60),
    minute: Math.floor(dayMinutes % 60),
    totalMinutes: total,
  };
}

export function formatClockTime(clock: GameClock): string {
  return `${String(clock.hour).padStart(2, "0")}:${String(Math.floor(clock.minute)).padStart(2, "0")}`;
}

// 게임 시각(hour) -> 스케줄 단계
export function schedulePhase(hour: number): NpcSchedulePhase {
  if (hour < 8) return "offwork";
  if (hour < 9) return "commuting";
  if (hour < 12) return "working";
  if (hour < 13) return "lunch";
  if (hour < 18) return "working";
  if (hour < 19) return "leaving";
  return "offwork";
}

// 스케줄 단계 -> 렌더링에 쓸 DuckWorkState
export function phaseToWorkState(phase: NpcSchedulePhase): DuckWorkState {
  switch (phase) {
    case "working":   return "typing";
    case "lunch":     return "question"; // 식사 중
    case "break":     return "question";
    case "commuting": return "offwork";
    case "leaving":   return "offwork";
    case "offwork":   return "offwork";
  }
}

// 2026-07-26 : 오피스 - 직원상태 - 지어내기제거
// 사용자 피드백 5-7 "직원들이랑 대화해보면 계속 뭐 바뀌면서 일하는척하는데 실제 일하고있는
// 거만 보이도록해" + 5-3 "실제로 일하고있지않으면 쉬는중 표시해야지".
//
// **여기 있던 simulateNpcTasks가 그 '일하는 척'의 정체였다.** 하는 일이 셋이었다:
//   ① 게임 1분마다 10% 확률로 부서별 템플릿("버그 수정 #142")에서 **없는 업무를 지어냈다**
//   ② 진행률을 난수로 올려 **아무도 하지 않은 진척**을 만들었다
//   ③ 만족도·생산성을 난수로 흔들었다
// 그래서 사용자가 같은 직원에게 두 번 물어보면 매번 다른 답이 나왔다. 화면의 모든 숫자가
// 실제 워크스페이스와 아무 관계가 없었다.
//
// 지금은 **실제 데이터로 만든 업무(mapWorkspaceToOfficeTasks)만** 직원이 들고 있고,
// 그게 없으면 지어내지 않고 "쉬는 중"이라고 말한다. 없는 일을 만들어 보여주느니 비는 게 정직하다.
// 그 결과 여기서 매 틱 할 일이 없어져 simulateNpcTasks·getTaskTemplates는 삭제했다.

// 직원의 지금 상태. 근무 시간이 아니면 스케줄이 결정하고, 근무 시간이면 **실제 업무 유무**가 결정한다.
export function npcWorkState(npc: Pick<Npc, "tasks">, phase: NpcSchedulePhase): DuckWorkState {
  if (phase !== "working") return phaseToWorkState(phase);
  return hasActiveWork(npc) ? "typing" : "idle";
}

// 실제로 붙잡고 있는 업무가 있는가. "쉬는 중" 판정의 단일 출처.
export function hasActiveWork(npc: Pick<Npc, "tasks">): boolean {
  return npc.tasks.some((t) => t.status === "active");
}

// 지정 존 내 랜덤 보행 가능 타일 반환. 존이 없거나 보행 가능 타일이 없으면 null.
export function pickWanderTarget(
  map: TileMap,
  zoneId: string,
  rng: () => number,
): Vec | null {
  const zone = map.zones.find(z => z.id === zoneId);
  if (!zone) return null;
  const walkable: Vec[] = [];
  for (let dy = 1; dy < zone.bounds.h - 1; dy++) {
    for (let dx = 1; dx < zone.bounds.w - 1; dx++) {
      const x = zone.bounds.x + dx;
      const y = zone.bounds.y + dy;
      if (!isBlocked(map, x, y)) walkable.push({ x, y });
    }
  }
  if (walkable.length === 0) return null;
  return walkable[Math.floor(rng() * walkable.length)] ?? null;
}

// 스케줄 단계에 따라 NPC가 배회할 존 ID 결정
export function wanderZone(phase: NpcSchedulePhase): string {
  switch (phase) {
    case "lunch": return "cafeteria";
    case "break": return "lobby";
    default: return "lobby";
  }
}

// (삭제됨) getTaskTemplates — 부서별 가짜 업무 문구 사전.
// 이 목록이 존재하는 한 "실제 일하는 것만 보여준다"를 지킬 수 없어 함께 지웠다.
// 직원이 보여줄 업무는 오직 mapWorkspaceToOfficeTasks가 실제 데이터에서 만든 것뿐이다.
