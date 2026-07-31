import type { SupabaseClient } from "@supabase/supabase-js";
import {
  feedSchema,
  articleSchema,
  parseRssItems,
  resolveFeedUrl,
  COMMON_FEED_PATHS,
  FEED_FAIL_THRESHOLD,
  buildArticleSummaryPrompt,
  isKoreanEnough,
  type Feed,
  type Article,
} from "@ldd/core";
import { GEMINI_GEN_MODEL, upstreamError, safeBody } from "./gemini";

// Phase 15 뉴스 파이프라인 — 피드 CRUD + 수집(중복제거·자동일시정지) + Gemini 3줄 요약.
// 저작권: articles엔 3줄 요약+원문 링크만. 본문 전문은 저장하지 않는다.
const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";

// 서버(수집 라우트)가 사용자 지정 URL을 fetch하므로, 내부/사설 대역으로의 SSRF를 피드 등록 시 차단한다.
// 메타데이터 엔드포인트(169.254.169.254) 등 발등찍기 방지. DNS 리바인딩까지는 막지 않는다(YAGNI).
//
// 2026-07-30 : 보안 - SSRF - 정규식 한 줄에서 정규화 판정으로 교체 (실측 발견 2건)
// 옛 구현은 문자열 정규식 한 줄이었고 **두 방향으로 틀렸다.**
//  ① IPv6로 감싸면 전부 통과했다. `::ffff:(127\.|…)` 분기는 점 표기를 기대했는데 WHATWG
//     파서가 `::ffff:127.0.0.1`을 `::ffff:7f00:1`로 압축해 넘기므로 **절대 매칭되지 않는
//     죽은 코드**였다. `::`(연결 시 루프백)와 `fe80::/10`은 목록에 아예 없었다.
//     주석이 이름까지 적어 막겠다던 `[::ffff:169.254.169.254]`가 실제로 통과했다.
//  ② `\[?fc|\[?fd`에 경계가 없어 **"fc"·"fd"로 시작하는 모든 도메인**을 막았다
//     (fcc.gov·fdny.gov·fcbarcelona.com — 사용자가 등록할 수 없었다).
// 문자열 패턴을 더 얹으면 같은 함정을 반복한다(IPv6 압축 표기 조합이 많다). 그래서
// **hostname을 8그룹 숫자로 펼쳐 판정**하고, IPv4 매핑·NAT64는 뒤 32비트를 IPv4로 되돌려
// IPv4 규칙을 재사용한다. 근거·실측표: docs/loop-eng/findings-2026-07-30-ssrf-ipv6-bypass.md
//
// IPv4 규칙은 옛 것을 그대로 쓴다 — 실측으로 정상 동작을 확인했다(10진수·16진수·8진수·짧은
// 표기는 파서가 점 표기로 정규화해 주므로 이 패턴만으로 전부 걸린다).
const PRIVATE_IPV4 =
  /^(127\.|0\.0\.0\.0$|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/;

/**
 * IPv6 hostname을 8그룹(각 0..0xffff) 숫자 배열로 펼친다. IPv6가 아니거나 형식이 잘못되면 null.
 * `::` 압축과, 끝에 점 표기 IPv4가 붙은 형태(`::ffff:127.0.0.1`)를 함께 받는다 —
 * 호출부는 항상 정규화된 값을 주지만, 판정 함수가 원문에도 옳게 답하는 편이 안전하다.
 */
function ipv6Groups(host: string): number[] | null {
  if (!host.includes(":")) return null;
  let s = host;
  const tail = /:(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(s);
  if (tail) {
    const b = tail.slice(1, 5).map(Number);
    if (b.some((n) => n > 255)) return null;
    const hi = ((b[0] << 8) | b[1]).toString(16);
    const lo = ((b[2] << 8) | b[3]).toString(16);
    s = `${s.slice(0, tail.index)}:${hi}:${lo}`;
  }
  const halves = s.split("::");
  if (halves.length > 2) return null; // `::`는 최대 한 번
  const parse = (part: string): number[] =>
    part === "" ? [] : part.split(":").map((x) => (/^[0-9a-f]{1,4}$/.test(x) ? parseInt(x, 16) : NaN));
  const left = parse(halves[0]);
  const right = halves.length === 2 ? parse(halves[1]) : [];
  const groups =
    halves.length === 2
      ? [...left, ...Array<number>(8 - left.length - right.length).fill(0), ...right]
      : left;
  if (groups.length !== 8 || groups.some((n) => !Number.isInteger(n) || n < 0 || n > 0xffff)) {
    return null;
  }
  return groups;
}

/** `new URL(url).hostname` 값을 받아 내부/사설 대역인지 판정한다. */
export function isPrivateHost(hostname: string): boolean {
  const h = hostname.replace(/^\[/, "").replace(/\]$/, "").toLowerCase();
  if (h === "localhost") return true;
  if (PRIVATE_IPV4.test(h)) return true;

  const g = ipv6Groups(h);
  if (g === null) return false;

  if (g.every((x) => x === 0)) return true; // `::` 미지정 — 연결하면 루프백으로 간다
  if (g.slice(0, 7).every((x) => x === 0) && g[7] === 1) return true; // `::1`
  if ((g[0] & 0xffc0) === 0xfe80) return true; // fe80::/10 링크 로컬
  if ((g[0] & 0xfe00) === 0xfc00) return true; // fc00::/7 유니크 로컬

  // IPv4를 품은 형태는 그 IPv4로 판정한다 — 안 그러면 사설 IPv4를 IPv6로 감싸 우회할 수 있다.
  const zeroTo5 = g.slice(0, 6).every((x) => x === 0);
  const mapped = g.slice(0, 5).every((x) => x === 0) && g[5] === 0xffff; // ::ffff:a.b.c.d
  const deprecatedCompat = zeroTo5 && (g[6] !== 0 || g[7] > 1); // ::a.b.c.d (구형 호환 표기)
  const nat64 = g[0] === 0x64 && g[1] === 0xff9b && g.slice(2, 6).every((x) => x === 0);
  if (mapped || nat64 || deprecatedCompat) {
    const ipv4 = `${g[6] >> 8}.${g[6] & 0xff}.${g[7] >> 8}.${g[7] & 0xff}`;
    return PRIVATE_IPV4.test(ipv4);
  }
  return false;
}

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
  // 2026-07-31 : 뉴스 - 카드 이미지 (B-6). 마이그레이션 적용 전에는 이 컬럼이 없어 select가
  // undefined를 준다 — 옵셔널로 둬야 미적용 상태에서도 목록이 통째로 죽지 않는다
  // (이 저장소가 Phase 37에서 "미적용 컬럼을 payload에 무조건 실어 쓰기가 죽은" 사고를 겪었다).
  image_url?: string | null;
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
    imageUrl: r.image_url ?? null,
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
  if (isPrivateHost(host)) {
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
    if (isPrivateHost(u.hostname)) return null;
    const res = await doFetch(candidate, {
      headers: { "user-agent": "LittleDevDuck/1.0 (+rss)" },
    });
    if (!res.ok) return null;
    if (isPrivateHost(new URL(res.url).hostname)) return null;
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
    if (isPrivateHost(resolvedHost)) throw new Error("사설 주소로 리다이렉트됨");
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
    // 2026-07-30 : 뉴스 - 벨로그 전체피드 스팸 필터 (사용자 실사용 피드백)
    // velog.io 전체 피드처럼 아무나 쓰는 플랫폼은 중국어 성매매 광고·해외 약 판매·도박 스팸이
    // 실제로 섞여 온다. 저장 전에 걸러 Gemini 요약 쿼터도 스팸에 낭비되지 않게 한다.
    if (!isKoreanEnough(`${item.title} ${item.snippet ?? ""}`)) continue;
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
      // 값은 코어 파서가 이미 https만 통과시켰다(safeImageUrl). 여기서 다시 거르지 않는다.
      image_url: item.imageUrl,
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
