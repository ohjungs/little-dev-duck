"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Loader2, Search } from "lucide-react";
import { searchPages } from "@ldd/api";
import type { Page } from "@ldd/core";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

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
  // 전역 리스너(마운트 시 1회 등록)가 항상 최신 open을 읽도록 ref에 동기화.
  const openRef = useRef(open);
  openRef.current = open;

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
    if (!q) {
      setResults([]);
      setState("idle");
      return;
    }
    setState("loading");
    timer.current = setTimeout(() => {
      searchPages(supabase, q).then(
        (rows) => {
          setResults(rows);
          setActiveIndex(0);
          setState("ready");
        },
        () => {
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

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setOpen(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && results[activeIndex]) {
      e.preventDefault();
      goTo(results[activeIndex].id);
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
        aria-label="페이지 검색"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={onKeyDown}
      >
        <div className="flex items-center gap-2 border-b border-border px-4">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => runSearch(e.target.value)}
            placeholder="페이지 검색..."
            aria-label="페이지 검색어"
            className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          {state === "loading" && (
            <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
          )}
        </div>

        <div className="max-h-[50vh] overflow-y-auto p-2">
          {state === "ready" && results.length === 0 && (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              검색 결과가 없습니다.
            </p>
          )}
          {state === "error" && (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              검색에 실패했습니다.
            </p>
          )}
          {state === "idle" && (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              제목이나 내용으로 페이지를 찾아보세요.
            </p>
          )}
          {results.map((page, i) => (
            <button
              key={page.id}
              type="button"
              onClick={() => goTo(page.id)}
              onMouseEnter={() => setActiveIndex(i)}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                i === activeIndex
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:bg-muted",
              )}
            >
              <FileText className="size-3.5 shrink-0 opacity-70" />
              <span className="min-w-0 flex-1 truncate">
                {page.title || "제목 없음"}
                {page.plainText && (
                  <span className="ml-2 text-xs text-muted-foreground/70">
                    {page.plainText.slice(0, 50)}
                  </span>
                )}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
