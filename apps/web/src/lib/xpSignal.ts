// XP 획득(투두 완료·습관 체크·뽀모도로 완료) → 오리 게임화 표시(레벨/XP/먹이) 갱신을 스토어
// 없이 잇는다. Phase 6 todoSignal과 동일한 네이티브 CustomEvent pub/sub 패턴.
const XP_CHANGED_EVENT = "ldd:xp-changed";

export function emitXpChanged(): void {
  window.dispatchEvent(new Event(XP_CHANGED_EVENT));
}

export function onXpChanged(handler: () => void): () => void {
  window.addEventListener(XP_CHANGED_EVENT, handler);
  return () => window.removeEventListener(XP_CHANGED_EVENT, handler);
}
