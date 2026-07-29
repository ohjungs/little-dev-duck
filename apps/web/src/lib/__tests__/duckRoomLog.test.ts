import { beforeEach, describe, expect, it, vi } from "vitest";

// 2026-07-29 : 연동 - 오리 방 기록 (Phase 59 T1 S-009)
const listRooms = vi.fn();
const sendMessage = vi.fn();
vi.mock("@ldd/api", () => ({
  listRooms: (...a: unknown[]) => listRooms(...a),
  sendMessage: (...a: unknown[]) => sendMessage(...a),
}));

const { recordToDuckRoom } = await import("../duckRoomLog");

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const client = {} as any;

beforeEach(() => {
  vi.clearAllMocks();
  sendMessage.mockResolvedValue({ id: "m1" });
});

describe("recordToDuckRoom", () => {
  it("오리(agent) 방에 system 기록을 남긴다", async () => {
    listRooms.mockResolvedValue([
      { id: "r-dm", type: "direct" },
      { id: "r-duck", type: "agent" },
    ]);
    expect(await recordToDuckRoom(client, "뽀모도로 완료")).toBe(true);
    expect(sendMessage).toHaveBeenCalledWith(
      client,
      expect.objectContaining({ roomId: "r-duck", body: "뽀모도로 완료", type: "system" }),
    );
  });

  it("오리 방이 없으면 만들지 않고 조용히 스킵", async () => {
    listRooms.mockResolvedValue([{ id: "r-dm", type: "direct" }]);
    expect(await recordToDuckRoom(client, "x")).toBe(false);
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it("실패해도 던지지 않는다 — 본 기능(뽀모도로)이 기록 때문에 죽으면 안 된다", async () => {
    listRooms.mockRejectedValue(new Error("boom"));
    expect(await recordToDuckRoom(client, "x")).toBe(false);
  });
});
