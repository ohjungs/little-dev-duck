import { describe, expect, it } from "vitest";
import {
  createGameClock,
  gameClockFromHm,
  formatClockTime,
  hasActiveWork,
  npcWorkState,
  phaseToWorkState,
  schedulePhase,
  tickClock,
  type Npc,
  type NpcTask,
} from "./office-npc";

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
    productivity: 75,
    satisfaction: 75,
    salary: 10,
    tasksCompleted: 0,
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

describe("gameClockFromHm", () => {
  it("시/분을 그대로 반영한다", () => {
    expect(gameClockFromHm(14, 30)).toEqual({ hour: 14, minute: 30, totalMinutes: 870 });
  });
  it("범위를 벗어난 값을 정규화한다", () => {
    expect(gameClockFromHm(25, 61)).toEqual({ hour: 1, minute: 1, totalMinutes: 61 });
    expect(gameClockFromHm(-1, -1)).toEqual({ hour: 23, minute: 59, totalMinutes: 1439 });
  });
});

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

// 2026-07-26 : 오피스 - 직원상태 - 지어내기제거 (피드백 5-3·5-7)
// 이 블록은 원래 simulateNpcTasks(가짜 업무 생성 + 난수 진행률)를 검증했다. 그 동작 자체가
// 사용자가 지적한 문제라 함수와 함께 삭제하고, 대신 **지어내지 않는다**를 잠근다.
describe("hasActiveWork", () => {
  it("활성 업무가 있으면 true", () => {
    expect(hasActiveWork({ tasks: [makeTask({ status: "active" })] })).toBe(true);
  });

  it("업무가 없으면 false", () => {
    expect(hasActiveWork({ tasks: [] })).toBe(false);
  });

  it("대기·완료만 있으면 일하는 게 아니다", () => {
    expect(
      hasActiveWork({
        tasks: [
          makeTask({ id: "w", status: "waiting" }),
          makeTask({ id: "d", status: "done", progress: 100 }),
        ],
      }),
    ).toBe(false);
  });
});

describe("npcWorkState", () => {
  it("근무 시간에 실제 업무가 있으면 typing", () => {
    expect(npcWorkState({ tasks: [makeTask({ status: "active" })] }, "working")).toBe(
      "typing",
    );
  });

  it("근무 시간이어도 실제 업무가 없으면 쉬는 중(idle)이다", () => {
    // 핵심 회귀 방지: 예전에는 여기서 없는 업무를 지어내 typing으로 보였다.
    expect(npcWorkState({ tasks: [] }, "working")).toBe("idle");
  });

  it("근무 시간이 아니면 업무 유무와 무관하게 스케줄이 결정한다", () => {
    expect(npcWorkState({ tasks: [makeTask({ status: "active" })] }, "lunch")).toBe(
      "question",
    );
    expect(npcWorkState({ tasks: [makeTask({ status: "active" })] }, "offwork")).toBe(
      "offwork",
    );
    expect(npcWorkState({ tasks: [] }, "commuting")).toBe("offwork");
  });

  it("같은 입력에 항상 같은 결과 — 난수가 개입하지 않는다", () => {
    // 사용자가 같은 직원에게 두 번 물어보면 같은 답이 나와야 한다(5-7의 실제 불만).
    const npc = { tasks: [makeTask({ status: "active" })] };
    const results = Array.from({ length: 20 }, () => npcWorkState(npc, "working"));
    expect(new Set(results).size).toBe(1);
  });

  it("실제 Npc 객체를 그대로 넘겨도 성립한다", () => {
    // 위 케이스들은 { tasks } 부분 객체를 쓴다. 그것만으로는 실제 호출부(완전한 Npc)와
    // 어긋나도 통과하므로, 진짜 타입으로 한 번 통과시켜 계약을 확인한다.
    expect(npcWorkState(makeNpc({ tasks: [] }), "working")).toBe("idle");
    expect(npcWorkState(makeNpc({ tasks: [makeTask()] }), "working")).toBe("typing");
  });
});
