"use client";

// 2026-07-29 : 메신저 - 방 이름 필터 (Phase 55 T1 L-023)
// 방이 늘면 스크롤로 찾게 된다. 목록은 서버가 이미 다 실어 줬으므로(ROOM_LIST_LIMIT 200)
// 필터는 클라이언트 순수 계산 — 왕복 0회. 판정은 core `filterRoomsByTitle` 한 벌이라
// "보이는 제목"(기본 제목 포함)과 "걸리는 제목"이 어긋나지 않는다.

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { ensureAgentRoom, sendAgentMessage, type RoomListItem } from "@ldd/api";
import { filterRoomsByTitle, roomDisplayTitle } from "@ldd/core";
import { createClient } from "@/lib/supabase/client";

// 이 개수 미만이면 필터 입력을 숨긴다 — 방 두 개에 검색창은 소음이다.
const FILTER_MIN_ROOMS = 6;

export function RoomList({ rooms }: { rooms: RoomListItem[] }) {
  const [q, setQ] = useState("");
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const visible = filterRoomsByTitle(rooms, q);

  // 2026-07-29 : 메신저 - 오리 방 입구 (사용자 피드백 — 방 생성 경로가 없어 목록이 늘 비었다).
  // 있으면 열고 없으면 만든다(ensureAgentRoom). 중복 클릭은 opening으로 막는다.
  async function openDuckRoom() {
    if (opening) return;
    setOpening(true);
    setError(null);
    try {
      const client = createClient();
      const { room, created } = await ensureAgentRoom(client);
      // 처음 만든 방이면 오리가 먼저 인사한다 — 빈 화면으로 시작하면 "아무것도 없다"로
      // 보인다(사용자 피드백의 잔재). 기존 방에는 안 넣는다(중복 인사 방지). 인사 실패는
      // 입장을 막지 않는다 — 방은 이미 있다.
      if (created) {
        await sendAgentMessage(client, {
          roomId: room.id,
          body:
            "꽥! 오리예요. 여기서 무엇이든 물어보세요 — 할 일·일정·노트·지원 현황을 알고 있어요.\n/를 입력하면 쓸 수 있는 명령도 보여요.",
          clientMsgId: crypto.randomUUID(),
        }).catch(() => {});
      }
      router.push(`/messages/${room.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setOpening(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => void openDuckRoom()}
        disabled={opening}
        className="mb-3 w-full rounded-lg border border-border bg-primary/10 p-3 text-left text-sm font-medium hover:bg-primary/20 disabled:opacity-50"
      >
        {opening ? "오리 방 여는 중…" : "오리와 대화하기"}
      </button>
      {error && (
        <p role="alert" className="mb-2 text-xs text-destructive break-keep">
          {error}
        </p>
      )}
      {rooms.length >= FILTER_MIN_ROOMS && (
        <div className="mb-2">
          <label htmlFor="room-filter" className="sr-only">
            방 이름으로 거르기
          </label>
          <input
            id="room-filter"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="방 이름으로 거르기"
            className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm"
          />
        </div>
      )}

      {visible.length === 0 ? (
        <p className="rounded-lg border border-border p-4 text-sm text-muted-foreground break-keep">
          {rooms.length === 0
            ? "아직 대화가 없어요. 위의 \"오리와 대화하기\"로 시작해 보세요."
            : "그런 이름의 방이 없어요."}
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {visible.map((room) => (
            <li key={room.id}>
              <Link href={`/messages/${room.id}`} className="block p-3 hover:bg-accent">
                <span className="text-sm font-medium">
                  {/* 고정한 방은 표시가 있어야 왜 위에 있는지 알 수 있다.
                      이모지 대신 글자로 둔다(CLAUDE.md 6절). */}
                  {room.pinnedAt && (
                    <span className="mr-1 rounded border border-border px-1 text-[10px] text-muted-foreground">
                      고정
                    </span>
                  )}
                  {roomDisplayTitle(room)}
                  {room.unread > 0 && (
                    <span
                      className="ml-2 rounded-full bg-primary px-1.5 text-[10px] text-primary-foreground"
                      aria-label={`안 읽은 메시지 ${room.unread}건`}
                    >
                      {/* 99를 넘으면 정확한 수보다 "많다"가 더 쓸모 있다. 창 밖은 못 세기도 한다. */}
                      {room.unread > 99 ? "99+" : room.unread}
                    </span>
                  )}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
