import { describe, expect, it } from "vitest";
import {
  MESSAGE_PAGE_SIZE,
  deleteMessage,
  listMessages,
  listRooms,
  markRead,
  sendMessage,
} from "./rooms";

const USER = "22222222-2222-4222-8222-222222222222";

const ROOM_ROW = {
  id: "11111111-1111-4111-8111-111111111111",
  type: "agent" as const,
  title: "오리와의 대화",
  created_by: USER,
  created_at: "2026-07-27T00:00:00.000Z",
  updated_at: "2026-07-27T00:00:00.000Z",
};

function messageRow(o: Partial<{ id: string; seq: number; body: string; client_msg_id: string }> = {}) {
  return {
    id: o.id ?? "33333333-3333-4333-8333-333333333333",
    room_id: ROOM_ROW.id,
    sender_user_id: USER,
    sender_type: "user" as const,
    type: "text" as const,
    body: o.body ?? "안녕",
    client_msg_id: o.client_msg_id ?? "c1",
    seq: o.seq ?? 1,
    attachment_path: null,
    deleted_at: null,
    created_at: "2026-07-27T00:00:00.000Z",
  };
}

/**
 * 테이블마다 다른 응답을 주는 목. **한 벌로 뭉뚱그리면 실제와 다른 걸 검사하게 된다** —
 * 이 저장소가 이미 한 번 데인 실패 모양이다(얕은 목이 통과했는데 실물은 달랐다).
 */
function fakeSupabase(opts: {
  rooms?: unknown[];
  messages?: unknown[];
  members?: unknown[];
  insertError?: { code?: string; message: string } | null;
  onUpdate?: (table: string, patch: Record<string, unknown>) => void;
  user?: { id: string } | null;
} = {}) {
  const messages = opts.messages ?? [];
  const chain = (table: string) => {
    const rows =
      table === "rooms" ? (opts.rooms ?? [])
      : table === "messages" ? messages
      : (opts.members ?? []);
    const result = async () => ({ data: rows, error: null });
    const selectChain: Record<string, unknown> = {
      eq: () => selectChain,
      order: () => selectChain,
      limit: result,
      then: undefined,
    };
    return {
      select: () => selectChain,
      insert: () => ({
        select: () => ({
          single: async () =>
            opts.insertError
              ? { data: null, error: opts.insertError }
              : { data: messages[0] ?? messageRow(), error: null },
        }),
      }),
      update: (patch: Record<string, unknown>) => {
        opts.onUpdate?.(table, patch);
        return { eq: () => ({ eq: async () => ({ error: null }), error: null, then: undefined }) };
      },
    };
  };

  return {
    auth: {
      getUser: async () => ({
        data: { user: opts.user === undefined ? { id: USER } : opts.user },
      }),
    },
    from: (table: string) => chain(table),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- 테스트용 최소 목
  } as any;
}

describe("listRooms", () => {
  it("행을 도메인 타입으로 변환한다", async () => {
    const rooms = await listRooms(fakeSupabase({ rooms: [ROOM_ROW] }));
    expect(rooms).toHaveLength(1);
    expect(rooms[0]!.createdBy).toBe(USER);
    expect(rooms[0]!.type).toBe("agent");
  });

  it("빈 목록에도 던지지 않는다", async () => {
    expect(await listRooms(fakeSupabase({ rooms: [] }))).toEqual([]);
  });
});

describe("listMessages", () => {
  it("최신순으로 받아 오래된 순으로 돌려준다 (화면은 위에서 아래로 읽는다)", async () => {
    const rows = [messageRow({ id: "aaaaaaaa-0000-4000-8000-000000000003", seq: 3 }),
                  messageRow({ id: "aaaaaaaa-0000-4000-8000-000000000002", seq: 2 })];
    const list = await listMessages(fakeSupabase({ messages: rows }), ROOM_ROW.id);
    expect(list.map((m) => m.seq)).toEqual([2, 3]);
  });

  it("한 번에 불러오는 개수에 상한이 있다", () => {
    // 전부 불러오면 오래된 방일수록 열기가 느려진다.
    expect(MESSAGE_PAGE_SIZE).toBeLessThanOrEqual(100);
  });
});

