// 홈 대시보드 인사말·시간 아이콘 — 시(hour, 0~23) 기반 순수 매퍼(사이드이펙트 없음).
// 시각 계산(KST)은 호출부에서 하고, 여기서는 시 → 표시 문자열 매핑만 담당해 경계 로직을 테스트한다.

export function getGreeting(h: number): string {
  if (h < 6) return "좋은 새벽이에요";
  if (h < 12) return "좋은 아침이에요";
  if (h < 18) return "좋은 오후예요";
  return "좋은 저녁이에요";
}

export function getTimeEmoji(h: number): string {
  if (h >= 6 && h < 12) return "\u{1F324}️"; // 🌤 morning sun
  if (h >= 12 && h < 18) return "☀️"; // ☀ afternoon sun
  if (h >= 18 && h < 22) return "\u{1F307}"; // 🌇 sunset
  return "\u{1F319}"; // 🌙 moon (22-5)
}
