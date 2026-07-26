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
  // 2026-07-27 : 오피스 - 작업 원천 (2차 피드백 5-2, Phase 48 T2)
  // "직원을 누르면 진짜 어떤 일을 하는지"의 **근거**다. 이게 없으면 상세 패널은
  // 제목만 보여 주게 되고, 그건 1차 5-7의 "일하는 척"과 구분되지 않는다.
  source: OfficeTaskSource;
  // 원본 레코드의 id. 화면에서 **그 원본으로 데려가기** 위한 것이다(할 일·페이지·일정).
  sourceId: string;
};

// 카테고리별 매핑 상한 — 전체를 다 넣으면 NPC 태스크가 과다해진다.
export const OFFICE_TASK_LIMITS = {
  pages: 20,
  pomodoros: 10,
  events: 15,
} as const;

// 2026-07-27 : 오피스 - 직무별 원천 (2차 피드백 5-1·5-3, Phase 48 T1)
// **사용자가 "개발자 오리가 습관 체크를 하고 있다"를 봤다.** 원인은 아래 라운드로빈이
// **일의 종류를 보지 않고** 부서를 순서대로 돌린 것이다 — 습관이 engineering에 갈 수도 있다.
//
// 원천을 **직무별로 제한한다.** 매핑은 데이터로 두어 검사할 수 있게 한다(화면에 흩으면 못 본다).
//
// **[추정] 표시**: 요청이 명시한 것은 개발자("개발 건만")와 인사팀("진짜 해야 할 일")뿐이다.
// 나머지는 성격으로 추정했고, 틀리면 이 표만 고치면 된다.
export type OfficeTaskSource = "todo" | "page" | "habit" | "pomodoro" | "event";

export const OFFICE_TASK_SOURCES: Record<DepartmentId, readonly OfficeTaskSource[]> = {
  // 요청 원문: 개발자는 "개발 건만". 지금 우리가 가진 것 중 개발에 가장 가까운 신호는
  // 뽀모도로(집중 작업)다. **할 일 제목으로 "개발"을 판정하지 않는다** — 키워드 매칭은
  // 오탐이 크고 사용자가 제목을 어떻게 쓰는지 우리가 정할 수 없다(계획이 짚은 함정).
  // GitHub 커밋·Claude Code 로그 연결은 별도 Task다.
  engineering: ["pomodoro"],
  qa: ["pomodoro"],
  // 요청 원문: 인사팀은 "진짜 내가 해야 할 일들" — 할 일과 일정.
  hr: ["todo", "event"],
  operations: ["todo", "event"],
  // [추정] 문서 작업은 기획·마케팅·디자인 쪽 성격이다.
  marketing: ["page"],
  design: ["page"],
  // [추정] 개인 루틴(습관)은 남에게 위임할 성질이 아니라 관리 라인에 둔다.
  finance: ["habit"],
  sales: ["todo"],
  support: ["event"],
};

/** 그 종류의 일을 받을 수 있는 부서들(정의 순서 유지 — 배분이 결정적이어야 한다). */
export function departmentsForSource(source: OfficeTaskSource): DepartmentId[] {
  return DEPARTMENTS.filter((d) => OFFICE_TASK_SOURCES[d].includes(source));
}

/**
 * 실제 사용자 데이터를 OfficeTask 배열로 변환한다(직렬화 가능·결정적).
 * 2026-07-27 (2차 피드백 5-1·5-3): 배분 규칙이 바뀌었다. 전에는 **종류를 보지 않고** 부서를
 * 순서대로 돌려서 개발자 오리가 습관 체크를 들고 있었다. 이제 **일의 종류가 갈 수 있는
 * 부서 안에서만** 돌린다(`OFFICE_TASK_SOURCES`). 받을 부서가 없으면 그 일은 배정되지 않고,
 * 일이 없는 부서는 **"쉬는 중"**이다 — 1차 5-3이 세운 계약을 그대로 지킨다.
 * **없는 업무를 만들어 채우지 않는다**(1차 5-7의 "일하는 척"으로 되돌아간다).
 */
export function mapWorkspaceToOfficeTasks(
  todos: Todo[],
  pages: Page[],
  habits: Habit[],
  pomodoros: PomodoroSession[],
  events: CalendarEvent[],
): OfficeTask[] {
  const tasks: OfficeTask[] = [];
  // 종류마다 **그 일을 받는 부서 안에서만** 돌린다. 전역 인덱스 하나로 돌리면 종류가 섞여
  // 개발자가 습관을 들고 있게 된다(사용자가 본 그 화면).
  const cursor: Record<string, number> = {};
  const assign = (source: OfficeTaskSource): DepartmentId | null => {
    const pool = departmentsForSource(source);
    if (pool.length === 0) return null;
    const i = cursor[source] ?? 0;
    cursor[source] = i + 1;
    return pool[i % pool.length]!;
  };

  // 미완료 투두 — 진행 중(progress=30) 태스크로 배분
  for (const todo of todos) {
    if (todo.isDone) continue; // 완료된 항목은 제외
    const dept = assign("todo");
    if (!dept) continue;
    tasks.push({ title: todo.title, progress: 30, department: dept, source: "todo", sourceId: todo.id });
  }

  // 페이지 — 문서 작업(progress=50)으로 배분 (최신 20개만)
  for (const page of pages.slice(0, OFFICE_TASK_LIMITS.pages)) {
    const title = page.title.trim() || "문서 작업";
    const dept = assign("page");
    if (!dept) continue;
    tasks.push({ title, progress: 50, department: dept, source: "page", sourceId: page.id });
  }

  // 습관 — 루틴 관리 업무(progress=20)로 배분
  for (const habit of habits) {
    const dept = assign("habit");
    if (!dept) continue;
    tasks.push({
      title: `[습관] ${habit.title}`, progress: 20, department: dept,
      source: "habit", sourceId: habit.id,
    });
  }

  // 완료된 포모도로 세션 — 집중 작업 완료(progress=100)로 engineering 우선
  for (const pomo of pomodoros.slice(0, OFFICE_TASK_LIMITS.pomodoros)) {
    if (!pomo.completedAt) continue; // 미완료 세션 제외
    const label = pomo.tag ? `[포모도로] ${pomo.tag}` : `집중 ${pomo.durationMinutes}분`;
    const dept = assign("pomodoro");
    if (!dept) continue;
    tasks.push({ title: label, progress: 100, department: dept, source: "pomodoro", sourceId: pomo.id });
  }

  // 캘린더 이벤트 — 일정/회의(progress=0)로 배분 (최신 15개만)
  for (const event of events.slice(0, OFFICE_TASK_LIMITS.events)) {
    const dept = assign("event");
    if (!dept) continue;
    tasks.push({
      title: `[일정] ${event.title}`, progress: 0, department: dept,
      source: "event", sourceId: event.id,
    });
  }

  return tasks;
}

// 2026-07-27 : 오피스 - 원천 라벨 (2차 피드백 5-2, Phase 48 T2)
// 상세 패널이 "이 일은 어디서 왔는가"를 사람 말로 보여 주기 위한 매핑.
// 화면에 문자열을 흩어 놓으면 종류가 늘 때 빠뜨리기 쉬워 여기 한 군데 둔다(테스트가 누락을 잡는다).
const SOURCE_LABELS: Record<OfficeTaskSource, string> = {
  todo: "할 일",
  page: "문서",
  habit: "습관",
  pomodoro: "집중 기록",
  event: "일정",
};

/** 업무가 어느 데이터에서 왔는지를 한국어로. */
export function describeTaskSource(source: OfficeTaskSource): string {
  return SOURCE_LABELS[source];
}
