"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { collectBackup, BACKUP_LABELS } from "@/lib/collectBackup";
import { todayIso } from "@/lib/today";
import { Button } from "@/components/ui/button";

export function ExportDataButton() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  const handleExport = async () => {
    setBusy(true);
    setError(null);
    setWarning(null);
    try {
      const data = await collectBackup(createClient());

      if (data.truncated.length > 0) {
        // 잘렸다고 단정하지 않는다 — 상한과 같은 개수가 돌아왔을 뿐 뒤가 있는지는 알 수 없다.
        setWarning(
          `${data.truncated.map((k) => BACKUP_LABELS[k]).join(", ")}이(가) 조회 상한에 닿았습니다. ` +
            "일부가 백업에 빠졌을 수 있습니다.",
        );
      }

      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `little-dev-duck-export-${todayIso()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "내보내기에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <Button
        variant="outline"
        onClick={() => void handleExport()}
        disabled={busy}
      >
        {busy ? (
          <Loader2 className="animate-spin" />
        ) : (
          <Download />
        )}
        내 데이터 내보내기
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {warning && (
        <p role="status" className="text-sm text-amber-600 dark:text-amber-500">
          {warning}
        </p>
      )}
    </div>
  );
}
