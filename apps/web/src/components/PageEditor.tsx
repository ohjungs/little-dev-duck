"use client";

import { useEffect, useRef, useState } from "react";
import { extractPlainText, type Page } from "@ldd/core";
import { updatePage } from "@ldd/api";
import { createClient } from "@/lib/supabase/client";

// 텍스트(줄바꿈=문단)를 BlockNote 호환 블록 배열로 변환. T2에서 BlockNote가 이 content를 그대로 로드하므로
// content 스키마는 지금부터 BlockNote 형식으로 저장한다(에디터만 교체, 데이터 마이그레이션 불필요).
// ponytail: T1 에디터는 textarea라 형식(굵게/제목 등)은 없다 — 블록 구조 자리만 잡아두는 인터림.
function textToBlocks(text: string): unknown[] {
  return text.split("\n").map((line) => ({
    type: "paragraph",
    content: line ? [{ type: "text", text: line, styles: {} }] : [],
  }));
}

const SAVE_DEBOUNCE_MS = 800;

type SaveState = "idle" | "saving" | "saved" | "error";

// 페이지 1개 편집(제목+본문, 디바운스 자동저장). 페이지 전환은 상위에서 key={page.id}로 리마운트.
export function PageEditor({
  page,
  onSaved,
}: {
  page: Page;
  onSaved?: (patch: { title: string }) => void;
}) {
  const supabase = createClient();
  const [title, setTitle] = useState(page.title);
  const [body, setBody] = useState(() => extractPlainText(page.content));
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 언마운트 시 대기 중 저장 타이머 정리.
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const scheduleSave = (nextTitle: string, nextBody: string) => {
    if (timer.current) clearTimeout(timer.current);
    setSaveState("saving");
    timer.current = setTimeout(() => {
      updatePage(supabase, page.id, {
        title: nextTitle,
        content: textToBlocks(nextBody),
      }).then(
        () => {
          setSaveState("saved");
          onSaved?.({ title: nextTitle });
        },
        () => setSaveState("error"),
      );
    }, SAVE_DEBOUNCE_MS);
  };

  return (
    <div className="mx-auto flex h-full w-full max-w-3xl flex-col gap-4 px-6 py-10">
      <input
        value={title}
        onChange={(e) => {
          setTitle(e.target.value);
          scheduleSave(e.target.value, body);
        }}
        placeholder="제목 없음"
        aria-label="페이지 제목"
        className="w-full bg-transparent text-3xl font-bold tracking-tight outline-none placeholder:text-muted-foreground/40"
      />
      <textarea
        value={body}
        onChange={(e) => {
          setBody(e.target.value);
          scheduleSave(title, e.target.value);
        }}
        placeholder="내용을 입력하세요..."
        aria-label="페이지 내용"
        className="min-h-[55vh] w-full flex-1 resize-none bg-transparent text-base leading-relaxed outline-none placeholder:text-muted-foreground/40"
      />
      <p className="text-xs text-muted-foreground" role="status" aria-live="polite">
        {saveState === "saving" && "저장 중..."}
        {saveState === "saved" && "저장됨"}
        {saveState === "error" && "저장 실패 — 잠시 후 다시 시도하세요"}
      </p>
    </div>
  );
}
