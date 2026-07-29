// 2026-07-27 : 메신저 - 방·메시지 접근 (Phase 50 T2·T3)
//
// 계획의 판단을 그대로 지킨다:
//   - **새 실시간 배관을 만들지 않는다.** `lib/realtime.ts`의 `subscribeTable`을 위젯 5개가
//     이미 쓰고, 마이그레이션이 messages·room_members를 publication에 얹었다.
//   - 중복 전송은 `client_msg_id` 유니크가 마지막으로 막는다. 여기서는 그 충돌을
//     **에러가 아니라 "이미 보낸 그 메시지"로 되돌려 준다** — 재시도한 사용자에게
//     "실패했습니다"를 보여 주면 같은 말을 두 번 쓰게 된다.
//   - 순서는 서버가 부여한 `seq`로만 매긴다. 클라이언트 시각으로 정렬하지 않는다.

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  shouldRemoveReaction,
  likePattern,
  mergeAroundWindow,
  mergeMessages,
  kstDayRange,
  sortRooms,
  unreadCount,
  checkMessageImage,
  messageAttachmentPath,
  messageSchema,
  roomSchema,
  type Message,
  type MessageSearchFilter,
  type Reaction,
  type Room,
  type RoomType,
} from "@ldd/core";

type RoomRow = {
  id: string;
  type: RoomType;
  title: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

type MessageRow = {
  id: string;
  room_id: string;
  sender_user_id: string | null;
  sender_type: "user" | "agent";
  type: "text" | "system";
  body: string;
  client_msg_id: string;
  seq: number;
  attachment_path: string | null;
  reply_to_id: string | null;
  edited_at?: string | null;
  deleted_at: string | null;
  created_at: string;
};

function roomFromRow(row: RoomRow): Room {
  return roomSchema.parse({
    id: row.id,
    type: row.type,
    title: row.title,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

function messageFromRow(row: MessageRow): Message {
  return messageSchema.parse({
    id: row.id,
    roomId: row.room_id,
    senderUserId: row.sender_user_id,
    senderType: row.sender_type,
    type: row.type,
    body: row.body,
    clientMsgId: row.client_msg_id,
    seq: Number(row.seq),
    attachmentPath: row.attachment_path,
    replyToId: row.reply_to_id,
    // 마이그레이션 적용 전 행에는 컬럼이 없다 — 그때는 "수정된 적 없음"이 맞다.
    editedAt: row.edited_at ?? null,
    deletedAt: row.deleted_at,
    createdAt: row.created_at,
  });
}

// 한 번에 불러오는 메시지 상한. 방을 열면 최근 것부터 본다 —
// 전부 불러오면 오래된 방일수록 열기가 느려진다(계획의 대용량 렌즈).
export const MESSAGE_PAGE_SIZE = 50;

// 안 읽은 수를 셀 때 훑는 최근 메시지 개수. **이 창 밖은 못 센다** —
// 방마다 count 쿼리를 돌리면 방 개수만큼 왕복이 생겨서, 한 번에 받아 방별로 나눈다.
// 창을 넘길 만큼 안 읽었으면 어차피 "많다"만 알면 된다(화면이 99+로 줄여 보여 준다).
export const RECENT_WINDOW = 500;

// 방 목록 조회 상한. 백업이 이 값으로 "잘렸을 수 있음"을 판정하므로 숫자를 한 곳에 둔다.
export const ROOM_LIST_LIMIT = 200;

export async function listRooms(supabase: SupabaseClient): Promise<Room[]> {
  const { data, error } = await supabase
    .from("rooms")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(ROOM_LIST_LIMIT);

  if (error) throw new Error(error.message);
  return (data as RoomRow[]).map(roomFromRow);
}

/**
 * 방의 최근 메시지. **seq 역순으로 가져와 오래된 순으로 뒤집어 돌려준다** —
 * 화면은 위에서 아래로 읽으므로 정렬을 화면에 맡기면 화면마다 달라진다.
 */
export async function listMessages(
  supabase: SupabaseClient,
  roomId: string,
  limit: number = MESSAGE_PAGE_SIZE,
): Promise<Message[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("room_id", roomId)
    .order("seq", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data as MessageRow[]).map(messageFromRow).reverse();
}

// 2026-07-29 : 메신저 - 링크 모아보기 (Phase 55 T3 K-016)
/**
 * 링크가 있을 법한 메시지를 불러온다. 서버 필터는 **고정 패턴** '%http%'라 사용자 입력이
 * 닿지 않는다(넓게 걸러도 실제 URL 추출은 core `extractLinks`가 한다 — 가짜 히트는
 * 링크가 안 나와 자연히 떨어진다). 최신부터 상한까지 — 아주 옛 링크는 안 나온다(정직한 한계).
 */
export async function listRoomLinkMessages(
  supabase: SupabaseClient,
  roomId: string,
  limit: number = GALLERY_LIMIT,
): Promise<Message[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("room_id", roomId)
    .ilike("body", "%http%")
    .is("deleted_at", null)
    .order("seq", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return ((data ?? []) as MessageRow[]).map(messageFromRow);
}

// 2026-07-29 : 메신저 - 위로 스크롤 과거 로딩 (Phase 51 T3 후속)
/**
 * 이 seq **이전** 조각을 불러온다(위로 스크롤). 최신순으로 잘라 받아 오래된 순으로 돌려준다 —
 * 앞에 이어 붙이면 바로 화면 순서가 된다. 빈 배열이면 처음까지 온 것이다.
 */
export async function listMessagesBefore(
  supabase: SupabaseClient,
  roomId: string,
  beforeSeq: number,
  limit: number = MESSAGE_PAGE_SIZE,
): Promise<Message[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("room_id", roomId)
    .lt("seq", beforeSeq)
    .order("seq", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return ((data ?? []) as MessageRow[]).map(messageFromRow).reverse();
}

// 2026-07-29 : 메신저 - 방 전체 메시지 수집 (Phase 55 T2 — 내보내기·백업 공용)
/** 방당 왕복 가드. 50개씩 100회 = 방당 5,000개. 닿으면 hitGuard로 알린다. */
export const FETCH_ALL_MAX_ROUNDS = 100;

/**
 * 방의 메시지를 처음까지 **전부** 읽는다. 대화 내보내기(.txt)와 백업이 같은 경로를 쓴다 —
 * 경로가 갈라지면 "전부"의 기준도 갈라진다. 상한은 무한 루프 방지 가드고, 닿으면
 * hitGuard=true로 돌려 호출부가 "잘렸을 수 있음"을 사용자에게 전하게 한다(조용히 자르지 않는다).
 */
export async function fetchAllRoomMessages(
  supabase: SupabaseClient,
  roomId: string,
): Promise<{ messages: Message[]; hitGuard: boolean }> {
  let all = await listMessages(supabase, roomId);
  for (let i = 0; i < FETCH_ALL_MAX_ROUNDS; i++) {
    const first = all[0];
    if (!first) return { messages: all, hitGuard: false };
    const older = await listMessagesBefore(supabase, roomId, first.seq);
    if (older.length === 0) return { messages: all, hitGuard: false };
    all = mergeMessages(older, all);
  }
  return { messages: all, hitGuard: true };
}

// 2026-07-29 : 메신저 - 표적 주변 로딩 (Phase 51 T3 잔여 L-005)
/**
 * 표적 메시지 **주변 창**을 불러온다(검색 점프용). 표적이 최근 페이지 밖에 있어도
 * 그 자리의 대화 맥락이 보이게 한다. 표적을 찾지 못하면(삭제·권한 밖) null —
 * 호출부가 평소 목록으로 폴백한다. 병합·순서는 core `mergeAroundWindow` 계약을 따른다.
 */
export async function listMessagesAround(
  supabase: SupabaseClient,
  roomId: string,
  messageId: string,
  half: number = Math.floor(MESSAGE_PAGE_SIZE / 2),
): Promise<Message[] | null> {
  const { data: targetRows, error: targetError } = await supabase
    .from("messages")
    .select("seq")
    .eq("room_id", roomId)
    .eq("id", messageId)
    .limit(1);
  if (targetError) throw new Error(targetError.message);
  const target = (targetRows as { seq: number }[] | null)?.[0];
  if (!target) return null;

  const [beforeRes, afterRes] = await Promise.all([
    supabase
      .from("messages")
      .select("*")
      .eq("room_id", roomId)
      .lt("seq", target.seq)
      .order("seq", { ascending: false })
      .limit(half),
    supabase
      .from("messages")
      .select("*")
      .eq("room_id", roomId)
      .gte("seq", target.seq)
      .order("seq", { ascending: true })
      .limit(half),
  ]);
  if (beforeRes.error) throw new Error(beforeRes.error.message);
  if (afterRes.error) throw new Error(afterRes.error.message);

  return mergeAroundWindow(
    ((beforeRes.data ?? []) as MessageRow[]).map(messageFromRow),
    ((afterRes.data ?? []) as MessageRow[]).map(messageFromRow),
  );
}

export type SendMessageInput = {
  roomId: string;
  body: string;
  /** 낙관적 UI가 만든 식별자. 재시도해도 같은 값을 보내야 중복이 걸러진다. */
  clientMsgId: string;
  /** 첨부 이미지의 스토리지 경로. 먼저 올린 뒤 그 경로를 넘긴다. */
  attachmentPath?: string | null;
  /** 답장 대상 메시지 id. 같은 방의 것이어야 한다(다른 방 id는 RLS에 막혀 미리보기가 빈다). */
  replyToId?: string | null;
  /**
   * 메시지 종류. 기본 "text". "system"은 변환 영수증처럼 **화면이 회색 안내줄로 그리는**
   * 기록용이다 — 말풍선이 아니라서 보낸 사람 표시도 메뉴도 없다.
   */
  type?: "text" | "system";
};

// Postgres 유니크 위반. PostgREST가 그대로 흘려 준다.
const UNIQUE_VIOLATION = "23505";

/**
 * 메시지를 보낸다. 같은 `clientMsgId`로 다시 보내면 **이미 저장된 그 메시지**를 돌려준다.
 *
 * 재시도는 반드시 일어난다(네트워크가 끊겼는데 서버엔 이미 도착한 경우). 그때 에러를
 * 던지면 사용자는 실패한 줄 알고 다시 쓰게 되고, 화면엔 같은 말이 두 번 남는다.
 */
export async function sendMessage(
  supabase: SupabaseClient,
  input: SendMessageInput,
): Promise<Message> {
  const body = input.body.trim();
  if (body === "") throw new Error("빈 메시지는 보낼 수 없습니다.");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("로그인이 필요합니다.");

  const { data, error } = await supabase
    .from("messages")
    .insert({
      room_id: input.roomId,
      sender_user_id: user.id,
      sender_type: "user",
      type: input.type ?? "text",
      body,
      client_msg_id: input.clientMsgId,
      attachment_path: input.attachmentPath ?? null,
      reply_to_id: input.replyToId ?? null,
    })
    .select()
    .single();

  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      const existing = await findByClientMsgId(supabase, input.roomId, input.clientMsgId);
      // 유니크 위반인데 찾지 못하는 건 우리가 모르는 상태다. 조용히 성공으로 만들지 않는다.
      if (existing) return existing;
    }
    throw new Error(error.message);
  }
  return messageFromRow(data as MessageRow);
}

async function findByClientMsgId(
  supabase: SupabaseClient,
  roomId: string,
  clientMsgId: string,
): Promise<Message | null> {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("room_id", roomId)
    .eq("client_msg_id", clientMsgId)
    .limit(1);

  if (error || !data || (data as MessageRow[]).length === 0) return null;
  return messageFromRow((data as MessageRow[])[0]!);
}

/**
 * 메시지를 지운다. **행을 지우지 않고 `deleted_at`만 찍는다**(소프트 삭제) —
 * 자리를 남겨야 "무슨 말이 있었는데 사라졌다"는 사실이 보인다.
 * 본문은 그대로 두고 화면에서 가린다: 하드 삭제는 정리 잡에서만 한다는 계약이라
 * 여기서 본문을 지우면 되돌릴 수 없다.
 */
export async function deleteMessage(
  supabase: SupabaseClient,
  id: string,
): Promise<void> {
  const { error } = await supabase
    .from("messages")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw new Error(error.message);
}

// 2026-07-29 : 메신저 - 메시지 수정 (Phase 51 T4 잔여 I-010·I-011)
/**
 * 본문을 고치고 수정 시각을 남긴다. **흔적 없이 바꾸지 않는다** — "수정됨" 표시의 근거.
 * 소유 검사는 RLS가 하고, 지운 메시지는 조건으로 막는다(0행이면 single()이 오류를 내
 * **조용히 성공한 척하지 않는다**). 갱신된 행을 돌려줘 화면이 그대로 갈아끼운다.
 */
export async function updateMessage(
  supabase: SupabaseClient,
  id: string,
  body: string,
): Promise<Message> {
  const trimmed = body.trim();
  if (trimmed === "") throw new Error("빈 내용으로 고칠 수 없습니다. 삭제를 쓰세요.");
  if ([...trimmed].length > 4000) throw new Error("메시지는 4000자까지예요.");

  const { data, error } = await supabase
    .from("messages")
    .update({ body: trimmed, edited_at: new Date().toISOString() })
    .eq("id", id)
    .is("deleted_at", null)
    .select()
    .single();

  if (error || !data) throw new Error(error?.message ?? "메시지를 고치지 못했어요.");
  return messageFromRow(data as MessageRow);
}

/**
 * 읽음 위치를 옮긴다. **뒤로 되돌리지 않는다** — 실시간 이벤트가 순서 없이 도착하면
 * 오래된 메시지 id로 덮어써 안 읽은 수가 되살아날 수 있다.
 * 어느 쪽이 뒤인지는 seq로 판정한다(시각이 아니라).
 */
export async function markRead(
  supabase: SupabaseClient,
  roomId: string,
  messageId: string,
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("로그인이 필요합니다.");

  const current = await currentReadSeq(supabase, roomId, user.id);
  if (current !== null) {
    const next = await seqOf(supabase, messageId);
    // 이미 더 뒤를 읽었으면 아무것도 하지 않는다. 되돌리면 안 읽은 수가 되살아난다.
    if (next !== null && next <= current) return;
  }

  const { error } = await supabase
    .from("room_members")
    .update({ last_read_message_id: messageId })
    .eq("room_id", roomId)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);
}

/** 지금 읽음 위치가 가리키는 메시지의 seq. 읽은 적 없거나 찾지 못하면 null. */
async function currentReadSeq(
  supabase: SupabaseClient,
  roomId: string,
  userId: string,
): Promise<number | null> {
  const { data, error } = await supabase
    .from("room_members")
    .select("last_read_message_id")
    .eq("room_id", roomId)
    .eq("user_id", userId)
    .limit(1);

  if (error || !data) return null;
  const rows = data as { last_read_message_id: string | null }[];
  const id = rows[0]?.last_read_message_id ?? null;
  if (!id) return null;
  return seqOf(supabase, id);
}

async function seqOf(supabase: SupabaseClient, messageId: string): Promise<number | null> {
  const { data, error } = await supabase
    .from("messages")
    .select("seq")
    .eq("id", messageId)
    .limit(1);

  if (error || !data) return null;
  const rows = data as { seq: number }[];
  return rows[0] ? Number(rows[0].seq) : null;
}

// ---------------------------------------------------------------------------
// 이미지 첨부
// ---------------------------------------------------------------------------
const BUCKET = "message-attachments";

/**
 * 이미지를 올리고 **경로**를 돌려준다. URL이 아니다 —
 * 버킷이 비공개라 URL엔 서명이 붙고 만료된다. 만료된 URL을 저장하면 나중에 안 열린다.
 *
 * 경로 첫 칸이 방 id여야 버킷 정책이 멤버를 판정할 수 있다(`messageAttachmentPath`).
 */
export async function uploadMessageImage(
  supabase: SupabaseClient,
  roomId: string,
  file: Blob & { type: string; size: number },
  fileId: string,
): Promise<string> {
  const check = checkMessageImage({ type: file.type, size: file.size });
  // 화면에서 이미 걸렀더라도 여기서 한 번 더 본다 — 이 함수를 다른 곳에서 부를 수 있다.
  if (!check.ok) throw new Error(check.reason);

  const ext = file.type.split("/")[1] ?? "png";
  const path = messageAttachmentPath(roomId, fileId, ext);
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
    // 덮어쓰기를 막는다. 버킷 정책도 update를 열지 않았다 —
    // 덮어쓸 수 있으면 남이 이미 본 이미지가 뒤바뀐다.
    upsert: false,
  });
  if (error) throw new Error(error.message);
  return path;
}

/** 이미지를 볼 수 있는 임시 주소. 기본 1시간 — 대화를 보는 동안 충분하고, 새면 곧 만료된다. */
export const SIGNED_URL_SECONDS = 3600;

export async function messageImageUrl(
  supabase: SupabaseClient,
  path: string,
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, SIGNED_URL_SECONDS);
  // 주소를 못 만들어도 대화는 계속 보여야 한다 — 사진 한 장 때문에 화면을 죽이지 않는다.
  if (error || !data) return null;
  return data.signedUrl;
}

