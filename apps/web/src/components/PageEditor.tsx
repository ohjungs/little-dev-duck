"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { EmojiPicker } from "@/components/EmojiPicker";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Check,
  ChevronRight,
  Copy,
  Download,
  Globe,
  History,
  ImageIcon,
  Link2,
  Loader2,
  RefreshCw,
  Save,
  Smile,
  Star,
  Table2,
  Play,
  X,
} from "lucide-react";
import type { Block, PartialBlock } from "@blocknote/core";
import {
  createDefaultDbSchema,
  extractPlainText,
  pageEmbedText,
  pageStats,
  type DbSchema,
  type Page,
  buildTemplateFile,
} from "@ldd/core";
import {
  createPage,
  createPageVersion,
  listBacklinks,
  publishPage,
  unpublishPage,
  updatePage,
  updatePageCover,
  recordEvent,
} from "@ldd/api";
import { reindexSource } from "@ldd/ai";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { PageExportDialog } from "@/components/PageExportDialog";
import { VersionHistory } from "@/components/VersionHistory";
import { DatabaseView } from "@/components/DatabaseView";
import { AiWriteAssistant } from "@/components/AiWriteAssistant";
import { PresentationMode } from "@/components/PresentationMode";
import {
  isFavorite,
  subscribeFavorites,
  toggleFavorite,
} from "@/lib/favorites";
import { recordRecentPage } from "@/lib/recentPages";
import { decodeTextBytes } from "@/lib/decodeTextFile";
import { timeAgo } from "@/lib/timeAgo";

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

