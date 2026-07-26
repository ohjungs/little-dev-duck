"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { slideTitle, splitIntoSlides, type Slide } from "@ldd/core";

// BlockNote는 브라우저 전용이라 PageEditor와 **같은 방식으로** 동적 로드해야 한다.
// 직접 import하면 서버 렌더에서 터진다.
const BlockEditor = dynamic(
  () => import("@/components/BlockEditor").then((m) => m.BlockEditor),
  {
    ssr: false,
    loading: () => <div className="min-h-[40vh] animate-pulse rounded-md bg-muted/40" />,
  },
);

// 2026-07-26 : 페이지 - 발표 - 화면 (Phase 34 T2)
// 발표는 **표시**다. 편집이 아니라 읽기 전용이라 되돌릴 수 없는 일이 없다.
// 장 나누기 판단은 core(splitIntoSlides)가 하고 여기는 보여주기만 한다.
//
// 렌더러를 새로 만들지 않았다 — 같은 BlockEditor를 editable=false로 쓴다.
// 별도 렌더러를 두면 발표에서만 다르게 보이는 블록이 생긴다(문서와 슬라이드는 한 원본이다).

export function PresentationMode({
  content,
  onClose,
}: {
  content: unknown;
  onClose: () => void;
}) {
  const [slides] = useState<Slide[]>(() => splitIntoSlides(content));
  const [index, setIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);

  const total = slides.length;
  const go = useCallback(
    (delta: number) => {
      setIndex((i) => Math.min(Math.max(i + delta, 0), Math.max(total - 1, 0)));
    },
    [total],
  );

  // 전체화면은 **사용자 제스처 안에서만** 허용된다(브라우저 정책). 버튼 클릭으로 열린 직후라
  // 여기서 요청할 수 있다. 거부돼도 발표는 그대로 진행한다 — 전체화면은 덤이지 조건이 아니다.
  // 포커스를 발표 화면 안으로 옮긴다. 안 옮기면 뒤의 "발표" 버튼에 포커스가 남아,
  // 스크린리더 사용자는 대화상자가 열린 걸 알기 어렵고 Tab이 가려진 페이지를 돈다.
  useEffect(() => {
    rootRef.current?.focus();
  }, []);

  useEffect(() => {
    const el = rootRef.current;
    if (!el || document.fullscreenElement) return;
    void el.requestFullscreen?.().catch(() => {
      // 브라우저가 거부했거나 지원하지 않는다. 창 안에서 그대로 발표한다.
    });
    return () => {
      // 닫을 때 전체화면도 함께 푼다. 안 풀면 페이지로 돌아와도 화면이 전체화면에 남는다.
      if (document.fullscreenElement) void document.exitFullscreen?.().catch(() => {
        // 이미 빠져나왔거나 브라우저가 거부했다. 닫는 것 자체는 성공했으므로 넘어간다.
      });
    };
  }, []);

  // 사용자가 브라우저 UI(F11·Esc)로 전체화면을 빠져나오면 발표도 함께 닫는다 —
  // 안 그러면 전체화면이 아닌 채로 발표 오버레이만 남아 페이지가 가려진다.
  useEffect(() => {
    const onChange = () => {
      if (!document.fullscreenElement) onClose();
    };
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, [onClose]);

  // 키보드만으로 전부 조작된다(접근성). 발표는 보통 리모컨·키보드로 넘긴다.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") return onClose();
      if (e.key === "ArrowRight" || e.key === "PageDown" || e.key === " ") {
        e.preventDefault();
        return go(1);
      }
      if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        return go(-1);
      }
      if (e.key === "Home") return setIndex(0);
      if (e.key === "End") return setIndex(Math.max(total - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, onClose, total]);

  const current = slides[index];

  return (
    <div
      ref={rootRef}
      tabIndex={-1}
      className="fixed inset-0 z-50 flex flex-col bg-background outline-none"
      // 발표 중에는 뒤 페이지가 보조기기에 읽히면 안 된다.
      role="dialog"
      aria-modal="true"
      aria-label="발표 모드"
    >
      <div className="no-print flex items-center justify-between border-b border-border px-4 py-2">
        <span className="text-xs text-muted-foreground">
          {total > 0 ? `${index + 1} / ${total}` : "보여줄 내용이 없습니다"}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => go(-1)}
            disabled={index === 0}
            aria-label="이전 장"
            className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            disabled={index >= total - 1}
            aria-label="다음 장"
            className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30"
          >
            <ChevronRight className="size-4" />
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="발표 끝내기"
            className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>

      {/* 장이 바뀐 걸 스크린리더에 알린다. 화면만 바뀌면 보이지 않는 사용자는 넘어간 걸 모른다. */}
      <p aria-live="polite" className="sr-only">
        {current ? slideTitle(current, index, total) : ""}
      </p>

      <div className="flex-1 overflow-auto px-8 py-10">
        {current ? (
          // key로 장마다 새로 마운트한다 — 같은 인스턴스를 재사용하면 이전 장의 내용이 남는다.
          <BlockEditor key={index} initialContent={current.blocks} editable={false} />
        ) : (
          <p className="text-sm text-muted-foreground">
            발표할 내용이 없습니다. 페이지에 글을 쓰면 큰 제목마다 한 장이 됩니다.
          </p>
        )}
      </div>
    </div>
  );
}
