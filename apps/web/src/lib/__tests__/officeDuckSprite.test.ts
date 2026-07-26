import { describe, it, expect } from "vitest";
import { drawDuckSprite } from "../office-draw";

// 2026-07-26 : 오피스 - 사장오리 - 방향표현 (피드백 5-6)
// 실측으로 확인한 시트 사실을 계약으로 고정한다:
//   ducky_3_spritesheet.png = 192x128, 32px 격자 6열 x 4행
//   채워진 프레임: row0=2, row1=6, row2=4, row3=6 — **행마다 개수가 다르다**
// 예전 코드는 방향으로 행을 고르고 프레임을 %6으로 잘라, down(row0, 2프레임)에서
// 존재하지 않는 열 2·3을 그려 오리가 깜빡였다. 그 회귀를 여기서 막는다.

const FRAME = 32;
const ROW_FILLED = [2, 6, 4, 6]; // 행별 실제 프레임 수(실측)

type Call = { sx: number; sy: number };

function fakeCtx() {
  const calls: Call[] = [];
  const ops: string[] = [];
  const ctx = {
    drawImage: (_img: unknown, sx: number, sy: number) => {
      calls.push({ sx, sy });
    },
    save: () => ops.push("save"),
    restore: () => ops.push("restore"),
    translate: () => ops.push("translate"),
    scale: () => ops.push("scale"),
  } as unknown as CanvasRenderingContext2D;
  return { ctx, calls, ops };
}

const SHEET = {} as HTMLImageElement;

describe("drawDuckSprite", () => {
  it("걷기 프레임이 아무리 커져도 그 행에 실재하는 열만 그린다", () => {
    const { ctx, calls } = fakeCtx();
    for (let f = 0; f < 50; f++) {
      drawDuckSprite(ctx, SHEET, 0, 0, FRAME, "down", f, 1, true);
    }
    for (const c of calls) {
      const row = c.sy / FRAME;
      const col = c.sx / FRAME;
      expect(col).toBeGreaterThanOrEqual(0);
      expect(col).toBeLessThan(ROW_FILLED[row]);
    }
  });

  it("멈춰 있을 때도 실재하는 열만 그린다(idle 행은 2프레임뿐)", () => {
    const { ctx, calls } = fakeCtx();
    for (let f = 0; f < 20; f++) {
      drawDuckSprite(ctx, SHEET, 0, 0, FRAME, "up", f, 1, false);
    }
    for (const c of calls) {
      const row = c.sy / FRAME;
      expect(c.sx / FRAME).toBeLessThan(ROW_FILLED[row]);
    }
  });

  it("왼쪽을 볼 때만 좌우 반전한다 — 이게 유일하게 눈에 보이는 방향 변화다", () => {
    for (const facing of ["down", "up", "right"] as const) {
      const { ctx, ops } = fakeCtx();
      drawDuckSprite(ctx, SHEET, 0, 0, FRAME, facing, 0, 1, true);
      expect(ops).not.toContain("scale");
    }
    const { ctx, ops } = fakeCtx();
    drawDuckSprite(ctx, SHEET, 0, 0, FRAME, "left", 0, 1, true);
    expect(ops).toContain("scale");
  });

  it("반전 후 캔버스 상태를 반드시 되돌린다(안 되돌리면 이후 렌더가 전부 뒤집힌다)", () => {
    const { ctx, ops } = fakeCtx();
    drawDuckSprite(ctx, SHEET, 0, 0, FRAME, "left", 0, 1, true);
    expect(ops.filter((o) => o === "save")).toHaveLength(1);
    expect(ops.filter((o) => o === "restore")).toHaveLength(1);
    expect(ops.indexOf("restore")).toBeGreaterThan(ops.indexOf("save"));
  });

  it("음수 프레임이 와도 열이 음수가 되지 않는다", () => {
    const { ctx, calls } = fakeCtx();
    drawDuckSprite(ctx, SHEET, 0, 0, FRAME, "right", -3, 1, true);
    expect(calls[0].sx).toBeGreaterThanOrEqual(0);
  });

  it("어떤 방향이든 프레임이 흐르면 그림이 실제로 바뀐다(정지 화면이 아니다)", () => {
    const { ctx, calls } = fakeCtx();
    for (let f = 0; f < 6; f++) {
      drawDuckSprite(ctx, SHEET, 0, 0, FRAME, "right", f, 1, true);
    }
    expect(new Set(calls.map((c) => c.sx)).size).toBeGreaterThan(1);
  });
});
