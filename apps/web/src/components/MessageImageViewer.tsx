"use client";

// 2026-07-29 : 메신저 - 전체화면 이미지 뷰어 (Phase 51 T5)
//
// 판단(순서·양옆·닫을 신호)은 core `galleryNav`가 하고, 여기는 그리기와 키만 받는다 —
// ConfirmDialog와 같은 dumb-component 패턴. 상태는 MessageRoom이 든다.
//
// 순환하지 않는다(끝에서 반대편으로 안 감) — core 주석 참조.

import { useEffect, useRef } from "react";

type Props = {
  /** 화면에 띄울 서명 URL. 아직 없으면 자리 표시. */
  url: string | null;
  nav: { prev: string | null; next: string | null; index: number; total: number };
  onNavigate: (path: string) => void;
  onClose: () => void;
  /** 원본 저장. 진행 중이면 버튼을 잠근다(두 번 누르면 두 번 받는다). */
  onDownload: () => void;
  downloading: boolean;
};

export function MessageImageViewer({ url, nav, onNavigate, onClose, onDownload, downloading }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  // 키를 받으려면 초점이 안에 있어야 한다(ConfirmDialog와 같은 방식).
  useEffect(() => {
    ref.current?.focus();
  }, []);

  return (
    <div
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-label="이미지 보기"
      tabIndex={-1}
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
        if (e.key === "ArrowLeft" && nav.prev) onNavigate(nav.prev);
        if (e.key === "ArrowRight" && nav.next) onNavigate(nav.next);
      }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/85"
    >
      {/* 위 바: 위치 · 저장 · 닫기. 이미지 클릭은 닫힘으로 새지 않게 막는다. */}
      <div
        className="flex w-full max-w-3xl items-center justify-between px-4 py-2 text-xs text-white"
        onClick={(e) => e.stopPropagation()}
      >
        <span aria-live="polite">
          {nav.index >= 0 ? `${nav.index + 1} / ${nav.total}` : ""}
        </span>
        <span className="flex gap-2">
          <button
            type="button"
            onClick={onDownload}
            disabled={downloading || !url}
            className="rounded border border-white/40 px-2 py-1 hover:bg-white/10 disabled:opacity-50"
          >
            {downloading ? "받는 중" : "저장"}
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="뷰어 닫기"
            className="rounded border border-white/40 px-2 py-1 hover:bg-white/10"
          >
            닫기
          </button>
        </span>
      </div>

      <div className="flex min-h-0 w-full flex-1 items-center justify-center gap-2 px-2 pb-4">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (nav.prev) onNavigate(nav.prev);
          }}
          disabled={!nav.prev}
          aria-label="이전 사진"
          className="rounded px-2 py-4 text-2xl text-white/80 hover:bg-white/10 disabled:opacity-20"
        >
          ‹
        </button>

        {url ? (
          // eslint-disable-next-line @next/next/no-img-element -- 서명 URL은 만료되는 임시 주소라 next/image 최적화 대상이 아니다(인라인 렌더와 같은 근거).
          <img
            src={url}
            alt="첨부 이미지 원본"
            onClick={(e) => e.stopPropagation()}
            className="max-h-full min-h-0 max-w-full rounded object-contain"
          />
        ) : (
          <span className="text-sm text-white/70">사진을 불러오는 중</span>
        )}

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (nav.next) onNavigate(nav.next);
          }}
          disabled={!nav.next}
          aria-label="다음 사진"
          className="rounded px-2 py-4 text-2xl text-white/80 hover:bg-white/10 disabled:opacity-20"
        >
          ›
        </button>
      </div>
    </div>
  );
}
