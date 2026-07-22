"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

// 저장된 메모·할일·습관·일정을 일괄 재인덱싱(백필). /api/ai/reindex-all 재사용.
type State = "idle" | "running" | "done" | "error";

const LABEL: Record<State, string> = {
  idle: "전체 재인덱싱",
  running: "인덱싱 중...",
  done: "인덱싱 완료",
  error: "다시 시도",
};

export function ReindexButton() {
  const [state, setState] = useState<State>("idle");

  const run = async () => {
    if (state === "running") return;
    setState("running");
    try {
      const res = await fetch("/api/ai/reindex-all", { method: "POST" });
      setState(res.ok ? "done" : "error");
    } catch {
      setState("error");
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      onClick={run}
      disabled={state === "running"}
    >
      <RefreshCw className={cn(state === "running" && "animate-spin")} />
      {LABEL[state]}
    </Button>
  );
}
