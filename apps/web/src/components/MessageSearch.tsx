"use client";

// 2026-07-27 : 메신저 - 검색 (Phase 51)
// 방 목록 위에서 대화 내용을 찾는다. **찾는 범위는 RLS가 정한다** —
// 멤버가 아닌 방의 메시지는 조건을 걸지 않아도 애초에 보이지 않는다.

import { useState } from "react";
import Link from "next/link";

import { searchMessages } from "@ldd/api";
import { messageBody, pendingMigrationMessage, splitByQuery, type Message } from "@ldd/core";
import { createClient } from "@/lib/supabase/client";

export function MessageSearch() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Message[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      setResults(await searchMessages(createClient(), q));
    } catch (err) {
      const raw = err instanceof Error ? err.message : String(err);
      setError(pendingMigrationMessage(raw) ?? raw);
    } finally {
      setBusy(false);
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
          )}
        </div>
      )}
    </div>
  );
}
