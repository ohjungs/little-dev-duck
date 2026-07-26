import { describe, expect, it } from "vitest";
import {
  LOG_KIND_LABELS,
  logKind,
  logName,
  summarizeLogs,
  summarizeVisits,
  type LogEntryLike,
} from "./log-stats";

function entry(over: Partial<LogEntryLike> & { toolName: string }): LogEntryLike {
  return {
    status: "success",
    argsSummary: null,
    resultSummary: null,
    createdAt: "2026-07-26T10:00:00.000Z",
    ...over,
  };
}

describe("logKind", () => {
  it.each([
    ["page:view", "visit"],
    ["batch:news-collect", "batch"],
    ["app:todo-add", "app"],
    ["createTodo", "tool"],
  ] as const)("%s → %s", (name, kind) => {
    expect(logKind(name)).toBe(kind);
  });

  it("모르는 접두사는 오리 작업으로 본다(기존 기록이 그렇다)", () => {
    expect(logKind("weird:thing")).toBe("tool");
  });

  it("콜론이 맨 앞이면 접두사가 아니다", () => {
    expect(logKind(":view")).toBe("tool");
  });

  it("모든 종류에 한국어 이름이 있다", () => {
    for (const k of ["visit", "batch", "app", "tool"] as const) {
      expect(LOG_KIND_LABELS[k].length).toBeGreaterThan(0);
    }
  });
});

describe("logName", () => {
  it("아는 접두사만 뗀다", () => {
    expect(logName("batch:news-collect")).toBe("news-collect");
    expect(logName("createTodo")).toBe("createTodo");
  });

  it("모르는 접두사는 그대로 둔다(정보를 잃지 않게)", () => {
    expect(logName("weird:thing")).toBe("weird:thing");
  });
});

describe("summarizeLogs", () => {
  const sample = [
    entry({ toolName: "createTodo" }),
    entry({ toolName: "createTodo" }),
    entry({ toolName: "batch:news-collect", status: "error", createdAt: "2026-07-26T09:00:00.000Z" }),
    entry({ toolName: "page:view" }),
  ];

  it("빈 목록이어도 NaN이 나오지 않는다", () => {
    const s = summarizeLogs([]);
    expect(s.total).toBe(0);
    expect(s.errorRate).toBe(0);
    expect(Number.isNaN(s.errorRate)).toBe(false);
  });

  it("전체 건수·실패 건수·실패율을 센다", () => {
    const s = summarizeLogs(sample);
    expect(s.total).toBe(4);
    expect(s.errors).toBe(1);
    expect(s.errorRate).toBe(25);
  });

  it("종류별 건수는 필터와 무관하게 전체를 센다", () => {
    // 화면이 "지금 어떤 종류가 얼마나 있나"를 탭에 표시하므로, 한 종류를 골라도
    // 나머지 개수를 알 수 있어야 한다.
    const s = summarizeLogs(sample, { kind: "tool" });
    expect(s.byKind).toEqual({ visit: 1, batch: 1, app: 0, tool: 2 });
    expect(s.total).toBe(2);
  });

  it("이름별 순위는 많은 순, 동점이면 이름순으로 확정된다", () => {
    const s = summarizeLogs([
      entry({ toolName: "b" }),
      entry({ toolName: "a" }),
      entry({ toolName: "c" }),
      entry({ toolName: "c" }),
    ]);
    expect(s.topNames.map((t) => t.name)).toEqual(["c", "a", "b"]);
  });

  it("같은 입력에 같은 결과 — 새로고침마다 순서가 흔들리지 않는다", () => {
    const first = summarizeLogs(sample).topNames;
    const second = summarizeLogs(sample).topNames;
    expect(second).toEqual(first);
  });

  it("최근 실패만 최신순으로 모은다", () => {
    const s = summarizeLogs([
      entry({ toolName: "x", status: "error", createdAt: "2026-07-26T01:00:00.000Z" }),
      entry({ toolName: "y", status: "error", createdAt: "2026-07-26T05:00:00.000Z" }),
      entry({ toolName: "z" }),
    ]);
    expect(s.recentErrors.map((e) => e.toolName)).toEqual(["y", "x"]);
  });

  it("입력 순서가 뒤죽박죽이어도 실패 순서는 최신순이다", () => {
    const shuffled = [
      entry({ toolName: "old", status: "error", createdAt: "2026-07-20T00:00:00.000Z" }),
      entry({ toolName: "new", status: "error", createdAt: "2026-07-26T00:00:00.000Z" }),
      entry({ toolName: "mid", status: "error", createdAt: "2026-07-23T00:00:00.000Z" }),
    ];
    expect(summarizeLogs(shuffled).recentErrors.map((e) => e.toolName)).toEqual([
      "new",
      "mid",
      "old",
    ]);
  });

  it("개수 상한을 지킨다", () => {
    const many = Array.from({ length: 20 }, (_, i) =>
      entry({ toolName: `t${i}`, status: "error" }),
    );
    const s = summarizeLogs(many, { topLimit: 3, errorLimit: 2 });
    expect(s.topNames).toHaveLength(3);
    expect(s.recentErrors).toHaveLength(2);
  });

  it("입력 배열을 바꾸지 않는다", () => {
    const input = [...sample];
    const snapshot = input.map((e) => e.toolName);
    summarizeLogs(input);
    expect(input.map((e) => e.toolName)).toEqual(snapshot);
  });
});