/**
 * 이 방에서 주고받은 사진 경로 전부(모아보기). **화면의 메시지 창은 최근 일부만 들고 있어서**
 * 거기서 뽑으면 옛 사진이 빠진다 — 그래서 따로 조회한다. 지운 메시지의 사진은 제외.
 *
 * 최신 것부터 상한까지만 받고 **오래된 순으로 돌려준다** — 뷰어의 이전/다음이
 * 대화 순서와 같아야 헷갈리지 않는다. 상한을 넘는 아주 옛 사진은 모아보기에 안 나온다(정직한 한계).
 */
export const GALLERY_LIMIT = 500;

export async function listRoomAttachments(
  supabase: SupabaseClient,
  roomId: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("attachment_path, seq")
    .eq("room_id", roomId)
    .not("attachment_path", "is", null)
    .is("deleted_at", null)
    .order("seq", { ascending: false })
    .limit(GALLERY_LIMIT);
  if (error || !data) throw new Error(error?.message ?? "사진 목록을 불러오지 못했어요.");
  const rows = data as { attachment_path: string | null; seq: number }[];
  return rows
    .filter((r): r is { attachment_path: string; seq: number } => r.attachment_path !== null)
    .sort((a, b) => a.seq - b.seq)
    .map((r) => r.attachment_path);
}

