import { describe, expect, it } from "vitest";
import {
  DELETED_MESSAGE_TEXT,
  messageBody,
  messageAttachment,
  messageSchema,
  isRoomMuted,
  MUTE_DURATIONS,
  roomMemberSchema,
  sortRooms,
  unreadCount,
} from "./room";

const U1 = "11111111-1111-4111-8111-111111111111";
const U2 = "22222222-2222-4222-8222-222222222222";
const ISO = "2026-07-27T00:00:00.000Z";

function msg(o: Partial<{ id: string; seq: number; senderUserId: string | null; deletedAt: string | null }> = {}) {
  return {
    id: o.id ?? "aaaaaaaa-0000-4000-8000-000000000001",
    seq: o.seq ?? 1,
    senderUserId: o.senderUserId === undefined ? U2 : o.senderUserId,
    deletedAt: o.deletedAt ?? null,
  };
}

describe("메시지 계약", () => {
  it("사람이 보낸 메시지는 보낸 사람이 있어야 한다", () => {
    const base = {
      id: U1, roomId: U2, senderType: "user" as const, type: "text" as const,
      body: "안녕", clientMsgId: "c1", seq: 1, attachmentPath: null, deletedAt: null, createdAt: ISO,
    };
    expect(messageSchema.safeParse({ ...base, senderUserId: U1 }).success).toBe(true);
    // 보낸 사람 없이 "사람이 보냈다"고 하면 화면이 누가 썼는지 못 그린다.
    expect(messageSchema.safeParse({ ...base, senderUserId: null }).success).toBe(false);
  });

  it("에이전트 메시지는 보낸 사람이 없어야 한다", () => {
    const base = {
      id: U1, roomId: U2, senderType: "agent" as const, type: "text" as const,
      body: "꽥", clientMsgId: "c2", seq: 2, attachmentPath: null, deletedAt: null, createdAt: ISO,
    };
    expect(messageSchema.safeParse({ ...base, senderUserId: null }).success).toBe(true);
    expect(messageSchema.safeParse({ ...base, senderUserId: U1 }).success).toBe(false);
  });

  it("빈 본문과 4000자 초과는 거부한다", () => {
    const base = {
      id: U1, roomId: U2, senderUserId: null, senderType: "agent" as const,
      type: "text" as const, clientMsgId: "c3", seq: 3, attachmentPath: null, deletedAt: null, createdAt: ISO,
    };
    expect(messageSchema.safeParse({ ...base, body: "" }).success).toBe(false);
    expect(messageSchema.safeParse({ ...base, body: "x".repeat(4001) }).success).toBe(false);
    expect(messageSchema.safeParse({ ...base, body: "x".repeat(4000) }).success).toBe(true);
  });
});

describe("멤버 계약", () => {
  const base = {
    id: U1, roomId: U2, lastReadMessageId: null, mutedUntil: null,
    pinnedAt: null, createdAt: ISO,
  };

  it("사람 멤버는 userId가 있어야 하고 에이전트는 없어야 한다", () => {
    expect(roomMemberSchema.safeParse({ ...base, memberType: "user", userId: U1 }).success).toBe(true);
    expect(roomMemberSchema.safeParse({ ...base, memberType: "user", userId: null }).success).toBe(false);
    expect(roomMemberSchema.safeParse({ ...base, memberType: "agent", userId: null }).success).toBe(true);
    // 오리는 auth.users에 없다 — userId를 붙이면 DB CHECK와 갈라진다.
    expect(roomMemberSchema.safeParse({ ...base, memberType: "agent", userId: U1 }).success).toBe(false);
  });
});

describe("삭제된 메시지", () => {
  it("본문 대신 안내 문구를 보여 준다 (자리는 남긴다)", () => {
    expect(messageBody({ body: "비밀", deletedAt: ISO })).toBe(DELETED_MESSAGE_TEXT);
    expect(messageBody({ body: "비밀", deletedAt: ISO })).not.toContain("비밀");
  });

  it("안 지운 메시지는 그대로", () => {
    expect(messageBody({ body: "안녕", deletedAt: null })).toBe("안녕");
  });
});

