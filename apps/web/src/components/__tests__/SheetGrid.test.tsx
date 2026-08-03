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

function renderGrid(cells: Cell[], onCellsCommit = vi.fn()) {
  render(<SheetGrid sheet={SHEET} cells={cells} onCellsCommit={onCellsCommit} />);
  // 키는 전부 선택 칸에 상주하는 입력칸이 받는다(한글 IME가 조합을 걸 곳이 늘 있어야 한다).
  return {
    onCellsCommit,
    grid: screen.getByRole("grid"),
    input: screen.getByLabelText("셀 편집") as HTMLInputElement,
  };
}

/** 좌표로 셀을 찾는다(빈 칸은 이름이 없어 role 조회로는 못 집는다 — e2e와 같은 방식). */
function cellEl(r: number, c: number): HTMLElement {
  const el = screen
    .getByRole("grid")
    .querySelector(`[aria-rowindex="${r + 2}"] [aria-colindex="${c + 2}"]`);
  if (!el) throw new Error(`셀 (${r},${c})이 렌더되지 않았습니다`);
  return el as HTMLElement;
}

/** 선택된(aria-selected) 칸들의 텍스트. 범위 선택을 눈에 보이는 계약으로 확인한다. */
function selectedCells(): string[] {
  return screen
    .getAllByRole("gridcell")
    .filter((el) => el.getAttribute("aria-selected") === "true")
    .map((el) => el.getAttribute("id") ?? "");
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
    const { input, onCellsCommit } = renderGrid([]);
    fireEvent.keyDown(input, { key: "F2" });
    fireEvent.change(input, { target: { value: "42" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onCellsCommit).toHaveBeenCalledWith([{ r: 0, c: 0, v: 42, f: null, s: null }]);
    expect((screen.getByLabelText("이름 상자") as HTMLInputElement).value).toBe("A2");
  });

  it("확정한 뒤에도 입력칸이 포커스를 쥐고 있고, 확정은 한 번만 일어난다", () => {
    const { input, onCellsCommit } = renderGrid([]);
    fireEvent.keyDown(input, { key: "F2" });
    fireEvent.change(input, { target: { value: "1" } });
    fireEvent.keyDown(input, { key: "Enter" });
    // 포커스가 남아 있어야 다음 칸을 이어서 칠 수 있다(AC-20).
    expect(document.activeElement).toBe(input);
    // blur가 한 번 더 확정하면 안 된다(같은 값이라 눈에 안 띄지만 저장은 두 번 간다).
    expect(onCellsCommit).toHaveBeenCalledTimes(1);
  });

  it("편집 중 다른 곳으로 포커스가 빠지면 입력이 저장된다", () => {
    const { input, onCellsCommit } = renderGrid([]);
    fireEvent.keyDown(input, { key: "F2" });
    fireEvent.change(input, { target: { value: "5" } });
    fireEvent.blur(input);
    expect(onCellsCommit).toHaveBeenCalledWith([{ r: 0, c: 0, v: 5, f: null, s: null }]);
  });

  it("이미 선택된 칸을 더블클릭해도 편집이 시작된다(입력칸이 그 칸을 덮고 있다)", () => {
    const { input } = renderGrid([cell(0, 0, "원래")]);
    fireEvent.doubleClick(input);
    expect(input.value).toBe("원래");
  });

  it("편집 중이 아닐 때의 blur는 아무것도 저장하지 않는다", () => {
    const { input, onCellsCommit } = renderGrid([cell(0, 0, "그대로")]);
    fireEvent.blur(input);
    expect(onCellsCommit).not.toHaveBeenCalled();
  });

  it("F2 없이 글자를 치면 그대로 편집이 시작된다(한글 IME가 조합을 걸 곳이 늘 있다)", () => {
    const { input, onCellsCommit } = renderGrid([]);
    // IME는 keydown에 key='Process'를 주므로 키 코드로 편집 시작을 판정하면 한글이 막힌다.
    // 입력칸이 상주하므로 조합 결과가 change로 바로 들어온다.
    fireEvent.change(input, { target: { value: "한글" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onCellsCommit).toHaveBeenCalledWith([{ r: 0, c: 0, v: "한글", f: null, s: null }]);
  });

  it("Esc는 편집을 취소하고 원래 값을 남긴다", () => {
    const { input, onCellsCommit } = renderGrid([cell(0, 0, "원래")]);
    fireEvent.keyDown(input, { key: "F2" });
    fireEvent.change(input, { target: { value: "바뀜" } });
    fireEvent.keyDown(input, { key: "Escape" });
    expect(onCellsCommit).not.toHaveBeenCalled();
    expect(screen.getByRole("gridcell", { name: "원래" })).toBeTruthy();
    expect(document.activeElement).toBe(input);
  });

  it("한글 조합 중 Enter는 셀을 확정하지 않는다", () => {
    const { input, onCellsCommit } = renderGrid([]);
    fireEvent.change(input, { target: { value: "한글" } });
    fireEvent.keyDown(input, { key: "Enter", isComposing: true });
    expect(onCellsCommit).not.toHaveBeenCalled();
    // 조합이 끝난 뒤의 Enter는 확정한다.
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onCellsCommit).toHaveBeenCalledWith([{ r: 0, c: 0, v: "한글", f: null, s: null }]);
  });

  it("수식 입력줄에서 Enter를 치면 그 셀에 수식이 들어간다", () => {
    const { onCellsCommit } = renderGrid([]);
    const bar = screen.getByLabelText("수식 입력줄");
    fireEvent.change(bar, { target: { value: "=1+2" } });
    fireEvent.keyDown(bar, { key: "Enter" });
    expect(onCellsCommit).toHaveBeenCalledWith([{ r: 0, c: 0, v: null, f: "=1+2", s: null }]);
  });
});

