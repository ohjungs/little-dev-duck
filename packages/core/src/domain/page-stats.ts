// 페이지 본문 통계(글자 수·단어 수·읽기 시간). 순수함수 — plainText(extractPlainText 결과)를 받는다.
// 읽기 속도는 한국어 평균을 대략치로(500자/분). 정밀 측정이 목적이 아니라 대략의 분량 감을 준다.

export interface PageStats {
  chars: number; // 공백 제외 글자 수
  words: number; // 공백 기준 단어 수
  readMinutes: number; // 예상 읽기 시간(분), 빈 글은 0
}

const CHARS_PER_MIN = 500;

export function pageStats(text: string): PageStats {
  const trimmed = text.trim();
  if (trimmed === "") return { chars: 0, words: 0, readMinutes: 0 };
  const chars = trimmed.replace(/\s/g, "").length;
  const words = trimmed.split(/\s+/).length;
  const readMinutes = chars === 0 ? 0 : Math.max(1, Math.ceil(chars / CHARS_PER_MIN));
  return { chars, words, readMinutes };
}
