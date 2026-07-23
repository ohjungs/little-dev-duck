import type { SupabaseClient } from "@supabase/supabase-js";
import {
  feedSchema,
  articleSchema,
  normalizeUrl,
  parseRssItems,
  FEED_FAIL_THRESHOLD,
  type Feed,
  type Article,
} from "@ldd/core";
import { GEMINI_GEN_MODEL, upstreamError, safeBody } from "./gemini";

// Phase 15 뉴스 파이프라인 — 피드 CRUD + 수집(중복제거·자동일시정지) + Gemini 3줄 요약.
// 저작권: articles엔 3줄 요약+원문 링크만. 본문 전문은 저장하지 않는다.
const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";

// 서버(수집 라우트)가 사용자 지정 URL을 fetch하므로, 내부/사설 대역으로의 SSRF를 피드 등록 시 차단한다.
// 개인 단일 사용자 도구라 위험은 자기 자신에 한정되지만(RLS로 본인 피드만 수집), 메타데이터 엔드포인트
// (169.254.169.254) 등 발등찍기 방지용 최소 방어. DNS 리바인딩까지는 막지 않는다(YAGNI).
const PRIVATE_HOST =
  /^(localhost$|127\.|0\.0\.0\.0$|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|\[?::1\]?$|\[?fc|\[?fd)/i;

type FeedRow = {
  id: string;
  user_id: string;
  url: string;
  title: string | null;
  folder: string | null;
  status: string;
  fail_count: number;
  created_at: string;
};

type ArticleRow = {
  id: string;
  user_id: string;
  feed_id: string;
  url_hash: string;
  title: string;
  link: string;
  snippet: string | null;
  summary: string | null;
  published_at: string | null;
  created_at: string;
};

function feedFromRow(r: FeedRow): Feed {
  return feedSchema.parse({
    id: r.id,
    userId: r.user_id,
    url: r.url,
    title: r.title,
    folder: r.folder,
    status: r.status,
    failCount: r.fail_count,
    createdAt: r.created_at,
  });
}

function articleFromRow(r: ArticleRow): Article {
  return articleSchema.parse({
    id: r.id,
    userId: r.user_id,
    feedId: r.feed_id,
    urlHash: r.url_hash,
    title: r.title,
    link: r.link,
    snippet: r.snippet,
    summary: r.summary,
    publishedAt: r.published_at,
    createdAt: r.created_at,
  });
}

async function requireUserId(supabase: SupabaseClient): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("로그인이 필요합니다.");
  return user.id;
}

// 정규화 URL의 SHA-256(중복 판정 키). Web Crypto라 Node 20+·브라우저 공통.
async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function addFeed(
  supabase: SupabaseClient,
  input: { url: string; title?: string | null; folder?: string | null },
): Promise<Feed> {
  const userId = await requireUserId(supabase);
  const url = input.url.trim();
  let host: string;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error("bad protocol");
    }
    host = parsed.hostname;
  } catch {
    throw new Error("올바른 URL이 아닙니다.");
  }
  if (PRIVATE_HOST.test(host)) {
    throw new Error("내부/사설 주소는 피드로 등록할 수 없어요.");
  }
  const { data, error } = await supabase
    .from("feeds")
    .insert({
      user_id: userId,
      url,
      title: input.title ?? null,
      folder: input.folder ?? null,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return feedFromRow(data as FeedRow);
}

export async function listFeeds(supabase: SupabaseClient): Promise<Feed[]> {
  const { data, error } = await supabase
    .from("feeds")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => feedFromRow(r as FeedRow));
}

export async function setFeedStatus(
  supabase: SupabaseClient,
  feedId: string,
  status: "active" | "paused",
): Promise<void> {
  // 수동 재개/일시정지 시 fail_count도 리셋(자동 일시정지 카운터와 통일).
  const { error } = await supabase
    .from("feeds")
    .update({ status, fail_count: 0 })
    .eq("id", feedId);
  if (error) throw new Error(error.message);
}

export async function deleteFeed(
  supabase: SupabaseClient,
  feedId: string,
): Promise<void> {
  const { error } = await supabase.from("feeds").delete().eq("id", feedId);
  if (error) throw new Error(error.message);
}

