import { getRoom, listMessages, listMessagesAround } from "@ldd/api";
import { pendingMigrationMessage, type Message, type Room } from "@ldd/core";
import { MessageRoom } from "@/components/MessageRoom";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// 2026-07-27 : 메신저 - 대화 화면 (Phase 50 T3)
// 첫 목록은 서버에서 읽어 넘긴다 — 화면이 빈 채로 깜빡이지 않게. 이후 갱신은 실시간 구독이 맡는다.
// 테이블이 아직 없는 상태(마이그레이션 대기)에서도 화면은 열려야 하므로 안내로 대체한다.

export default async function MessageRoomPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ focus?: string }>;
}) {
  const { id } = await params;
  // 검색에서 넘어온 "이 메시지로" 표적(L-003). 없으면 평소처럼 바닥에서 시작한다.
  const { focus } = await searchParams;
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

  let initial: Message[] = [];
  let room: Room | null = null;
  let notice: string | null = null;
  try {
    // 방 타입을 함께 싣는다 — 오리(agent) 방에서만 오리가 응답한다.
    room = await getRoom(supabase, id);
    // 표적이 있으면 그 주변 창을 싣는다(L-005) — 최근 페이지 밖의 옛 메시지도 맥락째 보인다.
    // 표적을 못 찾으면(삭제·권한 밖) 평소 목록으로 폴백하고, 화면이 안내를 띄운다.
    initial = focus
      ? ((await listMessagesAround(supabase, id, focus)) ?? (await listMessages(supabase, id)))
      : await listMessages(supabase, id);
  } catch (e) {
    const raw = e instanceof Error ? e.message : String(e);
    // 모르는 오류는 삼키지 않는다 — 원문을 보여주는 편이 낫다(저장소 관례).
    notice = pendingMigrationMessage(raw) ?? raw;
  }

  return (
    <div className="mx-auto w-full max-w-2xl p-4">
      <h1 className="mb-3 text-lg font-semibold">대화</h1>
      {notice ? (
        <p
          role="status"
          className="rounded-lg border border-border bg-muted/40 p-4 text-sm text-muted-foreground break-keep"
        >
          {notice}
        </p>
      ) : (
        <MessageRoom
          // 방 안에서 날짜 점프(E-039)로 focus만 바뀌는 소프트 내비게이션에서도
          // 상태(초기 목록·focus 1회 가드)가 새로 서도록 표적을 key로 건다.
          key={focus ?? "latest"}
          roomId={id}
          roomType={room?.type ?? null}
          initialMessages={initial}
          myUserId={user.id}
          focusId={focus ?? null}
        />
      )}
    </div>
  );
}
