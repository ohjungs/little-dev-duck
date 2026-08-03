// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { createGameClock, type Npc } from "@ldd/core";
import { OfficeManagementPanel } from "@/components/OfficeManagementPanel";

// OfficeDashboard.test.tsx와 동일한 근거(jsdom offsetParent 항상 null) — Tab 순환 단언은
// 이 파일에 쓰지 않는다. 실브라우저 검증은 Playwright e2e 몫.

const npc: Npc = {
  id: "npc-1", name: "테스트오리", department: "engineering", role: "백엔드",
  accessory: "glasses", accessoryColor: "#000",
  tile: { x: 0, y: 0 }, deskTile: { x: 0, y: 0 }, facing: "down",
  workState: "typing", schedulePhase: "working",
  tasks: [], recentDone: [], mood: "neutral",
  productivity: 80, satisfaction: 80, salary: 10, tasksCompleted: 0,
};
const npcs: Npc[] = [npc];
const clock = createGameClock();

describe("OfficeManagementPanel", () => {
  it("role=dialog·aria-modal·aria-label을 갖춰 렌더한다", () => {
    render(<OfficeManagementPanel npcs={npcs} clock={clock} onClose={vi.fn()} />);
    const dialog = screen.getByRole("dialog");
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(dialog.getAttribute("aria-label")).toBe("경영 관리 패널");
  });

  it("마운트되면 다이얼로그 컨테이너로 포커스가 들어간다", () => {
    render(<OfficeManagementPanel npcs={npcs} clock={clock} onClose={vi.fn()} />);
    expect(document.activeElement).toBe(screen.getByRole("dialog"));
  });

  it("Esc를 누르면 onClose를 한 번만 부른다", () => {
    const onClose = vi.fn();
    render(<OfficeManagementPanel npcs={npcs} clock={clock} onClose={onClose} />);
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("닫기(x) 버튼을 누르면 onClose를 부른다", () => {
    const onClose = vi.fn();
    render(<OfficeManagementPanel npcs={npcs} clock={clock} onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: "관리 패널 닫기" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("마운트 해제되면 열기 전 포커스로 되돌린다", () => {
    function Wrapper({ show }: { show: boolean }) {
      return (
        <>
          <button type="button">트리거</button>
          {show && (
            <OfficeManagementPanel npcs={npcs} clock={clock} onClose={vi.fn()} />
          )}
        </>
      );
    }
    const { rerender } = render(<Wrapper show={false} />);
    const trigger = screen.getByRole("button", { name: "트리거" });
    trigger.focus();
    expect(document.activeElement).toBe(trigger);

    rerender(<Wrapper show={true} />);
    expect(document.activeElement).toBe(screen.getByRole("dialog"));

    rerender(<Wrapper show={false} />);
    expect(document.activeElement).toBe(trigger);
  });
});
