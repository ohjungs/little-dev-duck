// 카메라 뷰포트 시스템 — 순수 함수(생성·추적·좌표변환·타일범위). 렌더러(web)가 소비.

export type Camera = {
  x: number;     // 뷰포트 좌상단 월드 X (픽셀)
  y: number;     // 뷰포트 좌상단 월드 Y (픽셀)
  viewW: number; // 뷰포트 너비 (픽셀)
  viewH: number; // 뷰포트 높이 (픽셀)
};

export function createCamera(viewW: number, viewH: number): Camera {
  return { x: 0, y: 0, viewW, viewH };
}

// 타깃 위치를 부드럽게 추적. lerp: 0=정지, 1=즉시 스냅, 0.08~0.12 권장.
// 맵 경계로 클램프해 카메라가 맵 밖을 절대 보이지 않게 한다.
export function followTarget(
  cam: Camera,
  targetX: number,
  targetY: number,
  mapW: number,
  mapH: number,
  lerp: number,
): Camera {
  const idealX = targetX - cam.viewW / 2;
  const idealY = targetY - cam.viewH / 2;

  const newX = cam.x + (idealX - cam.x) * lerp;
  const newY = cam.y + (idealY - cam.y) * lerp;

  const maxX = Math.max(0, mapW - cam.viewW);
  const maxY = Math.max(0, mapH - cam.viewH);

  return {
    ...cam,
    x: Math.max(0, Math.min(maxX, newX)),
    y: Math.max(0, Math.min(maxY, newY)),
  };
}

// 월드 좌표 → 스크린 좌표
export function worldToScreen(
  cam: Camera,
  wx: number,
  wy: number,
): { x: number; y: number } {
  return { x: wx - cam.x, y: wy - cam.y };
}

// 스크린 좌표 → 월드 좌표 (터치 입력 변환용)
export function screenToWorld(
  cam: Camera,
  sx: number,
  sy: number,
): { x: number; y: number } {
  return { x: sx + cam.x, y: sy + cam.y };
}

// 렌더 최적화용 가시 타일 범위 — 뷰포트 안에 있는 타일 열·행 인덱스만 반환.
export function visibleTileRange(
  cam: Camera,
  tileSize: number,
): {
  minCol: number;
  maxCol: number;
  minRow: number;
  maxRow: number;
} {
  return {
    minCol: Math.max(0, Math.floor(cam.x / tileSize)),
    maxCol: Math.ceil((cam.x + cam.viewW) / tileSize),
    minRow: Math.max(0, Math.floor(cam.y / tileSize)),
    maxRow: Math.ceil((cam.y + cam.viewH) / tileSize),
  };
}

// 2026-07-27 : 오피스 - 줌 (2차 피드백 5-5, Phase 48 T4)
// "화면이 너무 작아서" — 실측 결과 카메라에 **줌 개념이 아예 없었다.** 항상 1배라서
// 창을 키우면 오리는 그대로이고 방만 더 보였다.
//
// **정수 배율만 쓴다.** 소수 배율은 픽셀 아트를 뭉갠다(사용자가 다른 항목에서 "뭉개진다"를
// 이미 지적했다). 그리고 1차 5-2의 함정 — 32×32 자산을 64×64로 그려 벽을 넘던 버그 —
// 을 되풀이하지 않으려면 **배율을 렌더 코드에 뿌리면 안 된다.** 배율은 캔버스 컨텍스트가
// 한 번에 담당하고, 카메라는 "논리 뷰포트 크기"만 줄인다. 그래서 여기엔 곱셈이 없다.
export const OFFICE_ZOOM_LEVELS = [1, 2, 3] as const;

export type OfficeZoom = (typeof OFFICE_ZOOM_LEVELS)[number];

/** 다음 배율로 순환한다(3배 다음은 1배). 범위 밖 값이 들어오면 1배로 되돌린다. */
export function nextZoom(current: number): OfficeZoom {
  const i = OFFICE_ZOOM_LEVELS.indexOf(current as OfficeZoom);
  if (i < 0) return OFFICE_ZOOM_LEVELS[0];
  return OFFICE_ZOOM_LEVELS[(i + 1) % OFFICE_ZOOM_LEVELS.length]!;
}
