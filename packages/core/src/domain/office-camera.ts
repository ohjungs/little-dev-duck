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
