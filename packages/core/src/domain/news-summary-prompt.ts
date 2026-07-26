import { untrustedTextRule } from "./untrusted-text";

// 2026-07-26 : 보안 - 프롬프트인젝션 - 뉴스요약
// 조립을 core로 옮겼다. 전에는 api(news.ts)에서 문자열을 바로 이어 붙여 **테스트가 닿지 않았다** —
// buildRagPrompt·buildWriteAssistPrompt·formatStandupPrompt가 전부 core에 있는 것과 같은 이유다.
//
// 여기 들어가는 제목·본문은 **제3자가 쓴 텍스트**다. 피드 URL은 사용자가 자유로 등록하고,
// 기사는 남의 사이트가 쓴다. 경계 없이 붙이면 조작된 기사 하나로 요약 자리에 우리가 쓰지 않은
// 문구(피싱 링크·거짓 안내)가 나간다.
//
// 지시를 **기사보다 앞에** 둔다. 뒤에 붙이면 앞의 조작 문구가 이미 맥락을 잡은 뒤다.

export function buildArticleSummaryPrompt(article: {
  title: string;
  snippet: string | null;
}): string {
  const snippet = article.snippet?.trim();
  return [
    "다음 뉴스 기사를 한국어 3줄로 요약해줘. 과장·클릭베이트 없이 사실만, 각 줄은 '- '로 시작.",
    "본문 전문을 그대로 옮기지 말고 핵심만 압축해.",
    untrustedTextRule("기사"),
    "",
    "[기사]",
    `제목: ${article.title}`,
    // 길이 상한은 수집 단계(parseRssItems가 500자로 자름)에서 이미 건다. 여기서 또 자르면
    // 두 곳이 어긋나고, 어느 쪽이 진짜 상한인지 알 수 없어진다.
    `요약 원문: ${snippet ? snippet : "(없음 — 제목 기준으로만)"}`,
  ].join("\n");
}
