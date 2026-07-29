"use client";

// 2026-07-27 : 메신저 - 대화 화면 (Phase 50 T3·T4)
//
// **본문은 평문으로 렌더한다.** 계획(T4)이 못박은 대로다 — 이 방엔 사용자가 쓴 글뿐 아니라
// **에이전트(오리) 응답도 들어온다.** LLM 출력을 HTML로 그리면 그게 인젝션 표면이 된다.
// React가 기본으로 이스케이프하므로 `dangerouslySetInnerHTML`을 쓰지 않는 것이 곧 방어다.
//
// **낙관적 UI**: 보내면 즉시 목록에 붙인다. 그래서 중복이 생길 수 있고, 그 방어가
// `clientMsgId`다(같은 값으로 재시도하면 서버가 이미 저장한 것을 돌려준다).

import { Fragment, useCallback, useEffect, useRef, useState } from "react";

import {
  createMemo,
  createTodo,
  deleteMessage,
  downloadMessageImage,
  listMessages,
  listReactions,
  listRoomAttachments,
  getMyMembership,
  markRead,
  messageImageUrl,
  setRoomMute,
  setRoomPin,
  toggleReaction,
  sendMessage,
  uploadMessageImage,
} from "@ldd/api";
import {
  checkMessageImage,
  messageAttachment,
  messageBody,
  replyPreview,
  summarizeReactions,
  REACTION_EMOJIS,
  pendingMigrationMessage,
  resizeTarget,
  afterSend,
  shouldFlushOnLeave,
  shouldSendRead,
  isRoomMuted,
  MUTE_DURATIONS,
  attachmentDeleted,
  conversionReceiptText,
  dayDivider,
  firstUnreadId,
  todoTitleFrom,
  galleryNav,
  galleryPaths,
  isNearBottom,
  kstDateString,
  type Message,
  type Reaction,
  type ReadReceiptState,
} from "@ldd/core";
import { createClient } from "@/lib/supabase/client";
import { subscribeRoomMessages } from "@/lib/realtime";
import { notifyDuck } from "@/lib/notify";
import { MessageImageViewer } from "@/components/MessageImageViewer";