// 2026-08-02 : T6 — 범위 선택·복사붙여넣기·채우기·실행취소 (AC-5·13·14·15·20)

describe("SheetGrid 범위 선택", () => {
  it("Shift+방향키로 범위가 늘어난다", () => {
    const { input } = renderGrid([]);
    fireEvent.keyDown(input, { key: "ArrowDown", shiftKey: true });
    expect(selectedCells()).toHaveLength(2);
    fireEvent.keyDown(input, { key: "ArrowRight", shiftKey: true });
    expect(selectedCells()).toHaveLength(4);
  });

  it("Shift 없는 방향키는 범위를 한 칸으로 되돌린다", () => {
    const { input } = renderGrid([]);
    fireEvent.keyDown(input, { key: "ArrowDown", shiftKey: true });
    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(selectedCells()).toHaveLength(1);
  });

  it("Shift+클릭으로 그 칸까지 범위가 잡힌다", () => {
    renderGrid([cell(1, 1, "끝")]);
    fireEvent.click(screen.getByRole("gridcell", { name: "끝" }), { shiftKey: true });
    expect(selectedCells()).toHaveLength(4);
  });

  it("Ctrl+방향키는 데이터 끝으로 건너뛴다", () => {
    const { input } = renderGrid([cell(0, 0, 1), cell(1, 0, 2), cell(2, 0, 3)]);
    fireEvent.keyDown(input, { key: "ArrowDown", ctrlKey: true });
    expect((screen.getByLabelText("이름 상자") as HTMLInputElement).value).toBe("A3");
  });

  it("Delete는 선택한 범위를 통째로 비운다", () => {
    const { input, onCellsCommit } = renderGrid([cell(0, 0, 1), cell(1, 0, 2)]);
    fireEvent.keyDown(input, { key: "ArrowDown", shiftKey: true });
    fireEvent.keyDown(input, { key: "Delete" });
    expect(onCellsCommit).toHaveBeenCalledWith([
      { r: 0, c: 0, v: null, f: null, s: null },
      { r: 1, c: 0, v: null, f: null, s: null },
    ]);
  });
});

/** copy/paste 이벤트에 실어 보낼 가짜 클립보드. jsdom에는 clipboardData가 없다. */
function makeClipboard(initial = "") {
  let text = initial;
  return {
    data: { getData: () => text, setData: (_type: string, v: string) => (text = v) },
    read: () => text,
  };
}