describe("summarizeVisits", () => {
  const visit = (title: string, hour: number) => ({
    ...entry({ toolName: "page:view", argsSummary: title }),
    hour,
  });

  it("방문이 없으면 0으로 답한다(NaN 금지)", () => {
    const v = summarizeVisits([]);
    expect(v.pages).toBe(0);
    expect(v.avgVisitsPerPage).toBe(0);
    expect(v.byHour).toHaveLength(24);
    expect(v.byHour.every((n) => n === 0)).toBe(true);
  });

  it("자주 방문한 페이지를 많은 순으로 준다", () => {
    const v = summarizeVisits([
      visit("회의록", 9),
      visit("회의록", 10),
      visit("일기", 22),
    ]);
    expect(v.topPages[0]).toEqual({ name: "회의록", count: 2 });
    expect(v.pages).toBe(2);
    expect(v.totalVisits).toBe(3);
  });

  it("페이지당 평균 방문 횟수를 소수 한 자리로 준다", () => {
    const v = summarizeVisits([visit("a", 1), visit("a", 2), visit("b", 3)]);
    expect(v.avgVisitsPerPage).toBe(1.5);
  });

  it("시간대별 분포를 24칸으로 채운다", () => {
    const v = summarizeVisits([visit("a", 9), visit("b", 9), visit("c", 23)]);
    expect(v.byHour[9]).toBe(2);
    expect(v.byHour[23]).toBe(1);
    expect(v.byHour[0]).toBe(0);
  });

  it("범위 밖 시각은 분포에서 버리되 방문 수에는 센다", () => {
    // 시각을 못 구한 기록이 있어도 "몇 번 봤나"는 여전히 사실이다.
    const v = summarizeVisits([{ ...visit("a", 99) }, { ...visit("b", -1) }]);
    expect(v.totalVisits).toBe(2);
    expect(v.byHour.every((n) => n === 0)).toBe(true);
  });

  it("방문이 아닌 로그는 섞여 있어도 세지 않는다", () => {
    const v = summarizeVisits([
      visit("a", 1),
      { ...entry({ toolName: "createTodo" }), hour: 2 },
      { ...entry({ toolName: "batch:x" }), hour: 3 },
    ]);
    expect(v.totalVisits).toBe(1);
  });

  it("제목이 비어 있어도 항목이 사라지지 않는다", () => {
    const v = summarizeVisits([{ ...entry({ toolName: "page:view", argsSummary: "  " }), hour: 5 }]);
    expect(v.totalVisits).toBe(1);
    expect(v.topPages[0].name.length).toBeGreaterThan(0);
  });
});
