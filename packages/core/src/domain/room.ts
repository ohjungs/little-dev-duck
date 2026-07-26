// 2026-07-27 : 메신저 - 방·메시지 계약 (Phase 50 T1)
//
// 계획의 핵심 판단을 그대로 계약으로 옮긴다:
//   - 순서는 **서버가 정한 seq**로 매긴다. 클라이언트 시각으로 정렬하지 않는다 —
//     이 저장소는 시간대·날짜 문제로 여러 번 데였고, 사용자가 시계를 바꿀 수도 있다.
//   - 중복 전송은 `clientMsgId`로 걸러 낸다. 낙관적 UI + 재시도가 있으면 중복은 생긴다.
//   - 삭제는 소프트 삭제(`deletedAt`)다. 자리를 남겨야 대화가 어긋나지 않는다.

import { z } from "zod";

export const roomTypeSchema = z.enum(["agent", "direct", "group", "self"]);
export type RoomType = z.infer<typeof roomTypeSchema>;

export const roomSchema = z.object({
  id: z.string().uuid(),
  type: roomTypeSchema,
  title: z.string().min(1).max(100).nullable(),
  createdBy: z.string().uuid(),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
});
export type Room = z.infer<typeof roomSchema>;

// 에이전트(오리)는 auth.users에 없다 — 그래서 userId가 없을 수 있다.
// DB의 CHECK 제약과 같은 규칙을 여기서도 잠근다(두 곳이 갈라지면 화면과 DB가 다투게 된다).
export const roomMemberSchema = z
  .object({
    id: z.string().uuid(),
    roomId: z.string().uuid(),
    memberType: z.enum(["user", "agent"]),
    userId: z.string().uuid().nullable(),
    lastReadMessageId: z.string().uuid().nullable(),
    mutedUntil: z.string().datetime({ offset: true }).nullable(),
    pinnedAt: z.string().datetime({ offset: true }).nullable(),
    createdAt: z.string().datetime({ offset: true }),
  })
  .refine(
    (m) => (m.memberType === "user" ? m.userId !== null : m.userId === null),
    { message: "사람 멤버는 userId가 있어야 하고, 에이전트 멤버는 없어야 한다" },
  );
export type RoomMember = z.infer<typeof roomMemberSchema>;

export const messageSchema = z
  .object({
    id: z.string().uuid(),
    roomId: z.string().uuid(),
    senderUserId: z.string().uuid().nullable(),
    senderType: z.enum(["user", "agent"]),
    type: z.enum(["text", "system"]),
    body: z.string().min(1).max(4000),
    clientMsgId: z.string().min(1).max(64),
    seq: z.number().int().nonnegative(),
    deletedAt: z.string().datetime({ offset: true }).nullable(),
    createdAt: z.string().datetime({ offset: true }),
  })
  .refine(
    (m) => (m.senderType === "user" ? m.senderUserId !== null : m.senderUserId === null),
    { message: "사람이 보낸 메시지는 senderUserId가 있어야 한다" },
  );
export type Message = z.infer<typeof messageSchema>;

/**
 * 지운 메시지의 표시 문구. **본문을 지우고 자리를 남긴다** —
 * 행을 빼 버리면 "무슨 말이 있었는데 사라졌다"는 사실 자체가 안 보인다.
 */
export const DELETED_MESSAGE_TEXT = "삭제된 메시지입니다";

export function messageBody(message: Pick<Message, "body" | "deletedAt">): string {
  return message.deletedAt ? DELETED_MESSAGE_TEXT : message.body;
}

/**
 * 안 읽은 개수. **읽음 위치(lastReadMessageId)가 가리키는 메시지의 seq보다 큰 것**을 센다.
 * 계획(J-001·J-002)이 이 기준을 못박았다 — 시각으로 세면 시계가 어긋난 기기에서 숫자가 달라진다.
 *
 * 읽음 위치가 없으면(방에 들어온 적 없음) 전부 안 읽은 것이다.
 * 읽음 위치가 가리키는 메시지가 목록에 없으면(이미 지나갔거나 아직 안 불러왔다)
 * **0이라고 단정하지 않는다** — 모르는 것을 0이라고 하면 뱃지가 조용히 사라진다.
 * 내가 보낸 메시지는 세지 않는다. 내가 쓴 걸 안 읽었다고 하면 이상하다.
 */
export function unreadCount(
  messages: readonly Pick<Message, "id" | "seq" | "senderUserId" | "deletedAt">[],
  lastReadMessageId: string | null,
  myUserId: string | null,
): number {
  const countable = messages.filter(
    (m) => !m.deletedAt && (myUserId === null || m.senderUserId !== myUserId),
  );
  if (lastReadMessageId === null) return countable.length;
  const read = messages.find((m) => m.id === lastReadMessageId);
  if (!read) return countable.length;
  return countable.filter((m) => m.seq > read.seq).length;
}

/**
 * 방 목록 정렬: 고정한 방이 먼저, 그다음 최근 메시지 순.
 * 정렬 기준을 화면마다 따로 쓰면 목록이 화면마다 달라진다 — 여기 한 곳에 둔다.
 */
export function sortRooms<T extends { pinnedAt: string | null; lastMessageSeq: number }>(
  rooms: readonly T[],
): T[] {
  return [...rooms].sort((a, b) => {
    if ((a.pinnedAt !== null) !== (b.pinnedAt !== null)) return a.pinnedAt ? -1 : 1;
    return b.lastMessageSeq - a.lastMessageSeq;
  });
}
