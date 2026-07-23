"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  ChevronRight,
  Download,
  Globe,
  History,
  Link2,
  Save,
  Smile,
  Star,
  Table2,
} from "lucide-react";
import type { Block } from "@blocknote/core";
import {
  createDefaultDbSchema,
  extractPlainText,
  pageStats,
  type DbSchema,
  type Page,
} from "@ldd/core";
import {
  createPageVersion,
  publishPage,
  unpublishPage,
  updatePage,
} from "@ldd/api";
import { reindexSource } from "@ldd/ai";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { VersionHistory } from "@/components/VersionHistory";
import { DatabaseView } from "@/components/DatabaseView";
import {
  isFavorite,
  subscribeFavorites,
  toggleFavorite,
} from "@/lib/favorites";

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
  breadcrumb,
}: {
  page: Page;
  onSaved?: (patch: { title: string; content: unknown }) => void;
  // 상위 페이지 체인(root→parent). 중첩 페이지 내비게이션. 없으면 렌더 안 함.
  breadcrumb?: Page[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const [title, setTitle] = useState(page.title);
  const [icon, setIcon] = useState<string | null>(page.icon);
  const [showIconPicker, setShowIconPicker] = useState(false);
  // 본문 통계용 plainText(편집 중 실시간). 저장 파생값과 별개로 에디터 content에서 즉시 계산.
  const [plainText, setPlainText] = useState(page.plainText);
  const [favorited, setFavorited] = useState(false);

  // 즐겨찾기 상태(localStorage) 동기화 — 사이드바 별 토글과 즉시 일관.
  useEffect(() => {
    const sync = () => setFavorited(isFavorite(page.id));
    sync();
    return subscribeFavorites(sync);
  }, [page.id]);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [showVersions, setShowVersions] = useState(false);
  const [versionMsg, setVersionMsg] = useState<string | null>(null);
  // Phase 11: 이 페이지가 데이터베이스면 dbSchema 설정. 전환/스키마편집은 로컬 상태 + db_schema 저장.
  const [dbSchema, setDbSchema] = useState<DbSchema | null>(page.dbSchema);

  // 데이터베이스 전환/스키마 편집. 실패 시 이전 상태로 롤백 + 상태줄 표시(조용한 유실 방지 — 리뷰 HIGH).
  const flashMsg = (msg: string) => {
    setVersionMsg(msg);
    setTimeout(() => setVersionMsg(null), 2500);
  };

  const handleConvertToDatabase = () => {
    const schema = createDefaultDbSchema();
    setDbSchema(schema);
    updatePage(supabase, page.id, { dbSchema: schema }).catch(() => {
      setDbSchema(null);
      flashMsg("데이터베이스 전환에 실패했습니다.");
    });
  };

  const handleSchemaChange = (schema: DbSchema) => {
    const prev = dbSchema;
    setDbSchema(schema);
    updatePage(supabase, page.id, { dbSchema: schema }).catch(() => {
      setDbSchema(prev);
      flashMsg("변경 저장에 실패했습니다.");
    });
  };

  // 아이콘(이모지) 즉시 저장 — 디바운스 자동저장과 별개로 선택 즉시 반영. 실패 시 이전 값 롤백.
  const handleSetIcon = (next: string | null) => {
    setShowIconPicker(false);
    const prev = icon;
    setIcon(next);
    updatePage(supabase, page.id, { icon: next }).catch(() => {
      setIcon(prev);
      flashMsg("아이콘 저장에 실패했습니다.");
    });
  };

  // Phase 12 T1 공개 공유. publicSlug=null이면 비공개. 공개 시 링크를 클립보드에 복사.
  const [publicSlug, setPublicSlug] = useState<string | null>(page.publicSlug);

  const copyPublicLink = (slug: string) => {
    const link = `${window.location.origin}/p/${slug}`;
    void navigator.clipboard?.writeText(link).then(
      () => flashMsg("공개 링크가 복사되었습니다."),
      () => flashMsg(`공개 링크: ${link}`),
    );
  };

  const handlePublish = async () => {
    try {
      const { slug } = await publishPage(supabase, page.id);
      setPublicSlug(slug);
      copyPublicLink(slug);
    } catch {
      flashMsg("공개에 실패했습니다.");
    }
  };

  const handleUnpublish = async () => {
    setPublicSlug(null);
    try {
      await unpublishPage(supabase, page.id);
      flashMsg("공개를 취소했습니다.");
    } catch {
      setPublicSlug(page.publicSlug);
      flashMsg("공개 취소에 실패했습니다.");
    }
  };
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

  const stats = pageStats(plainText);

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
          onClick={() => toggleFavorite(page.id)}
          aria-pressed={favorited}
          className={favorited ? "text-yellow-500" : "text-muted-foreground"}
        >
          <Star className={`size-3.5 ${favorited ? "fill-current" : ""}`} />
          {favorited ? "즐겨찾기됨" : "즐겨찾기"}
        </Button>
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
        {!dbSchema && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleConvertToDatabase}
            className="text-muted-foreground"
          >
            <Table2 className="size-3.5" /> 데이터베이스로 전환
          </Button>
        )}
        {publicSlug ? (
          <>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => copyPublicLink(publicSlug)}
              className="text-primary"
            >
              <Link2 className="size-3.5" /> 공개 링크 복사
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleUnpublish}
              className="text-muted-foreground"
            >
              공개 취소
            </Button>
          </>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handlePublish}
            className="text-muted-foreground"
          >
            <Globe className="size-3.5" /> 웹에 공개
          </Button>
        )}
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
      {breadcrumb && breadcrumb.length > 0 && (
        <nav
          aria-label="상위 페이지"
          className="flex flex-wrap items-center gap-0.5 px-4 text-xs text-muted-foreground"
        >
          {breadcrumb.map((b) => (
            <span key={b.id} className="flex items-center gap-0.5">
              <Link
                href={`/pages/${b.id}`}
                className="flex items-center gap-1 rounded px-1 py-0.5 transition-colors hover:bg-muted hover:text-foreground"
              >
                {b.icon && <span className="leading-none">{b.icon}</span>}
                <span className="max-w-[10rem] truncate">
                  {b.title || "제목 없음"}
                </span>
              </Link>
              <ChevronRight className="size-3 shrink-0 opacity-50" />
            </span>
          ))}
        </nav>
      )}
      <div className="relative px-4">
        {icon ? (
          <button
            type="button"
            onClick={() => setShowIconPicker((o) => !o)}
            aria-label="페이지 아이콘 변경"
            className="rounded-lg text-5xl leading-none transition-transform hover:scale-105"
          >
            {icon}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setShowIconPicker((o) => !o)}
            className="flex items-center gap-1 text-xs text-muted-foreground opacity-60 transition-opacity hover:opacity-100"
          >
            <Smile className="size-3.5" /> 아이콘 추가
          </button>
        )}
        {showIconPicker && (
          <IconPicker
            onSelect={handleSetIcon}
            onClear={() => handleSetIcon(null)}
            onClose={() => setShowIconPicker(false)}
          />
        )}
      </div>
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
          setPlainText(extractPlainText(document));
          scheduleSave();
        }}
        onExportReady={handleExportReady}
      />
      <div className="flex flex-wrap items-center gap-x-3 px-4 text-xs text-muted-foreground">
        <p role="status" aria-live="polite">
          {saveState === "saving" && "저장 중..."}
          {saveState === "saved" && "저장됨"}
          {saveState === "error" && "저장 실패 — 잠시 후 다시 시도하세요"}
        </p>
        {stats.chars > 0 && (
          <span className="opacity-70">
            {stats.chars.toLocaleString()}자 · 약 {stats.readMinutes}분
          </span>
        )}
      </div>
      {dbSchema && (
        <DatabaseView
          dbId={page.id}
          dbSchema={dbSchema}
          onSchemaChange={handleSchemaChange}
        />
      )}
    </div>
  );
}

