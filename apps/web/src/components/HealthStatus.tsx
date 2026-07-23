"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Health = { supabase: boolean; gemini: boolean; checkedAt: string };
type ViewState = "loading" | "ready" | "error";

function StatusRow({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="flex items-center gap-1.5">
        <span
          className={cn(
            "size-2 rounded-full",
            ok ? "bg-green-500" : "bg-destructive",
          )}
          aria-hidden
        />
        <span className={ok ? "text-foreground" : "text-destructive"}>
          {ok ? "정상" : "확인 필요"}
        </span>
      </span>
    </div>
  );
}

// Phase 12 T3 헬스체크 카드. /api/health를 조회해 Supabase 도달성 + Gemini 키 구성 상태를 표시.
export function HealthStatus() {
  const [health, setHealth] = useState<Health | null>(null);
  const [state, setState] = useState<ViewState>("loading");

  useEffect(() => {
    fetch("/api/health", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("failed"))))
      .then(
        (h: Health) => {
          setHealth(h);
          setState("ready");
        },
        () => setState("error"),
      );
  }, []);

  if (state === "loading") {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-3.5 animate-spin" /> 상태 확인 중...
      </p>
    );
  }

  if (state === "error" || !health) {
    return (
      <p className="text-sm text-muted-foreground">
        상태를 확인하지 못했습니다.
      </p>
    );
  }

  return (
    <div className="flex flex-col divide-y divide-border/60">
      <StatusRow label="Supabase (데이터베이스)" ok={health.supabase} />
      <StatusRow label="Gemini (AI 키 구성)" ok={health.gemini} />
    </div>
  );
}
