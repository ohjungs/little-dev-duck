// 2026-07-24 : Phase G - 게임 클럭 기반 시간대 팔레트 (순수 함수, 사이드이펙트 없음)

export type TimeOfDay = "dawn" | "morning" | "afternoon" | "evening" | "night";

// hour(0-23) -> 시간대 레이블
export function timeOfDay(hour: number): TimeOfDay {
  if (hour >= 6 && hour < 8) return "dawn";
  if (hour >= 8 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 20) return "evening";
  return "night";
}

// 씬 전체에 덧씌울 RGBA 오버레이
// dawn = 따뜻한 오렌지, morning = 오버레이 없음, afternoon = 연한 황금빛
// evening = 진한 주황, night = 차가운 남색
export function timeOverlay(tod: TimeOfDay): { r: number; g: number; b: number; a: number } {
  switch (tod) {
    case "dawn":      return { r: 255, g: 200, b: 100, a: 0.08 };
    case "morning":   return { r: 0,   g: 0,   b: 0,   a: 0 };
    case "afternoon": return { r: 255, g: 220, b: 150, a: 0.05 };
    case "evening":   return { r: 255, g: 150, b: 50,  a: 0.15 };
    case "night":     return { r: 30,  g: 30,  b: 80,  a: 0.3 };
  }
}

// 저녁/밤에 창문 글로우 효과 활성화 여부
export function shouldWindowsGlow(tod: TimeOfDay): boolean {
  return tod === "evening" || tod === "night";
}

// HUD용 시간대 한국어 레이블
export function timeOfDayLabel(tod: TimeOfDay): string {
  switch (tod) {
    case "dawn":      return "새벽";
    case "morning":   return "오전";
    case "afternoon": return "오후";
    case "evening":   return "저녁";
    case "night":     return "밤";
  }
}

// HUD용 시간대 아이콘(텍스트 이모지)
export function timeOfDayIcon(tod: TimeOfDay): string {
  switch (tod) {
    case "dawn":      return "☀️";
    case "morning":   return "☀️";
    case "afternoon": return "🌤️";
    case "evening":   return "🌅";
    case "night":     return "🌙";
  }
}
