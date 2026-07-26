// 2026-07-27 : 색 - 지각 거리 (Phase 44 T3)
// **두 번째 화면이 같은 계산을 필요로 해서 core로 올렸다.** [Phase 42 T6](../../../../docs/plans/phase_42.md)이
// 습관 잔디 색 대비를 CIE ΔE로 잠갔는데, 메모 색도 같은 문제("잘 안 보인다")라 같은 잣대가 필요하다.
// 검사 파일에 복붙하면 두 벌이 되고, 한쪽 공식만 고쳐지면 두 화면이 서로 다른 기준으로 통과한다.
//
// **명도 대비(WCAG)가 아니라 지각 거리(ΔE)를 쓰는 이유**: 명도만 재면 밝기가 비슷하고 색이
// 다른 두 칸을 "구분 안 됨"으로 잘못 판정한다. 잔디·메모처럼 **색으로 구분하는 면**에는 ΔE가 맞다.
// (글자 가독성은 여전히 WCAG 대비의 영역이다 — 이 함수로 그걸 판정하지 않는다.)

// 사람이 "겨우 다르다"고 알아채기 시작하는 최소 차이. 기준선을 코드에 두어 각 검사가
// 자기 임계값을 이 값과 비교해 설명할 수 있게 한다.
export const JUST_NOTICEABLE_DELTA_E = 2.3;

// sRGB 16진색("#rrggbb") → CIE L*a*b*. 표준 변환식이라 라이브러리를 새로 들이지 않는다.
export function hexToLab(hex: string): [number, number, number] {
  const n = hex.replace("#", "");
  const srgb = [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16) / 255);
  const lin = srgb.map((c) =>
    c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4,
  );
  const [r, g, b] = lin as [number, number, number];
  // D65 백색점으로 정규화한 XYZ.
  const x = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047;
  const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883;
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const [fx, fy, fz] = [f(x), f(y), f(z)];
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

/** 두 색이 사람 눈에 얼마나 다른가(CIE76 ΔE). 0이면 같은 색. */
export function deltaE(a: string, b: string): number {
  const [l1, a1, b1] = hexToLab(a);
  const [l2, a2, b2] = hexToLab(b);
  return Math.hypot(l1 - l2, a1 - a2, b1 - b2);
}

/** 밝기(L*)만. 팔레트가 한 방향으로 진해지는지 볼 때 쓴다. */
export function lightness(hex: string): number {
  return hexToLab(hex)[0];
}
