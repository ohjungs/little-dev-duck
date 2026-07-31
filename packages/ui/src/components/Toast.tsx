"use client";

import { useEffect, useRef } from "react";

export type ToastType = "info" | "error";

export interface ToastProps {
  message: string;
  type?: ToastType;
  onDismiss?: () => void;
  durationMs?: number;
}

// 화면 우하단에 뜨는 자기소멸 알림. 전역 프로바이더/큐 없이 부모가 message 상태를 쥐고
// 조건부 렌더한다(최소 구현). onDismiss가 있으면 durationMs 후 자동 소멸.
export function Toast({ message, type = "info", onDismiss, durationMs = 5000 }: ToastProps) {
  // 2026-07-31 : 토스트 - 자동소멸 - 무한연장버그
  // 실제 호출부(DesktopCollectorSync, WalkingModeToggle)는 onDismiss를 인라인 화살표로 넘겨
  // 매 렌더 새 함수다. 이걸 effect 의존성에 그대로 두면 **부모가 리렌더될 때마다 타이머가
  // 처음부터 다시 돌아** 토스트가 영영 안 사라진다. 소멸 시각은 마운트 시점에 한 번만
  // 정해져야 하므로 콜백 identity를 ref로 끊는다(UndoNotice와 같은 패턴).
  const dismissRef = useRef(onDismiss);
  useEffect(() => {
    dismissRef.current = onDismiss;
  }, [onDismiss]);

  useEffect(() => {
    if (!dismissRef.current) return;
    const timer = setTimeout(() => dismissRef.current?.(), durationMs);
    return () => clearTimeout(timer);
  }, [durationMs]);

  return (
    <div
      role={type === "error" ? "alert" : "status"}
      style={{
        position: "fixed",
        bottom: "1rem",
        right: "1rem",
        maxWidth: "22rem",
        padding: "0.75rem 1rem",
        borderRadius: "8px",
        background: type === "error" ? "#b3261e" : "var(--ldd-color-surface)",
        color: type === "error" ? "#ffffff" : "var(--ldd-color-text)",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.25)",
        fontSize: "0.875rem",
        zIndex: 1000,
      }}
    >
      {message}
    </div>
  );
}