export async function listArticles(
  supabase: SupabaseClient,
  limit = 50,
): Promise<Article[]> {
  const { data, error } = await supabase
    .from("articles")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => articleFromRow(r as ArticleRow));
}

// Postgres unique_violation — 같은 기사 재수집은 정상이므로 에러가 아니라 스킵으로 다룬다.
function isDuplicate(error: { code?: string } | null): boolean {
  return error?.code === "23505";
}

export type CollectDeps = {
  fetchImpl?: typeof fetch;
  hashImpl?: (input: string) => Promise<string>;
};

// 피드 1개 수집: fetch→파싱→정규화·해시→중복 제외 insert. 실패 시 fail_count 증가·임계 도달 시
// 자동 일시정지. 성공 시 fail_count 리셋. 반환: 새로 저장한 기사 수 + 이번에 일시정지됐는지.
export async function collectFeed(
  supabase: SupabaseClient,
  feed: Feed,
  deps: CollectDeps = {},
): Promise<{ inserted: number; paused: boolean }> {
  const userId = await requireUserId(supabase);
  const doFetch = deps.fetchImpl ?? fetch;
  const doHash = deps.hashImpl ?? sha256Hex;

  let xml: string;
  try {
    const res = await doFetch(feed.url, {
      headers: { "user-agent": "LittleDevDuck/1.0 (+rss)" },
    });
    if (!res.ok) throw new Error(`feed HTTP ${res.status}`);
    xml = await res.text();
  } catch {
    const nextFail = feed.failCount + 1;
    const paused = nextFail >= FEED_FAIL_THRESHOLD;
    await supabase
      .from("feeds")
      .update({ fail_count: nextFail, status: paused ? "paused" : feed.status })
      .eq("id", feed.id);
    return { inserted: 0, paused };
  }

  if (feed.failCount > 0) {
    await supabase.from("feeds").update({ fail_count: 0 }).eq("id", feed.id);
  }

  const items = parseRssItems(xml);
  let inserted = 0;
  for (const item of items) {
    const urlHash = await doHash(normalizeUrl(item.link));
    const { error } = await supabase.from("articles").insert({
      user_id: userId,
      feed_id: feed.id,
      url_hash: urlHash,
      title: item.title.slice(0, 300),
      link: item.link,
      snippet: item.snippet,
      summary: null,
      published_at: item.publishedAt,
    });
    if (!error) inserted += 1;
    else if (!isDuplicate(error)) throw new Error(error.message);
  }
  return { inserted, paused: false };
}

// Gemini 3줄 요약(클릭베이트 배제). 캐시는 호출부에서 summary=null인 기사만 넘겨 담당한다.
export async function summarizeArticle(
  apiKey: string,
  article: { title: string; snippet: string | null },
  fetchImpl: typeof fetch = fetch,
): Promise<string> {
  const prompt = [
    "다음 뉴스 기사를 한국어 3줄로 요약해줘. 과장·클릭베이트 없이 사실만, 각 줄은 '- '로 시작.",
    "본문 전문을 그대로 옮기지 말고 핵심만 압축해.",
    "",
    `제목: ${article.title}`,
    `요약 원문: ${article.snippet ?? "(없음 — 제목 기준으로만)"}`,
  ].join("\n");
  const res = await fetchImpl(
    `${GEMINI_BASE}/models/${GEMINI_GEN_MODEL}:generateContent`,
    {
      method: "POST",
      headers: { "x-goog-api-key": apiKey, "content-type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
      }),
    },
  );
  if (!res.ok) throw upstreamError(res.status, await safeBody(res), "gemini");
  const json = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = (json.candidates?.[0]?.content?.parts ?? [])
    .map((p) => p.text ?? "")
    .join("")
    .trim();
  return text;
}

export async function setArticleSummary(
  supabase: SupabaseClient,
  articleId: string,
  summary: string,
): Promise<void> {
  const { error } = await supabase
    .from("articles")
    .update({ summary })
    .eq("id", articleId);
  if (error) throw new Error(error.message);
}
