"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, RotateCcw, Trash2 } from "lucide-react";
import { listTrashedPages, purgePage, restorePage } from "@ldd/api";
import { reindexSource } from "@ldd/ai";
import type { Page } from "@ldd/core";
import { createClient } from "@/lib/supabase/client";
import { Button, buttonVariants } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ConfirmDialog";

// 휴지통에 들어간 시각을 상대적으로 표시(간단 — 일 단위). 정밀 포맷은 과설계(ponytail).
function trashedAgo(iso: string | null): { label: string; warn: boolean } {
  if (!iso) return { label: "", warn: false };
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return { label: "오늘 삭제", warn: false };
  return { label: `${days}일 전 삭제`, warn: days > 25 };
}

// 휴지통 뷰: soft delete된 페이지 목록 + 복원/영구삭제. 영구삭제는 되돌리기 불가라 확인 후 실행(안전 규칙).
export function TrashView() {
  const supabase = useMemo(() => createClient(), []);
  const [pages, setPages] = useState<Page[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [pendingPurge, setPendingPurge] = useState<{ id: string; title: string } | null>(null);
  const [pendingPurgeAll, setPendingPurgeAll] = useState(false);

  useEffect(() => {
    listTrashedPages(supabase).then(
      (data) => {
        setPages(data);
        setState("ready");
      },
      () => setState("error"),
    );
  }, [supabase]);

  const handleRestore = async (id: string, plainText: string) => {
    const removed = pages.find((x) => x.id === id);
    setPages((p) => p.filter((x) => x.id !== id));
    try {
      await restorePage(supabase, id);
      // 복원하면 RAG 인덱스에 다시 추가(soft delete 때 제거됐던 것을 되돌림).
      void reindexSource({ sourceType: "page", sourceId: id, text: plainText });
    } catch {
      // 롤백은 제거된 항목만 함수형으로 되살린다(동시 작업으로 처리된 다른 항목 부활 방지).
      if (removed) {
        setPages((p) => (p.some((x) => x.id === id) ? p : [...p, removed]));
      }
    }
  };

  const handlePurge = (id: string, title: string) => {
    // 영구 삭제는 되돌릴 수 없고 하위 페이지도 DB cascade로 함께 삭제되므로 실행 전 확인(안전 규칙).
    // 하위 페이지 임베딩은 pages BEFORE DELETE 트리거(20260722070000)가 같은 트랜잭션에서 정리한다.
    setPendingPurge({ id, title });
  };

  const confirmPurge = async () => {
    if (!pendingPurge) return;
    const { id } = pendingPurge;
    setPendingPurge(null);
    const removed = pages.find((x) => x.id === id);
    setPages((p) => p.filter((x) => x.id !== id));
    try {
      await purgePage(supabase, id);
    } catch {
      if (removed) {
        setPages((p) => (p.some((x) => x.id === id) ? p : [...p, removed]));
      }
    }
  };

  // 전체 복원: 각 페이지를 순차 복원하고 RAG 재인덱싱. 일부 실패해도 성공한 것은 목록에서 제거한다.
  const handleRestoreAll = async () => {
    const snapshot = [...pages];
    setPages([]);
    const failed: Page[] = [];
    await Promise.allSettled(
      snapshot.map(async (page) => {
        try {
          await restorePage(supabase, page.id);
          void reindexSource({ sourceType: "page", sourceId: page.id, text: page.plainText });
        } catch {
          failed.push(page);
        }
      }),
    );
    if (failed.length > 0) {
      setPages(failed);
    }
  };

  // 전체 영구 삭제: 확인 후 실행. DB cascade로 하위 페이지도 삭제된다.
  const confirmPurgeAll = async () => {
    setPendingPurgeAll(false);
    const snapshot = [...pages];
    setPages([]);
    const failed: Page[] = [];
    await Promise.allSettled(
      snapshot.map(async (page) => {
        try {
          await purgePage(supabase, page.id);
        } catch {
          failed.push(page);
        }
      }),
    );
    if (failed.length > 0) {
      setPages(failed);
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-10">
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/pages"
          aria-label="페이지로 돌아가기"
          className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold tracking-tight">
            휴지통{state === "ready" && pages.length > 0 ? ` (${pages.length}개)` : ""}
          </h1>
          <p className="text-xs text-muted-foreground">
            삭제한 페이지를 복원하거나 영구 삭제합니다.
          </p>
        </div>
        {state === "ready" && pages.length > 0 && (
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={handleRestoreAll}>
              <RotateCcw className="size-3.5" /> 전체 복원
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPendingPurgeAll(true)}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="size-3.5" /> 전체 삭제
            </Button>
          </div>
        )}
      </div>

      {state === "loading" && (
        <p className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> 불러오는 중...
        </p>
      )}
      {state === "error" && (
        <p className="py-8 text-sm text-muted-foreground">
          휴지통을 불러오지 못했습니다.
        </p>
      )}
      {state === "ready" && pages.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <Trash2 className="size-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">휴지통이 비어 있습니다.</p>
        </div>
      )}

      <ul className="flex flex-col gap-1.5">
        {pages.map((page) => (
          <li
            key={page.id}
            className="flex items-center gap-3 rounded-lg border border-border bg-card/40 px-4 py-3"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {page.title || "제목 없음"}
              </p>
              {(() => {
                const { label, warn } = trashedAgo(page.trashedAt);
                return (
                  <p className={`text-xs ${warn ? "text-destructive" : "text-muted-foreground"}`}>
                    {label}
                    {warn && " — 곧 자동 삭제됩니다"}
                  </p>
                );
              })()}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleRestore(page.id, page.plainText)}
            >
              <RotateCcw className="size-3.5" /> 복원
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handlePurge(page.id, page.title)}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="size-3.5" /> 영구 삭제
            </Button>

          </li>
        ))}
      </ul>
      <ConfirmDialog
        open={!!pendingPurge}
        title="영구 삭제"
        description={pendingPurge ? `"${pendingPurge.title || "제목 없음"}"을(를) 영구 삭제할까요? 하위 페이지도 함께 삭제되며 되돌릴 수 없습니다.` : ""}
        confirmLabel="영구 삭제"
        onConfirm={confirmPurge}
        onCancel={() => setPendingPurge(null)}
      />
      <ConfirmDialog
        open={pendingPurgeAll}
        title="전체 영구 삭제"
        description={`휴지통의 페이지 ${pages.length}개를 모두 영구 삭제할까요? 하위 페이지도 함께 삭제되며 되돌릴 수 없습니다.`}
        confirmLabel="전체 삭제"
        onConfirm={confirmPurgeAll}
        onCancel={() => setPendingPurgeAll(false)}
      />
    </div>
  );
}
