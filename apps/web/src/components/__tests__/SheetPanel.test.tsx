// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
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

// 2026-08-02 : T8 — 여러 시트 탭과 시트 간 참조

const SHEET2: Sheet = { ...SHEET, id: "sheet-2", name: "Sheet2", position: 1 };

describe("SheetPanel 시트 탭", () => {
  it("시트가 여럿이면 탭이 모두 보이고 눌러서 옮겨간다", async () => {
    vi.mocked(listSheets).mockResolvedValue([SHEET, SHEET2]);
    vi.mocked(loadSheetCells).mockImplementation(async (_c, id) =>
      id === "sheet-2" ? [{ r: 0, c: 0, v: "둘째 시트", f: null, s: null }] : [],
    );
    render(<SheetPanel pageId="page-1" />);
    await settle();

    fireEvent.click(screen.getByRole("tab", { name: "Sheet2" }));
    await settle();
    expect(screen.getByRole("gridcell", { name: "둘째 시트" })).toBeTruthy();
  });

  it("다른 시트의 셀을 수식으로 참조할 수 있다 (AC-7)", async () => {
    vi.mocked(listSheets).mockResolvedValue([SHEET, SHEET2]);
    vi.mocked(loadSheetCells).mockImplementation(async (_c, id) =>
      id === "sheet-2" ? [{ r: 0, c: 0, v: 42, f: null, s: null }] : [],
    );
    render(<SheetPanel pageId="page-1" />);
    await settle();

    const input = screen.getByLabelText("셀 편집");
    fireEvent.change(input, { target: { value: "=Sheet2!A1+1" } });
    fireEvent.keyDown(input, { key: "Enter" });
    await settle();

    expect(screen.getByRole("gridcell", { name: "43" })).toBeTruthy();
  });

  it("시트를 더하면 이름이 이어 붙고 그 시트로 옮겨간다", async () => {
    vi.mocked(createSheet).mockResolvedValue(SHEET2);
    render(<SheetPanel pageId="page-1" />);
    await settle();

    fireEvent.click(screen.getByRole("button", { name: "시트 추가" }));
    await settle();
    expect(vi.mocked(createSheet).mock.calls[0][1]).toMatchObject({ name: "Sheet2" });
    expect(screen.getByRole("tab", { name: "Sheet2" }).getAttribute("aria-selected")).toBe(
      "true",
    );
  });
});

describe("SheetPanel CSV", () => {
  it("내보내기를 누르면 BOM이 붙은 CSV가 내려간다", async () => {
    vi.mocked(loadSheetCells).mockResolvedValue([
      { r: 0, c: 0, v: "이름", f: null, s: null },
      { r: 0, c: 1, v: 3, f: null, s: null },
    ]);
    // Blob 내용을 확인하려면 createObjectURL을 가로채야 한다(jsdom에는 없다).
    const blobs: Blob[] = [];
    const createURL = vi.fn((b: Blob) => {
      blobs.push(b);
      return "blob:x";
    });
    Object.defineProperty(URL, "createObjectURL", { value: createURL, configurable: true });
    Object.defineProperty(URL, "revokeObjectURL", { value: vi.fn(), configurable: true });

    render(<SheetPanel pageId="page-1" />);
    await settle();
    fireEvent.click(screen.getByRole("button", { name: "CSV 내보내기" }));

    expect(createURL).toHaveBeenCalled();
    // BOM은 **바이트로** 확인한다. Blob.text()는 규격상 UTF-8 디코딩에서 앞선 BOM을 떼므로
    // 글자로 보면 늘 없는 것처럼 보인다 — 정작 엑셀이 읽는 것은 그 바이트다.
    const bytes = new Uint8Array(await blobs[0].arrayBuffer());
    expect([bytes[0], bytes[1], bytes[2]]).toEqual([0xef, 0xbb, 0xbf]);
    expect(await blobs[0].text()).toContain("이름,3");
  });

  it("CSV를 가져오면 새 시트로 들어온다(있던 시트를 덮지 않는다)", async () => {
    vi.mocked(createSheet).mockResolvedValue({ ...SHEET, id: "sheet-9", name: "매출" });
    render(<SheetPanel pageId="page-1" />);
    await settle();

    const file = new File(["﻿이름,나이\n오리,3"], "매출.csv", { type: "text/csv" });
    const input = screen.getByLabelText("CSV 가져오기") as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });
    await settle(1000);

    // 파일 이름이 시트 이름이 된다.
    expect(vi.mocked(createSheet).mock.calls[0][1]).toMatchObject({ name: "매출" });
    expect(screen.getByRole("gridcell", { name: "오리" })).toBeTruthy();
    expect(vi.mocked(saveCells).mock.calls[0][2]).toHaveLength(4);
  });
});

describe("SheetPanel xlsx", () => {
  // 이 묶음만 **실제 타이머**를 쓴다. xlsx 라이브러리는 동적 import로 불러오는데(첫 화면
  // 번들에서 빼려고), 그 모듈 로딩은 가짜 타이머를 아무리 돌려도 풀리지 않는다.
  beforeEach(() => {
    vi.useRealTimers();
  });

  it("내보낸 xlsx를 다시 가져오면 값과 수식이 산다 (E5)", async () => {
    vi.mocked(loadSheetCells).mockResolvedValue([
      { r: 0, c: 0, v: 10, f: null, s: null },
      { r: 1, c: 0, v: null, f: "=A1*2", s: null },
    ]);
    vi.mocked(createSheet).mockResolvedValue({ ...SHEET, id: "sheet-x", name: "가져온표" });

    const blobs: Blob[] = [];
    Object.defineProperty(URL, "createObjectURL", {
      value: vi.fn((b: Blob) => {
        blobs.push(b);
        return "blob:x";
      }),
      configurable: true,
    });
    Object.defineProperty(URL, "revokeObjectURL", { value: vi.fn(), configurable: true });

    render(<SheetPanel pageId="page-1" />);
    await screen.findByRole("grid");

    fireEvent.click(screen.getByRole("button", { name: "엑셀 내보내기" }));
    await waitFor(() => expect(blobs).toHaveLength(1));

    const bytes = new Uint8Array(await blobs[0].arrayBuffer());
    // xlsx는 zip이다 — 첫 두 바이트가 PK여야 엑셀이 연다.
    expect([bytes[0], bytes[1]]).toEqual([0x50, 0x4b]);

    const file = new File([bytes], "내보낸것.xlsx");
    fireEvent.change(screen.getByLabelText("엑셀 가져오기"), { target: { files: [file] } });

    // 수식이 수식으로 돌아와 다시 계산된다(20).
    await screen.findByRole("gridcell", { name: "20" });
    // 무엇을 못 가져왔는지 알린다(AC-16).
    expect(screen.getByRole("alert").textContent).toContain("차트");
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
