// Phase 16 — 실 워크스페이스 데이터를 오피스 NPC 태스크로 매핑(순수, 사이드이펙트 없음).
// AI 분류 없이 순수 라운드로빈으로 부서에 배분한다 (ponytail 단순 접근).
// 기존에 apps/web 오피스 page에 인라인돼 있던 mapDataToTasks를 core로 추출 — 동작 보존.

import { DEPARTMENTS, type DepartmentId } from "./office-department";
import type { Todo } from "./todo";
import type { Page } from "./page";
import type { Habit } from "./habit";
import type { PomodoroSession } from "./pomodoro";
import type { CalendarEvent } from "./calendar-event";

export type OfficeTask = {
  title: string;
  progress: number;
  department: DepartmentId;
};

// 카테고리별 매핑 상한 — 전체를 다 넣으면 NPC 태스크가 과다해진다.
export const OFFICE_TASK_LIMITS = {
  pages: 20,
  pomodoros: 10,
  events: 15,
} as const;

/**
 * 실제 사용자 데이터를 OfficeTask 배열로 변환한다(직렬화 가능·결정적).
 * deptIdx를 카테고리 전체에 걸쳐 증가시켜 부서를 라운드로빈 배분한다.
 */
export function mapWorkspaceToOfficeTasks(
  todos: Todo[],
  pages: Page[],
  habits: Habit[],
  pomodoros: PomodoroSession[],
  events: CalendarEvent[],
): OfficeTask[] {
  const tasks: OfficeTask[] = [];
  let deptIdx = 0;

  // 미완료 투두 — 진행 중(progress=30) 태스크로 배분
  for (const todo of todos) {
    if (todo.isDone) continue; // 완료된 항목은 제외
    tasks.push({
      title: todo.title,
      progress: 30,
      department: DEPARTMENTS[deptIdx % DEPARTMENTS.length]!,
    });
    deptIdx++;
  }

  // 페이지 — 문서 작업(progress=50)으로 배분 (최신 20개만)
  for (const page of pages.slice(0, OFFICE_TASK_LIMITS.pages)) {
    const title = page.title.trim() || "문서 작업";
    tasks.push({
      title,
      progress: 50,
      department: DEPARTMENTS[deptIdx % DEPARTMENTS.length]!,
    });
    deptIdx++;
  }

  // 습관 — 루틴 관리 업무(progress=20)로 배분
  for (const habit of habits) {
    tasks.push({
      title: `[습관] ${habit.title}`,
      progress: 20,
      department: DEPARTMENTS[deptIdx % DEPARTMENTS.length]!,
    });
    deptIdx++;
  }

  // 완료된 포모도로 세션 — 집중 작업 완료(progress=100)로 engineering 우선
  for (const pomo of pomodoros.slice(0, OFFICE_TASK_LIMITS.pomodoros)) {
    if (!pomo.completedAt) continue; // 미완료 세션 제외
    const label = pomo.tag ? `[포모도로] ${pomo.tag}` : `집중 ${pomo.durationMinutes}분`;
    tasks.push({
      title: label,
      progress: 100,
      // 포모도로는 engineering → qa → operations 순으로 배분 (개발 관련 작업)
      department: DEPARTMENTS[deptIdx % 3]!,
    });
    deptIdx++;
  }

  // 캘린더 이벤트 — 일정/회의(progress=0)로 배분 (최신 15개만)
  for (const event of events.slice(0, OFFICE_TASK_LIMITS.events)) {
    tasks.push({
      title: `[일정] ${event.title}`,
      progress: 0,
      department: DEPARTMENTS[deptIdx % DEPARTMENTS.length]!,
    });
    deptIdx++;
  }

  return tasks;
}
