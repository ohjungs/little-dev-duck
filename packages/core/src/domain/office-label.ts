// 2026-07-26 : 사무실 - 표시이름 - 재구현제거
// 부서 색·이름은 DEPT_REGISTRY에 이미 있는데 화면 세 곳(OfficeDashboard·OfficeManagementPanel·
// OfficeTalkPanel)이 **각자 하드코딩한 표를 갖고 있었다.** 값이 같아서 지금은 문제가 없지만,
// 부서를 레지스트리에 추가하면 화면 세 곳이 조용히 빠진다(폴백으로 흘러 회색·영문 id가 뜬다).
// 같은 세션에서 DAY_CODES로 이미 겪은 부류라 데이터를 한 곳에서만 정의한다.
//
// 상태 이름은 타입(NpcSchedulePhase)만 core에 있고 한글 이름은 화면에만 있었다 — 제자리가
// 없던 값이라 타입 옆으로 옮긴다.
//
// 폴백은 기존 컴포넌트 동작을 그대로 보존한다(색은 회색, 이름은 받은 값 그대로) —
// 통합하면서 화면이 달라지면 그건 리팩터링이 아니라 변경이다.

import { DEPT_REGISTRY, type DepartmentId } from "./office-department";

const UNKNOWN_DEPT_COLOR = "#888";

export function deptColor(dept: string): string {
  return DEPT_REGISTRY[dept as DepartmentId]?.color ?? UNKNOWN_DEPT_COLOR;
}

export function deptLabel(dept: string): string {
  return DEPT_REGISTRY[dept as DepartmentId]?.label ?? dept;
}

// office-npc.ts의 NpcSchedulePhase에 대응하는 표시 이름. offwork는 타입에는 없지만
// 화면이 쓰던 값이라 함께 보존한다(빼면 그 자리에 영문이 뜬다).
const PHASE_LABELS: Record<string, string> = {
  working: "업무 중",
  lunch: "점심 시간",
  break: "휴식 중",
  commuting: "출근 중",
  leaving: "퇴근 중",
  offwork: "퇴근",
};

export function schedulePhaseLabel(phase: string): string {
  return PHASE_LABELS[phase] ?? phase;
}

// 2026-07-26 : 오피스 - 상태표시 - 쉬는중 (피드백 5-3)
// 스케줄만 보면 근무 시간엔 무조건 "업무 중"이 뜬다 — 맡은 일이 하나도 없어도 그렇다.
// 사용자가 요구한 건 "실제로 일하고있지않으면 쉬는중 표시"라 **업무 유무를 함께** 본다.
// 근무 시간이 아닐 때는 업무 유무가 의미 없으므로 종전 라벨 그대로다.
export function npcStatusLabel(phase: string, hasWork: boolean): string {
  if (phase === "working" && !hasWork) return "쉬는 중";
  return schedulePhaseLabel(phase);
}
