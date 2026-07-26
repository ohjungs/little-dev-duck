// 주제별 추천 RSS 피드(Phase 19 T2). 순수 데이터 + 순수 필터 — 실제 등록은 기존 addFeed(SSRF 가드 포함)가 한다.
//
// 2026-07-26 : 뉴스 - 추천피드 - 실측
// 여기 있는 URL은 전부 **실제로 요청해 RSS/Atom 응답을 확인한 것만** 넣었다(2026-07-26 기준 200 +
// <rss>/<feed> 루트). 유명하다고 URL을 추측해 넣으면 사용자가 "등록했는데 0건"을 다시 겪는다 —
// 피드백 iter6에서 이미 한 번 겪은 문제다.
//
// 2026-07-26 : 뉴스 - 추천피드 - 주식부동산추가
// 사용자 피드백 4-3("주식/부동산 현황은 왜 못가져오지?")에 답해 경제·증권·부동산 주제를 채웠다.
// Phase 19에서 "고를 근거가 없어 비워둔다"고 적었던 자리이고, 이번엔 후보 13개를 실제로 요청해
// **XML이고 항목이 1건 이상 파싱되는 것만** 남겼다(연합뉴스 economy.xml은 이 환경에서 연결 실패라 제외).
// 주의: 이건 **뉴스 기사** 피드다. 시세·호가 같은 수치 데이터가 아니다 — RSS로는 원래 안 온다.

export type RecommendedFeed = {
  topic: string;
  title: string;
  url: string;
};

export const RECOMMENDED_FEEDS: readonly RecommendedFeed[] = [
  { topic: "개발 뉴스", title: "GeekNews", url: "https://news.hada.io/rss/news" },
  { topic: "개발 뉴스", title: "Hacker News", url: "https://hnrss.org/frontpage" },
  { topic: "개발 뉴스", title: "DEV Community", url: "https://dev.to/feed" },
  { topic: "AI", title: "Google AI 블로그", url: "https://blog.google/technology/ai/rss/" },
  { topic: "AI", title: "OpenAI News", url: "https://openai.com/news/rss.xml" },
  { topic: "엔지니어링 블로그", title: "GitHub Blog", url: "https://github.blog/feed/" },
  { topic: "엔지니어링 블로그", title: "Vercel", url: "https://vercel.com/atom" },
  { topic: "엔지니어링 블로그", title: "Meta Engineering", url: "https://engineering.fb.com/feed/" },
  { topic: "엔지니어링 블로그", title: "Netflix Tech Blog", url: "https://netflixtechblog.com/feed" },
  // 아래 8건은 2026-07-26 실측 확인(항목 수는 그날 기준).
  { topic: "증권·주식", title: "한국경제 증권", url: "https://www.hankyung.com/feed/finance" },
  { topic: "증권·주식", title: "매일경제 증권", url: "https://www.mk.co.kr/rss/50200011/" },
  { topic: "증권·주식", title: "Yahoo Finance", url: "https://finance.yahoo.com/news/rssindex" },
  { topic: "증권·주식", title: "CNBC Finance", url: "https://www.cnbc.com/id/10000664/device/rss/rss.html" },
  { topic: "부동산", title: "한국경제 부동산", url: "https://www.hankyung.com/feed/realestate" },
  { topic: "부동산", title: "매일경제 부동산", url: "https://www.mk.co.kr/rss/50300009/" },
  { topic: "경제 일반", title: "한국경제", url: "https://www.hankyung.com/feed/economy" },
  { topic: "경제 일반", title: "매일경제", url: "https://www.mk.co.kr/rss/30100041/" },
];

// 등장 순서를 유지한 주제 목록(UI 그룹 헤더용).
export function feedTopics(feeds: readonly RecommendedFeed[]): string[] {
  return [...new Set(feeds.map((f) => f.topic))];
}

// core에는 URL 타입이 없어(플랫폼 중립, news.ts 42행 주석 참조) 문자열 수준으로만 맞춘다.
// 끝 슬래시·대소문자·공백 차이만 흡수하면 추천 목록 중복 제거엔 충분하다.
function key(url: string): string {
  return url.trim().toLowerCase().replace(/\/+$/, "");
}

// 아직 등록하지 않은 추천 피드만. 빈 배열이면 UI는 추천 섹션을 숨긴다.
export function unregisteredFeeds(
  feeds: readonly RecommendedFeed[],
  registeredUrls: readonly string[],
): RecommendedFeed[] {
  const taken = new Set(registeredUrls.map(key));
  return feeds.filter((f) => !taken.has(key(f.url)));
}