describe("SheetGrid 복사·붙여넣기", () => {
  it("복사하면 보이는 값이 TSV로 클립보드에 실린다", () => {
    const { input } = renderGrid([cell(0, 0, 10), cell(0, 1, 20)]);
    fireEvent.keyDown(input, { key: "ArrowRight", shiftKey: true });
    const clip = makeClipboard();
    fireEvent.copy(input, { clipboardData: clip.data });
    expect(clip.read()).toBe("10\t20");
  });

  it("엑셀에서 온 TSV를 붙여넣으면 표로 들어온다 (E4)", () => {
    const { input, onCellsCommit } = renderGrid([]);
    const clip = makeClipboard('1\t"두\n줄"\n3\t4');
    fireEvent.paste(input, { clipboardData: clip.data });
    expect(onCellsCommit).toHaveBeenCalledWith([
      { r: 0, c: 0, v: 1, f: null, s: null },
      { r: 0, c: 1, v: "두\n줄", f: null, s: null },
      { r: 1, c: 0, v: 3, f: null, s: null },
      { r: 1, c: 1, v: 4, f: null, s: null },
    ]);
  });

  it("우리에서 복사한 수식을 옆 칸에 붙이면 상대참조가 따라간다 (E2)", () => {
    const { input, onCellsCommit } = renderGrid([
      cell(0, 0, 10),
      cell(1, 0, 20),
      cell(2, 0, null, "=SUM(A1:A2)"),
    ]);
    // A3으로 이동해 복사한 뒤 B3으로 옮겨 붙여넣는다.
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "ArrowDown" });
    const clip = makeClipboard();
    fireEvent.copy(input, { clipboardData: clip.data });
    fireEvent.keyDown(input, { key: "ArrowRight" });
    fireEvent.paste(input, { clipboardData: clip.data });
    expect(onCellsCommit).toHaveBeenCalledWith([
      { r: 2, c: 1, v: null, f: "=SUM(B1:B2)", s: null },
    ]);
  });

  it("잘라내기는 복사하고 원래 자리를 비운다", () => {
    const { input, onCellsCommit } = renderGrid([cell(0, 0, "값")]);
    const clip = makeClipboard();
    fireEvent.cut(input, { clipboardData: clip.data });
    expect(clip.read()).toBe("값");
    expect(onCellsCommit).toHaveBeenCalledWith([{ r: 0, c: 0, v: null, f: null, s: null }]);
  });

  it("편집 중에는 클립보드를 격자가 가로채지 않는다(글자 단위 복사가 살아 있어야 한다)", () => {
    const { input, onCellsCommit } = renderGrid([]);
    fireEvent.keyDown(input, { key: "F2" });
    const clip = makeClipboard("바깥 값");
    fireEvent.paste(input, { clipboardData: clip.data });
    expect(onCellsCommit).not.toHaveBeenCalled();
  });
});

describe("SheetGrid 채우기 핸들", () => {
  it("아래로 끌면 연속 데이터가 채워진다", () => {
    const { input, onCellsCommit } = renderGrid([cell(0, 0, 1), cell(1, 0, 2)]);
    fireEvent.keyDown(input, { key: "ArrowDown", shiftKey: true });

    fireEvent.mouseDown(screen.getByLabelText("채우기 핸들"));
    fireEvent.mouseEnter(cellEl(3, 0));
    fireEvent.mouseUp(window);

    expect(onCellsCommit).toHaveBeenCalledWith([
      { r: 2, c: 0, v: 3, f: null, s: null },
      { r: 3, c: 0, v: 4, f: null, s: null },
    ]);
  });
});

// 2026-08-02 : T7 — 서식(굵게·정렬·숫자서식) · 열 너비 · 틀 고정

function renderWithMeta(cells: Cell[], meta: Sheet["meta"], onMetaChange = vi.fn()) {
  const onCellsCommit = vi.fn();
  render(
    <SheetGrid
      sheet={{ ...SHEET, meta }}
      cells={cells}
      onCellsCommit={onCellsCommit}
      onMetaChange={onMetaChange}
    />,
  );
  return {
    onCellsCommit,
    onMetaChange,
    input: screen.getByLabelText("셀 편집") as HTMLInputElement,
  };
}

