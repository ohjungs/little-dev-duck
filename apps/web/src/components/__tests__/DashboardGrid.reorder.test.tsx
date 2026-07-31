// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { DashboardGrid } from "@/components/DashboardGrid";

// 2026-07-31 : 테스트 - 대시보드 순서 - 키보드 경로와 인덱스 사상
// 이 파일이 지키는 계약은 셋이다.
// (1) **키보드로 순서를 바꿀 수 있다.** 끌기만 있으면 마우스 없이는 순서를 못 바꾼다(WCAG 2.1.1).
//     jsdom에는 드래그 앤 드롭이 없어 끌기 자체는 여기서 검증할 수 없다 — e2e 몫이다.
//     그런데 **저장에 들어가는 계산은 두 경로가 같은 함수**라, 여기서 계산을 잠그면 값이 크다.
// (2) **숨긴 카드를 건너뛴다.** 한 칸 이동을 전체 순서 기준으로 세면 숨긴 카드와 자리가 바뀌어
//     저장은 되는데 화면은 그대로다 — 사용자에겐 "키가 안 먹는다"로 보인다.
// (3) **저장이 실패하면 화면을 되돌린다.** 안 되돌리면 저장된 줄 알고 창을 닫는다.
//
// 자리 고정(pinnedClassName)을 떼는 규칙도 함께 잠근다 — 안 떼면 xl 화면에서 카드를 옮겨도
// 그리드가 원래 칸에 도로 붙여서 "옮겨지지 않는다"가 된다.

const saveMyDashboardLayout = vi.fn();

vi.mock("@ldd/api", () => ({
  saveMyDashboardLayout: (...args: unknown[]) => saveMyDashboardLayout(...args),
}));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({}) }));

// 서버가 넘기는 모양 그대로. 숨긴 카드(habit)는 애초에 slot이 오지 않는다.
function renderGrid(layout: { order: string[]; hidden: string[] }) {
  return render(
    <DashboardGrid
      layout={layout}
      widgets={[
        { id: "todo", label: "할 일", children: <div data-testid="body-todo" /> },
        {
          id: "memo",
          label: "메모",
          className: "md:col-span-2",
          pinnedClassName: "xl:col-start-1",
          children: <div data-testid="body-memo" />,
        },
      ]}
    />,
  );
}

// 카드 순서는 손잡이 버튼의 등장 순서로 읽는다(카드마다 정확히 하나다).
function handleOrder(): string[] {
  return screen
    .getAllByRole("button", { name: /카드 순서 이동$/ })
    .map((b) => b.getAttribute("aria-label") ?? "");
}

const handleFor = (label: string) =>
  screen.getByRole("button", { name: `${label} 카드 순서 이동` });

describe("DashboardGrid 순서 바꾸기", () => {
  beforeEach(() => {
    saveMyDashboardLayout.mockReset();
    saveMyDashboardLayout.mockResolvedValue(undefined);
    localStorage.clear();
  });

  it("아래 화살표로 카드를 옮기고 그 순서를 저장한다", async () => {
    // habit은 숨김이라 화면에 없다. 전체 순서에서는 todo와 memo 사이에 있다 —
    // 한 칸 이동을 전체 순서로 세면 todo가 habit과 자리만 바꿔 화면이 안 변한다.
    renderGrid({ order: ["todo", "habit", "memo"], hidden: ["habit"] });
    expect(handleOrder()).toEqual(["할 일 카드 순서 이동", "메모 카드 순서 이동"]);

    await act(async () => {
      fireEvent.keyDown(handleFor("할 일"), { key: "ArrowDown" });
    });

    expect(handleOrder()).toEqual(["메모 카드 순서 이동", "할 일 카드 순서 이동"]);
    expect(saveMyDashboardLayout).toHaveBeenCalledTimes(1);
    // 숨긴 habit은 순서에서 사라지지 않는다 — 다시 켜면 제자리로 돌아와야 한다.
    // 저장에는 화면에 없는 카드까지 전체 순서가 들어간다 — 그래야 숨긴 카드를 다시 켰을 때
    // 제자리로 돌아온다. 위젯을 추가하면 이 기대값도 함께 바뀌는 것이 정상이다
    // (2026-08-01에 커밋 잔디가 늘면서 이 검사가 먼저 잡아 줬다).
    expect(saveMyDashboardLayout.mock.calls[0]![1]).toEqual({
      order: [
        "habit",
        "memo",
        "todo",
        "duck",
        "chat",
        "pomodoro",
        "calendar",
        "github",
        "news-top",
      ],
      hidden: ["habit"],
    });
  });

  it("맨 위에서 위로 더 밀어도 저장하지 않는다", async () => {
    renderGrid({ order: [], hidden: [] });
    await act(async () => {
      fireEvent.keyDown(handleFor("할 일"), { key: "ArrowUp" });
    });
    expect(saveMyDashboardLayout).not.toHaveBeenCalled();
  });

  it("저장이 실패하면 순서를 되돌리고 이유를 보여준다", async () => {
    saveMyDashboardLayout.mockRejectedValue(new Error("column does not exist"));
    renderGrid({ order: ["todo", "memo"], hidden: [] });

    await act(async () => {
      fireEvent.keyDown(handleFor("할 일"), { key: "ArrowDown" });
    });

    expect(handleOrder()).toEqual(["할 일 카드 순서 이동", "메모 카드 순서 이동"]);
    expect(screen.getByText(/column does not exist/)).toBeTruthy();
  });

  it("사용자가 순서를 정하기 전에만 기본 자리 고정을 붙인다", () => {
    const { unmount } = renderGrid({ order: [], hidden: [] });
    // 카드 요소는 손잡이의 부모다(손잡이가 카드 안의 절대배치 버튼).
    expect(handleFor("메모").parentElement?.className).toContain("xl:col-start-1");
    unmount();

    renderGrid({ order: ["memo", "todo"], hidden: [] });
    expect(handleFor("메모").parentElement?.className).not.toContain("xl:col-start-1");
    // 크기 지정(span)은 자리 고정이 아니므로 계속 붙어 있어야 한다 —
    // 함께 떼면 카드가 순서를 바꾼 순간 좁아진다.
    expect(handleFor("메모").parentElement?.className).toContain("md:col-span-2");
  });
});
