"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Download, History, Save } from "lucide-react";
import type { Block } from "@blocknote/core";
import { type Page } from "@ldd/core";
import { createPageVersion, updatePage } from "@ldd/api";
import { reindexSource } from "@ldd/ai";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { VersionHistory } from "@/components/VersionHistory";

// 파일명에 못 쓰는 문자·제어문자를 -로 치환하고 끝의 점/공백을 정리한다(공백은 중간에선 보존).
// 결과가 비면(공백만 등) "page"로 폴백.
function safeFileName(name: string): string {
  const base = name.trim();
  if (!base) return "page";
  const cleaned = base.replace(/[/\?%*:|"<>]/g, "-").replace(/[. ]+$/, "");
  return (cleaned || "page").slice(0, 100);
}

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
  onSaved?: (patch: { title: string; content: unknown }) => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [title, setTitle] = useState(page.title);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [showVersions, setShowVersions] = useState(false);
  const [versionMsg, setVersionMsg] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 최신 편집값(제목/본문)을 저장 시점에 읽는다 — 디바운스 타이머 클로저가 오래된 값을 잡지 않도록 ref로 보관.
  const latest = useRef<{ title: string; content: unknown }>({
    title: page.title,
    content: page.content,
  });
  // BlockEditor가 넘겨주는 "현재 문서→Markdown" 변환 함수(에디터 인스턴스는 BlockEditor 소유).
  const toMarkdown = useRef<(() => string) | null>(null);
  const handleExportReady = useCallback((fn: () => string) => {
    toMarkdown.current = fn;
  }, []);

  // 실제 저장 1회: 서버가 content에서 plainText를 파생하므로 그 값으로 RAG 재인덱싱하고 상위 스냅샷도 갱신한다.
  const runSave = useCallback(
    () =>
      updatePage(supabase, page.id, {
        title: latest.current.title,
        content: latest.current.content,
      }).then((updated) => {
        onSaved?.({ title: updated.title, content: updated.content });
        void reindexSource({
          sourceType: "page",
          sourceId: page.id,
          text: updated.plainText,
        });
        return updated;
      }),
    [supabase, page.id, onSaved],
  );

  // 대기 중 디바운스 저장을 즉시 발화(페이지 전환/버전 액션 전에 최신 편집분 확정). 없으면 null.
  const flushPendingSave = useCallback((): Promise<unknown> | null => {
    if (!timer.current) return null;
    clearTimeout(timer.current);
    timer.current = null;
    return runSave();
  }, [runSave]);

  // 현재 페이지를 Markdown(.md)으로 내보낸다(T6). 제목을 H1로 앞에 붙인다.
  const handleExport = () => {
    const convert = toMarkdown.current;
    if (!convert) return;
    const body = convert();
    const md = `# ${latest.current.title.trim() || "제목 없음"}\n\n${body}`;
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${safeFileName(latest.current.title)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 현재 상태를 버전 스냅샷으로 저장(T5). 대기 중 편집을 먼저 저장한 뒤 서버 상태에서 스냅샷을 뜬다
  // (버전은 실제 저장된 내용의 통짜 복사 — 무결성/소유권은 서버가 강제).
  const handleSaveVersion = async () => {
    try {
      await (flushPendingSave() ?? Promise.resolve());
      await createPageVersion(supabase, { pageId: page.id });
      setVersionMsg("버전이 저장되었습니다.");
    } catch {
      setVersionMsg("버전 저장에 실패했습니다.");
    }
    setTimeout(() => setVersionMsg(null), 2500);
  };

  // 언마운트(페이지 전환 포함) 시 대기 중 저장을 폐기하지 말고 즉시 발화 — 디바운스 창 안에 페이지를
  // 바꿔도 마지막 편집분이 유실되지 않게 한다.
  useEffect(
    () => () => {
      flushPendingSave();
    },
    [flushPendingSave],
  );

  const scheduleSave = () => {
    if (timer.current) clearTimeout(timer.current);
    setSaveState("saving");
    timer.current = setTimeout(() => {
      // 발화 시점에 '대기 중' 해제 — flush/언마운트가 중복 저장하지 않도록.
      timer.current = null;
      runSave().then(
        () => setSaveState("saved"),
        () => setSaveState("error"),
      );
    }, SAVE_DEBOUNCE_MS);
  };

  return (
    <div className="mx-auto flex h-full w-full max-w-3xl flex-col gap-4 px-2 py-10">
      <div className="flex items-center justify-end gap-1 px-4">
        {versionMsg && (
          <span className="mr-auto text-xs text-muted-foreground" role="status">
            {versionMsg}
          </span>
        )}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleSaveVersion}
          className="text-muted-foreground"
        >
          <Save className="size-3.5" /> 버전 저장
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setShowVersions(true)}
          className="text-muted-foreground"
        >
          <History className="size-3.5" /> 버전 기록
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleExport}
          className="text-muted-foreground"
        >
          <Download className="size-3.5" /> Markdown 내보내기
        </Button>
      </div>
      {showVersions && (
        <VersionHistory
          pageId={page.id}
          onClose={() => setShowVersions(false)}
          onBeforeRestore={() => {
            // 복원은 현재 내용을 덮어쓰므로, 대기 중 자동저장이 복원과 경쟁하지 않도록 확인창 전에 취소한다.
            if (timer.current) {
              clearTimeout(timer.current);
              timer.current = null;
            }
          }}
        />
      )}
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
        onExportReady={handleExportReady}
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