/**
 * 이미지 원본을 Blob으로 내려받는다(전체화면 뷰어의 저장 버튼).
 * **서명 URL에 `download` 속성을 붙이는 방식은 안 된다** — 다른 출처라 브라우저가
 * 속성을 무시하고 이미지로 이동해 버린다. SDK로 받아 Blob URL(같은 출처)로 저장한다.
 */
export async function downloadMessageImage(
  supabase: SupabaseClient,
  path: string,
): Promise<Blob> {
  const { data, error } = await supabase.storage.from(BUCKET).download(path);
  if (error || !data) throw new Error(error?.message ?? "이미지를 내려받지 못했어요.");
  return data;
}

// ---------------------------------------------------------------------------
// 방 음소거
// ---------------------------------------------------------------------------
/**
 * 이 방에서의 내 멤버 정보(읽음 위치·음소거·고정). 없으면 null —
 * **멤버가 아니면 null이지 오류가 아니다**(정책이 안 보이게 막으므로 빈 결과가 정상이다).
 */
export async function getMyMembership(
  supabase: SupabaseClient,
  roomId: string,
): Promise<{ mutedUntil: string | null; lastReadMessageId: string | null; pinnedAt: string | null } | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("room_members")
    .select("muted_until, last_read_message_id, pinned_at")
    .eq("room_id", roomId)
    .eq("user_id", user.id)
    .limit(1);

  if (error || !data) return null;
  const rows = data as {
    muted_until: string | null;
    last_read_message_id: string | null;
    pinned_at: string | null;
  }[];
  const row = rows[0];
  if (!row) return null;
  return {
    mutedUntil: row.muted_until,
    lastReadMessageId: row.last_read_message_id,
    pinnedAt: row.pinned_at,
  };
}

