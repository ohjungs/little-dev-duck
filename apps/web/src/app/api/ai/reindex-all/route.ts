import { NextResponse } from "next/server";
import {
  allowRequest,
  indexSource,
  listMemos,
  listTodos,
} from "@ldd/api";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// 무료 티어 보호: 1회 백필로 인덱싱할 최대 항목 수. 순차 처리로 Gemini RPM도 완만하게.
const MAX_ITEMS = 200;

// 기존 메모·할일을 일괄 인덱싱(백필). 저장 시 인덱싱(/api/ai/embed)은 신규·수정분만 다루므로,
// 이미 있던 데이터를 검색 가능하게 하려면 사용자가 한 번 이 백필을 실행해야 한다.
export async function POST() {
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

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY 환경변수가 설정되지 않았습니다." },
      { status: 500 },
    );
  }

  try {
    const [memos, todos] = await Promise.all([
      listMemos(supabase),
      listTodos(supabase),
    ]);
    const items = [
      ...memos.map((m) => ({
        sourceType: "memo" as const,
        sourceId: m.id,
        text: m.content,
      })),
      ...todos.map((t) => ({
        sourceType: "todo" as const,
        sourceId: t.id,
        text: t.title,
      })),
    ].slice(0, MAX_ITEMS);

    // 순차 처리: 무료 티어 RPM 보호 + 쿼터 소진 시 여기까지는 인덱싱 유지(indexSource가 던지면 중단).
    let indexed = 0;
    for (const item of items) {
      await indexSource(supabase, apiKey, { userId: user.id, ...item });
      indexed += 1;
    }
    return NextResponse.json({ indexed, total: items.length });
  } catch (error) {
    console.error("AI reindex-all 실패", { userId: user.id, error });
    return NextResponse.json(
      { error: "인덱싱 중 일부가 실패했습니다(쿼터 등). 잠시 후 다시 시도하면 이어집니다." },
      { status: 502 },
    );
  }
}
