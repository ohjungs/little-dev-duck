import { useEffect, useState } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

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
