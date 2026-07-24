import { Building2 } from "lucide-react";
import { PixelOffice } from "@/components/PixelOffice";
import { createClient } from "@/lib/supabase/server";
import {
  listTodos,
  listPages,
  listHabits,
  listPomodoroSessions,
  listCalendarEvents,
} from "@ldd/api";
import type { Todo } from "@ldd/core";
import type { Page } from "@ldd/core";
import type { Habit } from "@ldd/core";
import type { PomodoroSession } from "@ldd/core";
import type { CalendarEvent } from "@ldd/core";

export const dynamic = "force-dynamic";

// Phase 16: 픽셀 오리 오피스 — 실제 Supabase 데이터를 서버에서 패치해 NPC에 배분한다.

// 부서 순서 — 라운드로빈 배분 기준
const DEPARTMENTS = [
  "engineering",
  "marketing",
  "design",
  "hr",
  "finance",
  "sales",
  "support",
  "qa",
  "operations",
] as const;

type RealTask = { title: string; progress: number; department: string };

/**
 * 실제 사용자 데이터를 RealTask 배열로 변환한다.
 * AI 분류 없이 순수 라운드로빈으로 부서에 배분한다 (ponytail 단순 접근).
 */
function mapDataToTasks(
  todos: Todo[],
  pages: Page[],
  habits: Habit[],
  pomodoros: PomodoroSession[],
  events: CalendarEvent[],
): RealTask[] {
  const tasks: RealTask[] = [];
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

  // 페이지 — 문서 작업(progress=50)으로 배분
  for (const page of pages.slice(0, 20)) {
    // 최신 20개만 (전체 다 넣으면 NPC 태스크가 너무 많아짐)
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
  for (const pomo of pomodoros.slice(0, 10)) {
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

  // 캘린더 이벤트 — 일정/회의(progress=0)로 배분
  for (const event of events.slice(0, 15)) {
    tasks.push({
      title: `[일정] ${event.title}`,
      progress: 0,
      department: DEPARTMENTS[deptIdx % DEPARTMENTS.length]!,
    });
    deptIdx++;
  }

  return tasks;
}

export default async function OfficePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-muted-foreground">로그인이 필요합니다.</p>
      </div>
    );
  }

  // 실제 데이터 병렬 패치 — 어느 하나가 실패해도 나머지는 계속 사용한다 (에러 내성)
  const [todosResult, pagesResult, habitsResult, pomodorosResult, eventsResult] =
    await Promise.allSettled([
      listTodos(supabase),
      listPages(supabase),
      listHabits(supabase),
      listPomodoroSessions(supabase),
      listCalendarEvents(supabase),
    ]);

  const todos = todosResult.status === "fulfilled" ? todosResult.value : [];
  const pages = pagesResult.status === "fulfilled" ? pagesResult.value : [];
  const habits = habitsResult.status === "fulfilled" ? habitsResult.value : [];
  const pomodoros = pomodorosResult.status === "fulfilled" ? pomodorosResult.value : [];
  const events = eventsResult.status === "fulfilled" ? eventsResult.value : [];

  // RealTask 직렬화 가능한 순수 객체 배열 (함수·Date 없음)
  const realTasks = mapDataToTasks(todos, pages, habits, pomodoros, events);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-16 pt-6 md:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-1">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Building2 className="size-6 text-primary-accent" />
          픽셀 오피스
        </h1>
        <p className="text-sm text-muted-foreground">
          직원 오리들이 각자 책상에서 일해요. 도구 실행에 따라 상태(타이핑·읽기·빌드·에러)가 바뀌고,
          한동안 조용하면 퇴근합니다. 캔버스를 클릭해 포커스한 뒤 방향키/WASD로 대장오리(👑)를 움직여
          직원 오리 옆에서 E를 누르면 지금 뭐 하는지 물어봐요.
        </p>
      </div>
      <PixelOffice realTasks={realTasks} />
    </div>
  );
}
