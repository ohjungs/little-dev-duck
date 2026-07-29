import { useEffect, useState } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

// 2026-07-29 : 접근성 - 모션 축소 판정 한 벌 (Phase 57 T1 X-006)
/**
 * 지금 이 순간의 설정을 직접 읽는다(훅이 아님). **효과·게임 루프 안에서 쓰는 짝**이다 —
 * 훅의 첫 렌더 값은 SSR 정합을 위해 false라, 그 값을 믿고 무거운 동작(영상 다운로드 등)을
 * 시작하면 모션 축소 사용자도 비용을 치른다(DuckVideo가 겪은 그 함정).
 * 미디어쿼리 리터럴은 이 파일에만 있다 — 세 애니메이션 표면(마스코트·오피스·영상)이 이 한 벌을 쓴다.
 */
export function prefersReducedMotionNow(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.matchMedia?.(QUERY).matches ?? false;
  } catch {
    return false;
  }
}

// 사용자가 동작 최소화를 켰는지 구독한다. 켜져 있으면 지속 애니메이션을 멈추고
// 정적 포즈로만 기분을 표현한다(접근성 — 동작은 깎되 정보는 유지).
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(QUERY);
    setReduced(mql.matches);
    const onChange = () => setReduced(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return reduced;
}
