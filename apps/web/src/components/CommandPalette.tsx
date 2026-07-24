"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  Building2,
  Clock,
  FileText,
  Loader2,
  Newspaper,
  Plus,
  Search,
  Settings,
  StickyNote,
} from "lucide-react";
import { createMemo, createPage, searchPages } from "@ldd/api";
import type { Page } from "@ldd/core";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { getRecentPages, type RecentPage } from "@/lib/recentPages";

// ---------------------------------------------------------------------------
// 최근 검색어 localStorage helpers
// ---------------------------------------------------------------------------
const RECENT_SEARCHES_KEY = "ldd-recent-searches";
const MAX_RECENT_SEARCHES = 5;

function getRecentSearches(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY) ?? "[]") as string[];
  } catch {
    return [];
  }
}

function saveRecentSearch(query: string): void {
  const trimmed = query.trim();
  if (!trimmed) return;
  const current = getRecentSearches();
  const deduped = [trimmed, ...current.filter((s) => s !== trimmed)].slice(
    0,
    MAX_RECENT_SEARCHES,
  );
  localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(deduped));
}

// ---------------------------------------------------------------------------

type QuickAction = {
  id: string;
  label: string;
  icon: ReactNode;
  run: () => void;
};

// 사이드바 검색 버튼 등 팔레트 밖에서 여는 신호(위젯 간 CustomEvent 패턴 — todoSignal/xpSignal과 동일).
export const OPEN_SEARCH_EVENT = "ldd:open-search";

const SEARCH_DEBOUNCE_MS = 200;

type SearchState = "idle" | "loading" | "ready" | "error";

