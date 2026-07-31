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

  // 2026-07-31 : 테스트 - 모달접근성 - useModalA11y 3줄 계약 잠금
  // 아래 B1~B3이 겨냥하는 지점은 useModalA11y.ts:20-25 + deps [open] 하나다.
  // (1) 정리 함수의 removeEventListener, (2) setup effect deps에서 onClose 제외,
  // (3) 최신 콜백을 onCloseRef로 읽기 — 셋 중 하나가 무너지면 각각 B1·B2·B3이 RED가 된다.
  // 셋 다 "동작은 그대로인데 조용히 두 번 부르거나 포커스를 뺏는" 종류라 눈으로는 안 잡힌다.

  it("B1: 닫았다 다시 열어도 Esc 리스너는 한 벌만 남는다", () => {
    const onCancel = vi.fn();
    const tree = (open: boolean) => (
      <ConfirmDialog
        {...baseProps}
        open={open}
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />
    );

    const { rerender } = render(tree(true));
    rerender(tree(false));
    rerender(tree(true));

    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });

    // 정리에서 리스너를 떼지 않으면 이전 열림의 리스너가 남아 2회가 된다.
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("B2: onCancel identity만 바뀐 리렌더는 setup effect를 다시 돌려 포커스를 뺏지 않는다", () => {
    // 관측 지점을 모달 **밖** 요소로 잡는 이유: useModalA11y의 focusables()에는
    // `|| el === document.activeElement` 예외 조항이 있어서, 모달 안쪽 버튼에 포커스를 두면
    // effect가 재실행돼도 그 버튼을 다시 골라 포커스한다(= 재실행이 관측되지 않는다).
    // 밖에 포커스가 있을 때만 "재실행 → 컨테이너로 포커스 회수"가 드러난다.
    const tree = (onCancel: () => void) => (
      <>
        <button type="button">바깥 버튼</button>
        <ConfirmDialog
          {...baseProps}
          open
          onConfirm={vi.fn()}
          onCancel={onCancel}
        />
      </>
    );

    const { rerender } = render(tree(vi.fn()));

    const outside = screen.getByRole("button", { name: "바깥 버튼" });
    outside.focus();
    expect(document.activeElement).toBe(outside);

    // 부모가 인라인 함수를 넘기면 매 리렌더마다 identity가 바뀐다(호출부의 일반적인 형태).
    rerender(tree(vi.fn()));

    // 콜백 identity는 setup 재실행 사유가 아니다. 재실행되면 포커스가 컨테이너로 끌려간다.
    expect(document.activeElement).toBe(outside);
  });

  it("B3: Esc는 리렌더 이후의 최신 onCancel을 부른다", () => {
    const first = vi.fn();
    const second = vi.fn();
    const tree = (onCancel: () => void) => (
      <ConfirmDialog
        {...baseProps}
        open
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />
    );

    const { rerender } = render(tree(first));
    rerender(tree(second));

    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });

    // 리스너가 최초 렌더의 클로저를 붙들고 있으면 옛 콜백(first)이 불린다.
    expect(second).toHaveBeenCalledTimes(1);
    expect(first).toHaveBeenCalledTimes(0);
  });

  it("B4: 5000자 description을 자르지 않고 원문 그대로 렌더한다", () => {
    const description = "긴".repeat(5000);

    render(
      <ConfirmDialog
        title={baseProps.title}
        description={description}
        open
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    // getByText는 정규화 후 완전일치다 — 잘리거나 말줄임되면 매칭이 실패한다.
    expect(screen.getByText(description)).not.toBeNull();
  });

  it("B5: 2000자 title을 aria-label에 원문 그대로 싣는다", () => {
    const title = "제".repeat(2000);

    render(
      <ConfirmDialog
        title={title}
        description={baseProps.description}
        open
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByRole("dialog").getAttribute("aria-label")).toBe(title);
  });

  it("N1: description이 빈 문자열이어도 role·접근가능한 이름·버튼 2개를 유지한다", () => {
    render(
      <ConfirmDialog
        title={baseProps.title}
        description=""
        open
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    // 본문이 비어도 모달의 정체성(역할 + 이름)과 조작 수단은 남아야 한다.
    expect(screen.getByRole("dialog", { name: baseProps.title })).not.toBeNull();
    expect(screen.getAllByRole("button")).toHaveLength(2);
  });
});
