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
  // 2026-07-31 : 뉴스 - 카드 이미지 (B-6). 마이그레이션 전 행은 이 컬럼이 없어 undefined로
  // 들어온다 — 기본값을 두어 옛 데이터가 스키마 검증에서 떨어지지 않게 한다(하위호환).
  imageUrl: z.string().nullable().default(null),
  publishedAt: z.string().datetime({ offset: true }).nullable(),
  createdAt: z.string().datetime({ offset: true }),
});
export type Article = z.infer<typeof articleSchema>;

export type RssItem = {
  title: string;
  link: string;
  publishedAt: string | null; // ISO 문자열 또는 null
  snippet: string | null;
  // 2026-07-31 : 뉴스 - 카드 이미지 (사용자 결정 B-6)
  // 피드가 알려 준 대표 이미지. 없으면 null이고 카드는 지금처럼 글자만 나온다.
  imageUrl: string | null;
};

// 2026-07-31 : 뉴스 - 이미지 URL - 외부 입력 검증 (사용자 결정 B-6)
// **이 값은 남의 서버가 준 문자열이고 곧장 `<img src>`에 들어간다.** 링크에 safeHref를 두는
// 것과 같은 이유로 여기서도 스킴을 화이트리스트한다 — `javascript:`가 src에서 실행되지는
// 않지만, `data:`는 임의 콘텐츠를 심는 통로이고 `http:`는 https 페이지에서 혼합 콘텐츠로
// 차단돼 깨진 이미지만 남는다. **https만 통과시킨다.**
//
// 저장 시점에 거른다(읽는 곳마다 다시 거르면 한 곳을 빠뜨린다 — L-21 복사-드리프트).
// core는 환경 중립이라 `URL` 전역을 쓰지 않는다(브라우저·Node 어느 쪽도 가정하지 않는다).
// 판정 규칙 자체가 "https로 시작하고 공백·제어문자가 없다"뿐이라 정규식으로 충분하다.
// 상대 경로는 기준 URL이 있어야 풀리는데 피드마다 기준이 달라 신뢰할 수 없다 → 버린다.
// 규칙은 "https로 시작하고 공백·따옴표·꺾쇠·역슬래시가 없다" 하나뿐이다. 제어문자 범위를
// 따로 막지 않는 이유: `\s`가 탭·개행을 이미 걷어내고, 값이 들어가는 자리는 React가
// 이스케이프하는 속성이라 남은 제어문자로 속성을 벗어날 수 없다. 규칙은 적을수록 안 깨진다.
const HTTPS_URL = /^https:\/\/[^\s"'<>\\]+$/;

export function safeImageUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  return HTTPS_URL.test(trimmed) ? trimmed : null;
}

// 자동 일시정지 임계: 연속 수집 실패가 이 횟수에 도달하면 피드를 paused로.
export const FEED_FAIL_THRESHOLD = 5;

// 2026-07-30 : 뉴스 - 벨로그 전체피드 스팸 필터 (사용자 실사용 피드백)
// velog.io 전체 피드처럼 아무나 쓸 수 있는 플랫폼은 중국어 성매매 광고·해외 약 판매·도박
// 스팸이 실제로 섞여 온다. 형태소 분석·언어감지 라이브러리 없이 "한글 글자 비율"만 본다 —
// 결정적 판정(HD-003, LLM 미사용). 글자가 아예 없으면(숫자·기호뿐) 판단 근거가 없으므로
// 통과시키지 않는다 — 모르는 걸 통과시키면 스팸이 새는 쪽으로 실수하게 된다.
const HANGUL_RE = /[가-힣ᄀ-ᇿ㄰-㆏]/gu;
const LETTER_RE = /\p{L}/gu;
const KOREAN_MIN_RATIO = 0.3;

export function isKoreanEnough(text: string, minRatio: number = KOREAN_MIN_RATIO): boolean {
  const letters = text.match(LETTER_RE) ?? [];
  if (letters.length === 0) return false;
  const hangul = text.match(HANGUL_RE) ?? [];
  return hangul.length / letters.length >= minRatio;
}

// 주의: URL 정규화(normalizeUrl)는 `new URL`(웹/노드 전역 타입)에 의존하는데 core는 플랫폼 중립이라
// tsconfig lib이 ES2022뿐이고 @types/node도 없어 CI에서 URL 타입이 없다 → api로 옮겼다(packages/api/news.ts).

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