/**
 * 음소거를 설정하거나(시각) 푼다(null).
 * **"언제까지"를 저장한다** — 켜짐/꺼짐으로 두면 "1시간만"을 표현할 수 없고,
 * 시간이 지났을 때 풀어 줄 주체가 없다(무료 원칙상 서버 스케줄러가 없다).
 */
export async function setRoomMute(
  supabase: SupabaseClient,
  roomId: string,
  mutedUntil: string | null,
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("로그인이 필요합니다.");

  const { error } = await supabase
    .from("room_members")
    .update({ muted_until: mutedUntil })
    .eq("room_id", roomId)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);
}

/** 방 + 내 고정 여부. 목록 화면이 쓰는 형태다. */
export type RoomListItem = Room & {
  pinnedAt: string | null;
  lastActivity: number;
  /** 안 읽은 개수. 아래 창(RECENT_WINDOW) 안에서만 세므로 그보다 많으면 창 크기에서 멈춘다. */
  unread: number;
};

/**
 * 고정한 방을 위에 둔 목록. **정렬은 core `sortRooms`가 한다** —
 * 화면마다 따로 정렬하면 목록이 화면마다 달라진다.
 *
 * 쿼리를 둘로 나눈다(방 · 내 멤버십). 조인 한 번보다 왕복이 하나 늘지만,
 * 방 200개 상한에서는 차이가 없고 **정책이 다른 두 테이블을 한 쿼리에 묶지 않는 편이 안전**하다.
 */
