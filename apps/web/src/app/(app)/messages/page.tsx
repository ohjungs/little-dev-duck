import { MessageSquare } from "lucide-react";
import Link from "next/link";

import { listRoomsWithPin } from "@ldd/api";
import { pendingMigrationMessage } from "@ldd/core";
import { MessageSearch } from "@/components/MessageSearch";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// 2026-07-27 : 메신저 - 방 목록 (Phase 50 T2)
//
// **이 화면은 테이블이 아직 없는 상태에서도 열려야 한다.** 마이그레이션 5건이 적용 대기이고
// 적용은 사용자만 할 수 있다. 그 상태에서 조회하면 PostgREST가
// "Could not find the table 'public.rooms'"를 돌려주는데, 그 원문을 그대로 보여 주면
// 사용자는 자기가 뭘 잘못했는지 의심한다 — 사실은 **알려진 대기 상태**다.
// core `pendingMigrationMessage`가 그 신호를 사람 말로 바꾼다.
//
// **오리 채팅(DuckChatPanel)은 건드리지 않았다.** 지금 그걸 방으로 갈아끼우면
// 테이블이 없어서 **잘 되던 대화가 깨진다.** 흡수는 마이그레이션이 적용된 뒤에 한다.

export default async function MessagesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-muted-foreground">로그인이 필요합니다.</p>
      </div>
    );
  }

  let rooms: Awaited<ReturnType<typeof listRoomsWithPin>> = [];
  let notice: string | null = null;
  try {
    rooms = await listRoomsWithPin(supabase);
  } catch (e) {
    const raw = e instanceof Error ? e.message : String(e);
    // 모르는 오류는 삼키지 않는다 — 원문을 보여주는 편이 낫다(저장소 관례).
    notice = pendingMigrationMessage(raw) ?? raw;
  }

  return (
    <div className="mx-auto w-full max-w-2xl p-4">
      <h1 className="mb-4 flex items-center gap-2 text-lg font-semibold">
        <MessageSquare className="size-5" aria-hidden="true" />
        메시지
      </h1>

      {/* 테이블이 없을 땐 검색도 안 되므로 안내만 보여 준다. */}
      {!notice && <MessageSearch />}

      {notice ? (
        <p
          role="status"
          className="rounded-lg border border-border bg-muted/40 p-4 text-sm text-muted-foreground break-keep"
        >
          {notice}
        </p>
      ) : rooms.length === 0 ? (
        <p className="rounded-lg border border-border p-4 text-sm text-muted-foreground break-keep">
          아직 대화가 없어요.
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {rooms.map((room) => (
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
                  {room.title ?? (room.type === "agent" ? "오리와의 대화" : "이름 없는 대화")}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
