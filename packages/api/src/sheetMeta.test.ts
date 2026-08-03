import { describe, expect, it } from "vitest";
import { createDefaultSheetMeta } from "@ldd/core";
import { updateSheetMeta } from "./sheets";

const SHEET = "33333333-3333-4333-8333-333333333333";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fakeSupabase(capture: { patch?: Record<string, unknown> }, error: unknown = null): any {
  return {
    auth: { getUser: async () => ({ data: { user: { id: "u1" } } }) },
    from: () => ({
      update: (patch: Record<string, unknown>) => {
        capture.patch = patch;
        return { eq: async () => ({ error }) };
      },
    }),
  };
}

// 2026-08-02 : 스프레드시트 - 시트 메타 저장 (SPEC-2026-08-02-spreadsheet-a1 T7)
// 열너비·행높이·틀고정·병합·서식 팔레트가 전부 meta 한 덩어리다. 셀과 달리 작고 통째로
// 읽고 쓰는 값들이라 그렇다 — 셀 개수만큼 커지는 것은 여기 들어오면 안 된다.

describe("updateSheetMeta", () => {
  it("meta 전체를 스키마로 정규화해 저장한다", async () => {
    const capture: { patch?: Record<string, unknown> } = {};
    const meta = { ...createDefaultSheetMeta(), freeze: { r: 1, c: 2 } };
    await updateSheetMeta(fakeSupabase(capture), SHEET, meta);

    expect(capture.patch?.meta).toMatchObject({ freeze: { r: 1, c: 2 } });
    // updated_at을 함께 올린다(다른 테이블과 같은 관례).
    expect(typeof capture.patch?.updated_at).toBe("string");
  });

  it("스키마에 없는 값이 섞여 있으면 저장 전에 막는다", async () => {
    const capture: { patch?: Record<string, unknown> } = {};
    await expect(
      updateSheetMeta(fakeSupabase(capture), SHEET, {
        ...createDefaultSheetMeta(),
        // 열 너비 하한(8) 아래 — 화면에서 끌다 0이 되는 경우다.
        cols: { "0": { w: 1 } },
      }),
    ).rejects.toThrow();
    expect(capture.patch).toBeUndefined();
  });

  it("저장 실패는 예외로 올린다", async () => {
    const capture: { patch?: Record<string, unknown> } = {};
    await expect(
      updateSheetMeta(fakeSupabase(capture, { message: "boom" }), SHEET, createDefaultSheetMeta()),
    ).rejects.toThrow("boom");
  });
});
