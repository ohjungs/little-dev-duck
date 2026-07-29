// 2026-07-29 : 연동 - 워크스페이스 신호를 오리 방에 기록 (Phase 59 T1 S-009)
// 뽀모도로 완료 같은 일이 오리 방에 system 안내줄로 남는다 — 오리 방이 하루의 기록이 된다.
// 원칙: **방을 만들지 않는다**(오리 방이 없으면 조용히 스킵 — 사용자가 안 만든 방을
// 자동 생성하면 놀란다) · **실패는 조용히**(본 기능인 뽀모도로/습관이 기록 때문에 죽으면 안 된다).

import type { SupabaseClient } from "@supabase/supabase-js";
import { listRooms, sendMessage } from "@ldd/api";
import { recordClientError } from "./clientErrorLog";

/** 오리(agent) 방에 system 기록을 남긴다. 방이 없으면 false(스킵), 남겼으면 true. 던지지 않는다. */
export async function recordToDuckRoom(
  supabase: SupabaseClient,
  body: string,
): Promise<boolean> {
  try {
    const rooms = await listRooms(supabase);
    const duckRoom = rooms.find((r) => r.type === "agent");
    if (!duckRoom) return false;
    await sendMessage(supabase, {
      roomId: duckRoom.id,
      body,
      clientMsgId: crypto.randomUUID(),
      type: "system",
    });
    return true;
  } catch (e) {
    recordClientError(
      `오리 방 기록 실패: ${e instanceof Error ? e.message : String(e)}`,
    );
    return false;
  }
}