export async function listRoomsWithPin(supabase: SupabaseClient): Promise<RoomListItem[]> {
  const rooms = await listRooms(supabase);
  if (rooms.length === 0) return [];

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pins = new Map<string, string | null>();
  const reads = new Map<string, string | null>();
  if (user) {
    const { data } = await supabase
      .from("room_members")
      .select("room_id, pinned_at, last_read_message_id")
      .eq("user_id", user.id);
    for (const row of (data ?? []) as {
      room_id: string;
      pinned_at: string | null;
      last_read_message_id: string | null;
    }[]) {
      pins.set(row.room_id, row.pinned_at);
      reads.set(row.room_id, row.last_read_message_id);
    }
  }

  // 안 읽은 수: **쿼리 한 번**으로 최근 메시지를 받아 방별로 센다.
  // 방마다 count 쿼리를 돌리면 방 개수만큼 왕복이 생긴다(방 200개면 200번).
  // 대신 창(window) 밖은 못 센다 — 그건 아래 주석과 타입에 적어 두었다.
  const recent = new Map<string, { id: string; seq: number; senderUserId: string | null; deletedAt: string | null }[]>();
  if (user) {
    const { data } = await supabase
      .from("messages")
      .select("id, room_id, seq, sender_user_id, deleted_at")
      .order("seq", { ascending: false })
      .limit(RECENT_WINDOW);
    for (const row of (data ?? []) as {
      id: string;
      room_id: string;
      seq: number;
      sender_user_id: string | null;
      deleted_at: string | null;
    }[]) {
      const list = recent.get(row.room_id) ?? [];
      list.push({
        id: row.id,
        seq: Number(row.seq),
        senderUserId: row.sender_user_id,
        deletedAt: row.deleted_at,
      });
      recent.set(row.room_id, list);
    }
  }

  return sortRooms(
    rooms.map((r) => ({
      ...r,
      pinnedAt: pins.get(r.id) ?? null,
      unread: unreadCount(recent.get(r.id) ?? [], reads.get(r.id) ?? null, user?.id ?? null),
      // updated_at을 활동 시각으로 쓴다(메시지 삽입 트리거가 갱신한다).
      // 해석 실패는 0으로 — 정렬 하나 때문에 목록이 죽으면 안 된다.
      lastActivity: Number.isNaN(Date.parse(r.updatedAt)) ? 0 : Date.parse(r.updatedAt),
    })),
  );
}

