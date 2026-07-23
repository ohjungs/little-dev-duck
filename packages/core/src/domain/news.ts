import { z } from "zod";

// Phase 15 뉴스 브리핑 — 피드/기사 계약 + 순수 파서.
// 저작권: 본문 전문은 저장하지 않는다. parseRssItems는 요약 스니펫만 500자로 잘라 들고 온다.

export const feedSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  url: z.string().url(),
  title: z.string().nullable(),
  folder: z.string().nullable(),
  status: z.enum(["active", "paused"]),
  failCount: z.number().int().min(0),
  createdAt: z.string().datetime({ offset: true }),
});
export type Feed = z.infer<typeof feedSchema>;

export const articleSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  feedId: z.string().uuid(),
  urlHash: z.string().min(1),
  title: z.string().min(1),
  link: z.string().url(),
  snippet: z.string().nullable(),
  summary: z.string().nullable(),
  publishedAt: z.string().datetime({ offset: true }).nullable(),
  createdAt: z.string().datetime({ offset: true }),
});
export type Article = z.infer<typeof articleSchema>;

export type RssItem = {
  title: string;
  link: string;
  publishedAt: string | null; // ISO 문자열 또는 null
  snippet: string | null;
};

// 자동 일시정지 임계: 연속 수집 실패가 이 횟수에 도달하면 피드를 paused로.
export const FEED_FAIL_THRESHOLD = 5;

// 추적/분석 파라미터 — 정규화 시 제거해 같은 기사가 다른 링크로 중복 저장되는 걸 막는다.
const TRACKING_PARAM = /^(utm_|fbclid$|gclid$|mc_|ref$|ref_src$|igshid$|_hsenc$|_hsmi$)/i;

// URL 정규화: 호스트 소문자 + 추적 파라미터 제거 + 해시 제거 + 남은 쿼리 정렬 + 끝 슬래시 정리.
// url_hash(중복 판정)의 입력이라 결정론적이어야 한다. 파싱 불가면 trim만 해서 돌려준다.
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

function decodeEntities(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&amp;/gi, "&")
    .trim();
}

function stripTags(s: string): string {
  return s
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function firstTag(block: string, name: string): string | null {
  const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i"));
  return m ? decodeEntities(m[1]) : null;
}

// RSS는 <link>url</link>, Atom은 <link href="url"/> — 둘 다 처리(Atom은 첫 href).
function extractLink(block: string): string | null {
  const rss = block.match(/<link[^>]*>([\s\S]*?)<\/link>/i);
  if (rss && rss[1].trim()) return decodeEntities(rss[1]);
  const atom = block.match(/<link[^>]*href=["']([^"']+)["']/i);
  return atom ? atom[1].trim() : null;
}

function toIso(s: string): string | null {
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

// 최소 RSS 2.0 / Atom 파서. <item>(RSS)·<entry>(Atom) 블록에서 제목/링크/발행일/요약만 뽑는다.
// ponytail: 표준 RSS2.0/Atom을 커버하는 정규식 파서 — 네임스페이스 접두 태그나 비표준 피드는
// 놓칠 수 있다(무의존성 우선). 실피드에서 파싱률이 문제되면 fast-xml-parser 도입으로 승격.
export function parseRssItems(xml: string): RssItem[] {
  const blocks = xml.match(/<(item|entry)\b[\s\S]*?<\/\1>/gi) ?? [];
  const items: RssItem[] = [];
  for (const block of blocks) {
    const title = firstTag(block, "title");
    const link = extractLink(block);
    if (!title || !link) continue;
    const pub =
      firstTag(block, "pubDate") ??
      firstTag(block, "published") ??
      firstTag(block, "updated");
    const rawSnippet = firstTag(block, "description") ?? firstTag(block, "summary");
    items.push({
      title,
      link,
      publishedAt: pub ? toIso(pub) : null,
      snippet: rawSnippet ? stripTags(rawSnippet).slice(0, 500) : null,
    });
  }
  return items;
}
