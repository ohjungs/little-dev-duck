"use client";

// 2026-07-27 : 메신저 - 검색 (Phase 51)
// 방 목록 위에서 대화 내용을 찾는다. **찾는 범위는 RLS가 정한다** —
// 멤버가 아닌 방의 메시지는 조건을 걸지 않아도 애초에 보이지 않는다.

import { useState } from "react";
import Link from "next/link";

import { searchMessages } from "@ldd/api";
import {
  formatTranscript,
  kstDateString,
  messageBody,
  pendingMigrationMessage,
  splitByQuery,
  transcriptFileName,
  transcriptJson,
  type Message,
  type MessageSearchFilter,
  type TranscriptFormat,
} from "@ldd/core";
import { createClient } from "@/lib/supabase/client";
import { clearRecentList, pushRecentList, readRecentList } from "@/lib/recentList";

// 2026-07-29 : 메신저 - 최근 검색어 (Phase 55 T1 L-017)
// 백업(localPrefs)에는 담지 않는다 — 파생값이라 쓰면 다시 쌓인다(local-prefs.ts의 판단).
const RECENT_SEARCHES_KEY = "ldd:recent-searches";
const RECENT_SEARCHES_MAX = 10;

export function MessageSearch() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Message[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recent, setRecent] = useState<string[]>(() =>
    typeof window !== "undefined" ? readRecentList(RECENT_SEARCHES_KEY) : [],
  );
  // 2026-07-29 : 메신저 - 검색 필터 (Phase 55 T1 L-006~L-008)
  // 필터는 "찾기"를 누를 때 적용된다 — 바꿀 때마다 검색하면 날짜를 고르는 중간에도 쿼리가 나간다.
  const [sender, setSender] = useState<"" | "user" | "agent">("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [withImage, setWithImage] = useState(false);

  // 제출 버튼과 최근 검색어 클릭이 같은 경로를 쓴다 — 갈라지면 필터 적용도 갈라진다.
  async function runSearch(term: string) {
    if (busy || term.trim() === "") return;
    setBusy(true);
    setError(null);
    try {
      const filter: MessageSearchFilter = {
        sender: sender === "" ? undefined : sender,
        from: from === "" ? undefined : from,
        to: to === "" ? undefined : to,
        withImage: withImage || undefined,
      };
      setResults(await searchMessages(createClient(), term, filter));
      // 성공한 검색만 남긴다 — 실패한 검색어가 쌓이면 목록이 못 쓰게 된다.
      setRecent(pushRecentList(RECENT_SEARCHES_KEY, term.trim(), RECENT_SEARCHES_MAX));
    } catch (err) {
      const raw = err instanceof Error ? err.message : String(err);
      setError(pendingMigrationMessage(raw) ?? raw);
    } finally {
      setBusy(false);
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    void runSearch(q);
  }

  // 2026-07-29 : 메신저 - 검색 결과 내보내기 (Phase 55 T1 L-020)
  // 대화 내보내기와 **같은 포매터 한 벌**(formatTranscript·transcriptJson)을 쓴다 —
  // 발화자·삭제 문구·KST 정책이 파일마다 다르면 안 된다. 결과는 화면에 있는 것 그대로다
  // (재조회하지 않는다 — 재조회하면 화면과 파일이 다를 수 있다).
  async function handleExportResults(format: Exclude<TranscriptFormat, "md">) {
    if (!results || results.length === 0) return;
    setError(null);
    try {
      const {
        data: { user },
      } = await createClient().auth.getUser();
      const text =
        format === "txt"
          ? formatTranscript(results, user?.id ?? "")
          : transcriptJson(results, user?.id ?? "");
      const blob = new Blob([text], {
        type: format === "txt" ? "text/plain;charset=utf-8" : "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = transcriptFileName(`검색 ${q.trim()}`, kstDateString(new Date()), format);
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <div className="mb-4">
      <form onSubmit={handleSearch} className="flex gap-2">
        <label htmlFor="message-search" className="sr-only">
          대화 내용 검색
        </label>
        <input
          id="message-search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="대화 내용 검색"
          className="flex-1 rounded-md border border-border bg-background px-3 py-1.5 text-sm"
        />
        <button
          type="submit"
          disabled={busy || q.trim() === ""}
          className="rounded-md border border-border px-3 py-1.5 text-sm disabled:opacity-50"
        >
          {busy ? "찾는 중" : "찾기"}
        </button>
      </form>

      {/* 필터 줄 — 좁은 화면에서는 줄바꿈된다. 값은 "찾기"에서 함께 적용된다. */}
      <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <label className="flex items-center gap-1">
          보낸 사람
          <select
            value={sender}
            onChange={(e) => setSender(e.target.value as "" | "user" | "agent")}
            className="rounded border border-border bg-background px-1 py-0.5"
          >
            <option value="">전체</option>
            <option value="user">나</option>
            <option value="agent">오리</option>
          </select>
        </label>
        <label className="flex items-center gap-1">
          기간
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            aria-label="검색 시작 날짜"
            className="rounded border border-border bg-background px-1 py-0.5"
          />
          ~
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            aria-label="검색 끝 날짜"
            className="rounded border border-border bg-background px-1 py-0.5"
          />
        </label>
        <label className="flex items-center gap-1">
          <input
            type="checkbox"
            checked={withImage}
            onChange={(e) => setWithImage(e.target.checked)}
            aria-label="사진 있는 메시지만"
          />
          사진만
        </label>
      </div>

      {/* 최근 검색어 — 성공한 검색만 쌓인다. 클릭하면 지금 필터로 다시 찾는다. */}
      {recent.length > 0 && (
        <div className="mt-1.5 flex flex-wrap items-center gap-1 text-xs">
          <span className="text-muted-foreground">최근</span>
          {recent.map((term) => (
            <button
              key={term}
              type="button"
              onClick={() => {
                setQ(term);
                void runSearch(term);
              }}
              className="rounded-full border border-border px-2 py-0.5 hover:bg-accent"
            >
              {term}
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              clearRecentList(RECENT_SEARCHES_KEY);
              setRecent([]);
            }}
            className="px-1 text-muted-foreground hover:text-foreground"
          >
            지우기
          </button>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-2 text-xs text-destructive break-keep">
          {error}
        </p>
      )}

      {/* 결과 0건과 "아직 안 찾음"을 구분한다 — 빈 화면만 보이면 고장인지 없는 건지 모른다. */}
      {results !== null && !error && (
        <div className="mt-2">
          {results.length === 0 ? (
            <p className="text-xs text-muted-foreground">찾는 말이 없어요.</p>
          ) : (
            <>
            {/* 결과 내보내기(L-020) — 화면에 보이는 결과 그대로를 파일로. */}
            <div className="mb-1 flex items-center gap-1 text-xs">
              <span className="text-muted-foreground">{`결과 ${results.length}건 내보내기`}</span>
              {(["txt", "json"] as const).map((fmt) => (
                <button
                  key={fmt}
                  type="button"
                  onClick={() => void handleExportResults(fmt)}
                  className="rounded border border-border px-2 py-0.5 hover:bg-accent"
                >
                  {`.${fmt}`}
                </button>
              ))}
            </div>
            <ul className="divide-y divide-border rounded-lg border border-border">
              {results.map((m) => (
                <li key={m.id}>
                  {/* 원문 점프(L-003): 방이 아니라 그 메시지로. 하이라이트(L-002)는 core 조각을
                      React로 그린다 — HTML 문자열을 만들지 않는다(평문 렌더 원칙). */}
                  <Link
                    href={`/messages/${m.roomId}?focus=${m.id}`}
                    className="block p-2 text-xs hover:bg-accent"
                  >
                    {splitByQuery(messageBody(m), q).map((part, i) =>
                      part.hit ? (
                        <mark key={i} className="rounded-sm bg-yellow-200 px-0.5 dark:bg-yellow-700">
                          {part.text}
                        </mark>
                      ) : (
                        <span key={i}>{part.text}</span>
                      ),
                    )}
                  </Link>
                </li>
              ))}
            </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}
