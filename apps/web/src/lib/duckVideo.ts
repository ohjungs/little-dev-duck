// 2026-07-26 : 오리 영상 - 배치 계약 - 크롭 창
// 두 mp4의 구도가 다르다(quack 720x1280 세로, 엠블럼이 세로 중앙보다 위 / idle 1280x720 가로).
// object-fit:cover는 남는 쪽을 잘라내므로 화면별 종횡비·object-position을 여기서 고정하고,
// 로그인 영상은 잘린 창이 엠블럼(아치 문구~리본)을 침범하지 않는지 테스트로 지킨다.
// 영상을 교체하면 source 크기와 EMBLEM_BOUNDS를 다시 재야 한다.

export type DuckVideoSurface = "welcome" | "login";

export interface Size {
  w: number;
  h: number;
}

export interface Ratio2D {
  x: number;
  y: number;
}

export interface DuckVideoSpec {
  src: string;
  poster: string;
  source: Size;
  loop: boolean;
  /** 영상을 담을 틀의 종횡비(가로/세로) */
  aspectRatio: number;
  /** cover 크롭이 구도 중심을 잡도록 하는 위치(0~1) */
  objectPosition: Ratio2D;
  label: string;
}

// duck-quack.mp4 마지막 프레임에서 실측한 엠블럼 상·하단(원본 720x1280 좌표계).
// 위: "QUACK GRATIA ARTIS" 글자 윗선, 아래: 리본 꼬리 끝.
export const DUCK_QUACK_EMBLEM_BOUNDS = { top: 205, bottom: 965 } as const;

const SPECS: Record<DuckVideoSurface, DuckVideoSpec> = {
  welcome: {
    src: "/duck-idle.mp4",
    poster: "/duck-idle-poster.jpg",
    source: { w: 1280, h: 720 },
    loop: true,
    aspectRatio: 1,
    objectPosition: { x: 0.5, y: 0.5 },
    label: "눈을 굴리며 앉아 있는 아기오리",
  },
  login: {
    src: "/duck-quack.mp4",
    poster: "/duck-quack-poster.jpg",
    source: { w: 720, h: 1280 },
    loop: false,
    // 정사각(1)이면 창 높이가 720px뿐이라 760px짜리 엠블럼의 위아래가 잘린다.
    aspectRatio: 0.94,
    objectPosition: { x: 0.5, y: 0.395 },
    label: "꽥 하고 우는 아기오리 오프닝",
  },
};

export function getDuckVideoSpec(surface: DuckVideoSurface): DuckVideoSpec {
  return SPECS[surface];
}

/** object-fit:cover가 실제로 보여 주는 원본 영역. 구도가 잘리는지 계산으로 확인하기 위한 순수 함수. */
export function coverRect(
  source: Size,
  aspectRatio: number,
  posX: number,
  posY: number,
): { x: number; y: number; w: number; h: number } {
  const sourceAspect = source.w / source.h;
  if (aspectRatio > sourceAspect) {
    // 틀이 원본보다 가로로 넓다 → 폭을 다 쓰고 높이를 자른다
    const h = source.w / aspectRatio;
    return { x: 0, y: posY * (source.h - h), w: source.w, h };
  }
  const w = source.h * aspectRatio;
  return { x: posX * (source.w - w), y: 0, w, h: source.h };
}

export function objectPositionCss({ x, y }: Ratio2D): string {
  return `${x * 100}% ${y * 100}%`;
}

/** 움직임 줄이기 설정에서는 자동재생도, 사전 다운로드도 하지 않는다(포스터만 보여 준다). */
export function getDuckVideoPlayback(reducedMotion: boolean): {
  autoPlay: boolean;
  preload: "none" | "auto";
} {
  return reducedMotion
    ? { autoPlay: false, preload: "none" }
    : { autoPlay: true, preload: "auto" };
}
