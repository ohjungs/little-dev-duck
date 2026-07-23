"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  Building2,
  FileText,
  Loader2,
  Newspaper,
  Plus,
  Search,
  Settings,
} from "lucide-react";
import { createPage, searchPages } from "@ldd/api";
import type { Page } from "@ldd/core";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

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

  // 열릴 때 입력에 포커스(setState 없음 — 규칙 회피).
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

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

  // 빠른 동작(검색어와 무관한 명령). 검색어가 있으면 라벨 부분일치로 필터.
  const allActions: QuickAction[] = [
    {
      id: "new-page",
      label: "새 페이지 만들기",
      icon: <Plus className="size-3.5 shrink-0 opacity-70" />,
      run: createAndOpen,
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

  // 액션 + 페이지 결과를 하나의 내비게이션 목록으로. Enter/↑↓가 통합 인덱스로 동작.
  type Item =
    | { kind: "action"; action: QuickAction }
    | { kind: "page"; page: Page };
  const items: Item[] = [
    ...actions.map((action) => ({ kind: "action" as const, action })),
    ...results.map((page) => ({ kind: "page" as const, page })),
  ];

  const runItem = (item: Item) => {
    if (item.kind === "action") item.action.run();
    else goTo(item.page.id);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
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
        <div className="flex items-center gap-2 border-b border-border px-4">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => runSearch(e.target.value)}
            placeholder="페이지 검색 또는 명령..."
            aria-label="페이지 검색 또는 명령"
            className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          {state === "loading" && (
            <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
          )}
        </div>

        <div className="max-h-[50vh] overflow-y-auto p-2">
          {items.map((item, i) => {
            const active = i === activeIndex;
            const key =
              item.kind === "action" ? item.action.id : item.page.id;
            return (
              <button
                key={key}
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
                    : item.page.title || "제목 없음"}
                  {item.kind === "page" && item.page.plainText && (
                    <span className="ml-2 text-xs text-muted-foreground/70">
                      {item.page.plainText.slice(0, 50)}
                    </span>
                  )}
                </span>
              </button>
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
      </div>
    </div>
  );
}
