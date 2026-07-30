import { NextResponse } from "next/server";
import {
  allowRequest,
  listFeeds,
  collectFeed,
  listUnsummarizedArticles,
  summarizeArticle,
  setArticleSummary,
  recordEvent,
} from "@ldd/api";
import { isLddError } from "@ldd/core";
import { createClient } from "@/lib/supabase/server";
import { blockIfFeatureDisabled } from "@/lib/featureGate";
import { requireGeminiKey } from "@/lib/apiHelpers";

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
  // 2026-07-30: 기능 토글을 서버에서도 확인한다(화면만 숨기면 주소로 직접 부를 수 있다).
  // `news` 기능이 곧 "RSS 구독과 요약"이라 이 라우트가 정확히 그 일이다.
  const blocked = await blockIfFeatureDisabled(supabase, user.id, "news");
  if (blocked) return blocked;
  const keyOrError = requireGeminiKey();
  if (keyOrError instanceof NextResponse) return keyOrError;
  const apiKey = keyOrError;

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
    // 요약 대상만 DB에서 직접 고른다. 예전엔 최신 100개를 가져와 앱에서 걸렀는데, 수집이
    // 요약보다 빠르면 요약 안 된 기사가 그 창 밖으로 밀려나 **영영 요약되지 않았다.**
    const pending = await listUnsummarizedArticles(supabase, MAX_SUMMARIES_PER_RUN);
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

    // 2026-07-26 (피드백 3-2 배치 로그): 자동 작업이 언제 돌아 무엇을 했는지 남긴다.
    // recordEvent는 절대 던지지 않으므로 수집 결과가 로그 때문에 유실되지 않는다.
    await recordEvent(supabase, {
      name: "batch:news-collect",
      detail: `피드 수집`,
      result: `새 기사 ${collected}건 · 요약 ${summarized}건${pausedNow.length ? ` · 일시정지 ${pausedNow.length}` : ""}`,
    });

    return NextResponse.json({ collected, summarized, paused: pausedNow });
  } catch (error) {
    console.error("뉴스 수집 실패", { userId: user.id, error });
    // 실패도 남긴다 — 에러 로그(3-2)는 실패가 기록될 때만 의미가 있다.
    await recordEvent(supabase, {
      name: "batch:news-collect",
      detail: "피드 수집",
      status: "error",
      result: error instanceof Error ? error.message : "알 수 없는 오류",
    });
    return NextResponse.json(
      { error: "수집에 실패했어요. 잠시 후 다시 시도해주세요." },
      { status: 502 },
    );
  }
}
