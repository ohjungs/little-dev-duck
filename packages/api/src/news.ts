import type { SupabaseClient } from "@supabase/supabase-js";
import {
  feedSchema,
  articleSchema,
  parseRssItems,
  resolveFeedUrl,
  COMMON_FEED_PATHS,
  FEED_FAIL_THRESHOLD,
  buildArticleSummaryPrompt,
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
  /^(localhost$|127\.|0\.0\.0\.0$|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|\[?::1\]?$|\[?fc|\[?fd|::ffff:(127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.))/i;

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

// 추적/분석 파라미터 — 정규화 시 제거해 같은 기사가 다른 링크로 중복 저장되는 걸 막는다.
const TRACKING_PARAM = /^(utm_|fbclid$|gclid$|mc_|ref$|ref_src$|igshid$|_hsenc$|_hsmi$)/i;

// URL 정규화: 호스트 소문자 + 추적 파라미터 제거 + 해시 제거 + 남은 쿼리 정렬 + 끝 슬래시 정리.
// url_hash(중복 판정)의 입력이라 결정론적이어야 한다. 파싱 불가면 trim만 해서 돌려준다.
// (core가 아니라 여기 있는 이유: `new URL`은 웹/노드 전역 타입이고 core는 lib=ES2022뿐이라 CI에서 미해석.)
export function normalizeUrl(raw: string): string {
  const trimmed = raw.trim();
  try {
    const u = new URL(trimmed);
    u.hash = "";
    u.hostname = u.hostname.toLowerCase();
    const kept: [string, string][] = [];
    for (const [k, v] of u.searchParams) {
      if (!TRACKING_PARAM.test(k)) kept.push([k, v]);
    }
    kept.sort(([a], [b]) => a.localeCompare(b));
    u.search = "";
    for (const [k, v] of kept) u.searchParams.append(k, v);
    let out = u.toString();
    if (out.endsWith("/") && !u.search) out = out.slice(0, -1);
    return out;
  } catch {
    return trimmed;
  }
}

// HTML 페이지에서 RSS/Atom 피드 링크를 자동 발견한다. 사용자가 RSS 주소 대신 사이트 홈 URL
// (예: https://news.hada.io/)을 등록해도 <link rel="alternate" type="...rss..."> 를 찾아 실제 피드로
// 수집되게 한다("알아서 가져오기"). 상대 경로는 baseUrl 기준으로 절대화. 못 찾으면 null.
export function discoverFeedUrl(html: string, baseUrl: string): string | null {
  const linkTags = html.match(/<link\b[^>]*>/gi) ?? [];
  for (const tag of linkTags) {
    const type = /type=["']([^"']+)["']/i.exec(tag)?.[1]?.toLowerCase() ?? "";
    const rel = /rel=["']([^"']+)["']/i.exec(tag)?.[1]?.toLowerCase() ?? "";
    if (!/rss|atom|xml/.test(type)) continue;
    if (rel && !rel.includes("alternate")) continue;
    const href = /href=["']([^"']+)["']/i.exec(tag)?.[1];
    if (!href) continue;
    try {
      return new URL(href, baseUrl).toString();
    } catch {
      continue;
    }
  }
  return null;
}

export async function addFeed(
  supabase: SupabaseClient,
  input: { url: string; title?: string | null; folder?: string | null },
): Promise<Feed> {
  const userId = await requireUserId(supabase);
  // 2026-07-26 : 뉴스 - 피드등록 - 사이트규칙선적용
  // 자동 발견이 원리적으로 불가능한 사이트(velog — 홈에 RSS 링크 없음 + 피드가 다른 도메인)를
  // 등록 시점에 바로잡는다. 수집 때 고치면 사용자는 그 사이 "0건"만 본다.
  // 만들 수 없는 입력은 조용히 저장하지 않는다 — 저장되면 수집될 줄 알고 기다리게 된다.
  const resolved = resolveFeedUrl(input.url);
  if (resolved.kind === "unresolvable") throw new Error(resolved.reason);
  const url = resolved.url;
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
  const userId = await requireUserId(supabase);
  const { error } = await supabase
    .from("feeds")
    .update({ status, fail_count: 0 })
    .eq("id", feedId)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
}

export async function deleteFeed(
  supabase: SupabaseClient,
  feedId: string,
): Promise<void> {
  const userId = await requireUserId(supabase);
  const { error } = await supabase.from("feeds").delete().eq("id", feedId).eq("user_id", userId);
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

// 2026-07-26 : 뉴스 - 요약대상 - 창밖은영영안됨
// 수집 라우트는 최신 100개를 가져와 앱에서 summary가 null인 것을 걸렀다. 수집이 요약(1회 8개)
// 보다 빠르면 요약 안 된 기사가 그 창 밖으로 밀려나고 **그 뒤로는 영영 요약되지 않는다.**
// 창을 넓히는 대신 대상만 DB에서 직접 고른다 — 창 개념 자체가 사라진다.
//
// 오래된 것부터 처리한다. 최신순으로 하면 밀린 기사가 새 기사에 계속 밀려 영영 차례가 안 온다.
export async function listUnsummarizedArticles(
  supabase: SupabaseClient,
  limit: number,
): Promise<Article[]> {
  const { data, error } = await supabase
    .from("articles")
    .select("*")
    .is("summary", null)
    .order("created_at", { ascending: true })
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
};

// 후보 URL 하나를 받아 "실제로 항목이 나오는 피드인지" 확인한다. 항목이 0건이거나 어떤 이유로든
// 실패하면 null — 호출부가 다음 후보로 넘어간다.
// 후보는 원격 HTML에서 유래하거나(자동 발견) 우리가 조립한 경로라, addFeed와 동일하게
// **요청을 보내기 전에** 프로토콜·사설 대역을 막는다(SSRF 방어). 리다이렉트 최종 도착지도 본다.
async function fetchFeedItems(
  doFetch: typeof fetch,
  candidate: string,
): Promise<ReturnType<typeof parseRssItems> | null> {
  try {
    const u = new URL(candidate);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    if (PRIVATE_HOST.test(u.hostname)) return null;
    const res = await doFetch(candidate, {
      headers: { "user-agent": "LittleDevDuck/1.0 (+rss)" },
    });
    if (!res.ok) return null;
    if (PRIVATE_HOST.test(new URL(res.url).hostname)) return null;
    const items = parseRssItems(await res.text());
    return items.length > 0 ? items : null;
  } catch {
    return null;
  }
}

// 한 번의 수집에서 저장할 최대 기사 수. 상한 근거는 collectFeed 안의 주석 참조(실측).
const MAX_ITEMS_PER_COLLECT = 50;
// 피드 응답 크기 상한(선언된 Content-Length 기준). 실측 최대가 2.9MB였다.
const MAX_FEED_BYTES = 5 * 1024 * 1024;

// 피드 1개 수집: fetch→파싱→정규화·해시→중복 제외 insert. 실패 시 fail_count 증가·임계 도달 시
// 자동 일시정지. 성공 시 fail_count 리셋. 반환: 새로 저장한 기사 수 + 이번에 일시정지됐는지.
export async function collectFeed(
  supabase: SupabaseClient,
  feed: Feed,
  deps: CollectDeps = {},
): Promise<{ inserted: number; paused: boolean }> {
  const userId = await requireUserId(supabase);
  const doFetch = deps.fetchImpl ?? fetch;

  let xml: string;
  try {
    const res = await doFetch(feed.url, {
      headers: { "user-agent": "LittleDevDuck/1.0 (+rss)" },
    });
    if (!res.ok) throw new Error(`feed HTTP ${res.status}`);
    // 피드 URL은 사용자가 자유롭게 넣는다. 크기를 안 보면 서버가 응답을 통째로 버퍼링한다.
    // 2026-07-26 실측에서 Vercel 피드가 2.9MB였다 — 악의적 URL이면 훨씬 커질 수 있다.
    // Content-Length가 없는 응답까지 막으려면 스트리밍이 필요한데, 정상 피드를 막을 위험이
    // 있어 여기선 **헤더가 있을 때만** 차단한다(그 이상은 항목 상한이 받아낸다).
    const declared = Number(res.headers?.get?.("content-length") ?? 0);
    if (declared > MAX_FEED_BYTES) throw new Error(`feed too large: ${declared}`);
    // 2026-07-24: redirect chain SSRF 방어 — 최종 도착지가 사설 대역이면 차단.
    const resolvedHost = new URL(res.url).hostname;
    if (PRIVATE_HOST.test(resolvedHost)) throw new Error("사설 주소로 리다이렉트됨");
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

  let items = parseRssItems(xml);
  // RSS 항목이 0개이고 HTML 페이지로 보이면, 사용자가 사이트 홈 URL을 등록한 경우다. 두 단계로 보정한다.
  //   ① <link rel=alternate>로 사이트가 광고하는 피드 주소 (대부분 여기서 잡힌다)
  //   ② 그것도 없으면 관용 경로(/rss.xml·/feed·…)를 차례로 두드린다
  // 2026-07-26 실측: ②로 toss.tech(/rss.xml)·tech.kakao.com(/feed)이 실제로 발견됐다.
  // 발견 시 feeds.url을 실제 피드로 갱신해 다음 수집부터는 곧장 간다(왕복이 반복되지 않게).
  if (items.length === 0 && /<html[\s>]/i.test(xml)) {
    const candidates: string[] = [];
    const discovered = discoverFeedUrl(xml, feed.url);
    if (discovered) candidates.push(discovered);
    for (const path of COMMON_FEED_PATHS) {
      try {
        candidates.push(new URL(path, feed.url).toString());
      } catch {
        // 기준 URL이 이상하면 그 후보만 건너뛴다
      }
    }
    for (const candidate of candidates) {
      if (candidate === feed.url) continue;
      const found = await fetchFeedItems(doFetch, candidate);
      if (found) {
        items = found;
        await supabase.from("feeds").update({ url: candidate }).eq("id", feed.id);
        break;
      }
    }
  }
  let inserted = 0;
  // 2026-07-26 실측: 추천 피드를 실제로 받아 파서에 넣어 보니 Vercel 1378건, OpenAI 1050건이
  // 나왔다(전체 아카이브를 그대로 내보내는 피드가 있다). 상한이 없으면 추천 칩 한 번에
  // 1378번 왕복 insert가 돌아 서버리스 실행시간 안에 끝나지 않는다.
  // RSS는 관례상 최신이 앞이므로 **앞에서부터** 자른다 — 뒤에서 자르면 오래된 것만 남는다.
  // 정상 피드 중 가장 많은 게 50건(GeekNews)이라 그 선에서 자르면 잃는 게 없다.
  for (const item of items.slice(0, MAX_ITEMS_PER_COLLECT)) {
    // 정규화 URL 자체를 중복 판정 키로 쓴다(같은 기사=같은 정규화 URL → UNIQUE로 차단). 해시 불필요.
    const urlHash = normalizeUrl(item.link);
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
  // 2026-07-26 : 보안 - 프롬프트인젝션 - 뉴스요약
  // 조립을 core로 옮겼다. 여기서 문자열을 이어 붙이면 **테스트가 닿지 않아** 인젝션 방어가
  // 빠진 걸 아무도 못 봤다(FEATURES.md:218이 MUST로 못박은 항목인데도).
  const prompt = buildArticleSummaryPrompt(article);
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

// 2026-07-26 : 백업 - 가져오기 - 피드복원
// restoreTodo와 같은 계약: 같은 id로 넣고, 인자의 userId는 무시하고 로그인 사용자로 채우며,
// 이미 있으면 멱등 성공. (user_id, url) 유일 제약이 있어 같은 주소를 다시 넣어도 안전하다.
// fail_count는 복원하지 않는다 — 실패 횟수는 지금 이 계정에서 다시 세는 값이지 백업 대상이 아니다.
export async function restoreFeed(
  supabase: SupabaseClient,
  feed: Feed,
): Promise<void> {
  const userId = await requireUserId(supabase);
  const { error } = await supabase.from("feeds").insert({
    id: feed.id,
    user_id: userId,
    url: feed.url,
    title: feed.title,
    folder: feed.folder,
    status: feed.status,
    created_at: feed.createdAt,
  });
  if (error && (error as { code?: string }).code !== "23505") {
    throw new Error(error.message);
  }
}
