// 주제별 추천 RSS 피드(Phase 19 T2). 순수 데이터 + 순수 필터 — 실제 등록은 기존 addFeed(SSRF 가드 포함)가 한다.
//
// 2026-07-26 : 뉴스 - 추천피드 - 실측
// 여기 있는 URL은 전부 **실제로 요청해 RSS/Atom 응답을 확인한 것만** 넣었다(2026-07-26 기준 200 +
// <rss>/<feed> 루트). 유명하다고 URL을 추측해 넣으면 사용자가 "등록했는데 0건"을 다시 겪는다 —
// 피드백 iter6에서 이미 한 번 겪은 문제다.
// 주식·부동산 주제는 신뢰할 만한 무료 RSS를 자율로 고를 근거가 없어 넣지 않았다(사용자 요청엔 있었으나
// 아무 피드나 넣는 것보다 비워두는 게 정직하다).

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
