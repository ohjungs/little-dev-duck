"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileText, Loader2, Plus, Trash, Trash2 } from "lucide-react";
import { createPage, listPages, softDeletePage } from "@ldd/api";
import type { Page } from "@ldd/core";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { PageEditor } from "@/components/PageEditor";

type TreeNode = Page & { children: TreeNode[] };

// flat 목록 → 부모별 트리. 순서는 created_at asc(listPages)를 유지.
function buildTree(pages: Page[]): TreeNode[] {
  const byId = new Map<string, TreeNode>();
  pages.forEach((p) => byId.set(p.id, { ...p, children: [] }));
  const roots: TreeNode[] = [];
  byId.forEach((node) => {
    const parent = node.parentId ? byId.get(node.parentId) : null;
    if (parent) parent.children.push(node);
    else roots.push(node);
  });
  return roots;
}

function TreeRow({
  node,
  depth,
  activeId,
  onDelete,
}: {
  node: TreeNode;
  depth: number;
  activeId: string | null;
  onDelete: (id: string) => void;
}) {
  const active = node.id === activeId;
  return (
    <div>
      <div
        className={cn(
          "group flex items-center gap-1 rounded-lg pr-1 text-sm transition-colors",
          active
            ? "bg-secondary font-medium text-foreground"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
      >
        <Link
          href={`/pages/${node.id}`}
          aria-current={active ? "page" : undefined}
          className="flex min-w-0 flex-1 items-center gap-2 py-2 pl-2"
          style={{ paddingLeft: depth * 14 + 8 }}
        >
          <FileText className="size-3.5 shrink-0 opacity-70" />
          <span className="truncate">{node.title || "제목 없음"}</span>
        </Link>
        <button
          type="button"
          onClick={() => onDelete(node.id)}
          aria-label={`${node.title || "제목 없음"} 삭제`}
          className="shrink-0 rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
      {node.children.map((child) => (
        <TreeRow
          key={child.id}
          node={child}
          depth={depth + 1}
          activeId={activeId}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}

// /pages 워크스페이스: 왼쪽 페이지 트리 + 오른쪽 에디터. 클라이언트 데이터(위젯과 동일 패턴).
export function PageWorkspace({ pageId }: { pageId: string | null }) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [pages, setPages] = useState<Page[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    listPages(supabase).then(
      (data) => {
        setPages(data);
        setState("ready");
      },
      () => setState("error"),
    );
  }, [supabase]);

  const tree = useMemo(() => buildTree(pages), [pages]);
  const current = pages.find((p) => p.id === pageId) ?? null;

  const handleCreate = async () => {
    try {
      const created = await createPage(supabase, {});
      setPages((prev) => [...prev, created]);
      router.push(`/pages/${created.id}`);
    } catch {
      // 재시도 가능 — 조용히 무시
    }
  };

  const handleDelete = async (id: string) => {
    const prev = pages;
    setPages((p) => p.filter((x) => x.id !== id));
    try {
      await softDeletePage(supabase, id);
      if (pageId === id) router.push("/pages");
    } catch {
      setPages(prev);
    }
  };

  const handleSaved = (id: string, patch: { title: string }) => {
    setPages((prev) =>
      prev.map((p) => (p.id === id ? { ...p, title: patch.title } : p)),
    );
  };

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-card/30 md:flex">
        <div className="flex items-center justify-between px-3 py-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            페이지
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={handleCreate}
            aria-label="새 페이지"
          >
            <Plus className="size-4" />
          </Button>
        </div>
        <nav className="flex-1 overflow-y-auto px-2 pb-3">
          {state === "loading" && (
            <p className="flex items-center gap-2 px-2 py-2 text-sm text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" /> 불러오는 중...
            </p>
          )}
          {state === "error" && (
            <p className="px-2 py-2 text-sm text-muted-foreground">
              목록을 불러오지 못했습니다.
            </p>
          )}
          {state === "ready" && tree.length === 0 && (
            <p className="px-2 py-2 text-sm text-muted-foreground">
              아직 페이지가 없습니다.
            </p>
          )}
          {tree.map((node) => (
            <TreeRow
              key={node.id}
              node={node}
              depth={0}
              activeId={pageId}
              onDelete={handleDelete}
            />
          ))}
        </nav>
        <div className="border-t border-border px-2 py-2">
          <Link
            href="/pages/trash"
            className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Trash className="size-3.5 opacity-70" /> 휴지통
          </Link>
        </div>
      </aside>

      <section className="min-w-0 flex-1">
        {current ? (
          <PageEditor
            key={current.id}
            page={current}
            onSaved={(patch) => handleSaved(current.id, patch)}
          />
        ) : (
          <div className="flex h-full min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
            <FileText className="size-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              {state === "ready" && pages.length > 0
                ? "왼쪽에서 페이지를 선택하세요."
                : "첫 페이지를 만들어 보세요."}
            </p>
            <Button type="button" onClick={handleCreate}>
              <Plus className="size-4" /> 새 페이지
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}
