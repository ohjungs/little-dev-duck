"use client";

import { useEffect, useRef } from "react";

// Phase 13 T2: div 기반 모달 공용 키보드 접근성.
// Esc 닫기 + 열릴 때 컨테이너 안으로 포커스 진입 + 닫힐 때 직전 포커스 복원 + Tab 포커스 트랩(모달
// 밖으로 새지 않게). 반환한 ref를 모달 컨테이너(tabIndex=-1)에 붙인다.
// ponytail: 네이티브 <dialog>.showModal()이 이 전부를 공짜로 주지만, 기존 div 모달 여럿을 한꺼번에
// 바꾸는 게 더 큰 변경이라 얇은 훅으로 통일한다. 새 모달은 <dialog>를 우선 고려.
const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function useModalA11y<T extends HTMLElement>(
  open: boolean,
  onClose: () => void,
): React.RefObject<T | null> {
  const ref = useRef<T | null>(null);
  // onClose가 인라인 함수여도 setup effect를 재실행(재포커스·리스너 재등록)하지 않도록 최신값만
  // ref에 담는다(렌더 중 ref 변경 금지 관례 — effect에서 반영).
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // open을 의존성으로 둔다 — 내부 플래그로 뒤늦게 열리는 모달(예: OnboardingOverlay)도 열린 뒤
  // 다이얼로그가 DOM에 있을 때 셋업이 돌도록.
  useEffect(() => {
    if (!open) return;
    const container = ref.current;
    const prevFocus = document.activeElement as HTMLElement | null;

    const focusables = (): HTMLElement[] =>
      Array.from(
        container?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [],
      ).filter((el) => el.offsetParent !== null || el === document.activeElement);

    // 열릴 때 첫 포커서블(없으면 컨테이너 자신)으로 진입.
    (focusables()[0] ?? container)?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab") return;
      const items = focusables();
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const idx = items.indexOf(document.activeElement as HTMLElement);
      if (e.shiftKey && idx <= 0) {
        e.preventDefault();
        items[items.length - 1].focus();
      } else if (!e.shiftKey && idx === items.length - 1) {
        e.preventDefault();
        items[0].focus();
      }
    };

    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      // 닫힐 때 모달 열기 전 포커스로 복원(키보드 사용자 맥락 유지).
      prevFocus?.focus?.();
    };
  }, [open]);

  return ref;
}
