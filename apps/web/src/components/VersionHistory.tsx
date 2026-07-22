"use client";

import { useEffect, useMemo, useState } from "react";
import { History, Loader2, RotateCcw } from "lucide-react";
import { listPageVersions, updatePage } from "@ldd/api";
import type { PageVersion } from "@ldd/core";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleString("ko-KR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

// 버전 기록 모달(T5): 저장된 스냅샷 목록 + 복원. 복원은 현재 내용을 덮으므로 확인 후 실행(안전 규칙).
export function VersionHistory({
  pageId,
  onClose,
}: {
  pageId: string;
  onClose: () => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [versions, setVersions] = useState<PageVersion[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [restoringId, setRestoringId] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    listPageVersions(supabase, pageId).then(
      (v) => {
        setVersions(v);
        setState("ready");
      },
      () => setState("error"),
    );
  }, [supabase, pageId]);

  const handleRestore = async (version: PageVersion) => {
    const ok = window.confirm(
      `이 버전(${timeLabel(version.createdAt)})으로 되돌릴까요?\n현재 내용을 덮어씁니다. 먼저 "버전 저장"을 눌러두면 지금 상태로 다시 돌아올 수 있습니다.`,
    );
    if (!ok) return;
    setRestoringId(version.id);
    try {
      await updatePage(supabase, pageId, {
        title: version.title,
        content: version.content,
      });
      // 복원은 명시적·드문 액션이라 에디터를 재초기화하기 위해 새로고침(클라이언트 상태 통짜 갱신).
      // RAG 재인덱싱은 다음 편집 시 자연히 갱신됨(부가 기능).
      window.location.reload();
    } catch {
      setRestoringId(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-background/60 px-4 pt-[12vh] backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-xl border border-border bg-card shadow-2xl"
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
  );
}
