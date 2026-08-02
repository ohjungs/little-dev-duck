// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { SheetGrid } from "@/components/SheetGrid";
import { createDefaultSheetMeta, type Cell, type Sheet } from "@ldd/core";

// 2026-08-02 : 테스트 - 스프레드시트 - 격자 화면 계약 (SPEC-2026-08-02-spreadsheet-a1 T5)
// AC-19(보이는 범위만 렌더) · AC-20(키보드·role=grid) · AC-21(IME) · AC-8의 화면 쪽(#CIRCULAR!).

const SHEET: Sheet = {
  id: "s1",
  pageId: "p1",
  name: "Sheet1",
  position: 0,
  meta: createDefaultSheetMeta(),
};

function cell(r: number, c: number, v: Cell["v"], f: string | null = null): Cell {
  return { r, c, v, f, s: null };
}

function renderGrid(cells: Cell[], onCellCommit = vi.fn()) {
  render(<SheetGrid sheet={SHEET} cells={cells} onCellCommit={onCellCommit} />);
  // 키는 전부 선택 칸에 상주하는 입력칸이 받는다(한글 IME가 조합을 걸 곳이 늘 있어야 한다).
  return {
    onCellCommit,
    grid: screen.getByRole("grid"),
    input: screen.getByLabelText("셀 편집") as HTMLInputElement,
  };
}

describe("SheetGrid 렌더", () => {
  it("열 머리글과 행 머리글을 보여준다", () => {
    renderGrid([]);
    expect(screen.getByRole("columnheader", { name: "A" })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "B" })).toBeTruthy();
    expect(screen.getByRole("rowheader", { name: "1" })).toBeTruthy();
  });

  it("수식 셀은 원문이 아니라 계산된 값을 보여준다", () => {
    renderGrid([cell(0, 0, 10), cell(1, 0, 20), cell(2, 0, null, "=SUM(A1:A2)")]);
    expect(screen.getByRole("gridcell", { name: "30" })).toBeTruthy();
  });

  it("순환 참조 셀에 #CIRCULAR!가 보인다", () => {
    renderGrid([cell(0, 0, null, "=A1")]);
    expect(screen.getByRole("gridcell", { name: "#CIRCULAR!" })).toBeTruthy();
  });

  it("10,000셀 격자에서 보이는 범위만 DOM에 만든다", () => {
    // 논리 격자는 500행 이상이 되고(마지막 데이터가 r=499), 열은 최소 20이다.
    const { grid } = renderGrid([cell(0, 0, 1), cell(499, 19, 2)]);
    const rendered = within(grid).getAllByRole("gridcell").length;
    expect(Number(grid.getAttribute("aria-rowcount"))).toBeGreaterThan(500);
    expect(rendered).toBeLessThan(600);
  });
});

describe("SheetGrid 선택과 입력줄", () => {
  it("셀을 클릭하면 선택되고 이름 상자에 주소가 뜬다", () => {
    renderGrid([cell(1, 1, "값")]);
    fireEvent.click(screen.getByRole("gridcell", { name: "값" }));
    expect(screen.getByRole("gridcell", { name: "값" }).getAttribute("aria-selected")).toBe("true");
    expect((screen.getByLabelText("이름 상자") as HTMLInputElement).value).toBe("B2");
  });

  it("수식 입력줄은 계산 결과가 아니라 수식 원문을 보여준다", () => {
    renderGrid([cell(0, 0, 10), cell(1, 0, null, "=A1*2")]);
    fireEvent.click(screen.getByRole("gridcell", { name: "20" }));
    expect((screen.getByLabelText("수식 입력줄") as HTMLInputElement).value).toBe("=A1*2");
  });

  it("이름 상자에 주소를 넣고 Enter를 치면 그 셀로 이동한다", () => {
    renderGrid([cell(2, 2, "여기")]);
    const nameBox = screen.getByLabelText("이름 상자");
    fireEvent.change(nameBox, { target: { value: "C3" } });
    fireEvent.keyDown(nameBox, { key: "Enter" });
    expect(screen.getByRole("gridcell", { name: "여기" }).getAttribute("aria-selected")).toBe("true");
  });
});

