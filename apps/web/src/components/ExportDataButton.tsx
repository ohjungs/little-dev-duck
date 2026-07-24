"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { listTodos, listMemos, listHabits, listPages } from "@ldd/api";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export function ExportDataButton() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async () => {
    setBusy(true);
    setError(null);
    try {
      const supabase = createClient();
      const [todos, memos, habits, pages] = await Promise.all([
        listTodos(supabase),
        listMemos(supabase),
        listHabits(supabase),
        listPages(supabase),
      ]);

      const data = {
        exportedAt: new Date().toISOString(),
        todos,
        memos,
        habits,
        pages: pages.map((p) => ({
          id: p.id,
          title: p.title,
          icon: p.icon,
          updatedAt: p.updatedAt,
        })),
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `little-dev-duck-export-${new Date().toISOString().slice(0, 10)}.json`;
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
    </div>
  );
}
