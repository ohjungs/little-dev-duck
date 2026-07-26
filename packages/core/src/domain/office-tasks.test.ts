import { describe, it, expect } from "vitest";
import { mapWorkspaceToOfficeTasks, OFFICE_TASK_LIMITS,
  OFFICE_TASK_SOURCES,
  departmentsForSource,
  describeTaskSource,
} from "./office-tasks";
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

  // 2026-07-27 정정 (2차 피드백 5-1·5-3, Phase 48 T1)
  // 이 검사는 **일의 종류를 보지 않는 전역 라운드로빈**을 잠그고 있었다. 그게 바로 사용자가
  // 지적한 문제다("개발자 오리가 습관 체크를 하고 있다") — 계약이 바뀌었으므로 검사도 바꾼다.
  // 지금 지켜야 할 성질: 완료 항목은 건너뛰고, 남은 것은 **할 일을 받는 부서 안에서만** 돈다.
  it("완료 항목은 건너뛰고, 할 일을 받는 부서 안에서만 순환한다", () => {
    const tasks = mapWorkspaceToOfficeTasks(
      [todo({ title: "A" }), todo({ title: "B", isDone: true }), todo({ title: "C" })],
      [],
      [],
      [],
      [],
    );
    const pool = departmentsForSource("todo");
    expect(tasks.map((t) => t.title)).toEqual(["A", "C"]);
    expect(tasks[0]!.department).toBe(pool[0]);
    expect(tasks[1]!.department).toBe(pool[1 % pool.length]);
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

  // 2026-07-27 정정: 포모도로는 **개발 직무 안에서만** 돈다(요청: 개발자는 "개발 건만").
  // 전에는 앞 3개 부서를 돌았는데 그 순서가 우연히 개발 직무와 겹쳤을 뿐 계약이 아니었다.
  it("포모도로는 개발 직무 안에서만 배분된다", () => {
    const tasks = mapWorkspaceToOfficeTasks(
      [todo(), todo(), todo(), todo()],
      [],
      [],
      [pomo({ completedAt: ISO })],
      [],
    );
    const pomoTask = tasks.find((t) => t.progress === 100)!;
    expect(departmentsForSource("pomodoro")).toContain(pomoTask.department);
    // 할 일이 앞에 몇 개 있든 포모도로 배분에 영향을 주지 않는다(종류별 커서가 따로다).
    expect(pomoTask.department).toBe(departmentsForSource("pomodoro")[0]);
  });

  it("캘린더는 '[일정] ' 접두 + progress=0, 최신 15개만", () => {
    const many = Array.from({ length: 18 }, (_, i) => event({ title: `E${i}` }));
    const tasks = mapWorkspaceToOfficeTasks([], [], [], [], many);
    expect(tasks[0]!.title).toBe("[일정] E0");
    expect(tasks[0]!.progress).toBe(0);
    expect(tasks.length).toBe(OFFICE_TASK_LIMITS.events);
  });

  // 2026-07-27 정정: 커서를 **종류마다 따로** 둔다. 전에는 하나로 이어져서 앞선 종류의 개수가
  // 뒤 종류의 부서를 바꿨다 — 할 일이 몇 개냐에 따라 습관이 어느 부서로 갈지 달라졌다는 뜻이다.
  it("종류마다 커서가 따로다 (앞 종류의 개수가 뒤 종류 배분을 바꾸지 않는다)", () => {
    const withTodo = mapWorkspaceToOfficeTasks([todo()], [], [habit()], [], []);
    const withoutTodo = mapWorkspaceToOfficeTasks([], [], [habit()], [], []);
    const habitDept = (list: typeof withTodo) =>
      list.find((t) => t.title.startsWith("[습관]"))!.department;
    expect(habitDept(withTodo)).toBe(habitDept(withoutTodo));
  });
});