describe("SheetGrid 키보드", () => {
  it("방향키로 선택이 움직인다", () => {
    const { input } = renderGrid([cell(1, 0, "아래")]);
    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(screen.getByRole("gridcell", { name: "아래" }).getAttribute("aria-selected")).toBe("true");
  });

  it("F2로 편집을 시작하고 Enter로 확정하면 아래 칸으로 내려간다", () => {
    const { input, onCellCommit } = renderGrid([]);
    fireEvent.keyDown(input, { key: "F2" });
    fireEvent.change(input, { target: { value: "42" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onCellCommit).toHaveBeenCalledWith({ r: 0, c: 0, v: 42, f: null, s: null });
    expect((screen.getByLabelText("이름 상자") as HTMLInputElement).value).toBe("A2");
  });

  it("확정한 뒤에도 입력칸이 포커스를 쥐고 있고, 확정은 한 번만 일어난다", () => {
    const { input, onCellCommit } = renderGrid([]);
    fireEvent.keyDown(input, { key: "F2" });
    fireEvent.change(input, { target: { value: "1" } });
    fireEvent.keyDown(input, { key: "Enter" });
    // 포커스가 남아 있어야 다음 칸을 이어서 칠 수 있다(AC-20).
    expect(document.activeElement).toBe(input);
    // blur가 한 번 더 확정하면 안 된다(같은 값이라 눈에 안 띄지만 저장은 두 번 간다).
    expect(onCellCommit).toHaveBeenCalledTimes(1);
  });

  it("편집 중 다른 곳으로 포커스가 빠지면 입력이 저장된다", () => {
    const { input, onCellCommit } = renderGrid([]);
    fireEvent.keyDown(input, { key: "F2" });
    fireEvent.change(input, { target: { value: "5" } });
    fireEvent.blur(input);
    expect(onCellCommit).toHaveBeenCalledWith({ r: 0, c: 0, v: 5, f: null, s: null });
  });

  it("이미 선택된 칸을 더블클릭해도 편집이 시작된다(입력칸이 그 칸을 덮고 있다)", () => {
    const { input } = renderGrid([cell(0, 0, "원래")]);
    fireEvent.doubleClick(input);
    expect(input.value).toBe("원래");
  });

  it("편집 중이 아닐 때의 blur는 아무것도 저장하지 않는다", () => {
    const { input, onCellCommit } = renderGrid([cell(0, 0, "그대로")]);
    fireEvent.blur(input);
    expect(onCellCommit).not.toHaveBeenCalled();
  });

  it("F2 없이 글자를 치면 그대로 편집이 시작된다(한글 IME가 조합을 걸 곳이 늘 있다)", () => {
    const { input, onCellCommit } = renderGrid([]);
    // IME는 keydown에 key='Process'를 주므로 키 코드로 편집 시작을 판정하면 한글이 막힌다.
    // 입력칸이 상주하므로 조합 결과가 change로 바로 들어온다.
    fireEvent.change(input, { target: { value: "한글" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onCellCommit).toHaveBeenCalledWith({ r: 0, c: 0, v: "한글", f: null, s: null });
  });

  it("Esc는 편집을 취소하고 원래 값을 남긴다", () => {
    const { input, onCellCommit } = renderGrid([cell(0, 0, "원래")]);
    fireEvent.keyDown(input, { key: "F2" });
    fireEvent.change(input, { target: { value: "바뀜" } });
    fireEvent.keyDown(input, { key: "Escape" });
    expect(onCellCommit).not.toHaveBeenCalled();
    expect(screen.getByRole("gridcell", { name: "원래" })).toBeTruthy();
    expect(document.activeElement).toBe(input);
  });

  it("한글 조합 중 Enter는 셀을 확정하지 않는다", () => {
    const { input, onCellCommit } = renderGrid([]);
    fireEvent.change(input, { target: { value: "한글" } });
    fireEvent.keyDown(input, { key: "Enter", isComposing: true });
    expect(onCellCommit).not.toHaveBeenCalled();
    // 조합이 끝난 뒤의 Enter는 확정한다.
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onCellCommit).toHaveBeenCalledWith({ r: 0, c: 0, v: "한글", f: null, s: null });
  });

  it("수식 입력줄에서 Enter를 치면 그 셀에 수식이 들어간다", () => {
    const { onCellCommit } = renderGrid([]);
    const bar = screen.getByLabelText("수식 입력줄");
    fireEvent.change(bar, { target: { value: "=1+2" } });
    fireEvent.keyDown(bar, { key: "Enter" });
    expect(onCellCommit).toHaveBeenCalledWith({ r: 0, c: 0, v: null, f: "=1+2", s: null });
  });
});
