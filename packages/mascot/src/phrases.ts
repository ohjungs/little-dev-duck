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
