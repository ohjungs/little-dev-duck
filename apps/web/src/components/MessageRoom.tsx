"use client";

// 2026-07-27 : 메신저 - 대화 화면 (Phase 50 T3·T4)
//
// **본문은 평문으로 렌더한다.** 계획(T4)이 못박은 대로다 — 이 방엔 사용자가 쓴 글뿐 아니라
// **에이전트(오리) 응답도 들어온다.** LLM 출력을 HTML로 그리면 그게 인젝션 표면이 된다.
// React가 기본으로 이스케이프하므로 `dangerouslySetInnerHTML`을 쓰지 않는 것이 곧 방어다.
//
// **낙관적 UI**: 보내면 즉시 목록에 붙인다. 그래서 중복이 생길 수 있고, 그 방어가
// `clientMsgId`다(같은 값으로 재시도하면 서버가 이미 저장한 것을 돌려준다).

import { useCallback, useEffect, useRef, useState } from "react";

import { listMessages, sendMessage } from "@ldd/api";
import { messageBody, pendingMigrationMessage, type Message } from "@ldd/core";
import { createClient } from "@/lib/supabase/client";
import { subscribeRoomMessages } from "@/lib/realtime";

type Props = {
  roomId: string;
  initialMessages: Message[];
  myUserId: string;
};

export function MessageRoom({ roomId, initialMessages, myUserId }: Props) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const reload = useCallback(async () => {
    try {
      setMessages(await listMessages(createClient(), roomId));
    } catch {
      // 실시간 갱신 실패는 화면을 죽이지 않는다 — 이미 있는 목록을 그대로 둔다.
    }
  }, [roomId]);

  useEffect(() => subscribeRoomMessages(createClient(), roomId, reload), [roomId, reload]);

  // 새 메시지가 오면 아래로. 사용자가 위를 읽는 중일 수도 있어 부드럽게만 민다.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (body === "" || sending) return;

    setSending(true);
    setError(null);
    try {
      const saved = await sendMessage(createClient(), {
        roomId,
        body,
        // 재시도해도 같은 값이어야 중복이 걸러진다 — 전송마다 새로 만들지 않는다.
        clientMsgId: crypto.randomUUID(),
      });
      // 같은 id가 이미 있으면 갈아끼운다(실시간 이벤트가 먼저 도착했을 수 있다).
      setMessages((prev) =>
        prev.some((m) => m.id === saved.id) ? prev : [...prev, saved],
      );
      setDraft("");
    } catch (err) {
      const raw = err instanceof Error ? err.message : String(err);
      setError(pendingMigrationMessage(raw) ?? raw);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex h-[60vh] flex-col rounded-lg border border-border">
      <ul className="flex-1 space-y-2 overflow-y-auto p-3" aria-label="대화 내용">
        {messages.length === 0 ? (
          <li className="text-sm text-muted-foreground">아직 주고받은 말이 없어요.</li>
        ) : (
          messages.map((m) => {
            const mine = m.senderUserId === myUserId;
            return (
              <li key={m.id} className={mine ? "text-right" : "text-left"}>
                <span
                  className={`inline-block max-w-[80%] rounded-lg px-3 py-1.5 text-sm break-keep ${
                    mine ? "bg-primary text-primary-foreground" : "bg-muted"
                  } ${m.deletedAt ? "italic opacity-60" : ""}`}
                >
                  {/* 평문 렌더 — HTML로 그리지 않는다(에이전트 응답이 섞인다). */}
                  {messageBody(m)}
                </span>
              </li>
            );
          })
        )}
        <div ref={bottomRef} />
      </ul>

      {error && (
        <p role="alert" className="border-t border-border px-3 py-2 text-xs text-destructive break-keep">
          {error}
        </p>
      )}

      <form onSubmit={handleSend} className="flex gap-2 border-t border-border p-2">
        <label htmlFor="message-draft" className="sr-only">
          메시지 입력
        </label>
        <input
          id="message-draft"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="메시지를 입력하세요"
          maxLength={4000}
          className="flex-1 rounded-md border border-border bg-background px-3 py-1.5 text-sm"
        />
        <button
          type="submit"
          disabled={sending || draft.trim() === ""}
          className="rounded-md border border-border px-3 py-1.5 text-sm disabled:opacity-50"
        >
          {sending ? "보내는 중" : "보내기"}
        </button>
      </form>
    </div>
  );
}
