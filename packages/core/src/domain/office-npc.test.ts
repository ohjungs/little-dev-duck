import { describe, expect, it } from "vitest";
import {
  createGameClock,
  formatClockTime,
  phaseToWorkState,
  schedulePhase,
  simulateNpcTasks,
  tickClock,
  type Npc,
  type NpcTask,
} from "./office-npc";

// 결정적 rng — 항상 0.5 반환
const fixedRng = () => 0.5;
// 항상 < 0.1이 되도록 0 반환 → 새 태스크 생성 강제
const zeroRng = () => 0;

function makeNpc(overrides: Partial<Npc> = {}): Npc {
  return {
    id: "npc-1",
    name: "꽥돌이",
    department: "engineering",
    role: "시니어 개발자",
    accessory: "glasses",
    accessoryColor: "#4A90D9",
    tile: { x: 5, y: 5 },
    deskTile: { x: 5, y: 5 },
    facing: "down",
    workState: "typing",
    schedulePhase: "working",
    tasks: [],
    recentDone: [],
    mood: "neutral",
    ...overrides,
  };
}

function makeTask(overrides: Partial<NpcTask> = {}): NpcTask {
  return {
    id: "t1",
    title: "API 리팩터링",
    status: "active",
    progress: 50,
    ...overrides,
  };
}

describe("createGameClock", () => {
  it("지정한 시각으로 시작한다", () => {
    const clock = createGameClock(9);
    expect(clock.hour).toBe(9);
    expect(clock.minute).toBe(0);
    expect(clock.totalMinutes).toBe(540);
  });

  it("기본값은 8시다", () => {
    const clock = createGameClock();
    expect(clock.hour).toBe(8);
  });
});

describe("tickClock", () => {
  it("1000ms → 게임 1분 경과", () => {
    const clock = createGameClock(8);
    const next = tickClock(clock, 1000);
    expect(next.minute).toBe(1);
    expect(next.hour).toBe(8);
  });

  it("60000ms(60초) → 게임 1시간 경과", () => {
    const clock = createGameClock(8);
    const next = tickClock(clock, 60_000);
    expect(next.hour).toBe(9);
    expect(next.minute).toBe(0);
  });

  it("23:59 → 1분 경과 시 00:00으로 래핑", () => {
    const clock = createGameClock(23);
    const at2359 = tickClock(clock, 59_000); // 23:59
    expect(at2359.hour).toBe(23);
    expect(at2359.minute).toBe(59);

    const wrapped = tickClock(at2359, 1_000); // +1분 → 00:00
    expect(wrapped.hour).toBe(0);
    expect(wrapped.minute).toBe(0);
  });

  it("totalMinutes는 단조 증가(래핑 안 됨)", () => {
    const clock = createGameClock(23);
    const next = tickClock(clock, 120_000); // +2시간
    expect(next.totalMinutes).toBeGreaterThan(clock.totalMinutes);
  });
});

describe("formatClockTime", () => {
  it("한 자리 시/분을 0 패딩한다", () => {
    expect(formatClockTime({ hour: 8, minute: 5, totalMinutes: 485 })).toBe("08:05");
  });

  it("두 자리는 그대로", () => {
    expect(formatClockTime({ hour: 13, minute: 30, totalMinutes: 810 })).toBe("13:30");
  });

  it("자정은 00:00", () => {
    expect(formatClockTime({ hour: 0, minute: 0, totalMinutes: 0 })).toBe("00:00");
  });
});

describe("schedulePhase", () => {
  it.each([
    [7, "offwork"],
    [8, "commuting"],
    [9, "working"],
    [11, "working"],
    [12, "lunch"],
    [13, "working"],
    [17, "working"],
    [18, "leaving"],
    [19, "offwork"],
    [23, "offwork"],
  ] as const)("hour=%i → %s", (hour, expected) => {
    expect(schedulePhase(hour)).toBe(expected);
  });
});

describe("phaseToWorkState", () => {
  it("working → typing", () => {
    expect(phaseToWorkState("working")).toBe("typing");
  });

  it("lunch/break → question", () => {
    expect(phaseToWorkState("lunch")).toBe("question");
    expect(phaseToWorkState("break")).toBe("question");
  });

  it("commuting/leaving/offwork → offwork", () => {
    expect(phaseToWorkState("commuting")).toBe("offwork");
    expect(phaseToWorkState("leaving")).toBe("offwork");
    expect(phaseToWorkState("offwork")).toBe("offwork");
  });
});

describe("simulateNpcTasks", () => {
  const clock = createGameClock(10);

  it("offwork 상태면 태스크가 변하지 않는다", () => {
    const task = makeTask({ progress: 10 });
    const npc = makeNpc({ schedulePhase: "offwork", tasks: [task] });
    const result = simulateNpcTasks(npc, clock, fixedRng);
    expect(result.tasks[0].progress).toBe(10);
  });

  it("working 상태에서 활성 태스크 진행률이 증가한다", () => {
    const task = makeTask({ progress: 10 });
    const npc = makeNpc({ schedulePhase: "working", tasks: [task] });
    const result = simulateNpcTasks(npc, clock, fixedRng);
    expect(result.tasks[0].progress).toBeGreaterThan(10);
  });

  it("진행률 100% 태스크는 recentDone으로 이동한다", () => {
    const task = makeTask({ progress: 99.5 });
    const npc = makeNpc({ schedulePhase: "working", tasks: [task] });
    // fixedRng → advance = 0.5 + 0.5*1.5 = 1.25 → 99.5+1.25 = 100.75 → 100 → done
    const result = simulateNpcTasks(npc, clock, fixedRng);
    expect(result.tasks).toHaveLength(0);
    expect(result.recentDone).toHaveLength(1);
    expect(result.recentDone[0].status).toBe("done");
  });

  it("recentDone은 최대 3개로 제한된다", () => {
    const done1 = makeTask({ id: "d1", status: "done", progress: 100 });
    const done2 = makeTask({ id: "d2", status: "done", progress: 100 });
    const done3 = makeTask({ id: "d3", status: "done", progress: 100 });
    // 기존 recentDone 3개, 새로 완료 1개 → 슬라이스 후 3개
    const task = makeTask({ id: "new", progress: 99.5 });
    const npc = makeNpc({
      schedulePhase: "working",
      tasks: [task],
      recentDone: [done1, done2, done3],
    });
    const result = simulateNpcTasks(npc, clock, fixedRng);
    expect(result.recentDone).toHaveLength(3);
  });

  it("활성 태스크가 2개 미만이면 새 태스크를 생성할 수 있다(rng=0)", () => {
    // zeroRng: rng() < 0.1 → 항상 true, 새 태스크 생성
    const npc = makeNpc({ schedulePhase: "working", tasks: [] });
    const result = simulateNpcTasks(npc, clock, zeroRng);
    expect(result.tasks.length).toBeGreaterThanOrEqual(1);
  });

  it("활성 태스크가 2개 이상이면 새 태스크를 생성하지 않는다", () => {
    const t1 = makeTask({ id: "t1", progress: 10 });
    const t2 = makeTask({ id: "t2", progress: 20 });
    const npc = makeNpc({ schedulePhase: "working", tasks: [t1, t2] });
    // zeroRng여도 active.length >= 2 이면 추가 안 함
    const result = simulateNpcTasks(npc, clock, zeroRng);
    expect(result.tasks).toHaveLength(2);
  });
});
