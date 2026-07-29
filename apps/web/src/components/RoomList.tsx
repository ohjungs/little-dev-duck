"use client";

// 2026-07-29 : 메신저 - 방 이름 필터 (Phase 55 T1 L-023)
// 방이 늘면 스크롤로 찾게 된다. 목록은 서버가 이미 다 실어 줬으므로(ROOM_LIST_LIMIT 200)
// 필터는 클라이언트 순수 계산 — 왕복 0회. 판정은 core `filterRoomsByTitle` 한 벌이라
// "보이는 제목"(기본 제목 포함)과 "걸리는 제목"이 어긋나지 않는다.

import { useState } from "react";
import Link from "next/link";

import type { RoomListItem } from "@ldd/api";
import { filterRoomsByTitle, roomDisplayTitle } from "@ldd/core";

// 이 개수 미만이면 필터 입력을 숨긴다 — 방 두 개에 검색창은 소음이다.
const FILTER_MIN_ROOMS = 6;

export function RoomList({ rooms }: { rooms: RoomListItem[] }) {
  const [q, setQ] = useState("");
  const visible = filterRoomsByTitle(rooms, q);

  return (
    <div>
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
          그런 이름의 방이 없어요.
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