describe("SheetGrid 서식", () => {
  it("굵게를 누르면 팔레트에 서식이 생기고 셀이 그 인덱스를 가리킨다", () => {
    const { onCellsCommit, onMetaChange } = renderWithMeta(
      [cell(0, 0, "글자")],
      createDefaultSheetMeta(),
    );
    fireEvent.click(screen.getByRole("button", { name: "굵게" }));

    expect(onMetaChange).toHaveBeenCalledWith(
      expect.objectContaining({ styles: [{ bold: true }] }),
    );
    expect(onCellsCommit).toHaveBeenCalledWith([
      { r: 0, c: 0, v: "글자", f: null, s: 0 },
    ]);
  });

  it("이미 굵은 셀에서 다시 누르면 굵기가 빠진다(토글)", () => {
    const meta = { ...createDefaultSheetMeta(), styles: [{ bold: true }] };
    const { onCellsCommit } = renderWithMeta([{ r: 0, c: 0, v: "글자", f: null, s: 0 }], meta);
    fireEvent.click(screen.getByRole("button", { name: "굵게" }));
    expect(onCellsCommit).toHaveBeenCalledWith([
      { r: 0, c: 0, v: "글자", f: null, s: null },
    ]);
  });

  it("서식은 선택한 범위 전체에 적용된다", () => {
    const { input, onCellsCommit } = renderWithMeta(
      [cell(0, 0, 1), cell(1, 0, 2)],
      createDefaultSheetMeta(),
    );
    fireEvent.keyDown(input, { key: "ArrowDown", shiftKey: true });
    fireEvent.click(screen.getByRole("button", { name: "굵게" }));
    expect(onCellsCommit.mock.calls[0][0]).toHaveLength(2);
  });

  it("숫자 서식이 셀 표시에 적용된다", () => {
    renderWithMeta([{ r: 0, c: 0, v: 1234.5, f: null, s: 0 }], {
      ...createDefaultSheetMeta(),
      styles: [{ numFmt: "#,##0.00" }],
    });
    expect(screen.getByRole("gridcell", { name: "1,234.50" })).toBeTruthy();
  });

  it("굵게·정렬이 실제 스타일로 그려진다", () => {
    renderWithMeta([{ r: 0, c: 0, v: "글자", f: null, s: 0 }], {
      ...createDefaultSheetMeta(),
      styles: [{ bold: true, align: "center" }],
    });
    const el = screen.getByRole("gridcell", { name: "글자" });
    expect(el.className).toContain("font-bold");
    expect(el.className).toContain("text-center");
  });
});

describe("SheetGrid 열 너비와 틀 고정", () => {
  it("meta의 열 너비가 셀 위치에 반영된다", () => {
    renderWithMeta([cell(0, 1, "B")], {
      ...createDefaultSheetMeta(),
      cols: { "0": { w: 200 } },
    });
    // A열이 200이면 B열은 머리글 너비(52) + 200에서 시작한다.
    expect(screen.getByRole("gridcell", { name: "B" }).style.left).toBe("252px");
  });

  it("열 경계를 끌면 그 열의 너비가 저장된다", () => {
    const { onMetaChange } = renderWithMeta([], createDefaultSheetMeta());
    const handle = screen.getByLabelText("A열 너비 조절");
    fireEvent.mouseDown(handle, { clientX: 100 });
    fireEvent.mouseMove(window, { clientX: 160 });
    fireEvent.mouseUp(window);
    expect(onMetaChange).toHaveBeenCalledWith(
      expect.objectContaining({ cols: { "0": { w: 164 } } }),
    );
  });

  it("틀 고정 버튼은 선택한 칸 위쪽·왼쪽을 고정한다", () => {
    const { input, onMetaChange } = renderWithMeta([], createDefaultSheetMeta());
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "ArrowRight" });
    fireEvent.click(screen.getByRole("button", { name: "틀 고정" }));
    expect(onMetaChange).toHaveBeenCalledWith(
      expect.objectContaining({ freeze: { r: 1, c: 1 } }),
    );
  });

  it("이미 고정돼 있으면 같은 버튼이 해제한다", () => {
    const { onMetaChange } = renderWithMeta([], {
      ...createDefaultSheetMeta(),
      freeze: { r: 1, c: 0 },
    });
    fireEvent.click(screen.getByRole("button", { name: "틀 고정 해제" }));
    expect(onMetaChange).toHaveBeenCalledWith(
      expect.objectContaining({ freeze: { r: 0, c: 0 } }),
    );
  });

  it("틀 고정된 행은 스크롤해도 자리를 지킨다", () => {
    renderWithMeta([cell(0, 0, "머리")], {
      ...createDefaultSheetMeta(),
      freeze: { r: 1, c: 0 },
    });
    const frozen = screen.getByRole("gridcell", { name: "머리" });
    // 고정된 줄은 스크롤 값을 더해 제자리에 붙는다(스크롤 0에서는 원래 자리).
    expect(frozen.style.zIndex).toBe("15");
  });
});

