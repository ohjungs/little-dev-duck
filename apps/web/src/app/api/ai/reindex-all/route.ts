import { NextResponse } from "next/server";
import {
  allowRequest,
  indexSource,
  listCalendarEvents,
  listHabits,
  listMemos,
  listPages,
  listTodos,
} from "@ldd/api";
import { pageEmbedText,
  todoEmbedText,
  calendarEventEmbedText,
} from "@ldd/core";
import type { EmbeddingSource } from "@ldd/core";
import { planReindex, type ReindexItem } from "@/lib/reindexPlan";
import { createClient } from "@/lib/supabase/server";
import { requireGeminiKey } from "@/lib/apiHelpers";

export const dynamic = "force-dynamic";


// 무료 티어 보호: 1회 백필로 인덱싱할 최대 항목 수. 순차 처리로 Gemini RPM도 완만하게.

// 기존 메모·할일을 일괄 인덱싱(백필). 저장 시 인덱싱(/api/ai/embed)은 신규·수정분만 다루므로,
// 이미 있던 데이터를 검색 가능하게 하려면 사용자가 한 번 이 백필을 실행해야 한다.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  if (!allowRequest(`ai-reindex:${user.id}`, 3, 60_000)) {
    return NextResponse.json(
      { error: "요청이 많습니다. 잠시 후 다시 시도해주세요." },
      { status: 429 },
    );
  }

  const keyOrError = requireGeminiKey();
  if (keyOrError instanceof NextResponse) return keyOrError;
  const apiKey = keyOrError;

  // 이어서 처리할 위치. 클라이언트가 지난 실행의 nextOffset을 그대로 돌려보낸다.
  let offset = 0;
  try {
    const body = (await request.json()) as { offset?: unknown };
    if (typeof body?.offset === "number") offset = body.offset;
  } catch {
    // 본문이 없거나 JSON이 아니면 처음부터 — 기존 호출(본문 없음)과 호환된다.
  }

  try {
    const [memos, todos, habits, events, pages] = await Promise.all([
      listMemos(supabase),
      listTodos(supabase),
      listHabits(supabase),
      listCalendarEvents(supabase),
      listPages(supabase),
    ]);
    // 소스별로 나눈 뒤 라운드로빈으로 인터리브해 MAX_ITEMS 상한을 공평 분배한다 — 한 소스(특히 텍스트가
    // 풍부한 page)가 concat 순서상 뒤에 밀려 통째로 잘려나가지 않게 한다.
    const bySource: ReindexItem[][] = [
      memos.map((m) => ({
        sourceType: "memo",
        sourceId: m.id,
        text: m.content,
      })),
      todos.map((t) => ({
        sourceType: "todo",
        sourceId: t.id,
        text: todoEmbedText(t.title, t.isDone, t.dueDate),
      })),
      habits.map((h) => ({ sourceType: "habit", sourceId: h.id, text: h.title })),
      events.map((e) => ({
        sourceType: "calendar_event",
        sourceId: e.id,
        text: calendarEventEmbedText(e.title, e.startAt, e.endAt),
      })),
      pages.map((p) => ({
        sourceType: "page",
        sourceId: p.id,
        // 행 속성값은 plain_text에 없다 — 백필에서도 함께 넣어야 기존 데이터가 검색된다.
        text: pageEmbedText(p.plainText, p.rowProps),
      })),
    ];
    // offset부터 이어서 처리한다. 예전엔 매번 앞 200개만 잡아 **그 뒤는 영영 색인되지
    // 않았다**(자동 백필도, 버튼을 여러 번 눌러도). 순서는 실행마다 같아야 offset이 의미를 갖는다.
    const plan = planReindex(bySource, offset);
    const items = plan.items;

    // 순차 처리: 무료 티어 RPM 보호 + 쿼터 소진 시 여기까지는 인덱싱 유지(indexSource가 던지면 중단).
    let indexed = 0;
    for (const item of items) {
      await indexSource(supabase, apiKey, { userId: user.id, ...item });
      indexed += 1;
    }
    // total은 **잘리기 전 전체 개수**다. 예전엔 잘린 개수를 돌려줘 indexed === total이 되어
    // 늘 "다 됐다"처럼 보였고, 그걸 믿은 클라이언트가 완료 플래그를 남겨 나머지를 버렸다.
    return NextResponse.json({
      indexed,
      total: plan.total,
      nextOffset: offset + indexed,
      done: offset + indexed >= plan.total,
    });
  } catch (error) {
    console.error("AI reindex-all 실패", { userId: user.id, error });
    return NextResponse.json(
      { error: "인덱싱 중 일부가 실패했습니다(쿼터 등). 잠시 후 다시 시도하면 이어집니다." },
      { status: 502 },
    );
  }
}