// 2026-07-31 : 뉴스 - 대표 이미지 추출 (사용자 결정 B-6)
// 피드마다 이미지를 다른 자리에 넣는다. 실제로 쓰이는 순서대로 본다:
//  ① <enclosure url type="image/*">  — RSS 2.0 표준 첨부
//  ② <media:content url medium="image"> — Media RSS(유튜브·많은 언론사)
//  ③ <media:thumbnail url>            — Media RSS 썸네일
//  ④ 본문 HTML의 첫 <img src>          — 위 셋이 없을 때의 마지막 수단
//
// ④를 마지막에 두는 이유: 본문 첫 이미지는 대표 이미지가 아닐 때가 많고(광고 배너·추적
// 픽셀·프로필 아바타), 그래서 명시적으로 "이게 대표다"라고 알려 준 ①~③을 먼저 믿는다.
//
// **외부 사이트를 크롤링하지 않는다.** og:image를 긁으려면 기사마다 원문을 받아야 하는데,
// 비용·저작권 문제이고 계획(Phase 61)이 애초에 하지 않기로 정한 방향이다. 피드가 준 것만 쓴다.
export function extractImageUrl(block: string): string | null {
  const enclosure = block.match(
    /<enclosure\b[^>]*\btype=["']image\/[^"']*["'][^>]*>/i,
  );
  if (enclosure) {
    const url = enclosure[0].match(/\burl=["']([^"']+)["']/i);
    const safe = safeImageUrl(url?.[1]);
    if (safe) return safe;
  }

  // media:content는 medium="image"로 알리거나 type="image/*"로 알린다. 둘 다 없으면
  // 영상·오디오일 수 있어 건너뛴다 — 모르는 것을 이미지로 취급하지 않는다.
  for (const m of block.matchAll(/<media:content\b[^>]*>/gi)) {
    const tag = m[0];
    const isImage =
      /\bmedium=["']image["']/i.test(tag) || /\btype=["']image\//i.test(tag);
    if (!isImage) continue;
    const safe = safeImageUrl(tag.match(/\burl=["']([^"']+)["']/i)?.[1]);
    if (safe) return safe;
  }

  const thumb = block.match(/<media:thumbnail\b[^>]*\burl=["']([^"']+)["']/i);
  const thumbSafe = safeImageUrl(thumb?.[1]);
  if (thumbSafe) return thumbSafe;

  // 본문 HTML은 XML 엔티티로 이스케이프돼 오는 경우가 흔하다(&lt;img ...). 먼저 푼 뒤 찾는다.
  const body =
    firstTag(block, "content:encoded") ??
    firstTag(block, "content") ??
    firstTag(block, "description");
  if (!body) return null;
  return safeImageUrl(body.match(/<img\b[^>]*\bsrc=["']([^"']+)["']/i)?.[1]);
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
    // 2026-07-26 실측: 추천 피드 9개를 실제로 파싱해 보니 GeekNews만 요약이 30/30 전부 비었다.
    // GeekNews(Atom)는 <content>를 쓰는데 여기서 description/summary만 봤기 때문이다.
    // 요약이 없으면 화면 미리보기가 비고, Gemini 3줄 요약도 제목만으로 만들어진다.
    // 규격상 summary(발췌)/description이 우선이고 content(전문)는 없을 때의 대체다.
    const rawSnippet =
      firstTag(block, "description") ??
      firstTag(block, "summary") ??
      firstTag(block, "content:encoded") ??
      firstTag(block, "content");
    items.push({
      title,
      link,
      publishedAt: pub ? toIso(pub) : null,
      // 태그를 걷어낸 뒤 **한 번 더** 엔티티를 푼다. 피드가 HTML을 이스케이프하고 XML로 또
      // 이스케이프하는 경우(`--&amp;gt;`)가 흔해서, 한 번만 풀면 `&gt;`가 화면에 그대로 뜬다
      // (실측: DEV Community). 걷어낸 뒤 남은 엔티티는 HTML 본문의 것이므로 푸는 게 맞다.
      snippet: rawSnippet ? decodeEntities(stripTags(rawSnippet)).slice(0, 500) : null,
      imageUrl: extractImageUrl(block),
    });
  }
  return items;
}
