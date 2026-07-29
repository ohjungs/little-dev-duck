"use client";

// 2026-07-29 : 메신저 - 저장 공간 사용량 (Phase 55 T2 Q-022)
// Phase 55의 착수 기준("스토리지 50% 초과?")을 보는 계기판. 방 수 × 폴더 목록 조회라
// 공짜가 아니어서 **버튼을 눌렀을 때만** 계산한다(설정을 열 때마다 훑지 않는다).

import { useState } from "react";
import { Loader2 } from "lucide-react";

import { messengerStorageUsage, type MessengerStorageUsage } from "@ldd/api";
import { formatBytes, storageUsagePercent, STORAGE_FREE_TIER_BYTES } from "@ldd/core";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export function MessageStorageCard() {
  const [busy, setBusy] = useState(false);
  const [usage, setUsage] = useState<MessengerStorageUsage | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    </div>
  );
}
