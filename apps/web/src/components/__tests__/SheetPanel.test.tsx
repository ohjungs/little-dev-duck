// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import {
  createSheet,
  getMyAccess,
  listSheets,
  loadSheetCells,
  saveCells,
  updateSheetMeta,
} from "@ldd/api";
import { createDefaultSheetMeta, type Sheet } from "@ldd/core";
import { SheetPanel } from "@/components/SheetPanel";

// 2026-08-02 : 테스트 - 스프레드시트 - 저장 시점 계약 (SPEC-2026-08-02-spreadsheet-a1 T5)
// 격자의 렌더·키보드는 SheetGrid.test.tsx가 잠갔다. 여기가 잠그는 것은 **데이터 계층**이다 —
// 디바운스 합치기·언마운트 flush·기능 토글. 마지막 편집이 조용히 사라지는 부류를 막는다.

vi.mock("@ldd/api", () => ({
  getMyAccess: vi.fn(),
  listSheets: vi.fn(),
  createSheet: vi.fn(),
  loadSheetCells: vi.fn(),
  saveCells: vi.fn(),
  updateSheetMeta: vi.fn(),
}));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({}) }));

const SHEET: Sheet = {
  id: "sheet-1",
  pageId: "page-1",
  name: "Sheet1",
  position: 0,
  meta: createDefaultSheetMeta(),
};

function mockAccess(disabled: string[] = []) {
  vi.mocked(getMyAccess).mockResolvedValue({
    id: "u1",
    email: "a@example.com",
    displayName: "오리",
    avatarUrl: null,
    role: "user",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    disabledFeatures: disabled as any,
    dashboardLayout: { order: [], hidden: [] },
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  mockAccess();
  vi.mocked(listSheets).mockResolvedValue([SHEET]);
  vi.mocked(loadSheetCells).mockResolvedValue([]);
  vi.mocked(saveCells).mockResolvedValue(undefined);
  vi.mocked(createSheet).mockResolvedValue(SHEET);
  vi.mocked(updateSheetMeta).mockResolvedValue(createDefaultSheetMeta());
});

afterEach(() => {
  // **정리를 먼저 한다.** 언마운트 flush가 대기 중인 저장을 흘려보내는데(그게 이 컴포넌트의
  // 계약이다), 자동 정리에 맡기면 그 호출이 vi.clearAllMocks() **뒤에** 기록돼 다음 테스트의
  // 첫 호출로 새어 든다. 실제로 그 새어 든 호출 때문에 멀쩡한 단언이 깨졌다.
  cleanup();
  vi.useRealTimers();
  vi.clearAllMocks();
});

// 불러오기는 await가 여러 겹이다(권한 -> 시트 목록 -> 셀). act로 감싸야 그 사이의 상태 갱신이
// 전부 반영된 뒤로 넘어간다 — 타이머만 돌리면 마이크로태스크가 덜 풀린 채 단언하게 된다.
async function settle(ms = 0) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

describe("SheetPanel 불러오기", () => {
  it("시트가 있으면 셀을 불러와 격자를 그린다", async () => {
    render(<SheetPanel pageId="page-1" />);
    await settle();
    expect(vi.mocked(loadSheetCells).mock.calls[0][1]).toBe("sheet-1");
    expect(screen.getByRole("grid")).toBeTruthy();
  });

  it("시트가 없으면 격자 대신 만들기 버튼만 보여준다", async () => {
    vi.mocked(listSheets).mockResolvedValue([]);
    render(<SheetPanel pageId="page-1" />);
    await settle();
    expect(screen.queryByRole("grid")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "스프레드시트 추가" }));
    await settle();
    expect(screen.getByRole("grid")).toBeTruthy();
  });

  it("기능 토글이 꺼져 있으면 격자를 그리지 않고 안내한다", async () => {
    mockAccess(["sheet"]);
    render(<SheetPanel pageId="page-1" />);
    await settle();
    expect(screen.queryByRole("grid")).toBeNull();
    expect(screen.getByRole("status").textContent).toContain("꺼져");
    // 꺼졌으면 셀을 읽으러 가지도 않는다.
    expect(loadSheetCells).not.toHaveBeenCalled();
  });
});

describe("SheetPanel 저장", () => {
  async function editCell(value: string) {
    const input = screen.getByLabelText("셀 편집");
    fireEvent.change(input, { target: { value } });
    fireEvent.keyDown(input, { key: "Enter" });
  }

  it("연달아 고친 같은 셀은 디바운스로 한 번만 저장한다", async () => {
    render(<SheetPanel pageId="page-1" />);
    await settle();

    await editCell("1");
    fireEvent.keyDown(screen.getByLabelText("셀 편집"), { key: "ArrowUp" });
    await editCell("2");
    expect(saveCells).not.toHaveBeenCalled();

    await settle(1000);
    expect(saveCells).toHaveBeenCalledTimes(1);
    expect(vi.mocked(saveCells).mock.calls[0][2]).toEqual([
      { r: 0, c: 0, v: 2, f: null, s: null },
    ]);
  });

  it("저장 전에 화면을 떠나도 대기 중인 편집을 흘려보낸다", async () => {
    const { unmount } = render(<SheetPanel pageId="page-1" />);
    await settle();
    await editCell("7");

    unmount();
    await settle();

    expect(saveCells).toHaveBeenCalledTimes(1);
    expect(vi.mocked(saveCells).mock.calls[0][2]).toEqual([
      { r: 0, c: 0, v: 7, f: null, s: null },
    ]);
  });

  it("서식을 주면 셀과 시트 메타가 함께 저장된다", async () => {
    render(<SheetPanel pageId="page-1" />);
    await settle();

    fireEvent.click(screen.getByRole("button", { name: "굵게" }));
    await settle(1000);

    expect(vi.mocked(saveCells).mock.calls[0][2]).toEqual([
      { r: 0, c: 0, v: null, f: null, s: 0 },
    ]);
    expect(vi.mocked(updateSheetMeta).mock.calls[0][2]).toMatchObject({
      styles: [{ bold: true }],
    });
  });

  it("메타 저장이 실패하면 알린다", async () => {
    vi.mocked(updateSheetMeta).mockRejectedValueOnce(new Error("네트워크"));
    const { unmount } = render(<SheetPanel pageId="page-1" />);
    await settle();

    fireEvent.click(screen.getByRole("button", { name: "굵게" }));
    await settle(1000);

    expect(screen.getByRole("alert").textContent).toContain("저장");

    // 실패한 저장은 대기열에 남는다(설계). 이 테스트 안에서 흘려보내지 않으면 언마운트 flush가
    // **다음 테스트의 mock에** 호출을 기록한다 — flush가 await 뒤에 저장을 부르기 때문에
    // afterEach의 clearAllMocks보다 늦게 도착한다. 실제로 옆 테스트를 깨뜨렸다.
    unmount();
    await settle();
  });

  it("저장에 실패하면 알리고, 잃어버리지 않고 다음 저장에 다시 싣는다", async () => {
    vi.mocked(saveCells).mockRejectedValueOnce(new Error("네트워크"));
    render(<SheetPanel pageId="page-1" />);
    await settle();

    await editCell("1");
    await settle(1000);
    expect(screen.getByRole("alert").textContent).toContain("저장");

    fireEvent.keyDown(screen.getByLabelText("셀 편집"), { key: "ArrowDown" });
    await editCell("2");
    await settle(1000);
    // 실패한 A1과 새로 고친 A2가 함께 실린다.
    expect(vi.mocked(saveCells).mock.calls[1][2]).toHaveLength(2);
  });
});
