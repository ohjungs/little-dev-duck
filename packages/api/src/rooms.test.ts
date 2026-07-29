import { describe, expect, it } from "vitest";
import {
  MESSAGE_PAGE_SIZE,
  fetchAllRoomMessages,
  firstMessageOnOrAfter,
  RECENT_WINDOW,
  deleteMessage,
  listMessages,
  listMessagesAround,
  listMessagesBefore,
  listRoomAttachments,
  listRooms,
  searchMessages,
  markRead,
  sendMessage,
  updateMessage,
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
    reply_to_id: null,
    edited_at: null,
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
  onInsert?: (table: string, row: Record<string, unknown>) => void;
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
      not: () => selectChain,
      is: () => selectChain,
      lt: () => selectChain,
      ilike: () => selectChain,
      gte: () => selectChain,
      order: () => selectChain,
      limit: result,
      then: undefined,
    };
    return {
      select: () => selectChain,
      insert: (row: Record<string, unknown>) => {
        opts.onInsert?.(table, row);
        return {
          select: () => ({
            single: async () =>
              opts.insertError
                ? { data: null, error: opts.insertError }
                : { data: messages[0] ?? messageRow(), error: null },
          }),
        };
      },
      update: (patch: Record<string, unknown>) => {
        opts.onUpdate?.(table, patch);
        // eq/is는 자기 자신을 돌려주는 체인. 끝을 await하면 { error: null }처럼 읽히고,
        // select().single()은 첫 메시지 행을 준다 — updateMessage가 갱신 행을 돌려받는 경로.
        const chain: Record<string, unknown> = {
          eq: () => chain,
          is: () => chain,
          select: () => ({
            single: async () => ({ data: messages[0] ?? messageRow(), error: null }),
          }),
          error: null,
          then: undefined,
        };
        return chain;
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

// 2026-07-27 : 메신저 - 안 읽은 수 (Phase 51)
// 방마다 count 쿼리를 돌리면 방 개수만큼 왕복이 생긴다(방 200개면 200번).
// 한 번에 받아 방별로 나누는 대신 **창 밖은 못 센다** — 그 한계를 값으로 잠근다.
describe("안 읽은 수 창", () => {
  it("한 번에 훑는 개수에 상한이 있다", () => {
    expect(RECENT_WINDOW).toBeGreaterThan(0);
    expect(RECENT_WINDOW).toBeLessThanOrEqual(1000);
  });

  it("한 화면에 불러오는 메시지 수보다 크다 (그보다 작으면 방 하나도 못 센다)", () => {
    expect(RECENT_WINDOW).toBeGreaterThan(MESSAGE_PAGE_SIZE);
  });
});

// 2026-07-29 : 메신저 - 방별 사진 모아보기 (Phase 51 T5)
describe("listRoomAttachments", () => {
  it("경로를 오래된 순으로 돌려준다 (뷰어 이동 순서와 같아야 한다)", async () => {
    // 서버는 최신순으로 잘라 받는다 — 목이 그 응답을 흉내 낸다.
    const rows = [{ attachment_path: "r/p3.webp", seq: 3 }, { attachment_path: "r/p1.webp", seq: 1 }];
    const list = await listRoomAttachments(fakeSupabase({ messages: rows }), ROOM_ROW.id);
    expect(list).toEqual(["r/p1.webp", "r/p3.webp"]);
  });

  it("빈 방이면 빈 배열", async () => {
    expect(await listRoomAttachments(fakeSupabase({ messages: [] }), ROOM_ROW.id)).toEqual([]);
  });
});

// 2026-07-29 : 메신저 - 변환 영수증 (Phase 52 T1)
describe("sendMessage 종류", () => {
  it("system 종류가 그대로 저장된다 (변환 영수증)", async () => {
    const inserted: Record<string, unknown>[] = [];
    const s = fakeSupabase({ onInsert: (_t, row) => inserted.push(row) });
    await sendMessage(s, { roomId: ROOM_ROW.id, body: "영수증", clientMsgId: "c9", type: "system" });
    expect(inserted[0]?.type).toBe("system");
  });

  it("종류를 안 주면 text다 (기존 호출부 하위호환)", async () => {
    const inserted: Record<string, unknown>[] = [];
    const s = fakeSupabase({ onInsert: (_t, row) => inserted.push(row) });
    await sendMessage(s, { roomId: ROOM_ROW.id, body: "안녕", clientMsgId: "c10" });
    expect(inserted[0]?.type).toBe("text");
  });
});

// 2026-07-29 : 메신저 - 메시지 수정 (Phase 51 T4 잔여)
describe("updateMessage", () => {
  it("본문과 수정 시각을 함께 남긴다 (흔적 없이 바꾸지 않는다)", async () => {
    const patches: Record<string, unknown>[] = [];
    const s = fakeSupabase({ messages: [messageRow()], onUpdate: (_t, p) => patches.push(p) });
    await updateMessage(s, "m1", "고친 말");
    expect(patches).toHaveLength(1);
    expect(patches[0]).toMatchObject({ body: "고친 말" });
    expect(patches[0]).toHaveProperty("edited_at");
  });

  it("빈 내용으로 고칠 수 없다 (삭제와 수정을 섞지 않는다)", async () => {
    const s = fakeSupabase({ messages: [messageRow()] });
    await expect(updateMessage(s, "m1", "   ")).rejects.toThrow("삭제");
  });

  it("4000자를 넘길 수 없다 (보낼 때와 같은 상한)", async () => {
    const s = fakeSupabase({ messages: [messageRow()] });
    await expect(updateMessage(s, "m1", "x".repeat(4001))).rejects.toThrow("4000");
  });

  it("앞뒤 공백을 정리해 저장한다", async () => {
    const patches: Record<string, unknown>[] = [];
    const s = fakeSupabase({ messages: [messageRow()], onUpdate: (_t, p) => patches.push(p) });
    await updateMessage(s, "m1", "  고친 말  ");
    expect(patches[0]).toMatchObject({ body: "고친 말" });
  });
});

// 2026-07-29 : 메신저 - 표적 주변 로딩 (Phase 51 T3 잔여)
describe("listMessagesAround", () => {
  it("표적을 찾지 못하면 null (호출부가 평소 목록으로 폴백한다)", async () => {
    const list = await listMessagesAround(fakeSupabase({ messages: [] }), ROOM_ROW.id, "없는-id");
    expect(list).toBeNull();
  });
});

describe("listMessagesBefore", () => {
  it("최신순으로 받아 오래된 순으로 돌려준다 (위로 이어 붙일 조각)", async () => {
    const rows = [messageRow({ id: "aaaaaaaa-0000-4000-8000-000000000005", seq: 5 }),
                  messageRow({ id: "aaaaaaaa-0000-4000-8000-000000000004", seq: 4 })];
    const list = await listMessagesBefore(fakeSupabase({ messages: rows }), ROOM_ROW.id, 6);
    expect(list.map((m) => m.seq)).toEqual([4, 5]);
  });

  it("더 없으면 빈 배열 (호출부가 '처음까지 왔다'로 안다)", async () => {
    expect(await listMessagesBefore(fakeSupabase({ messages: [] }), ROOM_ROW.id, 1)).toEqual([]);
  });
});

// 2026-07-29 : 메신저 - 방 전체 메시지 수집 (Phase 55 T2)
describe("fetchAllRoomMessages", () => {
  // 페이지 경계를 실제로 검증하려면 lt(seq)와 limit을 존중하는 목이 필요하다 —
  // 공용 fakeSupabase는 필터를 무시하고 같은 행을 돌려줘 루프 검사에 못 쓴다.
  function pagingSupabase(total: number) {
    const rows = Array.from({ length: total }, (_, i) =>
      messageRow({
        id: `aaaaaaaa-0000-4000-8000-${String(i + 1).padStart(12, "0")}`,
        seq: i + 1,
        client_msg_id: `c${i + 1}`,
      }),
    );
    const query = (table: string) => {
      let beforeSeq = Infinity;
      const chain: Record<string, unknown> = {
        eq: () => chain,
        is: () => chain,
        ilike: () => chain,
        order: () => chain,
        lt: (_col: string, v: number) => {
          beforeSeq = v;
          return chain;
        },
        limit: async (n: number) => {
          if (table !== "messages") return { data: [], error: null };
          const hit = rows.filter((r) => r.seq < beforeSeq).sort((a, b) => b.seq - a.seq);
          return { data: hit.slice(0, n), error: null };
        },
      };
      return { select: () => chain };
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- 테스트용 최소 목
    return { from: (t: string) => query(t) } as any;
  }

  it("화면 창(50개) 밖 과거까지 전부 읽는다", async () => {
    const { messages, hitGuard } = await fetchAllRoomMessages(pagingSupabase(120), ROOM_ROW.id);
    expect(messages).toHaveLength(120);
    expect(messages.map((m) => m.seq)).toEqual(
      Array.from({ length: 120 }, (_, i) => i + 1),
    );
    expect(hitGuard).toBe(false);
  });

  it("빈 방은 빈 배열, 가드 미작동", async () => {
    const r = await fetchAllRoomMessages(pagingSupabase(0), ROOM_ROW.id);
    expect(r.messages).toEqual([]);
    expect(r.hitGuard).toBe(false);
  });

  it("왕복 가드에 닿으면 조용히 자르지 않고 hitGuard로 알린다", async () => {
    // 가드(100회) × 50개 + 첫 페이지 50개 = 5,050개 초과분이 있으면 잘린다.
    const r = await fetchAllRoomMessages(pagingSupabase(5100), ROOM_ROW.id);
    expect(r.hitGuard).toBe(true);
    expect(r.messages.length).toBeLessThan(5100);
  });
});

// 2026-07-29 : 메신저 - 검색 필터 (Phase 55 T1)
describe("searchMessages 필터", () => {
  // 어떤 조건이 실제 쿼리에 얹혔는지 붙잡는 목 — 필터가 조용히 무시되면 사용자는
  // "필터가 걸렸다"고 믿은 채 전체 결과를 본다.
  function capturingSupabase() {
    const calls: Array<[string, ...unknown[]]> = [];
    const chain: Record<string, unknown> = {};
    for (const name of ["eq", "is", "ilike", "gte", "lt", "not", "order"]) {
      chain[name] = (...a: unknown[]) => {
        calls.push([name, ...a]);
        return chain;
      };
    }
    chain.limit = async () => ({ data: [], error: null });
    return {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- 테스트용 최소 목
      supabase: { from: () => ({ select: () => chain }) } as any,
      calls,
    };
  }

  it("보낸 사람 필터가 sender_type 조건으로 얹힌다", async () => {
    const { supabase, calls } = capturingSupabase();
    await searchMessages(supabase, "안녕", { sender: "agent" });
    expect(calls).toContainEqual(["eq", "sender_type", "agent"]);
  });

  it("기간 필터가 KST 경계(gte·lt)로 얹힌다", async () => {
    const { supabase, calls } = capturingSupabase();
    await searchMessages(supabase, "안녕", { from: "2026-07-29", to: "2026-07-29" });
    expect(calls).toContainEqual(["gte", "created_at", "2026-07-28T15:00:00.000Z"]);
    expect(calls).toContainEqual(["lt", "created_at", "2026-07-29T15:00:00.000Z"]);
  });

  it("사진만 필터가 attachment_path 조건으로 얹힌다", async () => {
    const { supabase, calls } = capturingSupabase();
    await searchMessages(supabase, "안녕", { withImage: true });
    expect(calls).toContainEqual(["not", "attachment_path", "is", null]);
  });

  it("필터를 안 주면 아무 조건도 늘지 않는다 (기존 동작 보존)", async () => {
    const { supabase, calls } = capturingSupabase();
    await searchMessages(supabase, "안녕");
    expect(calls.filter(([n]) => n === "eq" || n === "gte" || n === "lt" || n === "not")).toEqual([]);
  });
});

// 2026-07-29 : 메신저 - 날짜로 이동 (Phase 55 T4 E-039)
describe("firstMessageOnOrAfter", () => {
  function capturing(rows: unknown[] = []) {
    const calls: Array<[string, ...unknown[]]> = [];
    const chain: Record<string, unknown> = {};
    for (const name of ["eq", "gte", "order"]) {
      chain[name] = (...a: unknown[]) => {
        calls.push([name, ...a]);
        return chain;
      };
    }
    chain.limit = async () => ({ data: rows, error: null });
    return {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- 테스트용 최소 목
      supabase: { from: () => ({ select: () => chain }) } as any,
      calls,
    };
  }

  it("KST 그 날 시작 이후의 첫 메시지를 찾는다 (seq 오름차순)", async () => {
    const { supabase, calls } = capturing([messageRow({ seq: 7 })]);
    const m = await firstMessageOnOrAfter(supabase, ROOM_ROW.id, "2026-07-29");
    expect(m?.seq).toBe(7);
    expect(calls).toContainEqual(["eq", "room_id", ROOM_ROW.id]);
    expect(calls).toContainEqual(["gte", "created_at", "2026-07-28T15:00:00.000Z"]);
    expect(calls).toContainEqual(["order", "seq", { ascending: true }]);
  });

  it("그 날 이후 메시지가 없으면 null", async () => {
    const { supabase } = capturing([]);
    expect(await firstMessageOnOrAfter(supabase, ROOM_ROW.id, "2026-07-29")).toBeNull();
  });

  it("날짜 형식이 아니면 조회 없이 null (전체 첫 메시지로 점프하면 안 된다)", async () => {
    const { supabase, calls } = capturing([messageRow({ seq: 1 })]);
    expect(await firstMessageOnOrAfter(supabase, ROOM_ROW.id, "29-07-2026")).toBeNull();
    expect(calls).toEqual([]);
  });
});