// 큐레이션 이모지(노트/문서용 흔한 것들). 라이브러리 없이 그리드 피커(ponytail).
const PAGE_EMOJIS = [
  "📄", "📝", "📌", "📎", "🗂️", "📁", "📚", "📖",
  "✅", "⭐", "🔥", "💡", "🎯", "🚀", "🏆", "🎉",
  "💰", "📊", "📈", "🗓️", "⏰", "🔔", "❤️", "☕",
  "🦆", "🐣", "🌱", "🌟", "🧩", "🔧", "🛠️", "🔒",
  "💬", "📮", "🌍", "🎨", "🎵", "🍀", "🧠", "✨",
];

function IconPicker({
  onSelect,
  onClear,
  onClose,
}: {
  onSelect: (emoji: string) => void;
  onClear: () => void;
  onClose: () => void;
}) {
  return (
    <>
      <div
        role="presentation"
        className="fixed inset-0 z-10"
        onClick={onClose}
      />
      <div className="absolute left-4 top-full z-20 mt-1 flex w-64 flex-col gap-2 rounded-lg border border-border bg-card p-3 shadow-lg">
        <div className="grid grid-cols-8 gap-1">
          {PAGE_EMOJIS.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => onSelect(e)}
              aria-label={`아이콘 ${e}`}
              className="rounded p-1 text-xl leading-none transition-colors hover:bg-muted"
            >
              {e}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onClear}
          className="self-start text-xs text-muted-foreground transition-colors hover:text-destructive"
        >
          아이콘 제거
        </button>
      </div>
    </>
  );
}
