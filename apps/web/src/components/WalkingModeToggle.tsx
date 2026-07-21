"use client";

import { useEffect, useState } from "react";
import { Button, Toast } from "@ldd/ui";

type TauriGlobal = {
  core: {
    invoke: <T>(command: string, args?: Record<string, unknown>) => Promise<T>;
  };
};

function getTauri(): TauriGlobal | null {
  if (typeof window === "undefined") return null;
  return (window as unknown as { __TAURI__?: TauriGlobal }).__TAURI__ ?? null;
}

// 데스크톱(Tauri) 전용 컨트롤. 브라우저에서는 렌더링하지 않는다. mounted 가드로 서버 렌더와
// 데스크톱 하이드레이션 사이의 불일치를 피한다(서버에는 __TAURI__가 없으므로).
export function WalkingModeToggle() {
  const [mounted, setMounted] = useState(false);
  const [walking, setWalking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 마운트 후에만 Tauri 여부를 판정해 SSR/하이드레이션 불일치를 피한다(마운트 표식용 setState).
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;
  const tauri = getTauri();
  if (!tauri) return null;

  const toggle = async () => {
    const next = !walking;
    setWalking(next);
    try {
      await tauri.core.invoke("set_walking_mode", { enabled: next });
    } catch (err) {
      setWalking(!next);
      console.error("활보 모드 전환 실패:", err);
      setError("활보 모드를 전환하지 못했어요.");
    }
  };

  return (
    <>
      <Button
        type="button"
        onClick={toggle}
        aria-pressed={walking}
        style={{ padding: "0.25rem 0.7rem", fontSize: "0.8rem" }}
      >
        {walking ? "활보 멈추기" : "바탕화면 활보"}
      </Button>
      {error && (
        <Toast message={error} type="error" onDismiss={() => setError(null)} />
      )}
    </>
  );
}
