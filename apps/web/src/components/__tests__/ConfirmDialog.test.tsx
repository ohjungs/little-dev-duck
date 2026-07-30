// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ConfirmDialog } from "@/components/ConfirmDialog";

// 2026-07-31 : 테스트 - 환경한계 - jsdomTab트랩검증불가
// useModalA11y의 focusables() 필터는 el.offsetParent !== null에 기댄다. jsdom에는 레이아웃
// 엔진이 없어 offsetParent가 항상 null이다(jsdom 29.1.1에서 실측 확인). 그래서 이 환경에서
// focusables()는 언제나 빈 배열이고, 초기 포커스는 첫 버튼이 아니라 컨테이너로 들어가며
// (아래 "열리면 다이얼로그 컨테이너로 포커스가 들어간다"의 근거) Tab 핸들러는 preventDefault만
// 하고 끝난다.
// **따라서 Tab 순환(포커스 트랩) 단언은 이 파일에 쓰지 않는다.** 억지로 통과시키면 거짓 검증이다.
// HTMLElement.prototype.offsetParent 패치로 우회하는 것도 전역 프로토타입 오염이라 금지한다.
// 실브라우저 기준 Tab 트랩 검증은 Playwright e2e 몫으로 남긴다(후속 백로그).

const baseProps = {
  title: "메모를 삭제할까요?",
  description: "삭제하면 되돌릴 수 없습니다.",
};

describe("ConfirmDialog", () => {
  it("open=false면 아무것도 렌더하지 않는다", () => {
    render(
      <ConfirmDialog
        {...baseProps}
        open={false}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("open=true면 모달 역할·이름·본문·버튼 두 개를 갖춰 렌더한다", () => {
    render(
      <ConfirmDialog
        {...baseProps}
        open
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    const dialog = screen.getByRole("dialog");
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(dialog.getAttribute("aria-label")).toBe(baseProps.title);
    expect(screen.getByText(baseProps.description)).not.toBeNull();
    expect(screen.getByRole("button", { name: "취소" })).not.toBeNull();
    // confirmLabel 기본값
    expect(screen.getByRole("button", { name: "확인" })).not.toBeNull();
  });

  it("열리면 다이얼로그 컨테이너로 포커스가 들어간다", () => {
    render(
      <ConfirmDialog
        {...baseProps}
        open
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(document.activeElement).toBe(screen.getByRole("dialog"));
  });

  it("Esc를 누르면 onCancel만 한 번 부른다", () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <ConfirmDialog
        {...baseProps}
        open
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledTimes(0);
  });

  it("배경(오버레이) 클릭은 닫고, 다이얼로그 내부 클릭은 닫지 않는다", () => {
    const onCancel = vi.fn();
    render(
      <ConfirmDialog
        {...baseProps}
        open
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />,
    );

    const dialog = screen.getByRole("dialog");
    const overlay = dialog.parentElement;
    expect(overlay).not.toBeNull();

    fireEvent.click(overlay!);
    expect(onCancel).toHaveBeenCalledTimes(1);

    onCancel.mockClear();
    fireEvent.click(dialog);
    expect(onCancel).toHaveBeenCalledTimes(0);
  });

  it("확인 버튼을 누르면 onConfirm만 한 번 부른다", () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <ConfirmDialog
        {...baseProps}
        open
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "확인" }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).toHaveBeenCalledTimes(0);
  });

  it("닫히면 열기 직전에 포커스를 갖고 있던 요소로 포커스를 되돌린다", () => {
    const props = { ...baseProps, onConfirm: vi.fn(), onCancel: vi.fn() };
    const tree = (open: boolean) => (
      <>
        <button type="button">삭제</button>
        <ConfirmDialog {...props} open={open} />
      </>
    );

    const { rerender } = render(tree(false));

    const trigger = screen.getByRole("button", { name: "삭제" });
    trigger.focus();
    expect(document.activeElement).toBe(trigger);

    rerender(tree(true));
    expect(document.activeElement).toBe(screen.getByRole("dialog"));

    rerender(tree(false));
    expect(document.activeElement).toBe(trigger);
  });
});
