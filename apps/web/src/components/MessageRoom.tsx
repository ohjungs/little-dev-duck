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

import {
  deleteMessage,
  listMessages,
  markRead,
  messageImageUrl,
  sendMessage,
  uploadMessageImage,
} from "@ldd/api";
import {
  checkMessageImage,
  messageAttachment,
  messageBody,
  pendingMigrationMessage,
  resizeTarget,
  afterSend,
  shouldFlushOnLeave,
  shouldSendRead,
  type Message,
  type ReadReceiptState,
} from "@ldd/core";
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
  // 2026-07-27 : 메신저 - 메시지 메뉴 (Phase 50 T5)
  // 열린 메뉴의 메시지 id. **우클릭만으로 여는 메뉴는 키보드 사용자에게 없는 기능**이라
  // 눈에 보이는 버튼을 함께 둔다(계획이 "접근성이 가장 잘 빠지는 자리"라고 짚었다).
  const [menuFor, setMenuFor] = useState<string | null>(null);
  // 서명 URL은 만료된다(1시간). 그래서 **저장하지 않고 화면에 있는 동안만** 들고 있는다.
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  // 2026-07-27 : 메신저 - 읽음 보내기 (Phase 51 T1)
  // 보낸 위치를 ref로 든다 — 상태로 두면 갱신할 때마다 다시 그려지고, 이 값은 화면에 안 쓰인다.
  const readRef = useRef<ReadReceiptState>({ sentSeq: null, sentAt: null });

  const reload = useCallback(async () => {
    try {
      setMessages(await listMessages(createClient(), roomId));
    } catch {
      // 실시간 갱신 실패는 화면을 죽이지 않는다 — 이미 있는 목록을 그대로 둔다.
    }
  }, [roomId]);

  useEffect(() => subscribeRoomMessages(createClient(), roomId, reload), [roomId, reload]);

  // 메뉴는 Escape로 닫힌다. 열어 두고 나갈 방법이 없으면 갇힌 느낌이 든다.
  useEffect(() => {
    if (menuFor === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuFor(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuFor]);

  async function handleCopy(text: string) {
    setMenuFor(null);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // 클립보드는 권한·보안 컨텍스트에 따라 막힌다. 조용히 실패했다고 하지 않는다.
      setError("복사하지 못했어요. 직접 선택해 복사해 주세요.");
    }
  }

  async function handleDelete(id: string) {
    setMenuFor(null);
    try {
      await deleteMessage(createClient(), id);
      // 낙관적으로 화면에서 먼저 가린다 — 본문은 서버에 남고 자리도 남는다(소프트 삭제).
      setMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, deletedAt: new Date().toISOString() } : m)),
      );
    } catch (err) {
      const raw = err instanceof Error ? err.message : String(err);
      setError(pendingMigrationMessage(raw) ?? raw);
    }
  }

  // 첨부가 있는 메시지의 서명 URL을 채운다. **이미 받은 것은 다시 요청하지 않는다** —
  // 메시지가 올 때마다 전부 다시 만들면 요청이 목록 길이만큼 반복된다.
  useEffect(() => {
    const missing = messages
      .map((m) => messageAttachment(m))
      .filter((p): p is string => p !== null && !(p in imageUrls));
    if (missing.length === 0) return;

    let alive = true;
    void (async () => {
      const client = createClient();
      const pairs = await Promise.all(
        missing.map(async (path) => [path, await messageImageUrl(client, path)] as const),
      );
      if (!alive) return;
      setImageUrls((prev) => {
        const next = { ...prev };
        for (const [path, url] of pairs) if (url) next[path] = url;
        return next;
      });
    })();
    return () => {
      alive = false;
    };
  }, [messages, imageUrls]);

  // 읽음 위치를 보낸다. **판정은 core가 하고 여기서는 실행만** 한다 —
  // 조건을 화면에 흩어 두면 어디선가 한 곳이 빠져 실시간 예산을 태운다.
  // 마지막 메시지가 내 것이면 보낼 이유가 없다(내가 쓴 걸 읽었다고 알릴 필요는 없다).
  useEffect(() => {
    const last = messages[messages.length - 1];
    if (!last || last.senderUserId === myUserId) return;

    const send = async () => {
      if (!shouldSendRead(readRef.current, last.seq, Date.now())) return;
      readRef.current = afterSend(last.seq, Date.now());
      try {
        await markRead(createClient(), roomId, last.id);
      } catch {
        // 읽음 기록 실패로 대화를 막지 않는다. 다음 판정 때 다시 시도된다.
      }
    };
    void send();

    // 떠날 때 한 번 더 — 놓치면 다음에 들어왔을 때 "분명히 읽었는데 뱃지가 그대로"가 된다.
    return () => {
      if (!shouldFlushOnLeave(readRef.current, last.seq)) return;
      readRef.current = afterSend(last.seq, Date.now());
      void markRead(createClient(), roomId, last.id).catch(() => {});
    };
  }, [messages, myUserId, roomId]);

  // 새 메시지가 오면 아래로. 사용자가 위를 읽는 중일 수도 있어 부드럽게만 민다.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  /**
   * 보내기 전에 브라우저에서 줄인다. **스토리지가 1GB뿐이라 리사이즈는 생존 조건**이라고
   * 계획이 못박았다. 원본을 그대로 올리면 사진 몇백 장에 가득 찬다.
   * 줄이지 못하면(캔버스 실패 등) **원본으로 올리지 않고 멈춘다** — 상한을 조용히 넘기지 않는다.
   */
  async function shrink(file: File): Promise<Blob> {
    const bitmap = await createImageBitmap(file);
    const { width, height } = resizeTarget(bitmap.width, bitmap.height);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("이미지를 줄이지 못했어요.");
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", 0.85),
    );
    if (!blob) throw new Error("이미지를 줄이지 못했어요.");
    return blob;
  }

  async function handlePickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // 같은 파일을 다시 고를 수 있게 값을 비운다(안 비우면 change가 안 온다).
    e.target.value = "";
    if (!file) return;

    const check = checkMessageImage({ type: file.type, size: file.size });
    if (!check.ok) {
      setError(check.reason);
      return;
    }

    setUploading(true);
    setError(null);
    try {
      const shrunk = await shrink(file);
      const client = createClient();
      const path = await uploadMessageImage(
        client,
        roomId,
        Object.assign(shrunk, { type: "image/webp", size: shrunk.size }),
        crypto.randomUUID(),
      );
      // 본문이 비면 목록 미리보기와 알림이 빈칸이 된다 — 무엇이 왔는지 한 줄은 남긴다.
      const saved = await sendMessage(client, {
        roomId,
        body: "사진",
        clientMsgId: crypto.randomUUID(),
        attachmentPath: path,
      });
      setMessages((prev) => (prev.some((m) => m.id === saved.id) ? prev : [...prev, saved]));
    } catch (err) {
      const raw = err instanceof Error ? err.message : String(err);
      setError(pendingMigrationMessage(raw) ?? raw);
    } finally {
      setUploading(false);
    }
  }

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
              <li key={m.id} className={`relative ${mine ? "text-right" : "text-left"}`}>
                <span
                  onContextMenu={(e) => {
                    if (m.deletedAt) return;
                    e.preventDefault();
                    setMenuFor(m.id);
                  }}
                  className={`inline-block max-w-[80%] rounded-lg px-3 py-1.5 text-sm break-keep ${
                    mine ? "bg-primary text-primary-foreground" : "bg-muted"
                  } ${m.deletedAt ? "italic opacity-60" : ""}`}
                >
                  {/* 평문 렌더 — HTML로 그리지 않는다(에이전트 응답이 섞인다). */}
                  {messageBody(m)}
                </span>

                {(() => {
                  const path = messageAttachment(m);
                  if (!path) return null;
                  const url = imageUrls[path];
                  // 주소를 아직 못 받았거나 못 만들었으면 자리만 남긴다 —
                  // 사진 한 장 때문에 대화가 안 보이면 안 된다.
                  return url ? (
                    <div className="mt-1">
                      {/* eslint-disable-next-line @next/next/no-img-element -- 서명 URL은 만료되는 임시 주소라 next/image 최적화 대상이 아니다(Phase 39의 sharp 면제 전제도 지킨다). */}
                      <img
                        src={url}
                        alt="첨부 이미지"
                        className="inline-block max-h-60 max-w-[80%] rounded-lg border border-border"
                      />
                    </div>
                  ) : (
                    <div className="mt-1 text-xs text-muted-foreground">사진을 불러오는 중</div>
                  );
                })()}

                {!m.deletedAt && (
                  <button
                    type="button"
                    onClick={() => setMenuFor(menuFor === m.id ? null : m.id)}
                    aria-expanded={menuFor === m.id}
                    aria-label="메시지 메뉴 열기"
                    className="ml-1 rounded px-1 text-xs text-muted-foreground hover:text-foreground"
                  >
                    ...
                  </button>
                )}

                {menuFor === m.id && (
                  <div
                    role="menu"
                    aria-label="메시지 메뉴"
                    className="absolute right-0 z-10 mt-1 flex flex-col rounded-md border border-border bg-background text-left shadow-lg"
                  >
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => handleCopy(m.body)}
                      className="px-3 py-1.5 text-xs hover:bg-accent"
                    >
                      복사
                    </button>
                    {/* 삭제는 보낸 사람만 — 정책도 그렇게 막혀 있어 남의 것에 보여 주면 눌러도 실패한다. */}
                    {mine && (
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => handleDelete(m.id)}
                        className="px-3 py-1.5 text-xs text-destructive hover:bg-accent"
                      >
                        삭제
                      </button>
                    )}
                  </div>
                )}
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
        <label className="cursor-pointer rounded-md border border-border px-3 py-1.5 text-sm">
          {uploading ? "올리는 중" : "사진"}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            onChange={handlePickImage}
            disabled={uploading}
            className="sr-only"
          />
        </label>
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
