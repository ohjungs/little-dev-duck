"use client";

import { useEffect, useMemo, useState } from "react";
import { History, Loader2, RotateCcw } from "lucide-react";
import { listPageVersions, updatePage } from "@ldd/api";
import { reindexSource } from "@ldd/ai";
import type { PageVersion } from "@ldd/core";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { useModalA11y } from "@/hooks/useModalA11y";
import { ConfirmDialog } from "@/components/ConfirmDialog";

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleString("ko-KR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

// 버전 기록 모달(T5): 저장된 스냅샷 목록 + 복원. 복원은 현재 내용을 덮으므로 확인 후 실행(안전 규칙).
// onBeforeRestore: 상위(PageEditor)의 대기 중 자동저장을 확인창 전에 취소해 복원과의 경쟁을 없앤다.
export function VersionHistory({
  pageId,
  onClose,
  onBeforeRestore,
}: {
  pageId: string;
  onClose: () => void;
  onBeforeRestore?: () => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [versions, setVersions] = useState<PageVersion[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [pendingVersion, setPendingVersion] = useState<PageVersion | null>(null);
  // 마운트되면 항상 열린 모달 — Esc 닫기 + 포커스 트랩/복원.
  const dialogRef = useModalA11y<HTMLDivElement>(true, onClose);

  useEffect(() => {
    listPageVersions(supabase, pageId).then(
      (v) => {
        setVersions(v);
        setState("ready");
      },
      () => setState("error"),
    );
  }, [supabase, pageId]);

  const handleRestore = (version: PageVersion) => {
    // 확인창 '전에' 상위의 대기 중 자동저장을 취소 — 다이얼로그를 여는 시점에 취소해야 confirm 이후
    // 이미 큐에 오른 저장이 복원과 경쟁하는 것을 막을 수 있다(기존 window.confirm 동기 블로킹과 동일 효과).
    onBeforeRestore?.();
    setPendingVersion(version);
  };

  const confirmRestore = async () => {
    if (!pendingVersion) return;
    const version = pendingVersion;
    setPendingVersion(null);
    setRestoringId(version.id);
    try {
      const updated = await updatePage(supabase, pageId, {
        title: version.title,
        content: version.content,
      });
      // 복원 내용으로 RAG 인덱스도 즉시 갱신(reload가 in-flight fetch를 취소하므로 완료까지 await).
      await reindexSource({
        sourceType: "page",
        sourceId: pageId,
        text: updated.plainText,
      });
      // 복원은 명시적·드문 액션이라 에디터를 재초기화하기 위해 새로고침(클라이언트 상태 통짜 갱신).
      window.location.reload();
    } catch {
      setRestoringId(null);
    }
  };

  return (
    <>
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-background/60 px-4 pt-[12vh] backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="w-full max-w-md overflow-hidden rounded-xl border border-border bg-card shadow-2xl outline-none"
        role="dialog"
        aria-modal="true"
        aria-label="버전 기록"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <History className="size-4 text-muted-foreground" />
          <span className="text-sm font-semibold">버전 기록</span>
        </div>

        <div className="max-h-[55vh] overflow-y-auto p-2">
          {state === "loading" && (
            <p className="flex items-center gap-2 px-3 py-6 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> 불러오는 중...
            </p>
          )}
          {state === "error" && (
            <p className="px-3 py-6 text-sm text-muted-foreground">
              버전을 불러오지 못했습니다.
            </p>
          )}
          {state === "ready" && versions.length === 0 && (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              저장된 버전이 없습니다. &quot;버전 저장&quot;으로 체크포인트를
              남겨보세요.
            </p>
          )}
          {versions.map((version) => (
            <div
              key={version.id}
              className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-muted"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {version.title || "제목 없음"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {timeLabel(version.createdAt)}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                disabled={restoringId !== null}
                onClick={() => handleRestore(version)}
              >
                {restoringId === version.id ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <RotateCcw className="size-3.5" />
                )}
                복원
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
    <ConfirmDialog
      open={!!pendingVersion}
      title="버전 복원"
      description={pendingVersion ? `이 버전(${timeLabel(pendingVersion.createdAt)})으로 되돌릴까요? 현재 내용을 덮어씁니다. 먼저 "버전 저장"을 눌러두면 지금 상태로 다시 돌아올 수 있습니다.` : ""}
      confirmLabel="복원"
      onConfirm={confirmRestore}
      onCancel={() => setPendingVersion(null)}
    />
    </>
  );
}
