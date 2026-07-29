"use client";

// 2026-07-29 : 메신저 - 노트에서 채팅 인용 삽입 (Phase 59 T1 S-008)
// 노트 에디터에서 방 → 최근 메시지를 골라 quote 블록으로 삽입한다.
// 조회는 전부 기존 API 한 벌(listRoomsWithPin·listMessages — RLS가 범위), 블록 조립은
// chatQuoteBlocks, 출처 라벨은 core quoteSourceLabel(내보내기와 같은 발화자·KST 판정).
// 지운 메시지·system 영수증은 목록에서 뺀다 — 안내 문구를 인용해 봐야 쓸모가 없다.
//
// 열릴 때마다 내부(Inner)를 새로 마운트한다 — 상태 리셋 effect가 필요 없어지고
// (react-hooks/set-state-in-effect), 닫힌 사이 생긴 방도 다음 열기에서 자연히 보인다.

import { useEffect, useState } from "react";
import type { PartialBlock } from "@blocknote/core";

import { listMessages, listRoomsWithPin, type RoomListItem } from "@ldd/api";
import {
  messageBody,
  quoteSourceLabel,
  roomDisplayTitle,
  kstTimeString,
  type Message,
} from "@ldd/core";
import { createClient } from "@/lib/supabase/client";
import { chatQuoteBlocks } from "@/lib/pageTemplates";
import { useModalA11y } from "@/hooks/useModalA11y";

type Props = {
  open: boolean;
  onClose: () => void;
  onInsert: (blocks: PartialBlock[]) => void;
};

export function ChatQuoteDialog({ open, onClose, onInsert }: Props) {
  if (!open) return null;
  return <ChatQuoteInner onClose={onClose} onInsert={onInsert} />;
}

function ChatQuoteInner({ onClose, onInsert }: Omit<Props, "open">) {
  const ref = useModalA11y<HTMLDivElement>(true, onClose);
  const [rooms, setRooms] = useState<RoomListItem[] | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    listRoomsWithPin(createClient())
      .then((r) => {
        if (alive) setRooms(r);
      })
      .catch((err) => {
        if (alive) setError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      alive = false;
    };
  }, []);

  async function pickRoom(id: string) {
    setRoomId(id);
    setMessages(null);
    setError(null);
    try {
      const all = await listMessages(createClient(), id);
      // 최신이 위 — 인용할 말은 대개 방금 나눈 말이다.
      setMessages(
        all.filter((m) => m.type === "text" && m.deletedAt === null).reverse(),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function pickMessage(m: Message) {
    try {
      const {
        data: { user },
      } = await createClient().auth.getUser();
      onInsert(
        chatQuoteBlocks(messageBody(m), quoteSourceLabel(m, user?.id ?? "")) as PartialBlock[],
      );
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="chat-quote-title"
        className="flex max-h-[70vh] w-full max-w-md flex-col rounded-xl border border-border bg-card p-5 shadow-lg outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="chat-quote-title" className="text-sm font-semibold">
          채팅 인용
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          {roomId === null ? "인용할 대화방을 고르세요." : "인용할 메시지를 고르세요."}
        </p>

        {error && (
          <p role="alert" className="mt-2 text-xs text-destructive break-keep">
            {error}
          </p>
        )}

        <div className="mt-3 flex-1 overflow-y-auto">
          {roomId === null ? (
            rooms === null && !error ? (
              <p className="text-xs text-muted-foreground">불러오는 중…</p>
            ) : rooms !== null && rooms.length === 0 ? (
              <p className="text-xs text-muted-foreground">대화방이 없어요.</p>
            ) : (
              <ul className="divide-y divide-border rounded-lg border border-border">
                {(rooms ?? []).map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => void pickRoom(r.id)}
                      className="block w-full p-2 text-left text-xs hover:bg-accent"
                    >
                      {roomDisplayTitle(r)}
                    </button>
                  </li>
                ))}
              </ul>
            )
          ) : messages === null && !error ? (
            <p className="text-xs text-muted-foreground">불러오는 중…</p>
          ) : messages !== null && messages.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              인용할 메시지가 없어요 (최근 메시지 기준).
            </p>
          ) : (
            <ul className="divide-y divide-border rounded-lg border border-border">
              {(messages ?? []).map((m) => (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => void pickMessage(m)}
                    className="block w-full p-2 text-left text-xs hover:bg-accent"
                  >
                    <span className="line-clamp-2">{messageBody(m)}</span>
                    <span className="mt-0.5 block text-[10px] text-muted-foreground">
                      {kstTimeString(m.createdAt)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-3 flex justify-between">
          {roomId !== null ? (
            <button
              type="button"
              onClick={() => {
                setRoomId(null);
                setMessages(null);
                setError(null);
              }}
              className="rounded-md border border-border px-3 py-1.5 text-xs hover:bg-accent"
            >
              방 다시 고르기
            </button>
          ) : (
            <span />
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-border px-3 py-1.5 text-xs hover:bg-accent"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