/** 방 고정/해제. `null`이면 해제. */
export async function setRoomPin(
  supabase: SupabaseClient,
  roomId: string,
  pinnedAt: string | null,
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("로그인이 필요합니다.");

  const { error } = await supabase
    .from("room_members")
    .update({ pinned_at: pinnedAt })
    .eq("room_id", roomId)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);
}

/**
 * 내 방들에서 메시지를 찾는다. **RLS가 범위를 정한다** — 멤버가 아닌 방의 메시지는
 * 쿼리에 조건을 안 걸어도 애초에 보이지 않는다(정책이 방어선이지 이 함수가 아니다).
 *
 * 검색어는 `likePattern`으로 이스케이프한다 — `%`·`_`를 그대로 넘기면 사용자가 친
 * 글자가 패턴 문법으로 해석돼 엉뚱한 결과가 나온다.
 * 지운 메시지는 빼고, 최신순으로 준다.
 */
export async function searchMessages(
  supabase: SupabaseClient,
  query: string,
  // 2026-07-29 : 메신저 - 검색 필터 (Phase 55 T1 L-006~L-008)
  // 판단(KST 경계·필터 모양)은 core가, 여기는 조건을 쿼리에 얹기만 한다.
  filter: MessageSearchFilter = {},
  limit: number = MESSAGE_PAGE_SIZE,
): Promise<Message[]> {
  const pattern = likePattern(query);
  // 빈 검색어로 전부 긁어오지 않는다.
  if (pattern === null) return [];

  let q = supabase
    .from("messages")
    .select("*")
    .is("deleted_at", null)
    .ilike("body", pattern);

  if (filter.sender) q = q.eq("sender_type", filter.sender);
  const { fromIso, toIso } = kstDayRange(filter.from, filter.to);
  if (fromIso) q = q.gte("created_at", fromIso);
  // 배타 상한 — "그 날까지"가 그 날 23:59:59.999까지 포함된다.
  if (toIso) q = q.lt("created_at", toIso);
  if (filter.withImage) q = q.not("attachment_path", "is", null);

  const { data, error } = await q.order("seq", { ascending: false }).limit(limit);

  if (error) throw new Error(error.message);
  return (data as MessageRow[]).map(messageFromRow);
}

