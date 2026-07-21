import type { DuckMood } from "@ldd/core";

export const CLICK_PHRASES = [
  "꽥!",
  "오늘도 화이팅!",
  "할 일 하나 해볼까요?",
  "저 여기 있어요!",
  "메모 남기는 거 잊지 마세요",
];

export function pickPhrase(clickCount: number): string {
  const index = ((clickCount % CLICK_PHRASES.length) + CLICK_PHRASES.length) %
    CLICK_PHRASES.length;
  return CLICK_PHRASES[index];
}

// T2 자율 행동: 유휴 시 스스로 띄우는 혼잣말. mood에 맞춰 결이 다른 문구 풀에서 고른다.
export const IDLE_PHRASES: Record<DuckMood, string[]> = {
  happy: ["오늘 아주 잘하고 있어요!", "이 기세 좋아요, 꽥!", "기분이 좋네요~"],
  sad: ["요즘 좀 뜸했네요...", "커밋 한 번 어때요?", "천천히 다시 시작해봐요"],
  neutral: ["뭐 도와드릴까요?", "물 한 잔 하고 오세요", "저 여기 잘 있어요"],
};

export function pickIdlePhrase(mood: DuckMood): string {
  const pool = IDLE_PHRASES[mood];
  const index = Math.floor(Math.random() * pool.length);
  return pool[index];
}
