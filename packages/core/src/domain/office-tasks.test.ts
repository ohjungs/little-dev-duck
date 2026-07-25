import { describe, it, expect } from "vitest";
import { mapWorkspaceToOfficeTasks, OFFICE_TASK_LIMITS } from "./office-tasks";
import { DEPARTMENTS } from "./office-department";
import type { Todo } from "./todo";
import type { Page } from "./page";
import type { Habit } from "./habit";
import type { PomodoroSession } from "./pomodoro";
import type { CalendarEvent } from "./calendar-event";

const ISO = "2026-07-25T00:00:00.000Z";

function todo(o: Partial<Todo> = {}): Todo {
  return {
    id: "00000000-0000-0000-0000-000000000001",
    userId: "00000000-0000-0000-0000-0000000000aa",
    title: "할 일",
    isDone: false,
    dueDate: null,
    recurrence: null,
    createdAt: ISO,
    updatedAt: ISO,
    ...o,
  };
}

function page(o: Partial<Page> = {}): Page {
  return {
    id: "00000000-0000-0000-0000-000000000002",
    userId: "00000000-0000-0000-0000-0000000000aa",
    parentId: null,
    title: "문서",
    content: null,
    plainText: "",
    icon: null,
    isTrashed: false,
    trashedAt: null,
    createdAt: ISO,
    updatedAt: ISO,
    dbSchema: null,
    rowProps: {},
    isPublic: false,
    publicSlug: null,
    coverUrl: null,
    ...o,
  } as Page;
}

function habit(o: Partial<Habit> = {}): Habit {
  return {
    id: "00000000-0000-0000-0000-000000000003",
    userId: "00000000-0000-0000-0000-0000000000aa",
    title: "운동",
    frequency: "daily",
    timesPerWeek: null,
    createdAt: ISO,
    updatedAt: ISO,
    ...o,
  };
}

function pomo(o: Partial<PomodoroSession> = {}): PomodoroSession {
  return {
    id: "00000000-0000-0000-0000-000000000004",
    userId: "00000000-0000-0000-0000-0000000000aa",
    durationMinutes: 25,
    tag: null,
    startedAt: ISO,
    completedAt: ISO,
    createdAt: ISO,
    ...o,
  } as PomodoroSession;
}

function event(o: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    id: "00000000-0000-0000-0000-000000000005",
    userId: "00000000-0000-0000-0000-0000000000aa",
    title: "회의",
    startAt: ISO,
    endAt: null,
    createdAt: ISO,
    updatedAt: ISO,
    ...o,
  } as CalendarEvent;
}

describe("mapWorkspaceToOfficeTasks", () => {
  it("빈 입력이면 빈 배열", () => {
    expect(mapWorkspaceToOfficeTasks([], [], [], [], [])).toEqual([]);
  });

  it("완료된 투두는 제외하고 미완료만 progress=30으로 배분", () => {
    const tasks = mapWorkspaceToOfficeTasks(
      [todo({ title: "A" }), todo({ title: "B", isDone: true }), todo({ title: "C" })],
      [],
      [],
      [],
      [],
    );
    expect(tasks.map((t) => t.title)).toEqual(["A", "C"]);
    expect(tasks.every((t) => t.progress === 30)).toBe(true);
  });

  it("부서는 완료 항목을 건너뛰고 라운드로빈 배분(deptIdx는 스킵 시 증가 안 함)", () => {
    const tasks = mapWorkspaceToOfficeTasks(
      [todo({ title: "A" }), todo({ title: "B", isDone: true }), todo({ title: "C" })],
      [],
      [],
      [],
      [],
    );
    // 스킵된 B는 deptIdx를 소비하지 않으므로 A=0, C=1
    expect(tasks[0]!.department).toBe(DEPARTMENTS[0]);
    expect(tasks[1]!.department).toBe(DEPARTMENTS[1]);
  });

  it("페이지는 progress=50, 최신 20개만, 빈 제목은 '문서 작업' 폴백", () => {
    const many = Array.from({ length: 25 }, (_, i) => page({ title: `P${i}` }));
    const withBlank = mapWorkspaceToOfficeTasks(
      [],
      [page({ title: "   " }), ...many],
      [],
      [],
      [],
    );
    expect(withBlank[0]!.title).toBe("문서 작업");
    expect(withBlank[0]!.progress).toBe(50);
    // 상한 20개
    expect(withBlank.length).toBe(OFFICE_TASK_LIMITS.pages);
  });

  it("습관은 '[습관] ' 접두 + progress=20", () => {
    const tasks = mapWorkspaceToOfficeTasks([], [], [habit({ title: "런닝" })], [], []);
    expect(tasks[0]!.title).toBe("[습관] 런닝");
    expect(tasks[0]!.progress).toBe(20);
  });

  it("포모도로는 완료된 것만, tag 유무로 라벨 분기, progress=100, 최신 10개만", () => {
    const tasks = mapWorkspaceToOfficeTasks(
      [],
      [],
      [],
      [
        pomo({ tag: "코딩", completedAt: ISO }),
        pomo({ tag: null, durationMinutes: 50, completedAt: ISO }),
        pomo({ tag: "무시", completedAt: null }), // 미완료 → 제외
      ],
      [],
    );
    expect(tasks.map((t) => t.title)).toEqual(["[포모도로] 코딩", "집중 50분"]);
    expect(tasks.every((t) => t.progress === 100)).toBe(true);
  });

  it("포모도로 부서는 deptIdx % 3으로 배분(앞 3개 부서 순환)", () => {
    // 투두 4개(deptIdx 0..3 소비) 후 포모도로 → deptIdx=4 → 4%3=1
    const tasks = mapWorkspaceToOfficeTasks(
      [todo(), todo(), todo(), todo()],
      [],
      [],
      [pomo({ completedAt: ISO })],
      [],
    );
    const pomoTask = tasks[4]!;
    expect(pomoTask.department).toBe(DEPARTMENTS[4 % 3]);
  });

  it("캘린더는 '[일정] ' 접두 + progress=0, 최신 15개만", () => {
    const many = Array.from({ length: 18 }, (_, i) => event({ title: `E${i}` }));
    const tasks = mapWorkspaceToOfficeTasks([], [], [], [], many);
    expect(tasks[0]!.title).toBe("[일정] E0");
    expect(tasks[0]!.progress).toBe(0);
    expect(tasks.length).toBe(OFFICE_TASK_LIMITS.events);
  });

  it("deptIdx는 카테고리 전체에 걸쳐 연속 증가한다", () => {
    // 투두 1 + 습관 1 → deptIdx: todo=0, habit=1
    const tasks = mapWorkspaceToOfficeTasks([todo()], [], [habit()], [], []);
    expect(tasks[0]!.department).toBe(DEPARTMENTS[0]);
    expect(tasks[1]!.department).toBe(DEPARTMENTS[1]);
  });
});
