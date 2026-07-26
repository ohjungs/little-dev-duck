import { describe, it, expect } from "vitest";
import { drawFurnitureSprite } from "../office-draw";

// 2026-07-26 : 오피스 - 가구렌더 - 벽침범 (피드백 5-2)
// "사물들 에셋이 벽을 넘어가는등 UI가 이상해".
//
// 원인을 자산 크기를 실제로 재서 확인했다(apps/web/public/sprites/furniture, 43개):
//   · 타일은 32px인데 크기 규칙이 `32px 이하 → 2타일`이었다.
//   · 그래서 **32x32 에셋 20개가 64x64로** 그려졌다 — 한 타일 자리에 두 타일 크기다.
//     시작점이 타일 좌상단이라 남는 만큼이 오른쪽·아래 이웃 타일로 삐져나가고,
//     그 이웃이 벽이면 가구가 벽 위에 얹힌다. 가구끼리도 겹친다.
//   · 규칙 자체는 타일이 16px이던 시절 것으로 보인다(그땐 32px 에셋이 정말 2타일이었다).
//
// 불변식: **맵 데이터의 한 타일 = 그려지는 한 타일.** 그림이 자기 타일을 넘지 않는다.

type Draw = { dx: number; dy: number; dw: number; dh: number };

function fakeCtx(out: Draw[]) {
  return {
    drawImage: (...args: unknown[]) => {
      // drawImage(img, dx, dy, dw, dh) 5인자 형태만 쓴다.
      const [, dx, dy, dw, dh] = args as [unknown, number, number, number, number];
      out.push({ dx, dy, dw, dh });
    },
  } as unknown as CanvasRenderingContext2D;
}

function img(w: number, h = w): HTMLImageElement {
  return { naturalWidth: w, naturalHeight: h, width: w, height: h } as HTMLImageElement;
}

const TILE = 32;

describe("drawFurnitureSprite", () => {
  // 실제 저장소에 들어 있는 원본 크기들(실측). 새 자산이 들어와도 규칙이 유지돼야 한다.
  const REAL_SIZES = [16, 32, 224];

  it.each(REAL_SIZES)("원본 %ipx 자산이 타일 밖으로 나가지 않는다", (size) => {
    const out: Draw[] = [];
    drawFurnitureSprite(fakeCtx(out), img(size), 64, 96, TILE);
    const d = out[0];
    expect(d.dw).toBeLessThanOrEqual(TILE);
    expect(d.dh).toBeLessThanOrEqual(TILE);
    // 오른쪽·아래 경계를 넘지 않는다 = 이웃 타일(벽)을 침범하지 않는다.
    expect(d.dx + d.dw).toBeLessThanOrEqual(64 + TILE);
    expect(d.dy + d.dh).toBeLessThanOrEqual(96 + TILE);
  });

  it("타일 왼쪽·위로도 나가지 않는다", () => {
    const out: Draw[] = [];
    drawFurnitureSprite(fakeCtx(out), img(32), 64, 96, TILE);
    expect(out[0].dx).toBeGreaterThanOrEqual(64);
    expect(out[0].dy).toBeGreaterThanOrEqual(96);
  });

  it("32x32 자산이 예전처럼 2타일로 커지지 않는다(이번 회귀의 핵심)", () => {
    const out: Draw[] = [];
    drawFurnitureSprite(fakeCtx(out), img(32), 0, 0, TILE);
    expect(out[0].dw).not.toBe(TILE * 2);
    expect(out[0].dw).toBe(TILE);
  });

  it("타일 크기가 달라져도 그 타일 안에 머문다", () => {
    for (const tile of [16, 32, 48]) {
      const out: Draw[] = [];
      drawFurnitureSprite(fakeCtx(out), img(32), 0, 0, tile);
      expect(out[0].dw).toBeLessThanOrEqual(tile);
      expect(out[0].dh).toBeLessThanOrEqual(tile);
    }
  });

  it("naturalWidth가 0인(아직 디코드 전) 이미지도 타일을 넘지 않는다", () => {
    const out: Draw[] = [];
    const undecoded = { naturalWidth: 0, width: 32 } as HTMLImageElement;
    drawFurnitureSprite(fakeCtx(out), undecoded, 0, 0, TILE);
    expect(out[0].dw).toBeLessThanOrEqual(TILE);
    expect(out[0].dw).toBeGreaterThan(0);
  });
});
