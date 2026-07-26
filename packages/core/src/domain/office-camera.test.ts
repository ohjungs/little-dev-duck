import { describe, expect, it } from "vitest";
import {
  OFFICE_ZOOM_LEVELS,
  nextZoom,
  createCamera,
  followTarget,
  worldToScreen,
  screenToWorld,
  visibleTileRange,
} from "./office-camera";

describe("createCamera", () => {
  it("초기 위치는 (0,0)이고 뷰포트 크기가 저장된다", () => {
    const cam = createCamera(800, 600);
    expect(cam.x).toBe(0);
    expect(cam.y).toBe(0);
    expect(cam.viewW).toBe(800);
    expect(cam.viewH).toBe(600);
  });
});

describe("followTarget", () => {
  it("lerp=1 이면 타깃 중심으로 즉시 스냅", () => {
    const cam = createCamera(200, 100);
    // target at (500, 400) → idealX = 500-100=400, idealY = 400-50=350
    const result = followTarget(cam, 500, 400, 2000, 2000, 1);
    expect(result.x).toBe(400);
    expect(result.y).toBe(350);
  });

  it("lerp=0.5 이면 현재와 이상 위치의 중간으로 이동", () => {
    const cam = createCamera(200, 100);
    // cam.x=0, cam.y=0; idealX=400, idealY=350
    const result = followTarget(cam, 500, 400, 2000, 2000, 0.5);
    expect(result.x).toBeCloseTo(200);
    expect(result.y).toBeCloseTo(175);
  });

  it("맵 경계를 넘지 않도록 클램프 — 음수 방지", () => {
    const cam = createCamera(800, 600);
    // target near top-left; ideal would go negative
    const result = followTarget(cam, 10, 10, 2000, 2000, 1);
    expect(result.x).toBeGreaterThanOrEqual(0);
    expect(result.y).toBeGreaterThanOrEqual(0);
  });

  it("맵 경계를 넘지 않도록 클램프 — 맵 오른쪽·아래 초과 방지", () => {
    const cam = createCamera(800, 600);
    // target at far bottom-right; ideal would exceed mapW-viewW, mapH-viewH
    const result = followTarget(cam, 5000, 5000, 2000, 2000, 1);
    expect(result.x).toBe(2000 - 800); // maxX = 1200
    expect(result.y).toBe(2000 - 600); // maxY = 1400
  });

  it("맵이 뷰포트보다 작으면 (0,0) 고정", () => {
    const cam = createCamera(800, 600);
    // mapW=400, mapH=300 — both smaller than viewport
    const result = followTarget(cam, 200, 150, 400, 300, 1);
    expect(result.x).toBe(0);
    expect(result.y).toBe(0);
  });
});

describe("worldToScreen", () => {
  it("카메라 오프셋만큼 빼서 스크린 좌표를 반환", () => {
    const cam = { x: 100, y: 50, viewW: 800, viewH: 600 };
    expect(worldToScreen(cam, 350, 200)).toEqual({ x: 250, y: 150 });
  });

  it("카메라 위치가 0,0이면 월드 좌표와 동일", () => {
    const cam = createCamera(800, 600);
    expect(worldToScreen(cam, 123, 456)).toEqual({ x: 123, y: 456 });
  });
});

describe("screenToWorld", () => {
  it("카메라 오프셋을 더해 월드 좌표를 반환", () => {
    const cam = { x: 100, y: 50, viewW: 800, viewH: 600 };
    expect(screenToWorld(cam, 250, 150)).toEqual({ x: 350, y: 200 });
  });

  it("worldToScreen의 역연산", () => {
    const cam = { x: 300, y: 200, viewW: 800, viewH: 600 };
    const wx = 700;
    const wy = 450;
    const screen = worldToScreen(cam, wx, wy);
    expect(screenToWorld(cam, screen.x, screen.y)).toEqual({ x: wx, y: wy });
  });
});

describe("visibleTileRange", () => {
  it("타일 범위를 카메라 위치와 뷰포트 크기 기반으로 반환", () => {
    // cam.x=64, viewW=320, tileSize=32 → minCol=2, maxCol=ceil((64+320)/32)=ceil(12)=12
    const cam = { x: 64, y: 32, viewW: 320, viewH: 160 };
    const range = visibleTileRange(cam, 32);
    expect(range.minCol).toBe(2);
    expect(range.maxCol).toBe(12);
    expect(range.minRow).toBe(1);
    expect(range.maxRow).toBe(6);
  });

  it("카메라가 (0,0)이면 minCol·minRow는 0", () => {
    const cam = createCamera(320, 240);
    const range = visibleTileRange(cam, 32);
    expect(range.minCol).toBe(0);
    expect(range.minRow).toBe(0);
    expect(range.maxCol).toBe(10);
    expect(range.maxRow).toBe(8); // ceil(240/32) = 8 (240/32=7.5→8)
  });
});

// 2026-07-27 : 오피스 - 줌 (2차 피드백 5-5, Phase 48 T4)
describe("오피스 줌 배율", () => {
  it("전부 정수 배율이다 (소수는 픽셀 아트를 뭉갠다)", () => {
    for (const z of OFFICE_ZOOM_LEVELS) expect(Number.isInteger(z)).toBe(true);
  });

  it("1배부터 시작한다 (기본이 확대 상태면 처음 본 사람이 방을 못 찾는다)", () => {
    expect(OFFICE_ZOOM_LEVELS[0]).toBe(1);
  });

  it("순환한다 — 마지막 다음은 처음", () => {
    expect(nextZoom(1)).toBe(2);
    expect(nextZoom(2)).toBe(3);
    expect(nextZoom(3)).toBe(1);
  });

  it("범위 밖 값(저장된 옛 설정·조작된 값)은 1배로 되돌린다", () => {
    for (const bad of [0, -1, 1.5, 99, Number.NaN]) {
      expect(OFFICE_ZOOM_LEVELS).toContain(nextZoom(bad));
    }
  });

  it("확대하면 보이는 타일 수가 줄어든다 (뷰포트를 논리 크기로 줄이는 방식)", () => {
    // 배율을 렌더 코드에 뿌리지 않고 카메라 뷰포트만 줄인다 — 1차 5-2의 스케일 버그 방지.
    const wide = visibleTileRange(createCamera(600, 360), 32);
    const zoomed = visibleTileRange(createCamera(600 / 2, 360 / 2), 32);
    expect(zoomed.maxCol - zoomed.minCol).toBeLessThan(wide.maxCol - wide.minCol);
  });
});
