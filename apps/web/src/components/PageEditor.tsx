"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { Block } from "@blocknote/core";
import { type Page } from "@ldd/core";
import { updatePage } from "@ldd/api";
import { createClient } from "@/lib/supabase/client";

// BlockNote는 브라우저 전용(window/document 의존)이라 SSR 비활성 동적 로드. 로딩 중엔 스켈레톤.
const BlockEditor = dynamic(
  () => import("@/components/BlockEditor").then((m) => m.BlockEditor),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-[55vh] flex-1 animate-pulse rounded-md bg-muted/40" />
    ),
  },
);

const SAVE_DEBOUNCE_MS = 800;

type SaveState = "idle" | "saving" | "saved" | "error";

// 페이지 1개 편집(제목 + BlockNote 본문, 디바운스 자동저장). 페이지 전환은 상위에서 key={page.id}로 리마운트.
export function PageEditor({
  page,
  onSaved,
}: {
  page: Page;
  onSaved?: (patch: { title: string }) => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [title, setTitle] = useState(page.title);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 최신 편집값(제목/본문)을 저장 시점에 읽는다 — 디바운스 타이머 클로저가 오래된 값을 잡지 않도록 ref로 보관.
  const latest = useRef<{ title: string; content: unknown }>({
    title: page.title,
    content: page.content,
  });

  // 언마운트 시 대기 중 저장 타이머 정리.
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const scheduleSave = () => {
    if (timer.current) clearTimeout(timer.current);
    setSaveState("saving");
    timer.current = setTimeout(() => {
      updatePage(supabase, page.id, {
        title: latest.current.title,
        content: latest.current.content,
      }).then(
        () => {
          setSaveState("saved");
          onSaved?.({ title: latest.current.title });
        },
        () => setSaveState("error"),
      );
    }, SAVE_DEBOUNCE_MS);
  };

  return (
    <div className="mx-auto flex h-full w-full max-w-3xl flex-col gap-4 px-2 py-10">
      <input
        value={title}
        onChange={(e) => {
          setTitle(e.target.value);
          latest.current = { ...latest.current, title: e.target.value };
          scheduleSave();
        }}
        placeholder="제목 없음"
        aria-label="페이지 제목"
        className="w-full bg-transparent px-4 text-3xl font-bold tracking-tight outline-none placeholder:text-muted-foreground/40"
      />
      <BlockEditor
        initialContent={page.content}
        onChange={(document: Block[]) => {
          latest.current = { ...latest.current, content: document };
          scheduleSave();
        }}
      />
      <p
        className="px-4 text-xs text-muted-foreground"
        role="status"
        aria-live="polite"
      >
        {saveState === "saving" && "저장 중..."}
        {saveState === "saved" && "저장됨"}
        {saveState === "error" && "저장 실패 — 잠시 후 다시 시도하세요"}
      </p>
    </div>
  );
}