// 2026-07-27 : 오피스 - 직무별 원천 (2차 피드백 5-1·5-3, Phase 48 T1)
// **사용자가 "개발자 오리가 습관 체크를 하고 있다"를 봤다.** 원인은 배분이 일의 종류를 보지 않고
// 부서를 순서대로 돌린 것이었다. 여기서 잠그는 건 "종류에 맞는 부서에만 간다"는 성질이다.
describe("직무별 작업 원천", () => {
  const todo = (title: string) => ({
    id: "t", userId: "u", title, isDone: false, dueDate: null, recurrence: null,
    createdAt: "2026-07-27T00:00:00.000Z", updatedAt: "2026-07-27T00:00:00.000Z",
  }) as never;
  const habit = (title: string) => ({
    id: "h", userId: "u", title, createdAt: "2026-07-27T00:00:00.000Z",
  }) as never;

  it("습관은 개발 직무(engineering·qa)로 가지 않는다", () => {
    // 사용자가 실제로 본 그 화면이다 — 개발자 오리가 습관 체크를 들고 있었다.
    const tasks = mapWorkspaceToOfficeTasks([], [], [habit("물 마시기"), habit("스트레칭")], [], []);
    expect(tasks.length).toBeGreaterThan(0);
    for (const t of tasks) {
      expect(t.title).toContain("[습관]");
      expect(["engineering", "qa"]).not.toContain(t.department);
    }
  });

  it("할 일은 요청이 명시한 인사팀 계열로 간다", () => {
    const tasks = mapWorkspaceToOfficeTasks([todo("보고서 쓰기")], [], [], [], []);
    expect(departmentsForSource("todo")).toContain("hr");
    expect(departmentsForSource("todo")).toContain(tasks[0].department);
  });

  it("모든 부서가 원천 매핑을 갖는다 (빠지면 그 부서는 영영 일이 없다)", () => {
    for (const dept of DEPARTMENTS) {
      expect(OFFICE_TASK_SOURCES[dept], `${dept}에 매핑이 없다`).toBeDefined();
    }
  });

  it("모든 원천이 최소 한 부서에 배정된다 (아무도 안 받으면 그 데이터는 사라진다)", () => {
    for (const source of ["todo", "page", "habit", "pomodoro", "event"] as const) {
      expect(departmentsForSource(source).length, `${source}를 받는 부서가 없다`).toBeGreaterThan(0);
    }
  });

  it("배분이 결정적이다 (같은 입력에 같은 결과)", () => {
    const input = () =>
      mapWorkspaceToOfficeTasks([todo("a"), todo("b"), todo("c")], [], [], [], []);
    expect(input()).toEqual(input());
  });

  it("일이 없으면 아무 업무도 만들지 않는다 (쉬는 중 계약)", () => {
    // 1차 5-7의 "일하는 척"으로 되돌아가지 않게 — 없는 업무를 지어내지 않는다.
    expect(mapWorkspaceToOfficeTasks([], [], [], [], [])).toEqual([]);
  });
});

// 2026-07-27 : 오피스 - 작업 원천 추적 (2차 피드백 5-2, Phase 48 T2)
// 요청: "직원을 누르면 **진짜 어떤 일을 하고 있는지** 볼 수 있도록".
// 계획이 못박은 핵심: **"원천을 밝히는 것"이 이 Task의 핵심이다.** 상세를 보여줘도 근거가
// 없으면 1차 5-7의 "일하는 척" 의심을 그대로 받는다. 그래서 각 업무가 **어느 데이터에서
// 왔는지(source)와 그 원본이 무엇인지(sourceId)**를 업무 자체가 들고 다녀야 한다.
describe("작업 원천 추적", () => {
  it("각 업무가 자기 원천 종류를 들고 있다", () => {
    const tasks = mapWorkspaceToOfficeTasks(
      [todo({ title: "A" })],
      [page({ title: "P" })],
      [habit({ title: "H" })],
      [pomo({ completedAt: ISO })],
      [event({ title: "E" })],
    );
    const byTitle = (t: string) => tasks.find((x) => x.title.includes(t))!;
    expect(byTitle("A").source).toBe("todo");
    expect(byTitle("P").source).toBe("page");
    expect(byTitle("H").source).toBe("habit");
    expect(byTitle("E").source).toBe("event");
    expect(tasks.find((x) => x.progress === 100)!.source).toBe("pomodoro");
  });

  it("원본 id를 그대로 들고 있다 (누르면 그 원본으로 갈 수 있게)", () => {
    const t = todo({ id: "11111111-1111-1111-1111-111111111111", title: "원본" });
    const tasks = mapWorkspaceToOfficeTasks([t], [], [], [], []);
    expect(tasks[0]!.sourceId).toBe(t.id);
  });

  it("원천이 부서 배분 규칙과 어긋나지 않는다", () => {
    // source를 필드로 들고 다니게 됐으니, 그 값이 실제 배분에 쓰인 값과 같아야 한다.
    // 다르면 화면은 "할 일"이라 적고 실제로는 습관 부서에 가 있는 상태가 된다.
    const tasks = mapWorkspaceToOfficeTasks(
      [todo({ title: "A" }), todo({ title: "B" })],
      [],
      [habit({ title: "H" })],
      [],
      [],
    );
    for (const t of tasks) {
      expect(departmentsForSource(t.source)).toContain(t.department);
    }
  });
});

describe("describeTaskSource", () => {
  it("모든 원천에 한국어 라벨이 있다", () => {
    // 빠진 종류가 있으면 그 업무는 화면에서 정체불명이 된다 — 근거를 못 밝히는 것과 같다.
    for (const s of ["todo", "page", "habit", "pomodoro", "event"] as const) {
      expect(describeTaskSource(s).length).toBeGreaterThan(0);
    }
  });

  it("종류마다 라벨이 다르다 (겹치면 구분이 안 된다)", () => {
    const labels = (["todo", "page", "habit", "pomodoro", "event"] as const).map(
      describeTaskSource,
    );
    expect(new Set(labels).size).toBe(labels.length);
  });
});
