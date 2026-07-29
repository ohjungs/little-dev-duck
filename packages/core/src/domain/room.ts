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
    // 첨부 이미지의 스토리지 경로('<room_id>/<uuid>.<ext>'). 없으면 null.
    // **URL이 아니라 경로다** — 버킷이 비공개라 URL은 서명이 붙어 만료된다.
    // 만료된 URL을 저장해 두면 나중에 열리지 않는다.
    attachmentPath: z.string().max(300).nullable(),
    // 답장 대상 메시지 id. 원본이 하드 삭제되면 null이 된다 —
    // **답장이 함께 사라지면 안 되기 때문**이다(평소 삭제는 소프트 삭제라 원본 행은 남는다).
    replyToId: z.string().uuid().nullable(),
    // 마지막 수정 시각. null = 수정된 적 없음. 화면은 이 값으로 "수정됨"을 표시한다 —
    // 흔적 없이 본문이 바뀌면 읽은 사람이 본 것과 다른 말이 소리 없이 남는다.
    editedAt: z.string().datetime({ offset: true }).nullable(),
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
 * 지운 메시지의 이미지는 보여 주지 않는다. 본문만 가리고 사진이 남으면
 * **지웠다고 생각한 사람에게 지워지지 않은 것**이 된다.
 */
export function messageAttachment(
  message: Pick<Message, "attachmentPath" | "deletedAt">,
): string | null {
  return message.deletedAt ? null : message.attachmentPath;
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
 * 방 목록 정렬: 고정한 방이 먼저, 그다음 최근 활동 순.
 * 정렬 기준을 화면마다 따로 쓰면 목록이 화면마다 달라진다 — 여기 한 곳에 둔다.
 *
 * 2026-07-27 정정: 필드 이름이 `lastMessageSeq`였는데 **그 값을 구할 방법이 없어서
 * 아무도 이 함수를 쓰지 않았다**(죽은 코드였다). 방마다 최대 seq를 구하려면 방 개수만큼
 * 쿼리가 늘어난다. 대신 `rooms.updated_at`을 쓰는데, 그건 이제 메시지 삽입 트리거가
 * 갱신한다(20260727060000). **"큰 값이 더 최근"이기만 하면 되는 값**이라 이름을 그렇게 고쳤다.
 */
export function sortRooms<T extends { pinnedAt: string | null; lastActivity: number }>(
  rooms: readonly T[],
): T[] {
  return [...rooms].sort((a, b) => {
    if ((a.pinnedAt !== null) !== (b.pinnedAt !== null)) return a.pinnedAt ? -1 : 1;
    return b.lastActivity - a.lastActivity;
  });
}

/**
 * 이 방이 지금 음소거 상태인가. **"언제까지"를 저장하고 판정은 지금 시각과 비교**한다 —
 * 켜짐/꺼짐 불리언으로 두면 "1시간만 끄기"를 표현할 수 없고, 해제할 주체도 없다
 * (이 프로젝트는 무료 원칙상 서버 스케줄러가 없다).
 *
 * 시각을 인자로 받는다. 안에서 `Date.now()`를 부르면 테스트가 시간에 의존한다.
 * 과거 시각이면 이미 풀린 것이다 — 지난 값이 남아 있어도 알림이 영영 막히지 않는다.
 */
export function isRoomMuted(mutedUntil: string | null, now: number): boolean {
  if (!mutedUntil) return false;
  const until = Date.parse(mutedUntil);
  // 해석할 수 없는 값이면 **음소거로 치지 않는다.** 알림을 조용히 잃는 쪽이 더 나쁘다.
  if (Number.isNaN(until)) return false;
  return until > now;
}

/** 자주 쓰는 음소거 기간. 화면마다 다른 값을 쓰면 사용자가 무엇을 고른 건지 헷갈린다. */
export const MUTE_DURATIONS = [
  { label: "1시간", ms: 60 * 60 * 1000 },
  { label: "오늘 하루", ms: 24 * 60 * 60 * 1000 },
  { label: "직접 풀 때까지", ms: 365 * 24 * 60 * 60 * 1000 },
] as const;

/**
 * 부분 일치 검색용 패턴으로 바꾼다. **사용자 입력이 쿼리 패턴에 그대로 닿는 자리**다.
 *
 * `%`와 `_`는 패턴 문법이라 그대로 두면 검색이 사용자 뜻과 달라진다 —
 * "50%"를 찾으면 `50` 뒤에 아무거나 오는 것이 전부 걸린다. 백슬래시는 이스케이프 문자
 * 자체라 먼저 처리해야 한다(나중에 하면 우리가 넣은 백슬래시까지 다시 이스케이프된다).
 *
 * 빈 문자열이면 null — **빈 검색어로 전부 긁어오지 않는다.**
 */
export function likePattern(raw: string): string | null {
  const q = raw.trim();
  if (q === "") return null;
  const escaped = q
    .replace(/\\/g, "\\\\")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_");
  return `%${escaped}%`;
}

// 2026-07-29 : 메신저 - 전체화면 뷰어 (Phase 51 T5)
// 뷰어의 순서·이동 판정을 화면 밖에 둔다. DOM 없이 검증할 수 있어야
// "지우면 뷰어에서도 빠진다" 같은 규칙이 테스트로 잠긴다.

/** 갤러리에 넣을 사진 경로를 seq 순서로. 지운 메시지의 사진은 뷰어에도 없어야 한다. */
export function galleryPaths(
  messages: readonly Pick<Message, "seq" | "attachmentPath" | "deletedAt">[],
): string[] {
  return [...messages]
    .sort((a, b) => a.seq - b.seq)
    .map((m) => messageAttachment(m))
    .filter((p): p is string => p !== null);
}

/**
 * 보고 있는 그 사진의 메시지가 **지워진 것으로 확인**됐는가 — 뷰어를 닫을 신호.
 * 목록에 없어 모르는 사진은 거짓이다. 모른다고 닫아 버리면
 * 갤러리에서 연 옛 사진(현재 창 밖)이 전부 닫힌다.
 */
export function attachmentDeleted(
  messages: readonly Pick<Message, "attachmentPath" | "deletedAt">[],
  path: string,
): boolean {
  return messages.some((m) => m.attachmentPath === path && m.deletedAt !== null);
}

/**
 * 지금 보는 사진의 위치와 양옆. **끝에서 반대편으로 감지 않는다** —
 * 순환하면 "몇 장 중 몇 장째"라는 감을 잃고 같은 사진을 두 번 보게 된다.
 * 보는 중에 그 사진이 지워져 목록에서 빠지면 index -1 — 뷰어가 닫을 신호다.
 */
export function galleryNav(
  paths: readonly string[],
  current: string,
): { prev: string | null; next: string | null; index: number; total: number } {
  const index = paths.indexOf(current);
  if (index < 0) return { prev: null, next: null, index: -1, total: paths.length };
  return {
    prev: index > 0 ? paths[index - 1] : null,
    next: index < paths.length - 1 ? paths[index + 1] : null,
    index,
    total: paths.length,
  };
}

// 2026-07-29 : 메신저 - 메시지 수정 (Phase 51 T4 잔여 I-010)
/**
 * 이 메시지를 수정할 수 있는가. 내가 보낸 **글(text)** 메시지만 —
 * 지운 것은 안 된다(지웠는데 고칠 수 있으면 삭제가 삭제가 아니다),
 * system 영수증도 안 된다(기록을 고치면 기록이 아니다). RLS도 같은 방향으로 막지만,
 * 화면에서 판정해야 눌러도 실패할 버튼을 애초에 보여 주지 않는다.
 */
export function canEditMessage(
  m: Pick<Message, "senderUserId" | "type" | "deletedAt">,
  myUserId: string | null,
): boolean {
  return (
    myUserId !== null &&
    m.senderUserId === myUserId &&
    m.type === "text" &&
    m.deletedAt === null
  );
}

// 2026-07-29 : 메신저 - 메시지를 워크스페이스로 (Phase 52 T1)
// 변환은 기존 생성 함수(createTodo·createMemo)를 부른다 — 생성 로직 재구현 금지(계획).
// 여기는 그 앞의 **결정적 가공**만 둔다: 제목 다듬기와 영수증 문구.

/** todo 계약(title max 200)에 맞춘다. 코드 포인트 단위라 이모지가 경계에서 깨지지 않는다. */
export const TODO_TITLE_MAX = 200;

export function todoTitleFrom(body: string): string {
  // 여러 줄 메시지가 제목에 그대로 들어가면 목록이 깨진다 — 공백류는 한 칸으로.
  const flat = body.replace(/\s+/g, " ").trim();
  const chars = [...flat];
  return chars.length > TODO_TITLE_MAX
    ? `${chars.slice(0, TODO_TITLE_MAX - 1).join("")}…`
    : flat;
}

/**
 * 변환 영수증(system 메시지) 문구. **원본 메시지에 표시를 남기지 않으면 같은 메시지를
 * 두 번 변환한다**(계획 T1). 컬럼 추가 없이 방 안의 system 메시지로 흔적을 남긴다.
 */
export function conversionReceiptText(kind: "todo" | "memo", body: string): string {
  const chars = [...body.replace(/\s+/g, " ").trim()];
  const preview =
    chars.length > REPLY_PREVIEW_MAX
      ? `${chars.slice(0, REPLY_PREVIEW_MAX - 1).join("")}…`
      : chars.join("");
  return kind === "todo"
    ? `"${preview}" 메시지를 할 일로 만들었어요`
    : `"${preview}" 메시지를 메모로 저장했어요`;
}

/**
 * 답장 미리보기 문구. **원본을 목록에서 찾지 못하면 "찾을 수 없다"고 말한다** —
 * 빈칸으로 두면 답장인지 아닌지도 알 수 없다(오래돼 창 밖으로 나간 원본이 흔하다).
 */
export const REPLY_MISSING_TEXT = "원본을 불러오지 못했어요";
export const REPLY_PREVIEW_MAX = 40;

export function replyPreview(
  replyToId: string | null,
  pool: readonly Pick<Message, "id" | "body" | "deletedAt">[],
): string | null {
  if (!replyToId) return null;
  const target = pool.find((m) => m.id === replyToId);
  if (!target) return REPLY_MISSING_TEXT;
  const text = messageBody(target);
  const chars = [...text];
  return chars.length > REPLY_PREVIEW_MAX
    ? `${chars.slice(0, REPLY_PREVIEW_MAX - 1).join("")}…`
    : text;
}
