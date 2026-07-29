"use client";

// 2026-07-29 : 메신저 - 저장 공간 사용량 (Phase 55 T2 Q-022)
// Phase 55의 착수 기준("스토리지 50% 초과?")을 보는 계기판. 방 수 × 폴더 목록 조회라
// 공짜가 아니어서 **버튼을 눌렀을 때만** 계산한다(설정을 열 때마다 훑지 않는다).

import { useState } from "react";
import { Loader2 } from "lucide-react";

import {
  messengerStorageUsage,
  listOrphanAttachments,
  deleteOrphanAttachments,
  type MessengerStorageUsage,
  type OrphanAttachment,
} from "@ldd/api";
import { formatBytes, storageUsagePercent, STORAGE_FREE_TIER_BYTES } from "@ldd/core";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ConfirmDialog";

export function MessageStorageCard() {
  const [busy, setBusy] = useState(false);
  const [usage, setUsage] = useState<MessengerStorageUsage | null>(null);
  const [error, setError] = useState<string | null>(null);
  // 2026-07-29 (Phase 58 T3 V-022): 고아 첨부(업로드됐지만 메시지가 안 만들어진 파일).
  // 계획: "먼저 목록을 만들고 개수를 보고한 뒤 실행한다" — 삭제는 확인 게이트 뒤에만.
  const [orphanBusy, setOrphanBusy] = useState(false);
  const [orphanResult, setOrphanResult] = useState<
    { orphans: OrphanAttachment[]; safe: boolean } | null
  >(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [cleanNote, setCleanNote] = useState<string | null>(null);

  async function handleScanOrphans() {
    if (orphanBusy) return;
    setOrphanBusy(true);
    setError(null);
    setCleanNote(null);
    try {
      setOrphanResult(await listOrphanAttachments(createClient()));
    } catch (e) {
      setError(e instanceof Error ? e.message : "고아 파일 검사에 실패했습니다.");
    } finally {
      setOrphanBusy(false);
    }
  }

  async function handleCleanOrphans() {
    if (!orphanResult || orphanResult.orphans.length === 0) return;
    setConfirmOpen(false);
    setOrphanBusy(true);
    try {
      const n = await deleteOrphanAttachments(
        createClient(),
        orphanResult.orphans.map((o) => o.path),
      );
      setCleanNote(`고아 파일 ${n}개를 지웠어요.`);
      setOrphanResult({ orphans: [], safe: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : "정리에 실패했습니다.");
    } finally {
      setOrphanBusy(false);
    }
  }

  const orphanBytes = orphanResult
    ? orphanResult.orphans.reduce((sum, o) => sum + (o.size ?? 0), 0)
    : 0;

  async function handleMeasure() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      setUsage(await messengerStorageUsage(createClient()));
    } catch (e) {
      setError(e instanceof Error ? e.message : "사용량을 계산하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }

  const percent = usage ? storageUsagePercent(usage.totalBytes) : null;

  return (
    <div className="flex flex-col gap-2">
      <Button variant="outline" onClick={() => void handleMeasure()} disabled={busy}>
        {busy ? <Loader2 className="animate-spin" /> : null}
        {busy ? "계산 중" : "사용량 계산"}
      </Button>

      {error && <p className="text-sm text-destructive break-keep">{error}</p>}

      {usage && percent !== null && !error && (
        <div className="text-sm">
          <p>
            {`사진 ${usage.fileCount}개, ${formatBytes(usage.totalBytes)} / ${formatBytes(STORAGE_FREE_TIER_BYTES)} (${percent}%)`}
            {usage.approximate && (
              <span className="text-muted-foreground"> — 일부는 셈에서 빠졌을 수 있어 근사치예요.</span>
            )}
          </p>
          {/* 게이지 — 50%가 Phase 55의 정리 착수 기준이다. */}
          <div
            role="progressbar"
            aria-valuenow={Math.min(100, Math.round(percent))}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="메신저 저장 공간 사용률"
            className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-muted"
          >
            <div
              className={`h-full rounded-full ${percent >= 50 ? "bg-destructive" : "bg-primary"}`}
              style={{ width: `${Math.min(100, percent)}%` }}
            />
          </div>
          {percent >= 50 && (
            <p className="mt-1 text-xs text-muted-foreground break-keep">
              사용량이 절반을 넘었어요. 오래된 사진 정리를 생각해 볼 때예요.
            </p>
          )}
        </div>
      )}
      {/* 고아 파일 검사·정리(V-022) — 검사와 삭제를 분리하고, 삭제는 개수·용량 확인 뒤에만. */}
      <div className="mt-1 border-t border-border pt-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => void handleScanOrphans()}
          disabled={orphanBusy}
        >
          {orphanBusy ? <Loader2 className="animate-spin" /> : null}
          고아 파일 검사
        </Button>
        {cleanNote && (
          <p role="status" className="mt-1 text-xs text-muted-foreground">{cleanNote}</p>
        )}
        {orphanResult && !cleanNote && (
          <div className="mt-1 text-xs">
            {!orphanResult.safe ? (
              // 참조 목록이 잘려 판정 불가 — 틀릴 수 있는 목록으로 지우게 하지 않는다.
              <p className="text-muted-foreground break-keep">
                메시지가 많아 안전하게 판정할 수 없어요. 지금은 정리를 권하지 않아요.
              </p>
            ) : orphanResult.orphans.length === 0 ? (
              <p className="text-muted-foreground">고아 파일이 없어요.</p>
            ) : (
              <div className="flex flex-col gap-1">
                <p className="break-keep">
                  {`메시지 없이 남은 파일 ${orphanResult.orphans.length}개, ${formatBytes(orphanBytes)}`}
                </p>
                <ul className="text-muted-foreground">
                  {orphanResult.orphans.slice(0, 5).map((o) => (
                    <li key={o.path} className="truncate">{o.path}</li>
                  ))}
                  {orphanResult.orphans.length > 5 && (
                    <li>… 외 {orphanResult.orphans.length - 5}개</li>
                  )}
                </ul>
                <div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setConfirmOpen(true)}
                    disabled={orphanBusy}
                  >
                    정리 ({orphanResult.orphans.length}개 삭제)
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="고아 파일을 지울까요?"
        description={`메시지가 참조하지 않는 파일 ${orphanResult?.orphans.length ?? 0}개(${formatBytes(orphanBytes)})를 스토리지에서 지웁니다. 되돌릴 수 없어요.`}
        confirmLabel="지우기"
        onConfirm={() => void handleCleanOrphans()}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
