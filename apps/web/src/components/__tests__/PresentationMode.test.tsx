// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { PresentationMode } from "@/components/PresentationMode";

// PageEditor.test.tsx의 확립된 모킹 레시피 재사용 — BlockNote 내부 상태와 분리.
vi.mock("@/components/BlockEditor", () => ({
  BlockEditor: () => <div data-testid="block-editor-stub" />,
}));

// OfficeDashboard.test.tsx와 동일한 근거(jsdom offsetParent 항상 null) — Tab 순환 단언은
// 이 파일에 쓰지 않는다. 실브라우저 검증(포커스가 실제로 어느 버튼에 들어가는지 포함)은
// Playwright e2e 몫.
//
// document.fullscreenElement / requestFullscreen / exitFullscreen은 컴포넌트에서 이미
// `?.()` optional chaining으로 방어돼 있어 jsdom(미구현)에서도 별도 목 없이 그대로 통과한다.

const TWO_SLIDES_CONTENT = [
  { type: "heading", props: { level: 1 }, content: [{ type: "text", text: "장 하나" }] },
  { type: "paragraph", content: [{ type: "text", text: "본문 1" }] },
  { type: "heading", props: { level: 1 }, content: [{ type: "text", text: "장 둘" }] },
  { type: "paragraph", content: [{ type: "text", text: "본문 2" }] },
];

describe("PresentationMode", () => {
  it("role=dialog·aria-modal·aria-label을 갖춰 렌더한다", async () => {
    render(<PresentationMode content={TWO_SLIDES_CONTENT} onClose={vi.fn()} />);
    await screen.findByTestId("block-editor-stub");

    const dialog = screen.getByRole("dialog");
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(dialog.getAttribute("aria-label")).toBe("발표 모드");
  });

  it("마운트되면 다이얼로그 컨테이너로 포커스가 들어간다", async () => {
    render(<PresentationMode content={TWO_SLIDES_CONTENT} onClose={vi.fn()} />);
    await screen.findByTestId("block-editor-stub");

    expect(document.activeElement).toBe(screen.getByRole("dialog"));
  });

  it("Esc를 누르면 onClose를 한 번만 부른다", async () => {
    const onClose = vi.fn();
    render(<PresentationMode content={TWO_SLIDES_CONTENT} onClose={onClose} />);
    await screen.findByTestId("block-editor-stub");

    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("발표 끝내기 버튼을 누르면 onClose를 부른다", async () => {
    const onClose = vi.fn();
    render(<PresentationMode content={TWO_SLIDES_CONTENT} onClose={onClose} />);
    await screen.findByTestId("block-editor-stub");

    fireEvent.click(screen.getByRole("button", { name: "발표 끝내기" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("마운트 해제되면 열기 전 포커스로 되돌린다", async () => {
    function Wrapper({ show }: { show: boolean }) {
      return (
        <>
          <button type="button">트리거</button>
          {show && (
            <PresentationMode content={TWO_SLIDES_CONTENT} onClose={vi.fn()} />
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
    await screen.findByTestId("block-editor-stub");

    rerender(<Wrapper show={false} />);
    expect(document.activeElement).toBe(trigger);
  });

  // 79행(Escape 처리) 삭제가 인접 분기(ArrowRight 등)를 건드리지 않았는지 확인하는
  // 유일한 자동 검증 지점 — 훅은 Escape에만 개입하고 다른 키는 그대로 통과해야 한다.
  it("Esc가 아닌 다른 키(ArrowRight)는 여전히 다음 장으로 넘어간다", async () => {
    render(<PresentationMode content={TWO_SLIDES_CONTENT} onClose={vi.fn()} />);
    await screen.findByTestId("block-editor-stub");

    expect(screen.getByText("1 / 2")).not.toBeNull();
    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(screen.getByText("2 / 2")).not.toBeNull();
  });
});