// ---------------------------------------------------------------------------
// 메시지 반응
// ---------------------------------------------------------------------------
/** 이 메시지들에 달린 반응을 **한 번에** 가져온다(메시지마다 부르면 왕복이 그만큼 늘어난다). */
export async function listReactions(
  supabase: SupabaseClient,
  messageIds: readonly string[],
): Promise<Reaction[]> {
  if (messageIds.length === 0) return [];
  const { data, error } = await supabase
    .from("message_reactions")
    .select("message_id, user_id, emoji")
    .in("message_id", [...messageIds]);

  // 반응을 못 읽어도 대화는 보여야 한다 — 빈 목록으로 준다.
  if (error || !data) return [];
  return (data as { message_id: string; user_id: string; emoji: string }[]).map((r) => ({
    messageId: r.message_id,
    userId: r.user_id,
    emoji: r.emoji,
  }));
}

/**
 * 반응을 달거나 뗀다. **이미 단 것인지는 현재 목록으로 판정한다** —
 * 화면 상태로 판정하면 다른 기기에서 단 반응을 모르고 또 달게 되고, 유니크 제약에 막힌다.
 */
export async function toggleReaction(
  supabase: SupabaseClient,
  current: readonly Reaction[],
  messageId: string,
  emoji: string,
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("로그인이 필요합니다.");

  if (shouldRemoveReaction(current, messageId, user.id, emoji)) {
    const { error } = await supabase
      .from("message_reactions")
      .delete()
      .eq("message_id", messageId)
      .eq("user_id", user.id)
      .eq("emoji", emoji);
    if (error) throw new Error(error.message);
    return;
  }

  const { error } = await supabase
    .from("message_reactions")
    .insert({ message_id: messageId, user_id: user.id, emoji });
  if (error) throw new Error(error.message);
}
