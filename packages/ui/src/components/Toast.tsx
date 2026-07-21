"use client";

import { useEffect } from "react";

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
  useEffect(() => {
    if (!onDismiss) return;
    const timer = setTimeout(onDismiss, durationMs);
    return () => clearTimeout(timer);
  }, [onDismiss, durationMs]);

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