// 글자 수 마일스톤 — 편집 중 돌파하면 오리가 축하한다("노션 + 다마고치" 차별화, 격차 문서 P1).
const WRITE_MILESTONES = [200, 500, 1000, 2000, 5000] as const;
function highestMilestone(chars: number): number {
  let reached = 0;
  for (const m of WRITE_MILESTONES) if (chars >= m) reached = m;
  return reached;
}

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
  const router = useRouter();
  const [title, setTitle] = useState(page.title);
  const [icon, setIcon] = useState<string | null>(page.icon);
  const [showIconPicker, setShowIconPicker] = useState(false);
  // 본문 통계용 plainText(편집 중 실시간). 저장 파생값과 별개로 에디터 content에서 즉시 계산.
  const [plainText, setPlainText] = useState(page.plainText);
  const [favorited, setFavorited] = useState(false);
  // 오리 축하: 이미 초기 콘텐츠가 넘긴 마일스톤은 celebratedRef 초기값으로 잡아, 편집 중 "새로" 넘긴 것만 축하.
  const [celebration, setCelebration] = useState<string | null>(null);
  const celebratedRef = useRef(highestMilestone(pageStats(page.plainText).chars));
  const celebrationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 즐겨찾기 상태(localStorage) 동기화 — 사이드바 별 토글과 즉시 일관.
  useEffect(() => {
    const sync = () => setFavorited(isFavorite(page.id));
    sync();
    return subscribeFavorites(sync);
  }, [page.id]);

  // Ctrl+D / Cmd+D 단축키로 즐겨찾기 토글. 브라우저 기본 북마크 동작을 막는다.
  const handleToggleFavorite = useCallback(() => {
    toggleFavorite(page.id);
  }, [page.id]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "d") {
        e.preventDefault();
        handleToggleFavorite();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleToggleFavorite]);

  // 브라우저 탭 제목: 페이지 아이콘 + 제목. 언마운트 시 기본값으로 복원.
  useEffect(() => {
    document.title = icon
      ? `${icon} ${title || "제목 없음"} — Little Dev Duck`
      : `${title || "제목 없음"} — Little Dev Duck`;
    return () => {
      document.title = "Little Dev Duck";
    };
  }, [icon, title]);

  // 페이지 열람 시 최근 목록(localStorage MRU)에 기록 — 명령 팔레트 빠른 재접근용.
  useEffect(() => {
    recordRecentPage({ id: page.id, title: page.title, icon: page.icon });
  }, [page.id, page.title, page.icon]);

  // 2026-07-26 (피드백 3-1 방문 로그): 어느 페이지를 언제 열었는지 남긴다.
  // localStorage MRU와 별개다 — 그건 기기마다 따로이고 최근 몇 개만 들고 있어서
  // "자주 방문하는 페이지·평균 방문 횟수"를 낼 수 없다.
  //
  // **page.id에만 의존한다.** title/icon까지 넣으면 제목을 한 글자 고칠 때마다 방문이
  // 한 번씩 더 기록돼 통계가 부풀려진다(위의 MRU는 최신값으로 덮어쓰므로 상관없다).
  useEffect(() => {
    void recordEvent(supabase, {
      name: "page:view",
      detail: page.title.trim() || "제목 없음",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 방문 1회만 기록(제목 변경은 새 방문이 아니다)
  }, [supabase, page.id]);

  // 이 페이지를 참조하는 페이지 목록(백링크). 마운트 시 1회 조회.
  const [backlinks, setBacklinks] = useState<
    { sourcePageId: string; sourceTitle: string }[]
  >([]);
  useEffect(() => {
    listBacklinks(supabase, page.id).then(setBacklinks).catch(() => {});
  }, [supabase, page.id]);

  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [showVersions, setShowVersions] = useState(false);
  const [versionMsg, setVersionMsg] = useState<string | null>(null);
  const [textCopied, setTextCopied] = useState(false);
  // 내보내기·가져오기 모달 열림 상태(Phase 43 T1). 동작은 전부 기존 핸들러가 한다.
  const [exportOpen, setExportOpen] = useState(false);
  // Phase 11: 이 페이지가 데이터베이스면 dbSchema 설정. 전환/스키마편집은 로컬 상태 + db_schema 저장.
  const [dbSchema, setDbSchema] = useState<DbSchema | null>(page.dbSchema);

  // 데이터베이스 전환/스키마 편집. 실패 시 이전 상태로 롤백 + 상태줄 표시(조용한 유실 방지 — 리뷰 HIGH).
  // 이전 타이머를 취소해 연속 메시지가 서로를 조기 종료하지 않게 한다(리뷰 MEDIUM).
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashMsg = (msg: string) => {
    if (flashTimer.current) clearTimeout(flashTimer.current);
    setVersionMsg(msg);
    flashTimer.current = setTimeout(() => setVersionMsg(null), 2500);
  };

  const handleConvertToDatabase = () => {
    const schema = createDefaultDbSchema();
    setDbSchema(schema);
    updatePage(supabase, page.id, { dbSchema: schema }).catch(() => {
      setDbSchema((cur) => (cur === schema ? null : cur));
      flashMsg("데이터베이스 전환에 실패했습니다.");
    });
  };

  // 롤백은 "그 사이 더 최신 편집이 성공했는지"를 함수형 업데이터로 확인해, 현재 값이 아직 내가 낙관적으로
  // 설정한 값일 때만 되돌린다(stale rollback로 최신 성공 상태를 덮어쓰지 않게 — 리뷰 HIGH).
  const handleSchemaChange = (schema: DbSchema) => {
    const prev = dbSchema;
    setDbSchema(schema);
    updatePage(supabase, page.id, { dbSchema: schema }).catch(() => {
      setDbSchema((cur) => (cur === schema ? prev : cur));
      flashMsg("변경 저장에 실패했습니다.");
    });
  };

  // 아이콘(이모지) 즉시 저장 — 디바운스 자동저장과 별개로 선택 즉시 반영. 실패 시 (여전히 그 값이면) 롤백.
  const handleSetIcon = (next: string | null) => {
    setShowIconPicker(false);
    const prev = icon;
    setIcon(next);
    updatePage(supabase, page.id, { icon: next }).catch(() => {
      setIcon((cur) => (cur === next ? prev : cur));
      flashMsg("아이콘 저장에 실패했습니다.");
    });
  };

  // Phase 12 T1 공개 공유. publicSlug=null이면 비공개. 공개 시 링크를 클립보드에 복사.
  const [publicSlug, setPublicSlug] = useState<string | null>(page.publicSlug);

  // 커버 이미지 URL 상태. null=커버 없음. 낙관적 업데이트 + 실패 시 롤백.
  const [coverUrl, setCoverUrl] = useState<string | null>(page.coverUrl);
  const [showCoverInput, setShowCoverInput] = useState(false);
  const [coverInputValue, setCoverInputValue] = useState("");

  const copyPublicLink = (slug: string) => {
    const link = `${window.location.origin}/p/${slug}`;
    void navigator.clipboard?.writeText(link).then(
      () => flashMsg("공개 링크가 복사되었습니다."),
      () => flashMsg(`공개 링크: ${link}`),
    );
  };

  const handleCoverConfirm = () => {
    const url = coverInputValue.trim() || null;
    setShowCoverInput(false);
    setCoverInputValue("");
    const prev = coverUrl;
    setCoverUrl(url);
    updatePageCover(supabase, page.id, url).catch(() => {
      setCoverUrl((cur) => (cur === url ? prev : cur));
      flashMsg("커버 이미지 저장에 실패했습니다.");
    });
  };

  const handleCoverRemove = () => {
    const prev = coverUrl;
    setCoverUrl(null);
    updatePageCover(supabase, page.id, null).catch(() => {
      setCoverUrl((cur) => (cur === null ? prev : cur));
      flashMsg("커버 이미지 제거에 실패했습니다.");
    });
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
  // BlockEditor의 "Markdown 파싱 → 현재 문서 대체" 함수(가져오기).
  const importMd = useRef<((md: string) => Promise<void>) | null>(null);
  const handleImportReady = useCallback(
    (fn: (md: string) => Promise<void>) => {
      importMd.current = fn;
    },
    [],
  );
  // BlockEditor의 "커서 뒤에 블록 삽입" 함수(채팅 인용 S-008 — 가져오기와 같은 노출 관례).
  const insertBlocks = useRef<((blocks: PartialBlock[]) => void) | null>(null);
  const handleInsertReady = useCallback((fn: (blocks: PartialBlock[]) => void) => {
    insertBlocks.current = fn;
  }, []);

  // .md 파일을 읽어 본문으로 가져온다(현재 문서 대체). replaceBlocks가 onChange를 발화해 자동 저장된다.
  //
  // 2026-07-26 (피드백 2-1 "가져오기 … 전부 글자가 깨지고"): `file.text()`를 쓰지 않는다.
  // 그건 무조건 UTF-8로 해석해서, 한국어 Windows에서 흔한 CP949 파일이 전부 깨졌다.
  // decodeTextBytes가 BOM·UTF-8 검증으로 인코딩을 판별한다(정상 UTF-8 파일 동작은 그대로).
  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // 같은 파일 재선택 허용
    if (!file || !importMd.current) return;
    try {
      const { text, encoding } = decodeTextBytes(await file.arrayBuffer());
      await importMd.current(text);
      // 어떤 인코딩으로 읽었는지 밝힌다. 조용히 바꿔 읽으면 결과가 어색할 때 원인을 알 수 없다.
      flashMsg(
        encoding === "utf-8"
          ? "Markdown을 가져왔습니다."
          : `Markdown을 가져왔습니다 (${encoding} 파일로 읽음).`,
      );
    } catch {
      flashMsg("가져오기에 실패했습니다.");
    }
  };

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
          // 데이터베이스 행의 속성값은 plain_text에 안 들어간다 — 임베딩엔 함께 넣어야
          // 오리가 "진행 중인 프로젝트"처럼 값 기반 질문에 답할 수 있다.
          text: pageEmbedText(updated.plainText, updated.rowProps),
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

  // 2026-07-26 (피드백 2-6): 인쇄·PDF. 브라우저 인쇄 대화상자가 "PDF로 저장"을 포함하므로
  // PDF 라이브러리를 새로 들이지 않는다 — 지면 규칙(여백·페이지 나눔·다크 모드 보정)은
  // globals.css의 @media print가 담당한다.
  //
  // 저장이 끝나기 전에 인쇄하면 방금 친 글이 빠진 채 나간다. 먼저 저장을 밀어낸다.
  const handlePrint = () => {
    // 대기 중인 디바운스 저장이 없으면 null이라 바로 인쇄한다.
    const pending = flushPendingSave();
    if (!pending) {
      window.print();
      return;
    }
    // 저장이 실패해도 인쇄는 막지 않는다 — 화면에 보이는 내용은 그대로 찍힌다.
    void pending.finally(() => window.print());
  };

  // 2026-07-26 (피드백 2-6): 발표 모드. 본문의 큰 제목(h1)마다 한 장으로 보여준다.
  // 인쇄와 같은 이유로 **대기 중인 저장을 먼저 밀어낸다** — 방금 친 글이 빠진 채 발표되면 안 된다.
  // 저장이 실패해도 발표는 막지 않는다(화면에 보이는 내용은 그대로 보여줄 수 있다).
  //
  // 본문 스냅샷을 **누른 시점에** 잡아 상태로 둔다. 렌더 중에 latest.current를 읽으면
  // 린트의 "Cannot access refs during render"에 걸리고, 실제로도 발표 중 편집이 반영돼
  // 화면이 흔들릴 수 있다. 발표는 누른 순간의 내용을 보여주는 게 맞다.
  const [presentContent, setPresentContent] = useState<unknown | null>(null);
  const handlePresent = () => {
    const pending = flushPendingSave();
    const start = () => setPresentContent(latest.current.content);
    if (!pending) {
      start();
      return;
    }
    void pending.finally(start);
  };

  // 2026-07-26 (피드백 2-2): 이 페이지를 **템플릿 파일**로 내려받는다.
  // 템플릿 저장소를 새로 만들지 않고 파일로 주고받는다 — 받은 사람은 새 페이지 메뉴에서 가져온다.
  // 제목·본문·아이콘·데이터베이스 설정만 담는다(내용은 남의 것이 될 수 있어 그대로 옮긴다).
  const handleExportTemplate = () => {
    const file = buildTemplateFile({
      title: latest.current.title.trim() || "제목 없음",
      icon: page.icon,
      content: Array.isArray(latest.current.content) ? latest.current.content : [],
      dbSchema: page.dbSchema,
    });
    const blob = new Blob([JSON.stringify(file, null, 2)], {
      type: "application/json;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${safeFileName(latest.current.title)}.template.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 현재 페이지를 복제해 새 페이지로 이동(제목/본문/아이콘/부모 복사). db_schema는 계약상 미포함.
  const handleDuplicate = async () => {
    try {
      const newPage = await createPage(supabase, {
        title: `${latest.current.title || "제목 없음"} (복사본)`,
        content: latest.current.content,
        icon: icon,
        parentId: page.parentId,
      });
      router.push(`/pages/${newPage.id}`);
    } catch {
      flashMsg("복제에 실패했습니다.");
    }
  };

  // 페이지 본문을 일반 텍스트로 클립보드에 복사. 성공 피드백은 1.5초 후 원복.
  const handleCopyText = () => {
    void navigator.clipboard.writeText(plainText).then(() => {
      setTextCopied(true);
      setTimeout(() => setTextCopied(false), 1500);
    });
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
      {/* 2026-07-27 (2차 피드백 2-1): 버튼 9개가 max-w-3xl(768px) 한 줄에 들어가는데
          `flex-wrap`이 없어 좁은 창에서 넘쳤다(사용자가 지적한 범위가 정확히 이 div의 자식
          전체다). 줄바꿈은 **깨지지 않게 하는 즉시 조치**일 뿐이고, 근본은 버튼이 너무 많은
          것이다 — Phase 43이 4개로 줄인다. 그때까지 사용자가 깨진 화면을 보지 않게 한다. */}
      <div className="no-print flex flex-wrap items-center justify-end gap-1 px-4">
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
          onClick={handleDuplicate}
          className="text-muted-foreground"
        >
          <Copy className="size-3.5" /> 복제
        </Button>
        {/* 2026-07-27 (2차 피드백 2-2, Phase 43 T1): 흩어져 있던 다섯 컨트롤
            (Markdown 내보내기 · 템플릿으로 저장 · 인쇄·PDF · 텍스트 복사 · 가져오기)을
            모달 하나로 모았다. **동작은 하나도 바꾸지 않았다** — 모달이 같은 핸들러를 부른다.
            도구 모음이 넘치던 근본 원인이 버튼 수라서(Phase 42 T1은 `flex-wrap`으로 증상만
            막았다), 다섯 자리가 하나로 준다. 발표는 자주 쓰는 단독 동작이라 남긴다. */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setExportOpen(true)}
          className="text-muted-foreground"
        >
          <Download className="size-3.5" /> 내보내기 · 가져오기
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handlePresent}
          className="text-muted-foreground"
        >
          <Play className="size-3.5" /> 발표
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
      <PageExportDialog
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        onExportMarkdown={handleExport}
        onExportTemplate={handleExportTemplate}
        onPrint={handlePrint}
        onCopyText={handleCopyText}
        onImportFile={handleImportFile}
        textCopied={textCopied}
      />
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
      {/* 커버 이미지 배너 — URL이 있으면 전체 너비 배너로 표시. 호버 시 변경/삭제 버튼 노출. */}
      <div className="group relative w-full">
        {coverUrl ? (
          <>
            <div className="relative h-[200px] w-full">
              <Image
                src={coverUrl}
                alt="페이지 커버"
                fill
                unoptimized
                className="object-cover"
                sizes="100vw"
              />
            </div>
            {/* 2026-07-31 : 접근성 - 호버 전용 컨트롤 - 키보드 (SC 2.4.7)
                안쪽 버튼은 opacity-0인 채로도 탭 순서에 남는다 — 컨테이너째 숨겼으니
                되살리는 것도 컨테이너 단위(focus-within)여야 한다. */}
            <div className="absolute inset-0 flex items-end justify-start gap-2 bg-black/0 px-4 pb-3 opacity-0 transition-opacity focus-within:bg-black/20 focus-within:opacity-100 group-hover:bg-black/20 group-hover:opacity-100">
              <button
                type="button"
                onClick={() => {
                  setCoverInputValue(coverUrl ?? "");
                  setShowCoverInput(true);
                }}
                className="flex items-center gap-1 rounded bg-black/50 px-2 py-1 text-xs text-white hover:bg-black/70"
              >
                <ImageIcon className="size-3" /> 커버 변경
              </button>
              <button
                type="button"
                onClick={handleCoverRemove}
                className="flex items-center gap-1 rounded bg-black/50 px-2 py-1 text-xs text-white hover:bg-black/70"
              >
                <X className="size-3" /> 커버 삭제
              </button>
            </div>
          </>
        ) : (
          <div className="flex justify-start px-4 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
            <button
              type="button"
              onClick={() => {
                setCoverInputValue("");
                setShowCoverInput(true);
              }}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <ImageIcon className="size-3.5" /> 커버 추가
            </button>
          </div>
        )}
        {showCoverInput && (
          <CoverUrlDialog
            value={coverInputValue}
            onChange={setCoverInputValue}
            onConfirm={handleCoverConfirm}
            onCancel={() => {
              setShowCoverInput(false);
              setCoverInputValue("");
            }}
          />
        )}
      </div>
      <nav
        aria-label="경로"
        className="flex flex-wrap items-center gap-0.5 px-4 text-xs text-muted-foreground"
      >
        <Link
          href="/"
          className="rounded px-1 py-0.5 transition-colors hover:bg-muted hover:text-foreground"
        >
          홈
        </Link>
        <ChevronRight className="size-3 shrink-0 opacity-50" />
        <Link
          href="/pages"
          className="rounded px-1 py-0.5 transition-colors hover:bg-muted hover:text-foreground"
        >
          페이지
        </Link>
        {breadcrumb &&
          breadcrumb.map((b) => (
            <span key={b.id} className="flex items-center gap-0.5">
              <ChevronRight className="size-3 shrink-0 opacity-50" />
              <Link
                href={`/pages/${b.id}`}
                className="flex items-center gap-1 rounded px-1 py-0.5 transition-colors hover:bg-muted hover:text-foreground"
              >
                {b.icon && <span className="leading-none">{b.icon}</span>}
                <span className="max-w-[10rem] truncate">
                  {b.title || "제목 없음"}
                </span>
              </Link>
            </span>
          ))}
        <ChevronRight className="size-3 shrink-0 opacity-50" />
        <span className="max-w-[14rem] truncate text-foreground">
          {page.title || "제목 없음"}
        </span>
      </nav>
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
          <EmojiPicker
            onSelect={handleSetIcon}
            onClear={() => handleSetIcon(null)}
            onClose={() => setShowIconPicker(false)}
            ariaPrefix="아이콘"
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
          const pt = extractPlainText(document);
          setPlainText(pt);
          const reached = highestMilestone(pageStats(pt).chars);
          if (reached > celebratedRef.current) {
            celebratedRef.current = reached;
            if (celebrationTimer.current) clearTimeout(celebrationTimer.current);
            setCelebration(`🦆 ${reached.toLocaleString()}자 돌파! 잘하고 있어요`);
            celebrationTimer.current = setTimeout(
              () => setCelebration(null),
              3500,
            );
          }
          scheduleSave();
        }}
        onExportReady={handleExportReady}
        onImportReady={handleImportReady}
        onInsertReady={handleInsertReady}
      />
      {/* 발표는 **누른 시점의 내용**을 보여준다 — page.content는 처음 불러온 값이라
          방금 친 글이 빠진다(스냅샷은 handlePresent가 잡는다). */}
      {presentContent !== null && (
        <PresentationMode
          content={presentContent}
          onClose={() => setPresentContent(null)}
        />
      )}
      <div className="flex flex-wrap items-center gap-x-3 px-4 text-xs text-muted-foreground">
        <span role="status" aria-live="polite" className="flex items-center gap-1">
          {saveState === "saving" && (
            <>
              <Loader2 className="size-3 animate-spin" aria-hidden="true" />
              저장 중...
            </>
          )}
          {saveState === "saved" && (
            <>
              <Check className="size-3 text-green-500" aria-hidden="true" />
              저장됨
            </>
          )}
          {saveState === "error" && (
            <>
              <AlertCircle className="size-3 text-destructive" aria-hidden="true" />
              <span className="text-destructive">저장 실패</span>
              <button
                type="button"
                onClick={scheduleSave}
                className="ml-1 flex items-center gap-0.5 underline underline-offset-2 hover:text-foreground"
                aria-label="저장 다시 시도"
              >
                <RefreshCw className="size-3" aria-hidden="true" />
                다시 시도
              </button>
            </>
          )}
        </span>
        {stats.chars === 0 && <span className="opacity-50">계속 써보세요</span>}
        {stats.chars > 0 && (
          <span className="opacity-70">
            {stats.chars.toLocaleString()}자 · {stats.words.toLocaleString()}단어 · 약 {stats.readMinutes}분 읽기
          </span>
        )}
        {stats.chars > 0 && stats.chars < 100 && (
          <span className="opacity-50">계속 써보세요</span>
        )}
        {stats.chars >= 100 && stats.chars < 500 && (
          <span className="opacity-50">좋은 시작이에요</span>
        )}
      </div>
      <div className="border-t mt-4 pt-2 px-4 text-xs text-muted-foreground flex flex-wrap gap-4">
        <span>
          생성일{" "}
          {new Date(page.createdAt).toLocaleDateString("ko-KR", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </span>
        <span>수정 {timeAgo(page.updatedAt)}</span>
        <span>{plainText.length.toLocaleString()}자</span>
      </div>
      <AiWriteAssistant />
      {backlinks.length > 0 && (
        <div className="border-t px-4 pt-3">
          <h4 className="mb-2 text-xs font-semibold text-muted-foreground">
            백링크 ({backlinks.length})
          </h4>
          <div className="space-y-1">
            {backlinks.map((bl) => (
              <Link
                key={bl.sourcePageId}
                href={`/pages/${bl.sourcePageId}`}
                className="block text-xs text-primary hover:underline"
              >
                {bl.sourceTitle}
              </Link>
            ))}
          </div>
        </div>
      )}
      {dbSchema && (
        <DatabaseView
          dbId={page.id}
          dbSchema={dbSchema}
          onSchemaChange={handleSchemaChange}
        />
      )}
      {celebration && (
        <div
          role="status"
          className="pointer-events-none fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full border border-primary/30 bg-card px-4 py-2 text-sm font-medium shadow-lg"
        >
          {celebration}
        </div>
      )}
    </div>
  );
}

// 커버 이미지 URL 입력 다이얼로그(ponytail — 파일 업로드 없이 URL만). 에디터 영역 위에 절대 위치.
function CoverUrlDialog({
  value,
  onChange,
  onConfirm,
  onCancel,
}: {
  value: string;
  onChange: (v: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <>
      <div
        role="presentation"
        className="fixed inset-0 z-10"
        onClick={onCancel}
      />
      <div className="absolute left-4 top-full z-20 mt-1 flex w-80 flex-col gap-2 rounded-lg border border-border bg-card p-3 shadow-lg">
        <p className="text-xs font-medium text-foreground">커버 이미지 URL</p>
        <input
          autoFocus
          type="url"
          placeholder="https://example.com/image.jpg"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onConfirm();
            if (e.key === "Escape") onCancel();
          }}
          className="rounded border border-border bg-background px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-ring"
        />
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
          >
            취소
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded bg-primary px-2 py-1 text-xs text-primary-foreground hover:opacity-90"
          >
            적용
          </button>
        </div>
      </div>
    </>
  );
}