describe("sendMessage", () => {
  it("빈 메시지와 공백만 있는 메시지는 보내지 않는다", async () => {
    const s = fakeSupabase({ messages: [messageRow()] });
    await expect(sendMessage(s, { roomId: ROOM_ROW.id, body: "", clientMsgId: "c1" }))
      .rejects.toThrow("빈 메시지");
    await expect(sendMessage(s, { roomId: ROOM_ROW.id, body: "   ", clientMsgId: "c1" }))
      .rejects.toThrow("빈 메시지");
  });

  it("로그인하지 않으면 보내지 않는다", async () => {
    const s = fakeSupabase({ user: null, messages: [messageRow()] });
    await expect(sendMessage(s, { roomId: ROOM_ROW.id, body: "안녕", clientMsgId: "c1" }))
      .rejects.toThrow("로그인");
  });

  it("같은 clientMsgId로 다시 보내면 이미 저장된 그 메시지를 돌려준다", async () => {
    // 재시도는 반드시 일어난다(도착했는데 응답만 못 받은 경우). 에러를 던지면
    // 사용자는 실패한 줄 알고 다시 쓰고, 화면엔 같은 말이 두 번 남는다.
    const s = fakeSupabase({
      messages: [messageRow({ body: "처음 보낸 말", client_msg_id: "dup" })],
      insertError: { code: "23505", message: "duplicate key" },
    });
    const m = await sendMessage(s, { roomId: ROOM_ROW.id, body: "처음 보낸 말", clientMsgId: "dup" });
    expect(m.body).toBe("처음 보낸 말");
    expect(m.clientMsgId).toBe("dup");
  });

  it("유니크 위반인데 기존 메시지를 못 찾으면 조용히 성공시키지 않는다", async () => {
    const s = fakeSupabase({ messages: [], insertError: { code: "23505", message: "duplicate key" } });
    await expect(sendMessage(s, { roomId: ROOM_ROW.id, body: "안녕", clientMsgId: "x" }))
      .rejects.toThrow("duplicate key");
  });

  it("다른 오류는 그대로 던진다", async () => {
    const s = fakeSupabase({ messages: [], insertError: { code: "42501", message: "권한 없음" } });
    await expect(sendMessage(s, { roomId: ROOM_ROW.id, body: "안녕", clientMsgId: "x" }))
      .rejects.toThrow("권한 없음");
  });

  it("앞뒤 공백을 정리해 저장한다", async () => {
    const s = fakeSupabase({ messages: [messageRow({ body: "안녕" })] });
    const m = await sendMessage(s, { roomId: ROOM_ROW.id, body: "  안녕  ", clientMsgId: "c1" });
    expect(m.body).toBe("안녕");
  });
});

describe("deleteMessage", () => {
  it("행을 지우지 않고 deleted_at만 찍는다 (자리를 남긴다)", async () => {
    const patches: Record<string, unknown>[] = [];
    const s = fakeSupabase({ onUpdate: (_t, p) => patches.push(p) });
    await deleteMessage(s, "any-id");
    expect(patches).toHaveLength(1);
    expect(patches[0]).toHaveProperty("deleted_at");
    // 본문을 지우면 되돌릴 수 없다 — 하드 삭제는 정리 잡에서만 한다는 계약이다.
    expect(patches[0]).not.toHaveProperty("body");
  });
});

describe("markRead", () => {
  it("읽은 적 없으면 그대로 기록한다", async () => {
    const updates: string[] = [];
    const s = fakeSupabase({
      members: [{ last_read_message_id: null }],
      onUpdate: (t) => updates.push(t),
    });
    await markRead(s, ROOM_ROW.id, "aaaaaaaa-0000-4000-8000-000000000009");
    expect(updates).toContain("room_members");
  });

  it("이미 더 뒤를 읽었으면 되돌리지 않는다", async () => {
    // 실시간 이벤트는 순서 없이 도착한다. 되돌리면 안 읽은 수가 되살아난다.
    const updates: string[] = [];
    const s = fakeSupabase({
      members: [{ last_read_message_id: "old" }],
      messages: [{ seq: 10 }], // 현재 읽음 위치와 대상 둘 다 seq 10으로 조회된다
      onUpdate: (t) => updates.push(t),
    });
    await markRead(s, ROOM_ROW.id, "same-or-older");
    expect(updates).toHaveLength(0);
  });

  it("로그인하지 않으면 기록하지 않는다", async () => {
    const s = fakeSupabase({ user: null });
    await expect(markRead(s, ROOM_ROW.id, "m1")).rejects.toThrow("로그인");
  });
});
