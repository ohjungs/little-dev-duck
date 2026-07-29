"use client";

// 2026-07-29 : 설정 - 진단 내보내기 (Phase 56 T2 T-027)
// 수집만 여기서 하고 조립은 lib buildDiagnostics(순수·테스트됨)가 한다.

import { useState } from "react";
import { FileDown, Loader2 } from "lucide-react";
import { listActionLog } from "@ldd/api";
import { kstDateString } from "@ldd/core";
import { createClient } from "@/lib/supabase/client";
import { buildDiagnostics } from "@/lib/diagnostics";
import { listLddKeys } from "@/lib/resetLocalSettings";
import { readNotifyHistory } from "@/lib/notifyHistory";
import { Button } from "@/components/ui/button";

export function DiagnosticsExportButton() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleExport() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const actionLog = await listActionLog(createClient(), 200);
      const data = buildDiagnostics({
        exportedAt: new Date().toISOString(),
        userAgent: navigator.userAgent,
        lddKeys: listLddKeys(),
        notifyHistory: readNotifyHistory(),
        actionLog,
      });
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ldd-진단-${kstDateString(new Date())}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "진단 내보내기에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <Button variant="outline" size="sm" onClick={() => void handleExport()} disabled={busy}>
        {busy ? <Loader2 className="animate-spin" /> : <FileDown className="size-3.5" />}
        진단 로그 내보내기 (.json)
      </Button>
      {error && <p className="text-xs text-destructive break-keep">{error}</p>}
      <p className="text-xs text-muted-foreground break-keep">
        최근 활동 로그(200건)·알림 기록·설정 키 이름을 담아요. 브라우저 저장값의 내용은 담지 않아요.
      </p>
    </div>
  );
}
