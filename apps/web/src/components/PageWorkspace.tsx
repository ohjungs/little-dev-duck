"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Copy,
  Download,
  FileText,
  Loader2,
  Plus,
  Search,
  Star,
  Trash,
  Trash2,
  X,
} from "lucide-react";
import {
  createPage,
  listPages,
  listTrashedPages,
  softDeletePage,
} from "@ldd/api";
import { reindexSource } from "@ldd/ai";
import type { Page } from "@ldd/core";
import { createClient } from "@/lib/supabase/client";
import { subscribeTable } from "@/lib/realtime";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { PageEditor } from "@/components/PageEditor";
import { PAGE_TEMPLATES, type PageTemplate } from "@/lib/pageTemplates";
import {
  getFavorites,
  subscribeFavorites,
  toggleFavorite,
} from "@/lib/favorites";

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
  favoriteIds,
  onDelete,
  onDuplicate,
  onToggleFavorite,
}: {
  node: TreeNode;
  depth: number;
  activeId: string | null;
  favoriteIds: Set<string>;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onToggleFavorite: (id: string) => void;
}) {
  const active = node.id === activeId;
  const favorited = favoriteIds.has(node.id);
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
          {node.icon ? (
            <span className="shrink-0 text-sm leading-none">{node.icon}</span>
          ) : (
            <FileText className="size-3.5 shrink-0 opacity-70" />
          )}
          <span className="truncate">{node.title || "제목 없음"}</span>
        </Link>
        <button
          type="button"
          onClick={() => onToggleFavorite(node.id)}
          aria-label={
            favorited
              ? `${node.title || "제목 없음"} 즐겨찾기 해제`
              : `${node.title || "제목 없음"} 즐겨찾기`
          }
          aria-pressed={favorited}
          className={cn(
            "shrink-0 rounded p-1 transition-opacity hover:text-yellow-500",
            favorited
              ? "text-yellow-500 opacity-100"
              : "text-muted-foreground opacity-0 group-hover:opacity-100",
          )}
        >
          <Star className={cn("size-3.5", favorited && "fill-current")} />
        </button>
        <button
          type="button"
          onClick={() => onDuplicate(node.id)}
          aria-label={`${node.title || "제목 없음"} 복제`}
          className="shrink-0 rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
        >
          <Copy className="size-3.5" />
        </button>
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
          favoriteIds={favoriteIds}
          onDelete={onDelete}
          onDuplicate={onDuplicate}
          onToggleFavorite={onToggleFavorite}
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
  const [newMenuOpen, setNewMenuOpen] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortMode, setSortMode] = useState<"updated" | "name" | "created">("updated");

  const fetchPages = () => {
    listPages(supabase).then(
      (data) => {
        setPages(data);
        setState("ready");
      },
      () => setState("error"),
    );
  };

  useEffect(() => {
    fetchPages();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- supabase ref는 useMemo로 안정됨
  }, [supabase]);

  // Realtime: 다른 탭/기기에서 pages가 변경되면 목록을 다시 조회한다.
  useEffect(() => {
    let cleanup: (() => void) | undefined;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      cleanup = subscribeTable(supabase, "pages", user.id, () => {
        fetchPages();
      });
    });
    return () => cleanup?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 마운트 시 1회만 실행
  }, []);

  // 즐겨찾기: 마운트 시 localStorage 초기 동기화(SSR 안전) + 변경 구독.
  useEffect(() => {
    const sync = () => setFavorites(getFavorites());
    sync();
    return subscribeFavorites(sync);
  }, []);

  const filteredPages = useMemo(
    () =>
      searchQuery
        ? pages.filter((p) =>
            p.title.toLowerCase().includes(searchQuery.toLowerCase()),
          )
        : pages,
    [pages, searchQuery],
  );
  const sortedPages = useMemo(() => {
    const sorted = [...filteredPages];
    switch (sortMode) {
      case "name":
        sorted.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case "created":
        sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        break;
      case "updated":
      default:
        sorted.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
        break;
    }
    return sorted;
  }, [filteredPages, sortMode]);
  const tree = useMemo(() => buildTree(sortedPages), [sortedPages]);
  const current = pages.find((p) => p.id === pageId) ?? null;
  // 현재 페이지의 상위 체인(root→parent). 순환/누락 방어(guard). 브레드크럼 내비게이션에 사용.
  const breadcrumb = useMemo(() => {
    if (!current) return [];
    const byId = new Map(pages.map((p) => [p.id, p]));
    const chain: Page[] = [];
    let node = current.parentId ? byId.get(current.parentId) : undefined;
    let guard = 0;
    while (node && guard < 50) {
      chain.unshift(node);
      node = node.parentId ? byId.get(node.parentId) : undefined;
      guard += 1;
    }
    return chain;
  }, [current, pages]);
  const favoriteIds = useMemo(() => new Set(favorites), [favorites]);
  // 즐겨찾기 순서 유지, 삭제/휴지통으로 사라진 id는 제외.
  const favoritePages = useMemo(
    () =>
      favorites
        .map((id) => pages.find((p) => p.id === id))
        .filter((p): p is Page => p != null),
    [favorites, pages],
  );

  const handleCreate = async (template?: PageTemplate) => {
    setNewMenuOpen(false);
    try {
      const created = await createPage(supabase, {
        title: template?.title ?? "",
        content: template?.content ?? [],
      });
      setPages((prev) => [...prev, created]);
      router.push(`/pages/${created.id}`);
    } catch {
      // 재시도 가능 — 조용히 무시
    }
  };

  // 페이지 복제: 제목/본문/아이콘/부모를 복사해 새 페이지 생성 후 이동. db_schema는 createPage 계약상
  // 미포함이라 데이터베이스 페이지는 일반 페이지로 복제됨(자식·스키마 미복사 — 알려진 제약).
  const handleDuplicate = async (id: string) => {
    const src = pages.find((p) => p.id === id);
    if (!src) return;
    try {
      const created = await createPage(supabase, {
        title: `${src.title || "제목 없음"} (사본)`,
        content: src.content,
        icon: src.icon,
        parentId: src.parentId,
      });
      setPages((prev) => [...prev, created]);
      router.push(`/pages/${created.id}`);
    } catch {
      // 재시도 가능 — 조용히 무시
    }
  };

  const handleDelete = async (id: string) => {
    const removed = pages.find((x) => x.id === id);
    setPages((p) => p.filter((x) => x.id !== id));
    try {
      await softDeletePage(supabase, id);
      // 휴지통으로 보낸 페이지는 RAG 인덱스에서 제거(빈 텍스트=삭제, 타 소스와 동일 패턴).
      void reindexSource({ sourceType: "page", sourceId: id, text: "" });
      if (pageId === id) router.push("/pages");
    } catch {
      // 롤백은 통짜 스냅샷 대신 제거된 항목만 함수형으로 되살린다 — 동시 삭제 시 그 사이 처리된
      // 다른 항목을 부활시키지 않도록. 순서는 buildTree가 parentId/created_at로 재구성하므로 append로 충분.
      if (removed) {
        setPages((p) => (p.some((x) => x.id === id) ? p : [...p, removed]));
      }
    }
  };

  // 전체 페이지(휴지통 포함)를 JSON 파일로 내려받는 수동 백업(T6). 무료 원칙상 스케줄러 대신 수동.
  const handleBackup = async () => {
    try {
      const [active, trashed] = await Promise.all([
        listPages(supabase),
        listTrashedPages(supabase),
      ]);
      const backup = {
        exportedAt: new Date().toISOString(),
        version: 1,
        pages: [...active, ...trashed],
      };
      const blob = new Blob([JSON.stringify(backup, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "ldd-pages-backup.json";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // 재시도 가능 — 조용히 무시
    }
  };

  const handleSaved = (
    id: string,
    patch: { title: string; content: unknown },
  ) => {
    // content까지 스냅샷을 갱신해야 페이지를 오갔다가 돌아와도 최신 저장분으로 리마운트된다(stale 덮어쓰기 방지).
    setPages((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, title: patch.title, content: patch.content } : p,
      ),
    );
  };

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-card/30 md:flex">
        <div className="relative flex items-center justify-between px-3 py-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            페이지
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => setNewMenuOpen((v) => !v)}
            aria-label="새 페이지"
            aria-expanded={newMenuOpen}
          >
            <Plus className="size-4" />
          </Button>
          {newMenuOpen && (
            <>
              <div
                role="presentation"
                className="fixed inset-0 z-10"
                onClick={() => setNewMenuOpen(false)}
              />
              <div className="absolute right-2 top-11 z-20 w-40 overflow-hidden rounded-lg border border-border bg-card py-1 shadow-lg">
                {PAGE_TEMPLATES.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => handleCreate(t)}
                    className="flex w-full items-center px-3 py-1.5 text-left text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        <div className="px-2 pb-2">
          <div className="relative flex items-center">
            <Search className="pointer-events-none absolute left-2 size-3.5 text-muted-foreground" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="페이지 검색..."
              aria-label="페이지 검색"
              className="w-full rounded-md bg-muted/50 py-1.5 pl-7 pr-7 text-sm outline-none placeholder:text-muted-foreground/60 focus:bg-muted focus:ring-1 focus:ring-ring"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                aria-label="검색 초기화"
                className="absolute right-1.5 rounded p-0.5 text-muted-foreground hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
          <div className="mt-1.5 flex items-center justify-end">
            <select
              value={sortMode}
              onChange={(e) =>
                setSortMode(e.target.value as "updated" | "name" | "created")
              }
              aria-label="페이지 정렬 기준"
              className="rounded border border-border bg-transparent px-1 py-0.5 text-xs text-muted-foreground outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="updated">최근 수정</option>
              <option value="name">이름순</option>
              <option value="created">생성순</option>
            </select>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto px-2 pb-3">
          {favoritePages.length > 0 && (
            <div className="mb-2 border-b border-border/60 pb-2">
              <span className="px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground/70">
                즐겨찾기
              </span>
              {favoritePages.map((p) => (
                <div
                  key={p.id}
                  className={cn(
                    "group flex items-center gap-1 rounded-lg pr-1 text-sm transition-colors",
                    p.id === pageId
                      ? "bg-secondary font-medium text-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <Link
                    href={`/pages/${p.id}`}
                    aria-current={p.id === pageId ? "page" : undefined}
                    className="flex min-w-0 flex-1 items-center gap-2 py-2 pl-2"
                  >
                    {p.icon ? (
                      <span className="shrink-0 text-sm leading-none">
                        {p.icon}
                      </span>
                    ) : (
                      <Star className="size-3.5 shrink-0 fill-current text-yellow-500" />
                    )}
                    <span className="truncate">{p.title || "제목 없음"}</span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => toggleFavorite(p.id)}
                    aria-label={`${p.title || "제목 없음"} 즐겨찾기 해제`}
                    className="shrink-0 rounded p-1 text-yellow-500 transition-opacity hover:opacity-70"
                  >
                    <Star className="size-3.5 fill-current" />
                  </button>
                </div>
              ))}
            </div>
          )}
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
              {searchQuery ? "검색 결과가 없습니다." : "아직 페이지가 없습니다."}
            </p>
          )}
          {tree.map((node) => (
            <TreeRow
              key={node.id}
              node={node}
              depth={0}
              activeId={pageId}
              favoriteIds={favoriteIds}
              onDelete={handleDelete}
              onDuplicate={handleDuplicate}
              onToggleFavorite={toggleFavorite}
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
          <button
            type="button"
            onClick={handleBackup}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Download className="size-3.5 opacity-70" /> 백업 내보내기
          </button>
        </div>
      </aside>

      <section className="min-w-0 flex-1">
        {current ? (
          <PageEditor
            key={current.id}
            page={current}
            breadcrumb={breadcrumb}
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
            <Button type="button" onClick={() => handleCreate()}>
              <Plus className="size-4" /> 새 페이지
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}
