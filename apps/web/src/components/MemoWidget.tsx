"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { Check, Download, Pencil, Pin, Plus, Search, StickyNote, X } from "lucide-react";
import {
  createMemo,
  deleteMemo,
  listMemos,
  restoreMemo,
  updateMemo,
} from "@ldd/api";
import type { Memo } from "@ldd/core";
import { reindexSource } from "@ldd/ai";
import { createClient } from "@/lib/supabase/client";
import { todayIso } from "@/lib/today";
import { subscribeTable } from "@/lib/realtime";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { WidgetSkeleton } from "@/components/Skeleton";
import { timeAgo } from "@/lib/timeAgo";
import { UndoNotice } from "@/components/UndoNotice";

type LoadState = "loading" | "error" | "ready";

// 노트마다 살짝 다른 기울기로 손으로 붙인 느낌을 준다. hover 시 정렬(rotate-0)되도록
// CSS 변수로 넘겨 Tailwind hover가 덮어쓸 수 있게 한다(인라인 transform이면 hover가 안 먹음).
const NOTE_ROTATIONS = ["-2deg", "1.5deg", "-1deg", "2deg", "0.5deg"];

// 2026-07-27 : 메모 - 색 (2차 피드백 1-6 "메모가 잘 안보여서", Phase 44 T3)
// 전에는 `bg-yellow-50` 같은 **-50 단계**라 흰 카드 위에서 거의 구분되지 않았다(실측 ΔE 6~10).
// 값은 `globals.css`의 `--memo-*` 한 곳에 있다 — 여기에 클래스로 박으면 검사할 수 없다.
// `__tests__/memoColors.test.ts`가 그 파일을 파싱해 카드 대비와 색끼리의 거리를 잰다
// (Phase 42 T6의 잔디와 같은 방식이고, 계산은 core `deltaE` 한 벌을 쓴다).
//
// **색을 사용자가 고르는 것은 아직이다** — 메모마다 색을 저장하려면 `memos.color` 컬럼이
// 필요한데 마이그레이션이 이미 네 건 밀려 있다. 지금은 여전히 목록 순서로 배정된다.
const MEMO_COLOR_COUNT = 6;
function memoColorStyle(index: number): React.CSSProperties {
  return { backgroundColor: `var(--memo-${(index % MEMO_COLOR_COUNT) + 1})` };
}

const textareaClass =
  "w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none";

