// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { createGameClock, type Npc } from "@ldd/core";
import { OfficeDashboard } from "@/components/OfficeDashboard";

// ConfirmDialog.test.tsx와 동일한 근거(jsdom offsetParent 항상 null) — Tab 순환 단언은
// 이 파일에 쓰지 않는다. 실브라우저 검증은 Playwright e2e 몫.

const npcs: Npc[] = [];
const clock = createGameClock();

describe("OfficeDashboard", () => {
  it("role=dialog·aria-modal·aria-label을 갖춰 렌더한다", () => {
    render(<OfficeDashboard npcs={npcs} clock={clock} onClose={vi.fn()} />);
    const dialog = screen.getByRole("dialog");
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(dialog.getAttribute("aria-label")).toBe("전사 대시보드");
  });

  it("마운트되면 다이얼로그 컨테이너로 포커스가 들어간다", () => {
    render(<OfficeDashboard npcs={npcs} clock={clock} onClose={vi.fn()} />);
    expect(document.activeElement).toBe(screen.getByRole("dialog"));
  });

  it("Esc를 누르면 onClose를 한 번만 부른다", () => {
    const onClose = vi.fn();
    render(<OfficeDashboard npcs={npcs} clock={clock} onClose={onClose} />);
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("닫기(x) 버튼을 누르면 onClose를 부른다", () => {
    const onClose = vi.fn();
    render(<OfficeDashboard npcs={npcs} clock={clock} onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: "대시보드 닫기" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("마운트 해제되면 열기 전 포커스로 되돌린다", () => {
    function Wrapper({ show }: { show: boolean }) {
      return (
        <>
          <button type="button">트리거</button>
          {show && <OfficeDashboard npcs={npcs} clock={clock} onClose={vi.fn()} />}
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