// "지금부터 ms 뒤"를 ISO로. **컴포넌트 밖에 둔다** — 렌더 중 현재 시각을 읽으면
// 결과가 다시 그릴 때마다 달라져 예측할 수 없다(React 순수성 규칙, 린트가 잡았다).
function muteUntilIso(ms: number): string {
  return new Date(Date.now() + ms).toISOString();
}

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
  // 2026-07-27 : 메신저 - 알림 (Phase 51 T2)
  // 이미 알린 위치. **첫 렌더의 과거 메시지로 알림을 쏘지 않으려고** null로 시작하지 않고
  // 처음 본 순간의 seq로 채운다 — 방에 들어가자마자 지난 대화가 알림으로 쏟아지면 안 된다.
  const notifiedSeqRef = useRef<number | null>(null);
  // 음소거는 "언제까지"로 저장한다. 화면에서도 그 값을 그대로 들고 판정만 core에 맡긴다.
  const [mutedUntil, setMutedUntil] = useState<string | null>(null);
  // 렌더 중에 현재 시각을 읽지 않는다. 대신 상태로 두고 **만료되면 스스로 풀리게** 한다 —
  // 타이머가 없으면 화면을 새로 열기 전까지 "꺼짐"으로 남아 있다.
  const [muted, setMuted] = useState(false);
  const [pinnedAt, setPinnedAt] = useState<string | null>(null);
  // 답장 대상. 보내고 나면 비운다 — 안 비우면 다음 말도 계속 답장이 된다.
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  // 2026-07-29 : 메신저 - 구분선·스크롤 (Phase 51 T6)
  // 오늘 날짜(KST)는 렌더 중에 읽지 않는다(순수성). 채워지기 전에는 구분선이 "오늘" 대신
  // 날짜를 그대로 적는데, 틀린 말이 아니라서 깜빡여도 해가 없다.
  const [todayKey, setTodayKey] = useState("");
  // **들어온 순간의 읽음 위치**를 붙잡아 둔다. 읽음 표시는 들어가자마자 갱신되므로
  // 서버 값을 계속 따라가면 구분선이 뜨자마자 사라진다 — "어디까지 읽었는지"를 못 보게 된다.
  const [unreadAnchor, setUnreadAnchor] = useState<string | null>(null);
  const listRef = useRef<HTMLUListElement>(null);
  // 바닥 근처인지. 상태로 두면 스크롤할 때마다 다시 그린다 — 이 값은 아래 효과에서만 읽는다.
  const atBottomRef = useRef(true);
  const [showJump, setShowJump] = useState(false);
  // 2026-07-29 : 메신저 - 전체화면 뷰어 (Phase 51 T5)
  // 열려 있는 사진의 경로. null이면 닫힘. 순서·양옆 판정은 core가 한다.
  const [viewerPath, setViewerPath] = useState<string | null>(null);
  // 뷰어가 오가는 경로 목록. **연 자리에 따라 다르다** — 대화에서 열면 지금 창의 사진들,
  // 모아보기에서 열면 방 전체 사진들. 하나로 합치면 옛 사진에서 이전/다음이 끊긴다.
  const [viewerPaths, setViewerPaths] = useState<string[]>([]);
  const [downloading, setDownloading] = useState(false);
  // 방 전체 사진 모아보기. null이면 닫힘, 로딩 중엔 빈 배열과 구분해야 해서 "loading".
  const [gallery, setGallery] = useState<string[] | "loading" | null>(null);
  const galleryRef = useRef<HTMLDivElement>(null);

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

  // 2026-07-29 : 메신저 - 메시지를 워크스페이스로 (Phase 52 T1)
  // **생성 로직을 재구현하지 않는다** — 할 일·메모를 만드는 그 함수(createTodo·createMemo)를
  // 그대로 부른다(계획: 재구현은 인벤토리 위반). 생성은 되돌릴 수 있어 승인 카드 없이 바로 한다.
  // 변환 뒤 방에 system 영수증을 남긴다 — 표시가 없으면 같은 메시지를 두 번 변환한다.
  async function handleConvert(m: Message, kind: "todo" | "memo") {
    setMenuFor(null);
    try {
      const client = createClient();
      if (kind === "todo") {
        await createTodo(client, { title: todoTitleFrom(messageBody(m)) });
      } else {
        await createMemo(client, { content: messageBody(m) });
      }
      const saved = await sendMessage(client, {
        roomId,
        body: conversionReceiptText(kind, messageBody(m)),
        clientMsgId: crypto.randomUUID(),
        type: "system",
      });
      setMessages((prev) => (prev.some((x) => x.id === saved.id) ? prev : [...prev, saved]));
    } catch (err) {
      const raw = err instanceof Error ? err.message : String(err);
      setError(pendingMigrationMessage(raw) ?? raw);
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

  // 반응을 한 번에 불러온다. 메시지마다 부르면 왕복이 목록 길이만큼 늘어난다.
  useEffect(() => {
    if (messages.length === 0) return;
    let alive = true;
    void listReactions(createClient(), messages.map((m) => m.id)).then((rs) => {
      if (alive) setReactions(rs);
    });
    return () => {
      alive = false;
    };
  }, [messages]);

  async function handleReact(messageId: string, emoji: string) {
    try {
      await toggleReaction(createClient(), reactions, messageId, emoji);
      setReactions(await listReactions(createClient(), messages.map((m) => m.id)));
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

  useEffect(() => {
    const now = Date.now();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 현재 시각은 렌더 중에 읽을 수 없다(순수성). mutedUntil이 바뀔 때만 1회 동기화
    setMuted(isRoomMuted(mutedUntil, now));
    if (!mutedUntil) return;
    const remain = Date.parse(mutedUntil) - now;
    if (Number.isNaN(remain) || remain <= 0) return;
    // 아주 먼 미래("직접 풀 때까지")면 타이머를 걸지 않는다 — setTimeout 상한을 넘으면
    // 즉시 발화해 방금 끈 알림이 바로 켜진다.
    if (remain > 2 ** 31 - 1) return;
    const id = setTimeout(() => setMuted(false), remain);
    return () => clearTimeout(id);
  }, [mutedUntil]);

  // 내 멤버 정보(음소거)를 한 번 읽는다. 실패해도 대화는 열려야 하므로 조용히 넘긴다.
  useEffect(() => {
    let alive = true;
    void getMyMembership(createClient(), roomId).then((m) => {
      if (alive && m) {
        setMutedUntil(m.mutedUntil);
        setPinnedAt(m.pinnedAt);
        // 여기서 한 번만 잡는다. 이후 읽음 표시가 나가도 이 값은 그대로 둔다.
        setUnreadAnchor(m.lastReadMessageId);
      }
    });
    return () => {
      alive = false;
    };
  }, [roomId]);

  // 새 메시지 알림. **재구현하지 않는다** — `notifyDuck`이 권한·방해금지·집중 모드·
  // 하루 상한을 이미 다 본다(계획 T2: 두 벌로 만들면 한쪽만 방해금지를 지킨다).
  //
  // 보고 있는 창에는 띄우지 않는다. 눈앞의 대화를 알림으로 또 알리면 성가시기만 하다.
  useEffect(() => {
    const last = messages[messages.length - 1];
    if (!last) return;

    // 처음 본 순간을 기준점으로 잡는다(과거 대화가 알림으로 쏟아지지 않게).
    if (notifiedSeqRef.current === null) {
      notifiedSeqRef.current = last.seq;
      return;
    }
    if (last.seq <= notifiedSeqRef.current) return;
    notifiedSeqRef.current = last.seq;

    if (last.senderUserId === myUserId) return; // 내가 쓴 걸 나에게 알리지 않는다
    if (typeof document !== "undefined" && !document.hidden) return;
    if (muted) return; // 이 방만 조용히

    notifyDuck("새 메시지", messageBody(last));
  }, [messages, myUserId, muted]);

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

  // 오늘이 며칠인지는 한 번만 정한다(KST). 자정을 넘겨 방을 켜 둔 경우는
  // 구분선 문구가 하루 늦게 갱신되는데, 그걸 맞추자고 타이머를 두지는 않는다.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 현재 시각은 렌더 중에 읽을 수 없다(순수성). 마운트 시 1회
    setTodayKey(kstDateString(new Date()));
  }, []);

  // 2026-07-29 : 메신저 - 스크롤 - 읽는 중 보호 (Phase 51 T6)
  // **새 메시지가 왔다고 무조건 끌어내리지 않는다.** 위쪽 대화를 읽는 중에 화면이 튀면
  // 읽던 자리를 잃고, 그게 "스크롤이 이상하다"는 인상이 된다.
  // 바닥 근처면 따라 내려가고, 아니면 버튼으로 알린 뒤 사용자가 누를 때 내려간다.
  useEffect(() => {
    if (atBottomRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
      return;
    }
    setShowJump(true);
  }, [messages.length]);

  function handleListScroll() {
    const el = listRef.current;
    if (!el) return;
    const near = isNearBottom(el.scrollTop, el.clientHeight, el.scrollHeight);
    atBottomRef.current = near;
    // 바닥에 닿으면 알림 버튼은 할 일이 없다.
    if (near && showJump) setShowJump(false);
  }

  function jumpToBottom() {
    atBottomRef.current = true;
    setShowJump(false);
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }

  // 보는 중에 그 사진이 지워지면(실시간 삭제) 뷰어를 닫는다 — 지운 사진이 계속 떠 있으면
  // 지운 사람에게 안 지워진 것이다. **지워진 것으로 확인된 때만** 닫는다(core 판정) —
  // 창 밖이라 모르는 옛 사진(모아보기에서 연 것)을 모른다고 닫으면 안 된다.
  useEffect(() => {
    if (viewerPath === null) return;
    if (attachmentDeleted(messages, viewerPath)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- 삭제는 실시간 구독으로 도착한다. 이벤트 핸들러에서 알 수 있는 일이 아니다
      setViewerPath(null);
    }
  }, [viewerPath, messages]);

  /** 아직 주소 없는 경로들의 서명 URL을 받아 채운다(인라인 효과와 같은 병합 방식). */
  const fillUrls = useCallback(async (paths: string[]) => {
    const missing = paths.filter((p) => !(p in imageUrls));
    if (missing.length === 0) return;
    const client = createClient();
    const pairs = await Promise.all(
      missing.map(async (p) => [p, await messageImageUrl(client, p)] as const),
    );
    setImageUrls((prev) => {
      const next = { ...prev };
      for (const [p, u] of pairs) if (u) next[p] = u;
      return next;
    });
  }, [imageUrls]);

  // 모아보기가 열리거나 위의 뷰어가 닫히면 초점을 모아보기로 — Escape가 계속 먹게.
  // 인라인 콜백 ref로 매 렌더 focus하면 뷰어가 초점을 뺏겨 화살표 키가 죽는다.
  const galleryOpen = gallery !== null;
  useEffect(() => {
    if (galleryOpen && !viewerPath) galleryRef.current?.focus();
  }, [galleryOpen, viewerPath]);

  /** 방 전체 사진 모아보기 열기. 실패하면 안내하고 닫는다 — 빈 격자를 성공처럼 두지 않는다. */
  async function openGallery() {
    setGallery("loading");
    try {
      const paths = await listRoomAttachments(createClient(), roomId);
      setGallery(paths);
      void fillUrls(paths);
    } catch (err) {
      setGallery(null);
      const raw = err instanceof Error ? err.message : String(err);
      setError(pendingMigrationMessage(raw) ?? raw);
    }
  }

  /** 원본 저장. Blob URL(같은 출처)로 받아야 저장이 된다 — api 주석 참조. */
  async function handleDownload() {
    if (!viewerPath || downloading) return;
    setDownloading(true);
    try {
      const blob = await downloadMessageImage(createClient(), viewerPath);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = viewerPath.split("/").pop() ?? "image.webp";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      // 오류 안내는 뷰어 뒤에 가려진다 — 닫아서 보이게 한다. 조용한 실패보다 낫다.
      setViewerPath(null);
      const raw = err instanceof Error ? err.message : String(err);
      setError(pendingMigrationMessage(raw) ?? raw);
    } finally {
      setDownloading(false);
    }
  }

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

  async function handleMute(ms: number | null) {
    // null이면 해제. 그 외엔 "지금부터 ms 뒤까지".
    const until = ms === null ? null : muteUntilIso(ms);
    const prev = mutedUntil;
    setMutedUntil(until); // 낙관적으로 먼저 바꾼다 — 버튼이 즉시 반응해야 눌린 게 보인다
    try {
      await setRoomMute(createClient(), roomId, until);
    } catch (err) {
      setMutedUntil(prev); // 실패하면 되돌린다. 껐다고 생각했는데 알림이 오면 더 나쁘다
      const raw = err instanceof Error ? err.message : String(err);
      setError(pendingMigrationMessage(raw) ?? raw);
    }
  }

  async function handlePin() {
    const next = pinnedAt ? null : new Date().toISOString();
    const prev = pinnedAt;
    setPinnedAt(next);
    try {
      await setRoomPin(createClient(), roomId, next);
    } catch (err) {
      setPinnedAt(prev);
      const raw = err instanceof Error ? err.message : String(err);
      setError(pendingMigrationMessage(raw) ?? raw);
    }
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
        replyToId: replyTo?.id ?? null,
      });
      setReplyTo(null);
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

  // 목록 전체에 한 번만 계산한다 — 메시지마다 부르면 목록 길이의 제곱만큼 훑는다.
  const unreadId = firstUnreadId(messages, unreadAnchor, myUserId);

  return (
    <div className="flex h-[60vh] flex-col rounded-lg border border-border">
      {/* 2026-07-27 (Phase 51 T2): 방별 음소거. **"언제까지"를 고르게 한다** —
          켜짐/꺼짐만 두면 "1시간만 조용히"를 표현할 수 없다. */}
      <div className="flex flex-wrap items-center gap-1 border-b border-border p-2 text-xs">
        {/* 고정은 목록 순서를 바꾼다 — 그 사실을 버튼 문구로 말한다. */}
        <button
          type="button"
          onClick={handlePin}
          className="rounded border border-border px-2 py-0.5 hover:bg-accent"
        >
          {pinnedAt ? "목록 고정 해제" : "목록 위에 고정"}
        </button>
        <button
          type="button"
          onClick={() => void openGallery()}
          className="rounded border border-border px-2 py-0.5 hover:bg-accent"
        >
          사진 모아보기
        </button>
        {muted ? (
          <>
            <span className="text-muted-foreground">이 방 알림이 꺼져 있어요</span>
            <button
              type="button"
              onClick={() => handleMute(null)}
              className="rounded border border-border px-2 py-0.5 hover:bg-accent"
            >
              알림 켜기
            </button>
          </>
        ) : (
          <>
            <span className="text-muted-foreground">알림 끄기</span>
            {MUTE_DURATIONS.map((d) => (
              <button
                key={d.label}
                type="button"
                onClick={() => handleMute(d.ms)}
                className="rounded border border-border px-2 py-0.5 hover:bg-accent"
              >
                {d.label}
              </button>
            ))}
          </>
        )}
      </div>

      <div className="relative flex-1 overflow-hidden">
      <ul
        ref={listRef}
        onScroll={handleListScroll}
        className="h-full space-y-2 overflow-y-auto p-3"
        aria-label="대화 내용"
      >
        {messages.length === 0 ? (
          <li className="text-sm text-muted-foreground">아직 주고받은 말이 없어요.</li>
        ) : (
          messages.map((m, i) => {
            const mine = m.senderUserId === myUserId;
            // 날짜 경계는 KST로 나눈다(core). 화면에서 날짜를 비교하면 기기 시간대에 따라
            // 구분선이 다른 자리에 생긴다.
            const divider = dayDivider(messages[i - 1]?.createdAt ?? null, m.createdAt, todayKey);
            const unreadHere = m.id === unreadId;
            return (
              <Fragment key={m.id}>
              {/* 선은 장식이라 숨기고 날짜 글자만 읽히게 둔다. role="separator"를 주면
                  구분선 자체가 구조물로 읽혀 **안의 날짜가 안 읽히는** 리더가 있다. */}
              {divider && (
                <li className="flex items-center gap-2 py-1 text-center">
                  <span aria-hidden className="h-px flex-1 bg-border" />
                  <span className="text-[11px] text-muted-foreground">{divider}</span>
                  <span aria-hidden className="h-px flex-1 bg-border" />
                </li>
              )}
              {unreadHere && (
                <li className="flex items-center gap-2 py-1">
                  <span aria-hidden className="h-px flex-1 bg-primary/50" />
                  <span className="text-[11px] text-primary">여기까지 읽었어요</span>
                  <span aria-hidden className="h-px flex-1 bg-primary/50" />
                </li>
              )}
              {m.type === "system" ? (
                // 변환 영수증 같은 기록. 말풍선이 아니라 회색 안내줄 — 메뉴도 반응도 없다.
                <li className="py-0.5 text-center text-[11px] text-muted-foreground break-keep">
                  {messageBody(m)}
                </li>
              ) : (
              <li className={`relative ${mine ? "text-right" : "text-left"}`}>
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
                  {/* 답장이면 원본을 먼저 보여 준다 — 무엇에 대한 말인지 알아야 읽힌다. */}
                  {m.replyToId && (
                    <span className="mb-0.5 block border-l-2 border-current pl-1 text-[10px] opacity-70">
                      {replyPreview(m.replyToId, messages)}
                    </span>
                  )}
                  {/* 평문 렌더 — HTML로 그리지 않는다(에이전트 응답이 섞인다). */}
                  {messageBody(m)}
                </span>

                {/* 달린 반응 — 다시 누르면 해제된다는 걸 테두리로 보여 준다. */}
                {(() => {
                  const summary = summarizeReactions(reactions, m.id, myUserId);
                  if (summary.length === 0) return null;
                  return (
                    <div className="mt-0.5 flex flex-wrap gap-1">
                      {summary.map((s2) => (
                        <button
                          key={s2.emoji}
                          type="button"
                          onClick={() => void handleReact(m.id, s2.emoji)}
                          aria-label={`${s2.emoji} ${s2.count}개${s2.mine ? ", 내가 달았음" : ""}`}
                          className={`rounded-full border px-1.5 text-[11px] ${
                            s2.mine ? "border-primary" : "border-border"
                          }`}
                        >
                          {s2.emoji} {s2.count}
                        </button>
                      ))}
                    </div>
                  );
                })()}

                {(() => {
                  const path = messageAttachment(m);
                  if (!path) return null;
                  const url = imageUrls[path];
                  // 주소를 아직 못 받았거나 못 만들었으면 자리만 남긴다 —
                  // 사진 한 장 때문에 대화가 안 보이면 안 된다.
                  return url ? (
                    <div className="mt-1">
                      {/* 누르면 전체화면. 링크 아닌 버튼 — 페이지 이동이 아니라 화면 상태다. */}
                      <button
                        type="button"
                        onClick={() => {
                          // 대화에서 열면 지금 창의 사진들 사이를 오간다.
                          setViewerPaths(galleryPaths(messages));
                          setViewerPath(path);
                        }}
                        aria-label="사진 크게 보기"
                        className="cursor-zoom-in"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element -- 서명 URL은 만료되는 임시 주소라 next/image 최적화 대상이 아니다(Phase 39의 sharp 면제 전제도 지킨다). */}
                        <img
                          src={url}
                          alt="첨부 이미지"
                          className="inline-block max-h-60 max-w-full rounded-lg border border-border"
                        />
                      </button>
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
                    <div className="flex gap-0.5 border-b border-border px-1 py-1">
                      {REACTION_EMOJIS.map((e) => (
                        <button
                          key={e}
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setMenuFor(null);
                            void handleReact(m.id, e);
                          }}
                          aria-label={`${e} 반응 달기`}
                          className="rounded px-1 text-sm hover:bg-accent"
                        >
                          {e}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setReplyTo(m);
                        setMenuFor(null);
                      }}
                      className="px-3 py-1.5 text-xs hover:bg-accent"
                    >
                      답장
                    </button>
                    {/* 워크스페이스로 변환(Phase 52 T1). 생성은 되돌릴 수 있어 바로 실행한다. */}
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => void handleConvert(m, "todo")}
                      className="px-3 py-1.5 text-xs hover:bg-accent"
                    >
                      할 일로 만들기
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => void handleConvert(m, "memo")}
                      className="px-3 py-1.5 text-xs hover:bg-accent"
                    >
                      메모로 저장
                    </button>
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
              )}
              </Fragment>
            );
          })
        )}
        <div ref={bottomRef} />
      </ul>

      {/* 방 전체 사진 모아보기(Phase 51 T5). 뷰어(z-50)보다 아래라 썸네일을 누르면 위로 뜬다. */}
      {gallery !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="사진 모아보기"
          tabIndex={-1}
          ref={galleryRef}
          onKeyDown={(e) => {
            if (e.key === "Escape" && !viewerPath) setGallery(null);
          }}
          className="absolute inset-0 z-40 flex flex-col bg-background"
        >
          <div className="flex items-center justify-between border-b border-border px-3 py-2 text-sm">
            <span>사진 모아보기</span>
            <button
              type="button"
              onClick={() => setGallery(null)}
              aria-label="모아보기 닫기"
              className="rounded border border-border px-2 py-0.5 text-xs hover:bg-accent"
            >
              닫기
            </button>
          </div>
          {gallery === "loading" ? (
            <p className="p-4 text-sm text-muted-foreground">사진 목록을 불러오는 중</p>
          ) : gallery.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">주고받은 사진이 없어요.</p>
          ) : (
            <ul className="grid flex-1 grid-cols-3 gap-1 overflow-y-auto p-2 sm:grid-cols-4">
              {/* 최근 것을 먼저 보여 준다 — 찾는 사진은 대개 최근 것이다. 뷰어 순서는 대화 순서 그대로. */}
              {[...gallery].reverse().map((p) => (
                <li key={p}>
                  <button
                    type="button"
                    onClick={() => {
                      setViewerPaths(gallery);
                      setViewerPath(p);
                    }}
                    aria-label="사진 크게 보기"
                    className="block aspect-square w-full overflow-hidden rounded border border-border"
                  >
                    {imageUrls[p] ? (
                      // eslint-disable-next-line @next/next/no-img-element -- 서명 URL은 만료되는 임시 주소라 next/image 최적화 대상이 아니다.
                      <img src={imageUrls[p]} alt="첨부 이미지" className="size-full object-cover" />
                    ) : (
                      <span className="flex size-full items-center justify-center text-[10px] text-muted-foreground">
                        불러오는 중
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* 전체화면 뷰어. 열림 상태·순서 판정은 위에서 — 이 컴포넌트는 그리기만 한다. */}
      {viewerPath && (
        <MessageImageViewer
          url={imageUrls[viewerPath] ?? null}
          nav={galleryNav(viewerPaths, viewerPath)}
          onNavigate={setViewerPath}
          onClose={() => setViewerPath(null)}
          onDownload={() => void handleDownload()}
          downloading={downloading}
        />
      )}

      {/* 위쪽을 읽는 중에 새 말이 오면 여기로 알린다. 안 알리면 아래에 뭐가 온 줄 모른다. */}
      {showJump && (
        <button
          type="button"
          onClick={jumpToBottom}
          className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full border border-border bg-background px-3 py-1 text-xs shadow-md hover:bg-accent"
        >
          새 메시지 ↓
        </button>
      )}
      </div>

      {error && (
        <p role="alert" className="border-t border-border px-3 py-2 text-xs text-destructive break-keep">
          {error}
        </p>
      )}

      {replyTo && (
        <div className="flex items-center gap-2 border-t border-border px-2 py-1 text-xs">
          <span className="truncate text-muted-foreground">
            답장: {replyPreview(replyTo.id, messages)}
          </span>
          <button
            type="button"
            onClick={() => setReplyTo(null)}
            aria-label="답장 취소"
            className="ml-auto rounded border border-border px-2 py-0.5"
          >
            취소
          </button>
        </div>
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
