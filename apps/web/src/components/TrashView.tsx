"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, RotateCcw, Trash2 } from "lucide-react";
import { listTrashedPages, purgePage, restorePage } from "@ldd/api";
import { reindexSource } from "@ldd/ai";
import type { Page } from "@ldd/core";
import { createClient } from "@/lib/supabase/client";
import { Button, buttonVariants } from "@/components/ui/button";

// 휴지통에 들어간 시각을 상대적으로 표시(간단 — 일 단위). 정밀 포맷은 과설계(ponytail).
function trashedAgo(iso: string | null): string {
  if (!iso) return "";
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return "오늘 삭제";
  return `${days}일 전 삭제`;
}

// 휴지통 뷰: soft delete된 페이지 목록 + 복원/영구삭제. 영구삭제는 되돌리기 불가라 확인 후 실행(안전 규칙).
export function TrashView() {
  const supabase = useMemo(() => createClient(), []);
  const [pages, setPages] = useState<Page[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    listTrashedPages(supabase).then(
      (data) => {
        setPages(data);
        setState("ready");
      },
      () => setState("error"),
    );
  }, [supabase]);

  const handleRestore = async (id: string, plainText: string) => {
    const prev = pages;
    setPages((p) => p.filter((x) => x.id !== id));
    try {
      await restorePage(supabase, id);
      // 복원하면 RAG 인덱스에 다시 추가(soft delete 때 제거됐던 것을 되돌림).
      void reindexSource({ sourceType: "page", sourceId: id, text: plainText });
    } catch {
      setPages(prev);
    }
  };

  const handlePurge = async (id: string, title: string) => {
    // 영구 삭제는 되돌릴 수 없고 하위 페이지도 DB cascade로 함께 삭제되므로 실행 전 확인(안전 규칙).
    const ok = window.confirm(
      `"${title || "제목 없음"}"을(를) 영구 삭제할까요?\n하위 페이지도 함께 삭제되며 되돌릴 수 없습니다.`,
    );
    if (!ok) return;
    const prev = pages;
    setPages((p) => p.filter((x) => x.id !== id));
    try {
      await purgePage(supabase, id);
    } catch {
      setPages(prev);
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
        <div>
          <h1 className="text-xl font-bold tracking-tight">휴지통</h1>
          <p className="text-xs text-muted-foreground">
            삭제한 페이지를 복원하거나 영구 삭제합니다.
          </p>
        </div>
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
              <p className="text-xs text-muted-foreground">
                {trashedAgo(page.trashedAt)}
              </p>
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
    </div>
  );
}
