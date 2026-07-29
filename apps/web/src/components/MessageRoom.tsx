"use client";

// 2026-07-27 : 메신저 - 대화 화면 (Phase 50 T3·T4)
//
// **본문은 평문으로 렌더한다.** 계획(T4)이 못박은 대로다 — 이 방엔 사용자가 쓴 글뿐 아니라
// **에이전트(오리) 응답도 들어온다.** LLM 출력을 HTML로 그리면 그게 인젝션 표면이 된다.
// React가 기본으로 이스케이프하므로 `dangerouslySetInnerHTML`을 쓰지 않는 것이 곧 방어다.
//
// **낙관적 UI**: 보내면 즉시 목록에 붙인다. 그래서 중복이 생길 수 있고, 그 방어가
// `clientMsgId`다(같은 값으로 재시도하면 서버가 이미 저장한 것을 돌려준다).

import { Fragment, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import {
  coerceEventStart,
  createCalendarEvent,
  createMemo,
  createTodo,
  deleteMessage,
  downloadMessageImage,
  fetchAllRoomMessages,
  firstMessageOnOrAfter,
  listMessages,
  listMessagesBefore,
  listReactions,
  listRoomAttachments,
  listRoomLinkMessages,
  listRoomsWithPin,
  getMyMembership,
  markRead,
  messageImageUrl,
  setRoomMute,
  setRoomPin,
  toggleReaction,
  sendMessage,
  updateMessage,
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
  canEditMessage,
  canForwardMessage,
  codeFenceParts,
  conversionReceiptText,
  dayDivider,
  extractLinks,
  firstUnreadId,
  formatTranscript,
  formatTranscriptMarkdown,
  transcriptJson,
  matchSlashCommands,
  mergeMessages,
  parseSlashCommand,
  slashReceiptText,
  todoTitleFrom,
  transcriptFileName,
  galleryNav,
  galleryPaths,
  isNearBottom,
  kstDateString,
  linkifyParts,
  type Message,
  type TranscriptFormat,
  type Reaction,
  type ReadReceiptState,
} from "@ldd/core";
import { createClient } from "@/lib/supabase/client";
import { subscribeRoomMessages } from "@/lib/realtime";
import { notifyDuck } from "@/lib/notify";
import { loadDraft, saveDraft } from "@/lib/messageDraft";
import { isComposingEnter, shouldSendOnKey, type SendKeyMode } from "@/lib/composition";
import { getSendKeyMode } from "@/lib/sendKeyPref";
import { MessageImageViewer } from "@/components/MessageImageViewer";
import { EmojiPicker } from "@/components/EmojiPicker";

// "지금부터 ms 뒤"를 ISO로. **컴포넌트 밖에 둔다** — 렌더 중 현재 시각을 읽으면
// 결과가 다시 그릴 때마다 달라져 예측할 수 없다(React 순수성 규칙, 린트가 잡았다).
function muteUntilIso(ms: number): string {
  return new Date(Date.now() + ms).toISOString();
}

type Props = {
  roomId: string;
  initialMessages: Message[];
  myUserId: string;
  /** 검색에서 넘어온 "이 메시지로" 표적. 있으면 바닥 대신 그 메시지에서 시작한다. */
  focusId?: string | null;
};

export function MessageRoom({ roomId, initialMessages, myUserId, focusId = null }: Props) {
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
  // 표적이 있으면 "바닥 아님"으로 시작한다 — 아니면 마운트 스크롤이 표적을 지나쳐 바닥으로 간다.
  const atBottomRef = useRef(focusId === null);
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
  // 2026-07-29 : 메신저 - 메시지 수정 (Phase 51 T4 잔여)
  // 편집 중인 메시지와 그 임시 본문. 보내기 입력창(draft)과 섞지 않는다 —
  // 섞으면 수정 중에 새 말을 못 쓰고, 취소가 둘 중 무엇을 비울지 모호해진다.
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  // 2026-07-29 : 메신저 - 입력 임시저장 (Phase 54 선행)
  // 초안을 불러오기 전에 저장 효과가 빈 값으로 덮어쓰지 않도록 순서를 잠근다.
  const draftLoadedRef = useRef(false);
  // 2026-07-29 : 메신저 - 검색 원문 점프 (Phase 51 T3 잔여 L-003)
  // 반짝임 표시 중인 메시지. 표적이 로드 창 밖(최근 50개보다 오래됨)이면 안내를 띄운다 —
  // 조용히 바닥으로 가면 사용자는 점프가 고장 났다고 느낀다.
  const [flashId, setFlashId] = useState<string | null>(null);
  const [focusMissing, setFocusMissing] = useState(false);
  const focusDoneRef = useRef(false);
  // 2026-07-29 : 메신저 - 위로 스크롤 과거 로딩 (Phase 51 T3 후속)
  const [loadingOlder, setLoadingOlder] = useState(false);
  const loadingOlderRef = useRef(false); // 상태보다 먼저 잠근다 — 스크롤 이벤트는 몰려온다
  const reachedStartRef = useRef(false); // 빈 응답 = 처음까지 왔다. 더 묻지 않는다
  // 위에 이어 붙인 직후 스크롤 보정값. 안 하면 목록이 늘어난 만큼 화면이 아래로 밀린다.
  const anchorRef = useRef<{ prevHeight: number; prevTop: number } | null>(null);
  // 꼬리(마지막 메시지)가 바뀌었을 때만 "새 메시지" 처리 — 위에 이어 붙인 것은 새 도착이 아니다.
  const tailIdRef = useRef<string | null>(null);
  // 2026-07-29 : 메신저 - 메시지 전달 (Phase 54)
  // 전달할 메시지와 대상 방 목록. 사진은 경로가 방 스코프라 재사용할 수 없어
  // (버킷 정책이 경로 첫 칸으로 멤버를 판정한다) 받아서 대상 방으로 다시 올린다.
  const [forwarding, setForwarding] = useState<Message | null>(null);
  const [forwardRooms, setForwardRooms] = useState<
    Awaited<ReturnType<typeof listRoomsWithPin>> | "loading" | null
  >(null);
  const [forwardBusy, setForwardBusy] = useState(false);
  const [forwardNotice, setForwardNotice] = useState<string | null>(null);
  const forwardRef = useRef<HTMLDivElement>(null);
  // 이모지 피커(F-011). 페이지 아이콘과 같은 공용 컴포넌트 — "자주 쓰는" 목록도 공유된다.
  const [showEmoji, setShowEmoji] = useState(false);
  // 링크 모아보기(K-016). 감지는 말풍선과 같은 linkifyParts 한 벌(core extractLinks).
  const [links, setLinks] = useState<{ url: string; seq: number }[] | "loading" | null>(null);
  const linksRef = useRef<HTMLDivElement>(null);
  // 전송 키 설정(F-003). 방 진입 시 1회 읽는다 — 설정을 바꾸면 새로 연 화면부터 적용
  // (설정 화면에도 그렇게 안내한다).
  const sendKeyModeRef = useRef<SendKeyMode>("enter");

  const reload = useCallback(async () => {
    try {
      const fresh = await listMessages(createClient(), roomId);
      // **갈아치우지 않고 병합한다** — 옛 구간(검색 점프·위로 로딩)을 보는 중에
      // 실시간 이벤트가 와도 보던 자리가 사라지지 않는다. 겹치면 새 값이 이긴다(수정·삭제 반영).
      setMessages((prev) => mergeMessages(prev, fresh));
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

  /** 수정 저장. 갱신 행을 서버가 돌려주므로 그걸로 갈아끼운다("수정됨" 시각 포함). */
  async function handleEditSave() {
    if (!editing || savingEdit) return;
    const text = editing.text.trim();
    if (text === "") return; // 빈 수정은 저장하지 않는다 — 지우려면 삭제를 쓴다
    setSavingEdit(true);
    try {
      const saved = await updateMessage(createClient(), editing.id, text);
      setMessages((prev) => prev.map((m) => (m.id === saved.id ? saved : m)));
      setEditing(null);
    } catch (err) {
      const raw = err instanceof Error ? err.message : String(err);
      setError(pendingMigrationMessage(raw) ?? raw);
    } finally {
      setSavingEdit(false);
    }
  }

  // 2026-07-29 : 메신저 - 대화 내보내기 (Phase 55 T2 Q-001·Q-002)
  const [exporting, setExporting] = useState<TranscriptFormat | null>(null);

  // 형식마다 조립·MIME만 다르고 수집·정책(전부 읽기·삭제 문구·KST)은 한 벌이다.
  const TRANSCRIPT_FORMATS: Record<
    TranscriptFormat,
    { render: (all: Message[]) => string; mime: string }
  > = {
    txt: { render: (all) => formatTranscript(all, myUserId), mime: "text/plain;charset=utf-8" },
    md: {
      render: (all) => formatTranscriptMarkdown(all, myUserId),
      mime: "text/markdown;charset=utf-8",
    },
    json: { render: (all) => transcriptJson(all, myUserId), mime: "application/json" },
  };

  /**
   * 방 전체를 고른 형식으로 내려받는다. 화면 창(50개) 밖의 과거까지 **전부** 읽는다 —
   * 일부만 담고 "내보냈다"고 하면 안 된다. 수집은 백업(v5)과 같은 `fetchAllRoomMessages`
   * 한 경로다 — 경로가 갈라지면 "전부"의 기준도 갈라진다.
   */
  async function handleExport(format: TranscriptFormat) {
    if (exporting) return;
    setExporting(format);
    setError(null);
    try {
      const { messages: all } = await fetchAllRoomMessages(createClient(), roomId);
      const { render, mime } = TRANSCRIPT_FORMATS[format];
      const blob = new Blob([render(all)], { type: mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = transcriptFileName(null, kstDateString(new Date()), format);
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      const raw = err instanceof Error ? err.message : String(err);
      setError(pendingMigrationMessage(raw) ?? raw);
    } finally {
      setExporting(null);
    }
  }

  // 2026-07-29 : 메신저 - 날짜로 이동 (Phase 55 T4 E-039)
  // 표적 id만 찾고 점프는 기존 `?focus=` 경로에 맡긴다 — 주변 로딩·스크롤·강조가 이미 있다.
  const router = useRouter();
  const [jumpDate, setJumpDate] = useState("");
  const [jumping, setJumping] = useState(false);

  async function handleJumpToDate() {
    if (jumping || jumpDate === "") return;
    setJumping(true);
    setError(null);
    try {
      const target = await firstMessageOnOrAfter(createClient(), roomId, jumpDate);
      if (!target) {
        setError("그 날 이후 메시지가 없어요.");
        return;
      }
      router.push(`/messages/${roomId}?focus=${target.id}`);
    } catch (err) {
      const raw = err instanceof Error ? err.message : String(err);
      setError(pendingMigrationMessage(raw) ?? raw);
    } finally {
      setJumping(false);
    }
  }

  /** 전달 대상 고르기 열기. 방 목록을 그때 읽는다 — 새 방이 생겼어도 최신이 보이게. */
  async function openForward(m: Message) {
    setMenuFor(null);
    setForwarding(m);
    setForwardRooms("loading");
    try {
      const rooms = await listRoomsWithPin(createClient());
      // 지금 방은 뺀다. 같은 방으로 전달은 복사-붙여넣기지 전달이 아니다.
      setForwardRooms(rooms.filter((r) => r.id !== roomId));
    } catch (err) {
      setForwarding(null);
      setForwardRooms(null);
      const raw = err instanceof Error ? err.message : String(err);
      setError(pendingMigrationMessage(raw) ?? raw);
    }
  }

  async function handleForward(targetRoomId: string) {
    if (!forwarding || forwardBusy) return;
    setForwardBusy(true);
    try {
      const client = createClient();
      let attachmentPath: string | null = null;
      const srcPath = messageAttachment(forwarding);
      if (srcPath) {
        // 경로 재사용은 안 된다(방 스코프) — 원본을 받아 대상 방 몫으로 다시 올린다.
        const blob = await downloadMessageImage(client, srcPath);
        const copy = new Blob([blob], { type: blob.type || "image/webp" });
        attachmentPath = await uploadMessageImage(client, targetRoomId, copy, crypto.randomUUID());
      }
      await sendMessage(client, {
        roomId: targetRoomId,
        body: forwarding.body,
        clientMsgId: crypto.randomUUID(),
        attachmentPath,
      });
      setForwarding(null);
      setForwardRooms(null);
      setForwardNotice("전달했어요");
      setTimeout(() => setForwardNotice(null), 2500);
    } catch (err) {
      const raw = err instanceof Error ? err.message : String(err);
      setError(pendingMigrationMessage(raw) ?? raw);
    } finally {
      setForwardBusy(false);
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

  // 검색 표적으로 이동(1회). 렌더가 끝나야 요소가 있으므로 효과에서 찾는다.
  useEffect(() => {
    if (focusId === null || focusDoneRef.current) return;
    focusDoneRef.current = true;

    const el = document.getElementById(`msg-${focusId}`);
    if (!el) {
      // 최근 50개 창 밖(또는 삭제됨). 조용히 실패하지 않는다 — 옛 메시지 로딩은 별도 슬라이스.
      // eslint-disable-next-line react-hooks/set-state-in-effect -- DOM 존재 여부는 렌더 후에만 알 수 있다. 마운트 시 1회
      setFocusMissing(true);
      return;
    }
    el.scrollIntoView({ block: "center" });
    setFlashId(focusId);
    const t = setTimeout(() => setFlashId(null), 2500);
    return () => clearTimeout(t);
  }, [focusId]);

  // 전송 키 설정 읽기(1회). ref라 렌더에 영향 없다.
  useEffect(() => {
    sendKeyModeRef.current = getSendKeyMode();
  }, []);

  // 쓰다 만 초안 복원. 서버 렌더에는 localStorage가 없어 마운트 후에 읽는다 —
  // 초기값으로 읽으면 서버와 첫 화면이 달라진다(hydration 불일치).
  useEffect(() => {
    draftLoadedRef.current = false;
    const stored = loadDraft(roomId);
    if (stored !== "") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage는 렌더 중에 읽을 수 없다. 방 진입 시 1회 복원
      setDraft(stored);
    }
    draftLoadedRef.current = true;
  }, [roomId]);

  // 입력할 때마다 저장한다(작은 문자열 동기 쓰기라 디바운스가 필요할 무게가 아니다).
  // 보내고 비우면 빈 값 저장 → lib이 키를 지운다. 복원 전에는 쓰지 않는다(위 ref).
  useEffect(() => {
    if (!draftLoadedRef.current) return;
    saveDraft(roomId, draft);
  }, [draft, roomId]);

  // 2026-07-29 : 메신저 - 스크롤 - 읽는 중 보호 (Phase 51 T6)
  // **새 메시지가 왔다고 무조건 끌어내리지 않는다.** 위쪽 대화를 읽는 중에 화면이 튀면
  // 읽던 자리를 잃고, 그게 "스크롤이 이상하다"는 인상이 된다.
  // 바닥 근처면 따라 내려가고, 아니면 버튼으로 알린 뒤 사용자가 누를 때 내려간다.
  // **꼬리가 그대로면(위에 과거를 이어 붙인 경우) 새 도착이 아니다** — 아무것도 하지 않는다.
  useEffect(() => {
    const tail = messages[messages.length - 1]?.id ?? null;
    if (tail === tailIdRef.current) return;
    tailIdRef.current = tail;
    if (atBottomRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
      return;
    }
    setShowJump(true);
  }, [messages]);

  // 위에 이어 붙인 직후, 보던 메시지가 그 자리에 남도록 스크롤을 보정한다.
  // 그리기 전에 맞춰야 눈에 안 띈다 — 그래서 layout 효과다.
  useLayoutEffect(() => {
    const anchor = anchorRef.current;
    const el = listRef.current;
    if (!anchor || !el) return;
    anchorRef.current = null;
    el.scrollTop = el.scrollHeight - anchor.prevHeight + anchor.prevTop;
  }, [messages]);

  /** 위로 스크롤해 과거 조각을 불러온다. 빈 응답이면 처음까지 온 것 — 더 묻지 않는다. */
  async function loadOlder() {
    const el = listRef.current;
    const first = messages[0];
    if (!el || !first || loadingOlderRef.current || reachedStartRef.current) return;
    loadingOlderRef.current = true;
    setLoadingOlder(true);
    const prevHeight = el.scrollHeight;
    const prevTop = el.scrollTop;
    try {
      const older = await listMessagesBefore(createClient(), roomId, first.seq);
      if (older.length === 0) {
        reachedStartRef.current = true;
        return;
      }
      anchorRef.current = { prevHeight, prevTop };
      setMessages((prev) => mergeMessages(older, prev));
    } catch {
      // 과거 로딩 실패로 대화를 막지 않는다. 다시 스크롤하면 재시도된다.
    } finally {
      loadingOlderRef.current = false;
      setLoadingOlder(false);
    }
  }

  function handleListScroll() {
    const el = listRef.current;
    if (!el) return;
    const near = isNearBottom(el.scrollTop, el.clientHeight, el.scrollHeight);
    atBottomRef.current = near;
    // 바닥에 닿으면 알림 버튼은 할 일이 없다.
    if (near && showJump) setShowJump(false);
    // 꼭대기 근처면 과거를 이어 붙인다. 가드는 loadOlder 안에 있다(이벤트는 몰려온다).
    if (el.scrollTop <= 40) void loadOlder();
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

  // 전달 대상 고르기가 열리면 초점을 준다(같은 규칙).
  const forwardOpen = forwarding !== null;
  useEffect(() => {
    if (forwardOpen) forwardRef.current?.focus();
  }, [forwardOpen]);

  // 링크 모아보기가 열리면 초점을 준다(같은 규칙).
  const linksOpen = links !== null;
  useEffect(() => {
    if (linksOpen) linksRef.current?.focus();
  }, [linksOpen]);

  /** 링크 모아보기 열기. 서버는 넓게(%http%) 거르고 실제 추출은 core가 한다. */
  async function openLinks() {
    setLinks("loading");
    try {
      const rows = await listRoomLinkMessages(createClient(), roomId);
      setLinks(extractLinks(rows));
    } catch (err) {
      setLinks(null);
      const raw = err instanceof Error ? err.message : String(err);
      setError(pendingMigrationMessage(raw) ?? raw);
    }
  }

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
    // 2026-07-29 (K-008·K-009): canvas 재인코드는 EXIF를 통째로 버린다 — **촬영 위치(GPS)가
    // 서버에 올라가지 않는다**(확인: toBlob은 픽셀만 인코드한다). 다만 방향(orientation)도
    // EXIF에 있으므로 명시적으로 반영해 읽는다 — 안 하면 세로 사진이 눕는 브라우저가 있다.
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
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

  /**
   * 이미지 파일 하나를 줄여 올리고 메시지로 보낸다.
   * 파일 선택·붙여넣기·드래그가 **전부 이 한 경로**를 쓴다(F-006·F-007) —
   * 경로가 갈라지면 검사(형식·크기)도 갈라진다.
   */
  async function sendImageFile(file: File) {
    if (uploading) return;
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

  async function handlePickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // 같은 파일을 다시 고를 수 있게 값을 비운다(안 비우면 change가 안 온다).
    e.target.value = "";
    if (file) await sendImageFile(file);
  }

  // 2026-07-29 : 메신저 - 슬래시 커맨드 실행 (Phase 52 T2)
  // 파싱은 core(정규식·결정적), 실행은 기존 생성 함수. 성공하면 system 영수증을 남긴다.
  async function runSlashCommand(parsed: NonNullable<ReturnType<typeof parseSlashCommand>>) {
    if (!parsed.ok) {
      setError(parsed.error); // 보내지 않고 알려 준다 — "/할일"이 그냥 전송되면 이유를 모른다
      return;
    }
    setSending(true);
    setError(null);
    try {
      const client = createClient();
      const cmd = parsed.cmd;
      if (cmd.kind === "todo") {
        await createTodo(client, { title: cmd.title });
      } else {
        // KST 보정은 api의 기존 함수가 한다(오리 도구와 같은 경로 — 두 입구가 갈라지지 않는다).
        const startAt = coerceEventStart(cmd.time ? `${cmd.date}T${cmd.time}` : cmd.date);
        if (!startAt) throw new Error("일정 시각을 이해하지 못했어요.");
        await createCalendarEvent(client, { title: cmd.title, startAt, endAt: null });
      }
      const saved = await sendMessage(client, {
        roomId,
        body: slashReceiptText(cmd),
        clientMsgId: crypto.randomUUID(),
        type: "system",
      });
      setMessages((prev) => (prev.some((x) => x.id === saved.id) ? prev : [...prev, saved]));
      setDraft("");
    } catch (err) {
      const raw = err instanceof Error ? err.message : String(err);
      setError(pendingMigrationMessage(raw) ?? raw);
    } finally {
      setSending(false);
    }
  }

  /** 초안 전송. 폼 제출(버튼)과 키 판정(Enter/Ctrl+Enter)이 같은 경로를 쓴다. */
  async function submitDraft() {
    const body = draft.trim();
    if (body === "" || sending) return;

    // 커맨드면 메시지로 보내지 않고 실행한다.
    const parsed = parseSlashCommand(body);
    if (parsed !== null) {
      await runSlashCommand(parsed);
      return;
    }

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

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    await submitDraft();
  }

  // 목록 전체에 한 번만 계산한다 — 메시지마다 부르면 목록 길이의 제곱만큼 훑는다.
  const unreadId = firstUnreadId(messages, unreadAnchor, myUserId);

  return (
    <div
      className="flex h-[60vh] flex-col rounded-lg border border-border"
      // 드래그한 이미지를 놓으면 첨부로(F-007). 기본 동작(브라우저가 파일을 여는 것)을 막는다.
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes("Files")) e.preventDefault();
      }}
      onDrop={(e) => {
        const file = e.dataTransfer.files?.[0];
        if (file && file.type.startsWith("image/")) {
          e.preventDefault();
          void sendImageFile(file);
        }
      }}
    >
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
        <button
          type="button"
          onClick={() => void openLinks()}
          className="rounded border border-border px-2 py-0.5 hover:bg-accent"
        >
          링크 모아보기
        </button>
        {/* 형식별 버튼 — 음소거 기간 버튼과 같은 인라인 관례. 모달을 만들 만큼의 일이 아니다. */}
        <span className="text-muted-foreground">대화 내보내기</span>
        {(Object.keys(TRANSCRIPT_FORMATS) as TranscriptFormat[]).map((fmt) => (
          <button
            key={fmt}
            type="button"
            onClick={() => void handleExport(fmt)}
            disabled={exporting !== null}
            className="rounded border border-border px-2 py-0.5 hover:bg-accent disabled:opacity-50"
          >
            {exporting === fmt ? "내보내는 중" : `.${fmt}`}
          </button>
        ))}
        {/* 날짜로 이동 — 그 날(없으면 그 이후) 첫 메시지로 점프한다. */}
        <input
          type="date"
          value={jumpDate}
          onChange={(e) => setJumpDate(e.target.value)}
          aria-label="이동할 날짜"
          className="rounded border border-border bg-background px-1 py-0.5"
        />
        <button
          type="button"
          onClick={() => void handleJumpToDate()}
          disabled={jumping || jumpDate === ""}
          className="rounded border border-border px-2 py-0.5 hover:bg-accent disabled:opacity-50"
        >
          {jumping ? "찾는 중" : "날짜로 이동"}
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
        {loadingOlder && (
          <li className="py-1 text-center text-[11px] text-muted-foreground">
            이전 대화 불러오는 중
          </li>
        )}
        {/* 서버가 표적 주변을 실어 주므로(L-005) 여기 걸리는 건 그 사이 지워졌거나
            열 수 없게 된 경우다. 조용히 바닥으로 가면 점프가 고장 난 것처럼 보인다. */}
        {focusMissing && (
          <li role="status" className="rounded border border-border bg-muted/40 p-2 text-center text-xs text-muted-foreground break-keep">
            찾은 메시지를 열 수 없어요. 그 사이 지워졌을 수 있어요.
          </li>
        )}
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
              <li
                id={`msg-${m.id}`}
                className={`relative ${mine ? "text-right" : "text-left"} ${
                  flashId === m.id ? "rounded-lg ring-2 ring-primary" : ""
                }`}
              >
                {editing?.id === m.id ? (
                  /* 인라인 수정. Enter 저장 · Escape 취소 — 대화 흐름에서 벗어나지 않는다. */
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      void handleEditSave();
                    }}
                    className="inline-flex max-w-[80%] items-center gap-1"
                  >
                    <label htmlFor={`edit-${m.id}`} className="sr-only">
                      메시지 수정
                    </label>
                    <input
                      id={`edit-${m.id}`}
                      value={editing.text}
                      onChange={(e) => setEditing({ id: m.id, text: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === "Escape") setEditing(null);
                        // 조합 중 Enter로 수정이 저장되면 마지막 글자가 잘린다(X-017).
                        if (e.key === "Enter" && isComposingEnter(e.nativeEvent)) e.preventDefault();
                      }}
                      maxLength={4000}
                      autoFocus
                      className="flex-1 rounded-md border border-border bg-background px-2 py-1 text-sm"
                    />
                    <button
                      type="submit"
                      disabled={savingEdit || editing.text.trim() === ""}
                      className="rounded border border-border px-2 py-1 text-xs disabled:opacity-50"
                    >
                      {savingEdit ? "저장 중" : "저장"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditing(null)}
                      className="rounded border border-border px-2 py-1 text-xs"
                    >
                      취소
                    </button>
                  </form>
                ) : (
                <span
                  onContextMenu={(e) => {
                    if (m.deletedAt) return;
                    e.preventDefault();
                    setMenuFor(m.id);
                  }}
                  className={`inline-block max-w-[80%] rounded-lg px-3 py-1.5 text-sm break-keep whitespace-pre-wrap ${
                    mine ? "bg-primary text-primary-foreground" : "bg-muted"
                  } ${m.deletedAt ? "italic opacity-60" : ""}`}
                >
                  {/* 답장이면 원본을 먼저 보여 준다 — 무엇에 대한 말인지 알아야 읽힌다. */}
                  {m.replyToId && (
                    <span className="mb-0.5 block border-l-2 border-current pl-1 text-[10px] opacity-70">
                      {replyPreview(m.replyToId, messages)}
                    </span>
                  )}
                  {/* 평문 렌더 — HTML로 그리지 않는다(에이전트 응답이 섞인다).
                      코드 블록은 <pre>+복사(H-013), 글 조각만 링크화(javascript: 차단은 core). */}
                  {codeFenceParts(messageBody(m)).map((part, pi) =>
                    part.kind === "code" ? (
                      <span key={pi} className="block text-left">
                        <span className="flex items-center justify-between gap-2">
                          <span className="text-[10px] opacity-70">{part.lang ?? "코드"}</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              void handleCopy(part.text);
                            }}
                            className="rounded border border-current px-1 text-[10px] opacity-70 hover:opacity-100"
                          >
                            복사
                          </button>
                        </span>
                        <pre className="mt-0.5 max-w-full overflow-x-auto rounded bg-black/20 p-2 font-mono text-xs whitespace-pre">
                          {part.text}
                        </pre>
                      </span>
                    ) : (
                      <span key={pi}>
                        {linkifyParts(part.text).map((p, i) =>
                          p.href ? (
                            <a
                              key={i}
                              href={p.href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="underline break-all"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {p.text}
                            </a>
                          ) : (
                            <span key={i}>{p.text}</span>
                          ),
                        )}
                      </span>
                    ),
                  )}
                </span>
                )}
                {/* 수정 흔적. 없으면 읽은 사람이 본 것과 다른 말이 소리 없이 남는다(I-011). */}
                {m.editedAt && !m.deletedAt && editing?.id !== m.id && (
                  <span className="ml-1 text-[10px] text-muted-foreground">수정됨</span>
                )}

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
                    {/* 수정은 내 글 메시지만(판정은 core) — 눌러도 실패할 버튼은 애초에 안 보여 준다. */}
                    {canEditMessage(m, myUserId) && (
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setEditing({ id: m.id, text: m.body });
                          setMenuFor(null);
                        }}
                        className="px-3 py-1.5 text-xs hover:bg-accent"
                      >
                        수정
                      </button>
                    )}
                    {canForwardMessage(m) && (
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => void openForward(m)}
                        className="px-3 py-1.5 text-xs hover:bg-accent"
                      >
                        전달
                      </button>
                    )}
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

      {/* 링크 모아보기(K-016). 방에서 오간 URL을 최근 것부터, 같은 건 하나만. */}
      {links !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="링크 모아보기"
          tabIndex={-1}
          ref={linksRef}
          onKeyDown={(e) => {
            if (e.key === "Escape") setLinks(null);
          }}
          className="absolute inset-0 z-40 flex flex-col bg-background"
        >
          <div className="flex items-center justify-between border-b border-border px-3 py-2 text-sm">
            <span>링크 모아보기</span>
            <button
              type="button"
              onClick={() => setLinks(null)}
              aria-label="링크 모아보기 닫기"
              className="rounded border border-border px-2 py-0.5 text-xs hover:bg-accent"
            >
              닫기
            </button>
          </div>
          {links === "loading" ? (
            <p className="p-4 text-sm text-muted-foreground">링크를 모으는 중</p>
          ) : links.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">주고받은 링크가 없어요.</p>
          ) : (
            <ul className="flex-1 divide-y divide-border overflow-y-auto">
              {links.map((l) => (
                <li key={l.url}>
                  <a
                    href={l.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-3 text-sm underline break-all hover:bg-accent"
                  >
                    {l.url}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* 전달 대상 고르기(Phase 54). 방을 누르면 그 방으로 보낸다. */}
      {forwarding && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="전달할 방 고르기"
          tabIndex={-1}
          ref={forwardRef}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setForwarding(null);
              setForwardRooms(null);
            }
          }}
          className="absolute inset-0 z-40 flex flex-col bg-background"
        >
          <div className="flex items-center justify-between border-b border-border px-3 py-2 text-sm">
            <span>어느 방으로 전달할까요?</span>
            <button
              type="button"
              onClick={() => {
                setForwarding(null);
                setForwardRooms(null);
              }}
              aria-label="전달 취소"
              className="rounded border border-border px-2 py-0.5 text-xs hover:bg-accent"
            >
              취소
            </button>
          </div>
          {forwardRooms === "loading" || forwardRooms === null ? (
            <p className="p-4 text-sm text-muted-foreground">방 목록을 불러오는 중</p>
          ) : forwardRooms.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground break-keep">
              전달할 다른 방이 없어요. 방이 더 생기면 여기서 고를 수 있어요.
            </p>
          ) : (
            <ul className="flex-1 divide-y divide-border overflow-y-auto">
              {forwardRooms.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => void handleForward(r.id)}
                    disabled={forwardBusy}
                    className="w-full p-3 text-left text-sm hover:bg-accent disabled:opacity-50"
                  >
                    {r.title ?? (r.type === "agent" ? "오리와의 대화" : "이름 없는 대화")}
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

      {forwardNotice && (
        <p role="status" className="border-t border-border px-3 py-2 text-xs text-muted-foreground">
          {forwardNotice}
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

      {/* 슬래시 커맨드 자동완성(Phase 52 T2 F-021). 커맨드가 있는지 모르면 아무도 안 쓴다. */}
      {(() => {
        const matches = matchSlashCommands(draft);
        if (matches.length === 0) return null;
        return (
          <ul
            aria-label="커맨드 목록"
            className="border-t border-border px-2 py-1 text-xs"
          >
            {matches.map((c) => (
              <li key={c.name}>
                <button
                  type="button"
                  onClick={() => setDraft(`/${c.name} `)}
                  className="flex w-full gap-2 rounded px-2 py-1 text-left hover:bg-accent"
                >
                  <span className="font-medium whitespace-nowrap">{c.usage}</span>
                  <span className="text-muted-foreground">{c.desc}</span>
                </button>
              </li>
            ))}
          </ul>
        );
      })()}

      <form onSubmit={handleSend} className="relative flex gap-2 border-t border-border p-2">
        {/* 이모지 피커(F-011). 입력창 위로 뜬다 — 위치는 호출부가 정하는 계약. */}
        {showEmoji && (
          <EmojiPicker
            onSelect={(emoji) => {
              setDraft((d) => d + emoji);
              setShowEmoji(false);
            }}
            onClose={() => setShowEmoji(false)}
            className="absolute bottom-full left-2 z-20 mb-1"
          />
        )}
        <button
          type="button"
          onClick={() => setShowEmoji((o) => !o)}
          aria-expanded={showEmoji}
          aria-label="이모지 고르기"
          className="rounded-md border border-border px-2 py-1.5 text-sm"
        >
          🙂
        </button>
        <label htmlFor="message-draft" className="sr-only">
          메시지 입력
        </label>
        {/* textarea(F-001): 여러 줄 입력. 전송/줄바꿈 판정은 shouldSendOnKey 한 벌
            (설정 F-003 + IME 가드 X-017 포함) — 폼 암시 제출이 없어져 이 판정이 유일한 키 경로다. */}
        <textarea
          id="message-draft"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (
              shouldSendOnKey(sendKeyModeRef.current, {
                key: e.key,
                ctrlKey: e.ctrlKey,
                metaKey: e.metaKey,
                shiftKey: e.shiftKey,
                isComposing: e.nativeEvent.isComposing,
                keyCode: e.nativeEvent.keyCode,
              })
            ) {
              e.preventDefault();
              void submitDraft();
            }
          }}
          onPaste={(e) => {
            // 붙여넣은 것이 이미지면 첨부로(F-006). 글이면 평소대로 입력에 들어간다.
            const file = e.clipboardData.files?.[0];
            if (file && file.type.startsWith("image/")) {
              e.preventDefault();
              void sendImageFile(file);
            }
          }}
          placeholder="메시지를 입력하세요"
          maxLength={4000}
          rows={Math.min(4, draft.split("\n").length)}
          className="flex-1 resize-none rounded-md border border-border bg-background px-3 py-1.5 text-sm"
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
