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
  likePattern,
  sortRooms,
  checkMessageImage,
  messageAttachmentPath,
  messageSchema,
  roomSchema,
  type Message,
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
    deletedAt: row.deleted_at,
    createdAt: row.created_at,
  });
}

// 한 번에 불러오는 메시지 상한. 방을 열면 최근 것부터 본다 —
// 전부 불러오면 오래된 방일수록 열기가 느려진다(계획의 대용량 렌즈).
export const MESSAGE_PAGE_SIZE = 50;

export async function listRooms(supabase: SupabaseClient): Promise<Room[]> {
  const { data, error } = await supabase
    .from("rooms")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(200);

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

export type SendMessageInput = {
  roomId: string;
  body: string;
  /** 낙관적 UI가 만든 식별자. 재시도해도 같은 값을 보내야 중복이 걸러진다. */
  clientMsgId: string;
  /** 첨부 이미지의 스토리지 경로. 먼저 올린 뒤 그 경로를 넘긴다. */
  attachmentPath?: string | null;
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
      type: "text",
      body,
      client_msg_id: input.clientMsgId,
      attachment_path: input.attachmentPath ?? null,
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
export type RoomListItem = Room & { pinnedAt: string | null; lastActivity: number };

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
  if (user) {
    const { data } = await supabase
      .from("room_members")
      .select("room_id, pinned_at")
      .eq("user_id", user.id);
    for (const row of (data ?? []) as { room_id: string; pinned_at: string | null }[]) {
      pins.set(row.room_id, row.pinned_at);
    }
  }

  return sortRooms(
    rooms.map((r) => ({
      ...r,
      pinnedAt: pins.get(r.id) ?? null,
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
  limit: number = MESSAGE_PAGE_SIZE,
): Promise<Message[]> {
  const pattern = likePattern(query);
  // 빈 검색어로 전부 긁어오지 않는다.
  if (pattern === null) return [];

  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .is("deleted_at", null)
    .ilike("body", pattern)
    .order("seq", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data as MessageRow[]).map(messageFromRow);
}