describe("SheetGrid 병합", () => {
  it("범위를 병합하면 meta에 기록되고 좌상단만 남는다", () => {
    const { input, onMetaChange, onCellsCommit } = renderWithMeta(
      [cell(0, 0, "제목"), cell(0, 1, "지워질 값")],
      createDefaultSheetMeta(),
    );
    fireEvent.keyDown(input, { key: "ArrowRight", shiftKey: true });
    fireEvent.click(screen.getByRole("button", { name: "병합" }));

    expect(onMetaChange).toHaveBeenCalledWith(
      expect.objectContaining({ merges: ["A1:B1"] }),
    );
    // 좌상단을 뺀 칸의 값은 사라진다(엑셀과 같다 — 가려진 값이 남아 있으면 나중에 유령이 된다).
    expect(onCellsCommit).toHaveBeenCalledWith([
      { r: 0, c: 1, v: null, f: null, s: null },
    ]);
  });

  it("병합된 칸은 좌상단 하나만 그려지고 넓게 차지한다", () => {
    renderWithMeta([cell(0, 0, "넓은 제목")], {
      ...createDefaultSheetMeta(),
      merges: ["A1:B1"],
    });
    const el = screen.getByRole("gridcell", { name: "넓은 제목" });
    // 열 두 칸(104 × 2)
    expect(el.style.width).toBe("208px");
    // 가려진 칸은 렌더하지 않는다.
    expect(
      screen.getByRole("grid").querySelector('[aria-rowindex="2"] [aria-colindex="3"]'),
    ).toBeNull();
  });

  it("병합된 칸에서 다시 누르면 해제된다", () => {
    const { onMetaChange } = renderWithMeta([cell(0, 0, "제목")], {
      ...createDefaultSheetMeta(),
      merges: ["A1:B1"],
    });
    fireEvent.click(screen.getByRole("button", { name: "병합 해제" }));
    expect(onMetaChange).toHaveBeenCalledWith(expect.objectContaining({ merges: [] }));
  });
});

describe("SheetGrid 실행취소", () => {
  it("Ctrl+Z가 옛 값을 되돌리고 Ctrl+Y가 다시 넣는다", () => {
    const { input, onCellsCommit } = renderGrid([cell(0, 0, "옛값")]);
    fireEvent.keyDown(input, { key: "F2" });
    fireEvent.change(input, { target: { value: "새값" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onCellsCommit).toHaveBeenLastCalledWith([{ r: 0, c: 0, v: "새값", f: null, s: null }]);

    fireEvent.keyDown(input, { key: "z", ctrlKey: true });
    expect(onCellsCommit).toHaveBeenLastCalledWith([{ r: 0, c: 0, v: "옛값", f: null, s: null }]);

    fireEvent.keyDown(input, { key: "y", ctrlKey: true });
    expect(onCellsCommit).toHaveBeenLastCalledWith([{ r: 0, c: 0, v: "새값", f: null, s: null }]);
  });

  it("되돌릴 것이 없으면 아무 일도 하지 않는다", () => {
    const { input, onCellsCommit } = renderGrid([]);
    fireEvent.keyDown(input, { key: "z", ctrlKey: true });
    expect(onCellsCommit).not.toHaveBeenCalled();
  });

  it("붙여넣기도 한 번에 되돌아간다", () => {
    const { input, onCellsCommit } = renderGrid([cell(0, 0, "원래")]);
    fireEvent.paste(input, { clipboardData: makeClipboard("1\t2").data });
    fireEvent.keyDown(input, { key: "z", ctrlKey: true });
    expect(onCellsCommit).toHaveBeenLastCalledWith([
      { r: 0, c: 0, v: "원래", f: null, s: null },
      { r: 0, c: 1, v: null, f: null, s: null },
    ]);
  });
});
