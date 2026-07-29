import { describe, expect, it } from "vitest";
import {
  DELETED_MESSAGE_TEXT,
  attachmentDeleted,
  canEditMessage,
  galleryNav,
  galleryPaths,
  messageBody,
  messageAttachment,
  messageSchema,
  isRoomMuted,
  likePattern,
  replyPreview,
  REPLY_MISSING_TEXT,
  MUTE_DURATIONS,
  mergeAroundWindow,
  mergeMessages,
  roomMemberSchema,
  sortRooms,
  todoTitleFrom,
  conversionReceiptText,
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
      body: "안녕", clientMsgId: "c1", seq: 1, attachmentPath: null, replyToId: null, editedAt: null, deletedAt: null, createdAt: ISO,
    };
    expect(messageSchema.safeParse({ ...base, senderUserId: U1 }).success).toBe(true);
    // 보낸 사람 없이 "사람이 보냈다"고 하면 화면이 누가 썼는지 못 그린다.
    expect(messageSchema.safeParse({ ...base, senderUserId: null }).success).toBe(false);
  });

  it("에이전트 메시지는 보낸 사람이 없어야 한다", () => {
    const base = {
      id: U1, roomId: U2, senderType: "agent" as const, type: "text" as const,
      body: "꽥", clientMsgId: "c2", seq: 2, attachmentPath: null, replyToId: null, editedAt: null, deletedAt: null, createdAt: ISO,
    };
    expect(messageSchema.safeParse({ ...base, senderUserId: null }).success).toBe(true);
    expect(messageSchema.safeParse({ ...base, senderUserId: U1 }).success).toBe(false);
  });

  it("빈 본문과 4000자 초과는 거부한다", () => {
    const base = {
      id: U1, roomId: U2, senderUserId: null, senderType: "agent" as const,
      type: "text" as const, clientMsgId: "c3", seq: 3, attachmentPath: null, replyToId: null, editedAt: null, deletedAt: null, createdAt: ISO,
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

// 2026-07-27 : 메신저 - 검색 패턴 (Phase 51)
// 사용자 입력이 쿼리 패턴에 닿는 자리다(CLAUDE.md 5절: 검증·이스케이프).
describe("검색 패턴", () => {
  it("앞뒤를 감싸 부분 일치로 만든다", () => {
    expect(likePattern("회의")).toBe("%회의%");
  });

  it("퍼센트를 문자로 취급한다 (안 하면 '50%'가 '50 뒤에 아무거나'가 된다)", () => {
    expect(likePattern("50%")).toBe("%50\\%%");
  });

  it("밑줄도 문자로 취급한다 (한 글자 아무거나가 아니다)", () => {
    expect(likePattern("a_b")).toBe("%a\\_b%");
  });

  it("백슬래시를 먼저 처리한다 (나중에 하면 우리가 넣은 것까지 다시 이스케이프된다)", () => {
    expect(likePattern("a\\b")).toBe("%a\\\\b%");
  });

  it("빈 검색어로 전부 긁어오지 않는다", () => {
    expect(likePattern("")).toBeNull();
    expect(likePattern("   ")).toBeNull();
  });

  it("한글·이모지가 깨지지 않는다", () => {
    expect(likePattern("오리 🦆")).toBe("%오리 🦆%");
  });
});

// 2026-07-27 : 메신저 - 답장 미리보기 (Phase 51)
describe("답장 미리보기", () => {
  const pool = [
    { id: "m1", body: "원본 메시지", deletedAt: null },
    { id: "m2", body: "지운 것", deletedAt: ISO },
  ];

  it("답장이 아니면 null", () => {
    expect(replyPreview(null, pool)).toBeNull();
  });

  it("원본 본문을 보여 준다", () => {
    expect(replyPreview("m1", pool)).toBe("원본 메시지");
  });

  it("원본을 못 찾으면 빈칸이 아니라 사실을 말한다", () => {
    // 오래돼 창 밖으로 나간 원본이 흔하다. 빈칸이면 답장인지도 알 수 없다.
    expect(replyPreview("없는-id", pool)).toBe(REPLY_MISSING_TEXT);
  });

  it("지운 원본은 삭제 문구로 보여 준다 (본문이 새지 않는다)", () => {
    expect(replyPreview("m2", pool)).not.toContain("지운 것");
  });

  it("긴 원본은 코드 포인트 단위로 줄인다 (이모지가 깨지지 않게)", () => {
    const long = { id: "m3", body: "가".repeat(100), deletedAt: null };
    const out = replyPreview("m3", [...pool, long])!;
    expect([...out].length).toBeLessThanOrEqual(40);
    expect(out.endsWith("…")).toBe(true);
  });
});

describe("galleryPaths / galleryNav (Phase 51 T5 전체화면 뷰어)", () => {
  const gm = (id: string, seq: number, path: string | null, deletedAt: string | null = null) => ({
    id, seq, attachmentPath: path, deletedAt,
  });

  it("첨부가 있는 메시지만 seq 순서로 뽑는다", () => {
    const list = [gm("a", 3, "p3"), gm("b", 1, "p1"), gm("c", 2, null)];
    expect(galleryPaths(list)).toEqual(["p1", "p3"]);
  });

  it("지운 메시지의 사진은 갤러리에도 없다 (지웠는데 뷰어에 남으면 안 지워진 것)", () => {
    const list = [gm("a", 1, "p1", "2026-07-27T00:00:00.000Z"), gm("b", 2, "p2")];
    expect(galleryPaths(list)).toEqual(["p2"]);
  });

  it("첨부가 하나도 없으면 빈 배열", () => {
    expect(galleryPaths([gm("a", 1, null)])).toEqual([]);
  });

  it("가운데에서는 양쪽 다 있다", () => {
    const nav = galleryNav(["p1", "p2", "p3"], "p2");
    expect(nav).toEqual({ prev: "p1", next: "p3", index: 1, total: 3 });
  });

  it("첫 장에서 이전은 없다 (끝에서 반대편으로 감지 않는다 — 몇 장인지 감을 잃는다)", () => {
    expect(galleryNav(["p1", "p2"], "p1").prev).toBeNull();
  });

  it("마지막 장에서 다음은 없다", () => {
    expect(galleryNav(["p1", "p2"], "p2").next).toBeNull();
  });

  it("한 장뿐이면 양쪽 다 없다", () => {
    expect(galleryNav(["p1"], "p1")).toEqual({ prev: null, next: null, index: 0, total: 1 });
  });

  it("보는 중에 그 메시지가 지워져 목록에서 빠지면 null 내비 (뷰어가 닫을 신호)", () => {
    expect(galleryNav(["p1", "p2"], "없는것")).toEqual({ prev: null, next: null, index: -1, total: 2 });
  });

  it("빈 갤러리에서는 전부 null", () => {
    expect(galleryNav([], "p1")).toEqual({ prev: null, next: null, index: -1, total: 0 });
  });
});

describe("attachmentDeleted (뷰어를 닫을 신호)", () => {
  const am = (path: string | null, deletedAt: string | null) => ({
    attachmentPath: path, deletedAt,
  });

  it("그 사진의 메시지가 지워졌으면 참", () => {
    expect(attachmentDeleted([am("p1", "2026-07-27T00:00:00.000Z")], "p1")).toBe(true);
  });

  it("살아 있으면 거짓", () => {
    expect(attachmentDeleted([am("p1", null)], "p1")).toBe(false);
  });

  it("창 밖이라 모르는 사진은 거짓 (모른다고 닫아 버리면 갤러리에서 연 옛 사진이 다 닫힌다)", () => {
    expect(attachmentDeleted([am("p1", null)], "옛날사진")).toBe(false);
  });

  it("빈 목록이면 거짓", () => {
    expect(attachmentDeleted([], "p1")).toBe(false);
  });
});

// 2026-07-29 : 메신저 - 메시지를 워크스페이스로 (Phase 52 T1)
describe("todoTitleFrom (메시지 → 할 일 제목)", () => {
  it("짧은 본문은 그대로", () => {
    expect(todoTitleFrom("우유 사기")).toBe("우유 사기");
  });

  it("줄바꿈·연속 공백은 한 칸으로 (여러 줄 메시지가 제목에 그대로 들어가면 목록이 깨진다)", () => {
    expect(todoTitleFrom("우유\n사기   그리고\n\n빵")).toBe("우유 사기 그리고 빵");
  });

  it("200자를 넘으면 코드 포인트 단위로 줄인다 (todo 계약 max 200)", () => {
    const long = "가".repeat(300);
    const title = todoTitleFrom(long);
    expect([...title].length).toBe(200);
    expect(title.endsWith("…")).toBe(true);
  });

  it("이모지가 경계에서 깨지지 않는다", () => {
    const emoji = "🦆".repeat(300);
    const title = todoTitleFrom(emoji);
    expect([...title].length).toBe(200);
    // 잘린 자리 앞까지 전부 온전한 오리여야 한다.
    expect([...title].slice(0, 199).every((c) => c === "🦆")).toBe(true);
  });

  it("앞뒤 공백을 정리한다", () => {
    expect(todoTitleFrom("  우유  ")).toBe("우유");
  });
});

describe("conversionReceiptText (변환 영수증 문구)", () => {
  it("할 일 변환을 말한다", () => {
    expect(conversionReceiptText("todo", "우유 사기")).toBe('"우유 사기" 메시지를 할 일로 만들었어요');
  });

  it("메모 저장을 말한다", () => {
    expect(conversionReceiptText("memo", "회의 내용")).toBe('"회의 내용" 메시지를 메모로 저장했어요');
  });

  it("긴 본문은 미리보기 길이로 줄인다 (영수증이 원문만큼 길면 대화가 밀린다)", () => {
    const text = conversionReceiptText("todo", "가".repeat(100));
    expect(text).toContain("…");
    expect([...text].length).toBeLessThan(70);
  });
});

// 2026-07-29 : 메신저 - 메시지 수정 (Phase 51 T4 잔여)
describe("canEditMessage", () => {
  const base = { senderUserId: U1, type: "text" as const, deletedAt: null };

  it("내가 보낸 글 메시지는 수정할 수 있다", () => {
    expect(canEditMessage(base, U1)).toBe(true);
  });

  it("남의 메시지는 수정할 수 없다", () => {
    expect(canEditMessage(base, U2)).toBe(false);
  });

  it("지운 메시지는 수정할 수 없다 (지웠는데 고칠 수 있으면 삭제가 삭제가 아니다)", () => {
    expect(canEditMessage({ ...base, deletedAt: ISO }, U1)).toBe(false);
  });

  it("system 메시지(영수증)는 수정할 수 없다 (기록을 고치면 기록이 아니다)", () => {
    expect(canEditMessage({ ...base, type: "system" as const }, U1)).toBe(false);
  });

  it("로그인 정보가 없으면 수정할 수 없다", () => {
    expect(canEditMessage(base, null)).toBe(false);
  });
});

// 2026-07-29 : 메신저 - 표적 주변 창 병합 (Phase 51 T3 잔여 L-005)
describe("mergeAroundWindow", () => {
  const m = (id: string, seq: number) => msg({ id, seq });

  it("이전(최신순)과 이후(오래된순)를 오래된순 하나로 합친다", () => {
    // DB가 주는 그대로: before는 desc(표적에서 위로), after는 asc(표적부터 아래로).
    const before = [m("b2", 4), m("b1", 3)];
    const after = [m("t", 5), m("a1", 6)];
    expect(mergeAroundWindow(before, after).map((x) => x.seq)).toEqual([3, 4, 5, 6]);
  });

  it("이전이 없어도(방 첫 메시지 근처) 동작한다", () => {
    expect(mergeAroundWindow([], [m("t", 1)]).map((x) => x.seq)).toEqual([1]);
  });

  it("이후가 없어도(마지막 메시지가 표적) 동작한다", () => {
    expect(mergeAroundWindow([m("b1", 1)], []).map((x) => x.seq)).toEqual([1]);
  });

  it("둘 다 비면 빈 배열", () => {
    expect(mergeAroundWindow([], [])).toEqual([]);
  });
});

// 2026-07-29 : 메신저 - 과거 로딩·실시간 병합 (Phase 51 T3 후속)
describe("mergeMessages", () => {
  const m = (id: string, seq: number) => msg({ id, seq });

  it("두 목록을 seq 순서로 합친다", () => {
    const loaded = [m("a", 1), m("b", 2)];
    const fresh = [m("c", 5), m("d", 6)];
    expect(mergeMessages(loaded, fresh).map((x) => x.seq)).toEqual([1, 2, 5, 6]);
  });

  it("겹치는 메시지는 새 값으로 하나만 남는다 (수정·삭제 반영)", () => {
    const loaded = [msg({ id: "a", seq: 1, deletedAt: null })];
    const fresh = [msg({ id: "a", seq: 1, deletedAt: ISO })];
    const out = mergeMessages(loaded, fresh);
    expect(out).toHaveLength(1);
    expect(out[0]!.deletedAt).toBe(ISO);
  });

  it("옛 구간을 보는 중 최신이 와도 옛 구간이 사라지지 않는다", () => {
    // 사이클 9의 알려진 한계: reload가 목록을 최신 50개로 갈아치웠다.
    const oldWindow = [m("o1", 10), m("o2", 11)];
    const latest = [m("n1", 90), m("n2", 91)];
    expect(mergeMessages(oldWindow, latest).map((x) => x.seq)).toEqual([10, 11, 90, 91]);
  });

  it("빈 쪽이 있어도 동작한다", () => {
    expect(mergeMessages([], [m("a", 1)]).map((x) => x.seq)).toEqual([1]);
    expect(mergeMessages([m("a", 1)], []).map((x) => x.seq)).toEqual([1]);
  });
});
