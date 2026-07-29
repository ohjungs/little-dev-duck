// 2026-07-29 : 보안 - 외부 링크 스킴 화이트리스트 한 벌 (Phase 61·62 리뷰)
// RSS 등 외부 데이터가 준 URL은 http(s)만 href로 허용한다 — zod .url()은 javascript: 스킴을
// 통과시킨다. NewsReader·NewsTopWidget에 같은 함수가 두 벌 있었고 DailyBriefing은 아예
// 없이 원본을 넣고 있었다(리뷰 발견). 여기 한 곳으로 승격.

export function safeHref(url: string): string {
  return /^https?:\/\//i.test(url) ? url : "#";
}
