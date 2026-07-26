import { describe, expect, it } from "vitest";
import {
  EMPTY_LAYOUT,
  isHidden,
  moveWidget,
  parseDashboardLayout,
  resolveOrder,
  toggleHidden,
  visibleWidgets,
  type DashboardLayout,
} from "./dashboard-layout";

const AVAILABLE = ["duck", "chat", "todo", "habit", "memo"];

function layout(over: Partial<DashboardLayout> = {}): DashboardLayout {
  return { order: [], hidden: [], ...over };
}

describe("parseDashboardLayout", () => {
  it("정상 값을 그대로 읽는다", () => {
    expect(parseDashboardLayout({ order: ["todo", "duck"], hidden: ["memo"] })).toEqual({
      order: ["todo", "duck"],
      hidden: ["memo"],
    });
  });

  it.each([undefined, null, "layout", 42, []])("이상한 값(%s)은 빈 배치", (bad) => {
    expect(parseDashboardLayout(bad)).toEqual(EMPTY_LAYOUT);
  });

  it("문자열 아닌 원소·중복·빈 문자열을 걸러낸다", () => {
    expect(
      parseDashboardLayout({ order: ["todo", "todo", "", 3, null], hidden: "memo" }),
    ).toEqual({ order: ["todo"], hidden: [] });
  });

  it("컬럼이 아직 없을 때(undefined)도 throw하지 않는다", () => {
    // 마이그레이션 적용 전에는 이 값이 없다. 여기서 죽으면 대시보드가 통째로 안 뜬다.
    expect(() => parseDashboardLayout(undefined)).not.toThrow();
  });
});

describe("resolveOrder", () => {
  it("저장이 없으면 코드가 정한 기본 순서 그대로", () => {
    expect(resolveOrder(AVAILABLE, EMPTY_LAYOUT)).toEqual(AVAILABLE);
  });

  it("저장된 순서를 따른다", () => {
    expect(resolveOrder(AVAILABLE, layout({ order: ["memo", "todo"] }))).toEqual([
      "memo",
      "todo",
      "duck",
      "chat",
      "habit",
    ]);
  });

  it("새로 만든 위젯은 뒤에 붙되 기본 순서를 유지한다", () => {
    // 저장 시점엔 없던 habit·memo가 코드에 추가된 상황.
    const stored = layout({ order: ["todo", "chat", "duck"] });
    expect(resolveOrder(AVAILABLE, stored)).toEqual([
      "todo",
      "chat",
      "duck",
      "habit",
      "memo",
    ]);
  });

  it("사라진 위젯은 조용히 버린다", () => {
    const stored = layout({ order: ["없어진위젯", "todo"] });
    expect(resolveOrder(AVAILABLE, stored)).not.toContain("없어진위젯");
    expect(resolveOrder(AVAILABLE, stored)[0]).toBe("todo");
  });

  it("결과에 위젯이 빠지거나 중복되지 않는다", () => {
    const stored = layout({ order: ["memo", "memo", "없음"] });
    const out = resolveOrder(AVAILABLE, stored);
    expect(new Set(out).size).toBe(out.length);
    expect(out.sort()).toEqual([...AVAILABLE].sort());
  });
});

describe("toggleHidden / visibleWidgets", () => {
  it("숨기면 목록에서 빠지고 다시 켜면 돌아온다", () => {
    let l = toggleHidden(EMPTY_LAYOUT, "todo");
    expect(isHidden(l, "todo")).toBe(true);
    expect(visibleWidgets(AVAILABLE, l)).not.toContain("todo");
    l = toggleHidden(l, "todo");
    expect(visibleWidgets(AVAILABLE, l)).toContain("todo");
  });

  it("숨겼다 켜도 원래 자리로 돌아온다(맨 뒤로 밀리지 않는다)", () => {
    // 이게 "보이는 것만 저장"하지 않은 이유다.
    const base = layout({ order: ["memo", "todo", "duck", "chat", "habit"] });
    const hidden = toggleHidden(base, "todo");
    const restored = toggleHidden(hidden, "todo");
    expect(visibleWidgets(AVAILABLE, restored)).toEqual([
      "memo",
      "todo",
      "duck",
      "chat",
      "habit",
    ]);
  });

  it("숨김 토글이 순서를 바꾸지 않는다", () => {
    const base = layout({ order: ["memo", "todo"] });
    expect(toggleHidden(base, "duck").order).toEqual(["memo", "todo"]);
  });

  it("전부 숨기면 빈 목록", () => {
    let l = EMPTY_LAYOUT;
    for (const id of AVAILABLE) l = toggleHidden(l, id);
    expect(visibleWidgets(AVAILABLE, l)).toEqual([]);
  });
});

describe("moveWidget", () => {
  it("한 칸 위로 옮긴다", () => {
    const l = moveWidget(AVAILABLE, EMPTY_LAYOUT, "todo", "up");
    expect(resolveOrder(AVAILABLE, l)).toEqual(["duck", "todo", "chat", "habit", "memo"]);
  });

  it("한 칸 아래로 옮긴다", () => {
    const l = moveWidget(AVAILABLE, EMPTY_LAYOUT, "todo", "down");
    expect(resolveOrder(AVAILABLE, l)).toEqual(["duck", "chat", "habit", "todo", "memo"]);
  });

  it("맨 위에서 더 올려도 순환하지 않는다", () => {
    const l = moveWidget(AVAILABLE, EMPTY_LAYOUT, "duck", "up");
    expect(resolveOrder(AVAILABLE, l)).toEqual(AVAILABLE);
  });

  it("맨 아래에서 더 내려도 순환하지 않는다", () => {
    const l = moveWidget(AVAILABLE, EMPTY_LAYOUT, "memo", "down");
    expect(resolveOrder(AVAILABLE, l)).toEqual(AVAILABLE);
  });

  it("저장이 비어 있어도 화면에 보이는 위치 기준으로 옮긴다", () => {
    // 부분 저장 상태에서 인덱스를 잘못 세면 엉뚱한 카드가 움직인다.
    const partial = layout({ order: ["memo"] });
    const moved = moveWidget(AVAILABLE, partial, "duck", "up");
    // memo, duck, chat, ... 에서 duck을 올리면 duck이 맨 앞
    expect(resolveOrder(AVAILABLE, moved)[0]).toBe("duck");
  });

  it("없는 위젯을 옮기려 하면 배치가 그대로다", () => {
    const before = layout({ order: ["memo"] });
    expect(moveWidget(AVAILABLE, before, "없음", "up")).toEqual(before);
  });

  it("옮겨도 위젯이 사라지거나 늘지 않는다", () => {
    let l: DashboardLayout = EMPTY_LAYOUT;
    for (const dir of ["up", "down", "down", "up"] as const) {
      l = moveWidget(AVAILABLE, l, "habit", dir);
    }
    const out = resolveOrder(AVAILABLE, l);
    expect(out.sort()).toEqual([...AVAILABLE].sort());
  });

  it("숨김 목록을 건드리지 않는다", () => {
    const l = moveWidget(AVAILABLE, layout({ hidden: ["memo"] }), "todo", "up");
    expect(l.hidden).toEqual(["memo"]);
  });

  it("입력 배치를 변형하지 않는다", () => {
    const before = layout({ order: ["memo", "todo"], hidden: ["duck"] });
    const snapshot = JSON.parse(JSON.stringify(before));
    moveWidget(AVAILABLE, before, "todo", "up");
    expect(before).toEqual(snapshot);
  });
});
