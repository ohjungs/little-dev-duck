// Phase 11 후속 — select 옵션 색상 → Tailwind 클래스 매핑.
// Tailwind JIT는 동적 문자열을 못 스캔하므로 각 색의 클래스를 정적 리터럴로 나열한다.
// core SELECT_COLORS와 이름을 맞추되, 미지의 색은 gray로 폴백한다. 라이트/다크 모두 대응.

// 칩(배지) 배경+글자색.
const CHIP_CLASS: Record<string, string> = {
  gray: "bg-muted text-muted-foreground",
  red: "bg-red-500/15 text-red-700 dark:text-red-300",
  orange: "bg-orange-500/15 text-orange-700 dark:text-orange-300",
  yellow: "bg-yellow-500/20 text-yellow-800 dark:text-yellow-300",
  green: "bg-green-500/15 text-green-700 dark:text-green-300",
  blue: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  purple: "bg-purple-500/15 text-purple-700 dark:text-purple-300",
  pink: "bg-pink-500/15 text-pink-700 dark:text-pink-300",
};

// 스와치/점 배경색(피커·표 셀 앞 점).
const DOT_CLASS: Record<string, string> = {
  gray: "bg-muted-foreground/40",
  red: "bg-red-500",
  orange: "bg-orange-500",
  yellow: "bg-yellow-500",
  green: "bg-green-500",
  blue: "bg-blue-500",
  purple: "bg-purple-500",
  pink: "bg-pink-500",
};

export function selectChipClass(color: string): string {
  return CHIP_CLASS[color] ?? CHIP_CLASS.gray;
}

export function selectDotClass(color: string): string {
  return DOT_CLASS[color] ?? DOT_CLASS.gray;
}