// Cmd/Ctrl+K 전역 검색 팔레트. 제목/본문 부분일치(searchPages)로 페이지를 찾아 이동. (app) 레이아웃에 상주.
export function CommandPalette() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Page[]>([]);
  const [state, setState] = useState<SearchState>("idle");
  const [activeIndex, setActiveIndex] = useState(0);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [memoMode, setMemoMode] = useState(false);
  const [memoText, setMemoText] = useState("");
  const [memoSaved, setMemoSaved] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 최신 검색어를 담아 out-of-order 응답(느린 옛 요청이 최신 결과를 덮어씀)을 버린다.
  const latestQuery = useRef("");
  // 전역 리스너(마운트 시 1회 등록)가 항상 최신 open을 읽도록 ref에 동기화(렌더 중 ref 변경 금지 —
  // effect에서 반영).
  const openRef = useRef(open);
  useEffect(() => {
    openRef.current = open;
  }, [open]);

  const reset = () => {
    if (timer.current) clearTimeout(timer.current);
    setQuery("");
    setResults([]);
    setState("idle");
    setActiveIndex(0);
    setMemoMode(false);
    setMemoText("");
    setMemoSaved(false);
  };

  // 전역 열기 트리거: Cmd/Ctrl+K(토글) + OPEN_SEARCH_EVENT(열기). 초기화는 이벤트 핸들러에서 수행
  // (effect 내 동기 setState 회피). 언마운트 시 리스너·타이머 정리.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (openRef.current) {
          setOpen(false);
        } else {
          reset();
          setOpen(true);
        }
      }
    };
    const onOpen = () => {
      reset();
      setOpen(true);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener(OPEN_SEARCH_EVENT, onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(OPEN_SEARCH_EVENT, onOpen);
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  // 열릴 때 입력에 포커스하고 최근 검색어를 로드한다.
  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
      // eslint-disable-next-line react-hooks/set-state-in-effect -- SSR/hydration 안전: 팔레트 오픈 시 localStorage 동기화
      setRecentSearches(getRecentSearches());
    }
  }, [open]);

  // 메모 모드로 전환 시 메모 입력에 포커스한다.
  useEffect(() => {
    if (memoMode) {
      inputRef.current?.focus();
    }
  }, [memoMode]);

  const runSearch = (raw: string) => {
    setQuery(raw);
    if (timer.current) clearTimeout(timer.current);
    const q = raw.trim();
    latestQuery.current = q;
    if (!q) {
      setResults([]);
      setState("idle");
      setActiveIndex(0);
      return;
    }
    setState("loading");
    timer.current = setTimeout(() => {
      searchPages(supabase, q).then(
        (rows) => {
          // 응답 도착 시점에 검색어가 바뀌었으면(더 최신 요청 존재) 이 결과는 버린다.
          if (q !== latestQuery.current) return;
          setResults(rows);
          setActiveIndex(0);
          setState("ready");
        },
        () => {
          if (q !== latestQuery.current) return;
          setResults([]);
          setState("error");
        },
      );
    }, SEARCH_DEBOUNCE_MS);
  };

  const goTo = (id: string) => {
    // 검색어가 있을 때만 저장한다(최근 페이지 클릭은 검색어가 없으므로 저장 안 함).
    if (query.trim()) saveRecentSearch(query.trim());
    setOpen(false);
    router.push(`/pages/${id}`);
  };

  const go = (path: string) => {
    setOpen(false);
    router.push(path);
  };

  // 빈 페이지를 만들고 바로 연다. 실패 시 팔레트만 닫힘(페이지 목록에서 재시도 가능).
  const createAndOpen = () => {
    setOpen(false);
    createPage(supabase, {}).then(
      (p) => router.push(`/pages/${p.id}`),
      () => {},
    );
  };

  const saveMemo = () => {
    const content = memoText.trim();
    if (!content) return;
    createMemo(supabase, { content }).then(
      () => {
        setMemoSaved(true);
        setTimeout(() => setOpen(false), 800);
      },
      () => {},
    );
  };

  // 빠른 동작(검색어와 무관한 명령). 검색어가 있으면 라벨 부분일치로 필터.
  const allActions: QuickAction[] = [
    {
      id: "new-page",
      label: "새 페이지 만들기",
      icon: <Plus className="size-3.5 shrink-0 opacity-70" />,
      run: createAndOpen,
    },
    {
      id: "quick-memo",
      label: "빠른 메모 작성",
      icon: <StickyNote className="size-3.5 shrink-0 opacity-70" />,
      run: () => setMemoMode(true),
    },
    {
      id: "go-insights",
      label: "통계 열기",
      icon: <BarChart3 className="size-3.5 shrink-0 opacity-70" />,
      run: () => go("/insights"),
    },
    {
      id: "go-news",
      label: "뉴스 브리핑 열기",
      icon: <Newspaper className="size-3.5 shrink-0 opacity-70" />,
      run: () => go("/news"),
    },
    {
      id: "go-office",
      label: "오리 오피스 열기",
      icon: <Building2 className="size-3.5 shrink-0 opacity-70" />,
      run: () => go("/office"),
    },
    {
      id: "go-settings",
      label: "설정 열기",
      icon: <Settings className="size-3.5 shrink-0 opacity-70" />,
      run: () => go("/settings"),
    },
  ];
  const q = query.trim().toLowerCase();
  const actions = q
    ? allActions.filter((a) => a.label.toLowerCase().includes(q))
    : allActions;

  // 검색어가 없을 때만 최근 연 페이지(localStorage MRU)를 노출.
  const recent = q ? [] : getRecentPages();
  // 검색어가 없을 때만 최근 검색어를 노출.
  const recentSearchItems = q ? [] : recentSearches;

  // 액션 + 최근 검색어 + 최근 페이지 + 검색 결과를 하나의 내비게이션 목록으로.
  type Item =
    | { kind: "action"; action: QuickAction }
    | { kind: "recentSearch"; query: string }
    | { kind: "recent"; page: RecentPage }
    | { kind: "page"; page: Page };
  const items: Item[] = [
    ...actions.map((action) => ({ kind: "action" as const, action })),
    ...recentSearchItems.map((sq) => ({ kind: "recentSearch" as const, query: sq })),
    ...recent.map((page) => ({ kind: "recent" as const, page })),
    ...results.map((page) => ({ kind: "page" as const, page })),
  ];

  const runItem = (item: Item) => {
    if (item.kind === "action") {
      item.action.run();
    } else if (item.kind === "recentSearch") {
      // 최근 검색어를 클릭하면 해당 쿼리로 검색을 다시 실행한다.
      runSearch(item.query);
    } else {
      goTo(item.page.id);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (memoMode) return;
    if (e.key === "Escape") {
      setOpen(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && items[activeIndex]) {
      e.preventDefault();
      runItem(items[activeIndex]);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-background/60 px-4 pt-[15vh] backdrop-blur-sm"
      onClick={() => setOpen(false)}
      role="presentation"
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-xl border border-border bg-card shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label="검색 및 명령"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={onKeyDown}
      >
        {memoMode ? (
          <div className="flex items-center gap-2 border-b border-border px-4">
            <StickyNote className="size-4 shrink-0 text-muted-foreground" />
            <input
              ref={inputRef}
              value={memoSaved ? "저장됨" : memoText}
              onChange={(e) => { if (!memoSaved) setMemoText(e.target.value); }}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); saveMemo(); }
                if (e.key === "Escape") setOpen(false);
              }}
              placeholder="메모 내용을 입력하고 Enter..."
              aria-label="빠른 메모 입력"
              readOnly={memoSaved}
              className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
        ) : (
          <div className="flex items-center gap-2 border-b border-border px-4">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => runSearch(e.target.value)}
              placeholder="페이지 검색 또는 명령..."
              aria-label="페이지 검색 또는 명령"
              aria-controls="palette-listbox"
              aria-activedescendant={items.length > 0 ? `palette-item-${activeIndex}` : undefined}
              className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            {state === "loading" && (
              <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
            )}
          </div>
        )}

        {!memoMode && (
        <div id="palette-listbox" role="listbox" className="max-h-[50vh] overflow-y-auto p-2">
          {items.map((item, i) => {
            const active = i === activeIndex;
            const key =
              item.kind === "action"
                ? item.action.id
                : item.kind === "recentSearch"
                  ? `recent-search-${item.query}`
                  : item.page.id;

            // 섹션 구분선 — 최근 검색어 첫 항목 앞에 헤더를 삽입한다.
            const isFirstRecentSearch =
              item.kind === "recentSearch" &&
              (i === 0 || items[i - 1]?.kind !== "recentSearch");
            // 최근 페이지 첫 항목 앞에도 헤더를 삽입한다.
            const isFirstRecentPage =
              item.kind === "recent" &&
              (i === 0 || items[i - 1]?.kind !== "recent");

            return (
              <div key={key}>
                {isFirstRecentSearch && (
                  <p className="px-3 pb-1 pt-2 text-xs font-medium text-muted-foreground">
                    최근 검색
                  </p>
                )}
                {isFirstRecentPage && (
                  <p className="px-3 pb-1 pt-2 text-xs font-medium text-muted-foreground">
                    최근 페이지
                  </p>
                )}
                <button
                  id={`palette-item-${i}`}
                  role="option"
                  aria-selected={active}
                  type="button"
                  onClick={() => runItem(item)}
                  onMouseEnter={() => setActiveIndex(i)}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                    active
                      ? "bg-secondary text-foreground"
                      : "text-muted-foreground hover:bg-muted",
                  )}
                >
                  {item.kind === "action" ? (
                    item.action.icon
                  ) : item.kind === "recentSearch" ? (
                    <Clock className="size-3.5 shrink-0 opacity-70" />
                  ) : item.page.icon ? (
                    <span className="shrink-0 text-sm leading-none">
                      {item.page.icon}
                    </span>
                  ) : (
                    <FileText className="size-3.5 shrink-0 opacity-70" />
                  )}
                  <span className="min-w-0 flex-1 truncate">
                    {item.kind === "action"
                      ? item.action.label
                      : item.kind === "recentSearch"
                        ? item.query
                        : item.page.title || "제목 없음"}
                    {item.kind === "page" && item.page.plainText && (
                      <span className="ml-2 text-xs text-muted-foreground/70">
                        {item.page.plainText.slice(0, 50)}
                      </span>
                    )}
                  </span>
                </button>
              </div>
            );
          })}
          {q !== "" && state === "ready" && results.length === 0 && (
            <p className="px-3 py-4 text-center text-sm text-muted-foreground">
              일치하는 페이지가 없습니다.
            </p>
          )}
          {state === "error" && (
            <p className="px-3 py-4 text-center text-sm text-muted-foreground">
              검색에 실패했습니다.
            </p>
          )}
        </div>
        )}
      </div>
    </div>
  );
}