describe("안 읽은 개수", () => {
  const list = [msg({ id: "m1", seq: 1 }), msg({ id: "m2", seq: 2 }), msg({ id: "m3", seq: 3 })];

  it("읽음 위치가 없으면 전부 안 읽음", () => {
    expect(unreadCount(list, null, U1)).toBe(3);
  });

  it("읽음 위치보다 뒤에 온 것만 센다", () => {
    expect(unreadCount(list, "m2", U1)).toBe(1);
    expect(unreadCount(list, "m3", U1)).toBe(0);
  });

  it("내가 보낸 메시지는 세지 않는다", () => {
    const mine = [msg({ id: "a", seq: 1, senderUserId: U1 }), msg({ id: "b", seq: 2 })];
    expect(unreadCount(mine, null, U1)).toBe(1);
  });

  it("지운 메시지는 세지 않는다", () => {
    const withDeleted = [msg({ id: "a", seq: 1, deletedAt: ISO }), msg({ id: "b", seq: 2 })];
    expect(unreadCount(withDeleted, null, U1)).toBe(1);
  });

  it("읽음 위치가 목록에 없으면 0이라고 단정하지 않는다", () => {
    // 이미 지나갔거나 아직 안 불러온 경우다. 0으로 처리하면 뱃지가 조용히 사라진다.
    expect(unreadCount(list, "없는-id", U1)).toBe(3);
  });

  it("빈 목록은 0", () => {
    expect(unreadCount([], null, U1)).toBe(0);
    expect(unreadCount([], "m1", U1)).toBe(0);
  });
});

describe("방 목록 정렬", () => {
  it("고정한 방이 먼저, 그다음 최근 메시지 순", () => {
    const rooms = [
      { id: "a", pinnedAt: null, lastActivity: 10 },
      { id: "b", pinnedAt: ISO, lastActivity: 1 },
      { id: "c", pinnedAt: null, lastActivity: 20 },
    ];
    expect(sortRooms(rooms).map((r) => r.id)).toEqual(["b", "c", "a"]);
  });

  it("원본 배열을 바꾸지 않는다", () => {
    const rooms = [
      { id: "a", pinnedAt: null, lastActivity: 1 },
      { id: "b", pinnedAt: null, lastActivity: 2 },
    ];
    sortRooms(rooms);
    expect(rooms.map((r) => r.id)).toEqual(["a", "b"]);
  });

  it("빈 목록에도 던지지 않는다", () => {
    expect(sortRooms([])).toEqual([]);
  });
});

// 2026-07-27 : 메신저 - 첨부 (Phase 50 T4)
describe("메시지 첨부", () => {
  it("지운 메시지의 이미지는 보여 주지 않는다", () => {
    // 본문만 가리고 사진이 남으면 지웠다고 생각한 사람에게 지워지지 않은 것이 된다.
    expect(messageAttachment({ attachmentPath: "room/a.png", deletedAt: ISO })).toBeNull();
  });

  it("안 지운 메시지는 경로를 그대로 준다", () => {
    expect(messageAttachment({ attachmentPath: "room/a.png", deletedAt: null })).toBe("room/a.png");
  });

  it("첨부가 없으면 null", () => {
    expect(messageAttachment({ attachmentPath: null, deletedAt: null })).toBeNull();
  });
});

// 2026-07-27 : 메신저 - 방 음소거 (Phase 51 T2)
describe("방 음소거", () => {
  const NOW = Date.parse("2026-07-27T12:00:00.000Z");

  it("음소거한 적 없으면 조용하지 않다", () => {
    expect(isRoomMuted(null, NOW)).toBe(false);
  });

  it("아직 안 지났으면 음소거다", () => {
    expect(isRoomMuted("2026-07-27T13:00:00.000Z", NOW)).toBe(true);
  });

  it("지난 값은 이미 풀린 것이다 (남아 있어도 영영 막히지 않는다)", () => {
    expect(isRoomMuted("2026-07-27T11:00:00.000Z", NOW)).toBe(false);
  });

  it("경계에서 풀린다", () => {
    expect(isRoomMuted("2026-07-27T12:00:00.000Z", NOW)).toBe(false);
  });

  it("해석할 수 없는 값은 음소거로 치지 않는다", () => {
    // 알림을 조용히 잃는 쪽이 더 나쁘다.
    expect(isRoomMuted("이상한 값", NOW)).toBe(false);
    expect(isRoomMuted("", NOW)).toBe(false);
  });

  it("기간 선택지에 라벨과 길이가 모두 있다", () => {
    for (const d of MUTE_DURATIONS) {
      expect(d.label.length).toBeGreaterThan(0);
      expect(d.ms).toBeGreaterThan(0);
    }
  });
});
