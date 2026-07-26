import { listMessages } from "@ldd/api";
import { pendingMigrationMessage, type Message } from "@ldd/core";
import { MessageRoom } from "@/components/MessageRoom";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// 2026-07-27 : 메신저 - 대화 화면 (Phase 50 T3)
// 첫 목록은 서버에서 읽어 넘긴다 — 화면이 빈 채로 깜빡이지 않게. 이후 갱신은 실시간 구독이 맡는다.
// 테이블이 아직 없는 상태(마이그레이션 대기)에서도 화면은 열려야 하므로 안내로 대체한다.

export default async function MessageRoomPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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
  let notice: string | null = null;
  try {
    initial = await listMessages(supabase, id);
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
        <MessageRoom roomId={id} initialMessages={initial} myUserId={user.id} />
      )}
    </div>
  );
}