// ---------------------------------------------------------------------------
// 사이트별 피드 주소 해석
// ---------------------------------------------------------------------------
// 2026-07-26 : 뉴스 - 피드해석 - 자동발견불가사이트
// 대부분의 사이트는 홈 HTML에 <link rel="alternate" type="application/rss+xml">를 실어서
// 자동 발견(discoverFeedUrl)으로 잡힌다. 그런데 그 태그가 아예 없고 피드가 **다른 도메인**에
// 있는 사이트가 있다. 그런 곳은 원리적으로 자동 발견이 불가능해 사이트 규칙이 필요하다.
//
// 여기 넣는 규칙은 **실제로 요청해 확인한 것만** 넣는다(news-feeds 상단 원칙과 동일).

export type FeedResolution =
  // 사이트 규칙으로 실제 피드 주소를 만들어 냈다. note는 사용자에게 보여줄 안내.
  | { kind: "rewritten"; url: string; note: string }
  // 규칙 대상이 아니다 — 입력을 그대로 쓴다(자동 발견·관용 경로가 뒤를 받는다).
  | { kind: "asis"; url: string }
  // 규칙 대상인데 이 입력으로는 피드를 만들 수 없다. 조용히 등록하면 안 되는 경우.
  //
  // 2026-07-27 (Phase 42 T3): **이 갈래를 기본값으로 쓰지 않는다.** velog가 그렇게 처리돼
  // 있었는데, 거부는 해결이 아니라서 사용자가 같은 항목을 다시 올렸다. 게다가 "전체 피드가
  // 없다"는 거부 사유 자체가 **틀린 실측**이었다(아래 velog 주석). 새 사이트 규칙을 더할 때는
  // **먼저 `rewritten`으로 데려갈 길이 정말 없는지 실측**하고, 그때만 이 갈래를 쓴다.
  // 지금 이 갈래를 쓰는 규칙은 하나도 없다(전수 확인).
  | { kind: "unresolvable"; reason: string };

// velog: 홈에 RSS 링크가 없고(실측), velog.io/rss/@아이디는 404이며, 진짜 피드는
// v2.velog.io/rss/@아이디 다(실측 200 / 20건).
//
// 2026-07-27 정정 (2차 피드백 4-1, Phase 42 T3): **"전체 피드는 제공하지 않는다"고 적어 뒀던
// 것이 틀렸다.** `https://v2.velog.io/rss/`가 실제로 200에 RSS를 준다 — 실측: 20건, 전부
// title·link·pubDate를 갖고 있고 발행 시각도 당일이었다. 1차 조사는 홈 HTML의
// `<link rel=alternate>`만 봤고, **없다는 것을 확인한 게 아니라 못 찾은 것**이었다.
//
// 그래서 홈 주소를 **거부하지 않는다.** 거부는 해결이 아니다 — 안내만 띄우고 "고쳤다"고
// 적었더니 사용자가 같은 항목을 2차 피드백에 다시 올렸다. 이제 전체 피드로 등록하고,
// 특정 사용자만 보는 방법을 note로 알려 준다(다음 단계로 데려간다).
const VELOG_USER = /^(?:https?:\/\/)?(?:www\.)?velog\.io\/@([^/?#]+)/i;
const VELOG_HOME = /^(?:https?:\/\/)?(?:www\.)?velog\.io\/?(?:[?#]|$)/i;
// 끝의 슬래시를 뺀 `https://v2.velog.io/rss`는 확인하지 않았다 — 실측한 주소만 쓴다.
const VELOG_ALL_FEED = "https://v2.velog.io/rss/";

// core는 플랫폼 중립이라 URL 타입이 없다(news.ts 42행 주석) — 문자열 수준으로만 다룬다.
export function resolveFeedUrl(raw: string): FeedResolution {
  const url = raw.trim();

  const velogUser = VELOG_USER.exec(url);
  if (velogUser) {
    return {
      kind: "rewritten",
      url: `https://v2.velog.io/rss/@${velogUser[1]}`,
      note: "velog는 홈 주소로는 수집할 수 없어 사용자 피드 주소로 바꿔 등록했어요.",
    };
  }
  if (VELOG_HOME.test(url)) {
    return {
      kind: "rewritten",
      url: VELOG_ALL_FEED,
      note: "velog 전체 글 피드로 등록했어요. 특정 사용자의 글만 받으려면 velog.io/@아이디 로 등록하세요.",
    };
  }

  return { kind: "asis", url };
}

// 자동 발견(<link rel=alternate>)이 실패했을 때 마지막으로 시도해 보는 관용 피드 경로.
// 2026-07-26 실측: 이 목록으로 toss.tech(/rss.xml)·tech.kakao.com(/feed)이 실제로 발견됐다
// (news.hada.io·hankyung.com은 여기에도 없어 실패 — 즉 만능이 아니다).
// 수집 1회당 추가 왕복이 붙으므로 개수를 늘릴 때는 근거가 필요하다(테스트가 상한을 잠근다).
export const COMMON_FEED_PATHS: readonly string[] = [
  "/rss.xml",
  "/feed",
  "/rss",
  "/feed.xml",
  "/atom.xml",
  "/index.xml",
];
