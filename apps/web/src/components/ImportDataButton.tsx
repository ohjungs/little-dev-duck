"use client";

import { useRef, useState } from "react";
import { Upload, Loader2 } from "lucide-react";
import type { Backup } from "@ldd/core";
import { createClient } from "@/lib/supabase/client";
import { decodeTextBytes } from "@/lib/decodeTextFile";
import { previewBackup, restoreBackup, type RestoreOutcome } from "@/lib/restoreBackup";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ConfirmDialog";

// 2026-07-26 : 백업 - 가져오기 - 화면
// 되돌리기 어려운 작업이라 **실행 전에 무엇이 들어가는지 보여주고 확인을 받는다**(CLAUDE.md 5절).
// 덮어쓰기는 하지 않는다 — 같은 id가 이미 있으면 건너뛰므로 기존 데이터는 그대로다.

type Pending = { backup: Backup; total: number; invalid: number };

export function ImportDataButton() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [outcome, setOutcome] = useState<RestoreOutcome | null>(null);

  const handleFile = async (file: File) => {
    setError(null);
    setOutcome(null);
    try {
      // File.text()는 무조건 UTF-8로 읽어 CP949 파일이 깨진다(이 저장소가 겪은 부류).
      const { text } = decodeTextBytes(await file.arrayBuffer());
      let raw: unknown;
      try {
        raw = JSON.parse(text);
      } catch {
        setError("JSON 파일이 아닙니다. 내보내기로 받은 .json 파일을 골라주세요.");
        return;
      }
      const preview = previewBackup(raw);
      if (!preview.ok) {
        setError(preview.reason);
        return;
      }
      setPending({ backup: preview.backup, total: preview.total, invalid: preview.invalid });
    } catch (e) {
      setError(e instanceof Error ? e.message : "파일을 읽지 못했습니다.");
    }
  };

  const handleConfirm = async () => {
    if (!pending) return;
    const { backup } = pending;
    setPending(null);
    setBusy(true);
    try {
      setOutcome(await restoreBackup(createClient(), backup));
    } catch (e) {
      setError(e instanceof Error ? e.message : "가져오기에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  const description = pending
    ? [
        `${pending.total}개 항목을 가져옵니다.`,
        "이미 있는 항목은 건너뛰므로 지금 데이터가 지워지거나 바뀌지 않습니다.",
        pending.invalid > 0
          ? `모양이 맞지 않는 ${pending.invalid}개는 넣지 않습니다.`
          : "",
        pending.backup.truncated.length > 0
          ? "이 백업은 내보낼 때 일부가 잘렸을 수 있습니다."
          : "",
        // 이 브라우저에 이미 설정이 있으면 그대로 두므로 "가져온다"가 아니라 조건을 밝힌다.
        Object.keys(pending.backup.localPrefs).length > 0
          ? "할 일 순서·즐겨찾기 같은 브라우저 설정은 이 브라우저에 아직 없는 것만 채웁니다."
          : "",
      ]
        .filter(Boolean)
        .join(" ")
    : "";

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={inputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        aria-label="백업 파일 선택"
        onChange={(e) => {
          const file = e.target.files?.[0];
          // 같은 파일을 연달아 고를 수 있게 값을 비운다(안 비우면 onChange가 안 뜬다).
          e.target.value = "";
          if (file) void handleFile(file);
        }}
      />
      <Button
        variant="outline"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
      >
        {busy ? <Loader2 className="animate-spin" /> : <Upload />}
        백업 가져오기
      </Button>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {outcome && (
        <p role="status" className="text-sm text-muted-foreground">
          {`${outcome.restored}개를 가져왔습니다.`}
          {outcome.invalid > 0 && ` 모양이 맞지 않아 건너뛴 항목 ${outcome.invalid}개.`}
          {outcome.failed > 0 &&
            ` 실패 ${outcome.failed}개 — ${outcome.errors.join(" / ")}`}
          {/* 화면은 마운트할 때 이 값들을 읽었으므로 지금 화면에는 반영돼 있지 않다.
              "됐다"고만 하고 왜 안 보이는지 말하지 않으면 안 된 줄 안다. */}
          {outcome.localPrefs > 0 &&
            ` 브라우저 설정 ${outcome.localPrefs}개도 복원했습니다 — 새로고침하면 반영됩니다.`}
        </p>
      )}

      <ConfirmDialog
        open={pending !== null}
        title="백업을 가져올까요?"
        description={description}
        confirmLabel="가져오기"
        onConfirm={() => void handleConfirm()}
        onCancel={() => setPending(null)}
      />
    </div>
  );
}
