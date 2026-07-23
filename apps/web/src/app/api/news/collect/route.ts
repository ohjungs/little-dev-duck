import { NextResponse } from "next/server";
import {
  allowRequest,
  listFeeds,
  collectFeed,
  listArticles,
  summarizeArticle,
  setArticleSummary,
} from "@ldd/api";
import { isLddError } from "@ldd/core";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// 무료 티어 쿼터 보호: 한 번 실행에 요약은 이 개수까지, 나머지는 다음 실행으로.
const MAX_SUMMARIES_PER_RUN = 8;

// Phase 15: 활성 피드를 모두 수집(중복 제외·자동 일시정지)한 뒤, 아직 요약 없는 기사 일부를 Gemini로
// 3줄 요약한다. 발송(Gmail)·스케줄러(GitHub Actions)는 사용자 인프라라 이 라우트는 수집+요약까지만.
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }
  if (!allowRequest(`news-collect:${user.id}`, 6, 60_000)) {
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
    const feeds = await listFeeds(supabase);
    const active = feeds.filter((f) => f.status === "active");
    let collected = 0;
    const pausedNow: string[] = [];
    for (const feed of active) {
      const r = await collectFeed(supabase, feed, { fetchImpl: fetch });
      collected += r.inserted;
      if (r.paused) pausedNow.push(feed.title ?? feed.url);
    }

    // 요약: summary=null 기사 최신순 상한개까지. 쿼터 소진 시 중단(부분 성공 반환).
    const articles = await listArticles(supabase, 100);
    const pending = articles
      .filter((a) => a.summary === null)
      .slice(0, MAX_SUMMARIES_PER_RUN);
    let summarized = 0;
    for (const a of pending) {
      try {
        const summary = await summarizeArticle(
          apiKey,
          { title: a.title, snippet: a.snippet },
          fetch,
        );
        if (summary) {
          await setArticleSummary(supabase, a.id, summary);
          summarized += 1;
        }
      } catch (e) {
        // 쿼터 소진이면 남은 요약은 다음 실행으로 미룬다(부분 성공). 개별 실패는 스킵.
        if (isLddError(e) && e.code === "quota_exceeded") break;
      }
    }

    return NextResponse.json({ collected, summarized, paused: pausedNow });
  } catch (error) {
    console.error("뉴스 수집 실패", { userId: user.id, error });
    return NextResponse.json(
      { error: "수집에 실패했어요. 잠시 후 다시 시도해주세요." },
      { status: 502 },
    );
  }
}
