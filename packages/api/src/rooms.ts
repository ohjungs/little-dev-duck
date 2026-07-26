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