function exportMemos(memos: Memo[]) {
  const text = memos
    .map((m) => `---\n${m.content}\n(${new Date(m.createdAt).toLocaleDateString("ko-KR")})`)
    .join("\n\n");
  const blob = new Blob([text], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `memos-${todayIso()}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

const PINNED_KEY = "ldd-pinned-memos";

function getPinnedIds(): string[] {
  try {
    return JSON.parse(localStorage.getItem(PINNED_KEY) ?? "[]") as string[];
  } catch {
    return [];
  }
}

function togglePin(id: string): string[] {
  const current = getPinnedIds();
  const next = current.includes(id)
    ? current.filter((p) => p !== id)
    : [id, ...current];
  localStorage.setItem(PINNED_KEY, JSON.stringify(next));
  return next;
}

export function MemoWidget() {
  const [memos, setMemos] = useState<Memo[]>([]);
  const [pinnedIds, setPinnedIds] = useState<string[]>(() => getPinnedIds());
  const [state, setState] = useState<LoadState>("loading");
  const [actionError, setActionError] = useState<string | null>(null);
  // 방금 지운 메모. 되돌리기 안내를 띄우는 동안만 들고 있는다.
  const [deleted, setDeleted] = useState<Memo | null>(null);
  const [newContent, setNewContent] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [query, setQuery] = useState("");

  const supabase = createClient();

  const handleTogglePin = (id: string) => {
    setPinnedIds(togglePin(id));
  };

  // 고정 메모를 앞에, 나머지는 원래 순서(생성일 내림차순)로 정렬한다.
  const sortedMemos = [
    ...memos.filter((m) => pinnedIds.includes(m.id)).sort((a, b) => {
      const ai = pinnedIds.indexOf(a.id);
      const bi = pinnedIds.indexOf(b.id);
      return ai - bi;
    }),
    ...memos.filter((m) => !pinnedIds.includes(m.id)),
  ];

  // 내용 부분일치 필터(메모가 많을 때만 검색창 노출).
  const q = query.trim().toLowerCase();
  const visibleMemos = q
    ? sortedMemos.filter((m) => m.content.toLowerCase().includes(q))
    : sortedMemos;

  const fetchMemos = async () => {
    try {
      const data = await listMemos(supabase);
      setMemos(data);
      setState("ready");
    } catch {
      setState("error");
    }
  };

  useEffect(() => {
    // 마운트 시 1회 조회. 재시도는 이벤트 핸들러(reload)가 담당.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- SSR/hydration 안전: 마운트 후 1회 동기화
    fetchMemos();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 마운트 시 1회만 실행
  }, []);

  // Realtime: 다른 탭/기기에서 memos가 변경되면 목록을 다시 조회한다.
  useEffect(() => {
    let cleanup: (() => void) | undefined;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      cleanup = subscribeTable(supabase, "memos", user.id, () => {
        void fetchMemos();
      });
    });
    return () => cleanup?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 마운트 시 1회만 실행
  }, []);

  const reload = () => {
    setState("loading");
    fetchMemos();
  };

  const handleAdd = async () => {
    const content = newContent.trim();
    if (!content) return;
    setActionError(null);
    try {
      const created = await createMemo(supabase, { content });
      setMemos((prev) => [created, ...prev]);
      setNewContent("");
      // RAG 인덱싱(fire-and-forget). 실패해도 저장 흐름을 막지 않는다.
      void reindexSource({ sourceType: "memo", sourceId: created.id, text: content });
    } catch {
      setActionError("메모를 추가하지 못했습니다.");
    }
  };

  const startEdit = (memo: Memo) => {
    setEditingId(memo.id);
    setEditContent(memo.content);
  };

  const saveEdit = async (id: string) => {
    const content = editContent.trim();
    if (!content) return;
    const prevMemos = memos;
    setMemos((prev) =>
      prev.map((m) => (m.id === id ? { ...m, content } : m)),
    );
    try {
      await updateMemo(supabase, id, { content });
      setEditingId(null);
      void reindexSource({ sourceType: "memo", sourceId: id, text: content });
    } catch {
      setMemos(prevMemos);
      setActionError("메모를 수정하지 못했습니다. 다시 시도해 주세요.");
    }
  };

  const handleUndoDelete = async (memo: Memo) => {
    setDeleted(null);
    setActionError(null);
    // 같은 id로 되살아나므로 임베딩(sourceId)이 그대로 이어진다.
    setMemos((prev) => (prev.some((m) => m.id === memo.id) ? prev : [memo, ...prev]));
    try {
      await restoreMemo(supabase, memo);
      void reindexSource({
        sourceType: "memo",
        sourceId: memo.id,
        text: memo.content,
      });
    } catch {
      // 실패를 조용히 넘기면 복구된 줄 알고 넘어간다.
      setMemos((prev) => prev.filter((m) => m.id !== memo.id));
      setActionError("되돌리지 못했습니다.");
    }
  };

  const handleDelete = async (id: string) => {
    const prevMemos = memos;
    const removed = prevMemos.find((m) => m.id === id) ?? null;
    setMemos((prev) => prev.filter((m) => m.id !== id));
    try {
      await deleteMemo(supabase, id);
      // 빈 텍스트로 재인덱싱 = 서버가 해당 소스 임베딩 삭제.
      void reindexSource({ sourceType: "memo", sourceId: id, text: "" });
      // 삭제 버튼은 hover로 뜨는 작은 아이콘이라 오클릭이 실제로 일어난다. 되돌릴 창을 준다.
      if (removed) setDeleted(removed);
    } catch {
      setMemos(prevMemos);
      setActionError("메모를 삭제하지 못했습니다.");
    }
  };

  const rotationStyle = (index: number): CSSProperties =>
    ({
      "--rot": NOTE_ROTATIONS[index % NOTE_ROTATIONS.length],
    }) as CSSProperties;

  return (
    <Card data-testid="memo-widget" className="h-full">
      <CardHeader>
        <CardTitle>
          <StickyNote className="size-4 text-primary-accent" />
          메모
        </CardTitle>
        {state === "ready" && memos.length > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => exportMemos(sortedMemos)}
            aria-label="전체 내보내기"
          >
            <Download className="size-3.5" />
            전체 내보내기
          </Button>
        )}
      </CardHeader>

      <CardContent className="flex flex-col gap-3">
        <div className="flex gap-2">
          <div className="flex flex-1 flex-col gap-1">
            <textarea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleAdd();
              }}
              placeholder="메모 (Ctrl+Enter로 추가)"
              rows={2}
              className={textareaClass}
            />
            <span className="text-xs text-muted-foreground">{newContent.length}/200자</span>
          </div>
          <Button
            type="button"
            size="icon"
            onClick={handleAdd}
            aria-label="추가"
          >
            <Plus />
          </Button>
        </div>

        {state === "ready" && memos.length > 5 && (
          <div className="flex items-center gap-2 rounded-lg border border-input bg-background px-2.5">
            <Search className="size-3.5 shrink-0 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="메모 검색"
              aria-label="메모 검색"
              className="h-8 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
        )}

        {deleted && (
          <UndoNotice
            key={deleted.id}
            message={`"${deleted.title}" 삭제했습니다.`}
            onUndo={() => void handleUndoDelete(deleted)}
            onDismiss={() => setDeleted(null)}
          />
        )}

        {actionError && (
          <p role="alert" className="text-xs text-destructive">
            {actionError}
          </p>
        )}

        {state === "loading" && <WidgetSkeleton />}
        {state === "error" && (
          <div className="flex flex-col items-start gap-2">
            <p className="text-sm text-muted-foreground">
              목록을 불러오지 못했습니다.
            </p>
            <Button type="button" variant="outline" size="sm" onClick={reload}>
              다시 시도
            </Button>
          </div>
        )}
        {state === "ready" && memos.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">
            메모를 남겨보세요.
          </p>
        )}
        {state === "ready" && memos.length > 0 && visibleMemos.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">
            검색어와 일치하는 메모가 없습니다.
          </p>
        )}
        {state === "ready" && visibleMemos.length > 0 && (
          <div className="flex flex-wrap gap-3">
            {visibleMemos.map((memo, index) =>
              editingId === memo.id ? (
                <div
                  key={memo.id}
                  data-testid={`memo-${memo.id}`}
                  style={memoColorStyle(index)}
                  className="flex min-h-36 w-40 flex-col gap-2 rounded-xl border border-border p-3 shadow-sm"
                >
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    rows={4}
                    autoFocus
                    // 수정 모드엔 placeholder가 없어 스크린리더가 이름 없는 입력란으로 읽는다.
                    aria-label="메모 내용 수정"
                    className="flex-1 resize-none bg-transparent text-sm focus-visible:outline-none"
                  />
                  <div className="flex justify-end gap-1">
                    <Button
                      type="button"
                      size="icon-sm"
                      onClick={() => saveEdit(memo.id)}
                      aria-label="저장"
                    >
                      <Check />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setEditingId(null)}
                      aria-label="취소"
                    >
                      <X />
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  key={memo.id}
                  data-testid={`memo-${memo.id}`}
                  // 기울기와 배경색을 한 style로 합친다 — 두 번 주면 뒤엣것이 앞엣것을 덮는다.
                  style={{ ...rotationStyle(index), ...memoColorStyle(index) }}
                  className="group flex min-h-36 w-40 flex-col gap-2 rounded-xl border border-border p-3 shadow-sm transition-all motion-safe:rotate-[var(--rot)] motion-safe:hover:-translate-y-1 motion-safe:hover:rotate-0 hover:shadow-md"
                >
                  <div className="flex justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => handleTogglePin(memo.id)}
                      aria-label={pinnedIds.includes(memo.id) ? "고정 해제" : "고정"}
                      className={`transition-opacity focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring ${
                        pinnedIds.includes(memo.id)
                          ? "text-primary opacity-100"
                          : "text-muted-foreground opacity-0 hover:text-foreground group-hover:opacity-100"
                      }`}
                    >
                      <Pin className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => startEdit(memo)}
                      aria-label="수정"
                      className="text-muted-foreground opacity-0 transition-opacity hover:text-foreground focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring group-hover:opacity-100"
                    >
                      <Pencil className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(memo.id)}
                      aria-label="삭제"
                      className="text-muted-foreground opacity-0 transition-opacity hover:text-destructive focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring group-hover:opacity-100"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                  <p className="flex-1 whitespace-pre-wrap text-sm">
                    {memo.content}
                  </p>
                  <span className="text-[10px] text-muted-foreground">
                    {timeAgo(memo.createdAt)}
                  </span>
                </div>
              ),
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
