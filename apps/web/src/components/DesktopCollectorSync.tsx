"use client";

import { useEffect, useState } from "react";
import { upsertActivityDaily } from "@ldd/api";
import { Spinner, Toast } from "@ldd/ui";
import { createClient } from "@/lib/supabase/client";

type DailyCount = { date: string; count: number };
type ScanProgress = { scanned: number; total: number };

type TauriGlobal = {
  core: { invoke: <T>(command: string) => Promise<T> };
  event: {
    listen: (
      event: string,
      handler: (payload: { payload: ScanProgress }) => void,
    ) => Promise<() => void>;
  };
};

function getTauri(): TauriGlobal | null {
  if (typeof window === "undefined") return null;
  return (window as unknown as { __TAURI__?: TauriGlobal }).__TAURI__ ?? null;
}

// Tauri 데스크톱 위젯에서만 실행된다 - 브라우저에서는 __TAURI__가 없어 아무 것도 하지 않는다.
// Rust 사이드가 로컬 로그 파일 존재/날짜만 집계해 반환하고(원문 미전송), 여기서는 그 집계값만
// 사용자 계정으로 업로드한다(DECISIONS.md 6절 프라이버시 원칙).
export function DesktopCollectorSync() {
  const [progress, setProgress] = useState<ScanProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const tauri = getTauri();
    if (!tauri) return;

    let unlisten: (() => void) | undefined;
    let cancelled = false;

    const sync = async () => {
      unlisten = await tauri.event.listen("collector://progress", (e) => {
        if (!cancelled) setProgress(e.payload);
      });

      try {
        const counts = await tauri.core.invoke<DailyCount[]>("collect_claude_logs");
        if (counts.length > 0) {
          const supabase = createClient();
          await upsertActivityDaily(supabase, "claude_code", counts);
        }
      } catch (err) {
        // 무음 실패는 사용자가 미동기화를 영영 모른다 - Toast로 알린다.
        console.error("Claude Code 활동 동기화 실패:", err);
        if (!cancelled) setError("Claude Code 활동 동기화에 실패했어요.");
      } finally {
        if (!cancelled) setProgress(null);
      }
    };

    sync();

    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, []);

  return (
    <>
      {progress && progress.scanned < progress.total && (
        <p
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            fontSize: "0.75rem",
            opacity: 0.6,
          }}
        >
          <Spinner size={12} />
          Claude Code 활동 동기화 중... ({progress.scanned}/{progress.total})
        </p>
      )}
      {error && (
        <Toast message={error} type="error" onDismiss={() => setError(null)} />
      )}
    </>
  );
}
