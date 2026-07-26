// 2026-07-27 : 오리 - 자율 발화 - LLM 표현 (2차 피드백 1-3, Phase 45 T1)
// **이전 판단을 뒤집는 자리라 근거를 남긴다.** Phase 30 T1은 자율 발화에 LLM을 쓰지 않았고
// 그 기록은 "조건이 전부 결정적이라 규칙으로 고르고 문장은 템플릿"이었다. HD-003에 맞는
// 판단이었다. **그런데 사용자가 원한 것은 정확성이 아니라 다양성이다** — "재밌는 농담을
// 한다던가". 템플릿은 문장 수가 유한해서 며칠이면 다 본다. 원리적으로 못 하는 일이다.
//
// 그래서 **역할을 나눈다**(HD-003의 정확한 적용):
//   - 규칙(`pickInitiative`)이 **무엇을 말할지**를 정한다 — 결정적, 코드.
//   - LLM은 **그것을 어떻게 말할지**만 정한다 — 창의적, 재작성.
// 사실은 우리가 준 것만 쓰게 못박는다. 안 그러면 **없는 할 일을 지어낸다.**

import { untrustedTextRule } from "./untrusted-text";

// LLM이 고를 수 있는 표정. **허용 목록 밖은 받지 않는다** — 모르는 값이 오면 기본으로 떨어진다
// (Phase 30 T1이 세운 계약: 표정과 문장이 맞아야 한다).
export const DUCK_LINE_MOODS = ["happy", "neutral", "sad", "excited"] as const;
export type DuckLineMood = (typeof DUCK_LINE_MOODS)[number];

// 한 문장이어야 한다. 길어지면 말풍선이 화면을 덮는다.
export const DUCK_LINE_MAX_CHARS = 60;

export interface DuckLineFacts {
  // 규칙이 고른 화제(예: "미완료 할 일 3건"). **이미 만들어진 템플릿 문장을 그대로 넘긴다** —
  // 사실의 출처를 하나로 두기 위해서다(문장을 여기서 다시 조립하면 두 벌이 된다).
  factLine: string;
  // 규칙이 고른 표정. LLM이 바꿀 수 있지만 허용 목록 안에서만.
  mood: string;
  // 지금 시간대(예: "아침"). 없으면 넣지 않는다.
  timeOfDay?: string;
}

/**
 * 오리 한마디를 다시 쓰게 하는 프롬프트. **순수 함수** — 같은 입력에 같은 문자열.
 *
 * 계약:
 * - 사실은 `factLine`에 있는 것만 쓴다(없는 할 일·일정을 지어내지 않는다).
 * - 사용자 데이터가 섞이므로 **프롬프트 인젝션 방어 문장을 붙인다**(core `untrustedTextRule`
 *   한 벌 — 일정 제목은 남이 만든 텍스트일 수 있다).
 * - 출력은 **JSON 한 줄**이라 파싱이 결정적이다(자유 문장을 파싱하면 규칙이 두 벌이 된다).
 */
export function buildDuckLinePrompt(facts: DuckLineFacts): string {
  const lines = [
    "너는 사용자의 워크스페이스에 사는 아기오리 캐릭터다.",
    "아래 [사실]을 근거로 사용자에게 건넬 **한국어 한 문장**을 만든다.",
    "",
    "규칙:",
    `- ${DUCK_LINE_MAX_CHARS}자 이내, 한 문장, 반말이 아닌 친근한 존댓말.`,
    "- [사실]에 없는 내용을 지어내지 않는다. 날씨·뉴스·시간처럼 주지 않은 정보는 말하지 않는다.",
    "- 같은 사실이라도 매번 다르게 표현한다. 가벼운 농담이나 격려를 섞어도 좋다.",
    "- 이모지를 쓰지 않는다.",
    `- ${untrustedTextRule("사실")}`,
    "",
    "출력 형식(다른 말 없이 이 JSON 한 줄만):",
    `{"line":"문장","mood":"${DUCK_LINE_MOODS.join("|")}"}`,
    "",
    "[사실]",
    facts.factLine,
  ];
  if (facts.timeOfDay) lines.push(`지금은 ${facts.timeOfDay}입니다.`);
  lines.push(`기본 표정: ${facts.mood}`);
  return lines.join("\n");
}

export interface DuckLineResult {
  line: string;
  mood: DuckLineMood;
}

/**
 * LLM 응답을 안전한 결과로 바꾼다. **못 믿을 값은 전부 null로 떨어뜨린다** —
 * 호출부는 null이면 기존 템플릿 문장을 그대로 쓰면 되고, 그게 곧 기존 동작이다.
 *
 * 왜 여기서 판정하나: 화면에서 하면 규칙이 두 벌이 되고, 한쪽만 고쳐진다.
 */
export function parseDuckLine(
  raw: string | null | undefined,
  fallbackMood: string,
): DuckLineResult | null {
  if (typeof raw !== "string") return null;
  // 모델이 코드펜스로 감싸는 경우가 흔하다. 첫 번째 중괄호 구간만 떼어 본다.
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw.slice(start, end + 1));
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null) return null;
  const obj = parsed as { line?: unknown; mood?: unknown };
  if (typeof obj.line !== "string") return null;
  const line = obj.line.trim();
  if (line === "") return null;
  // 길이는 잘라내지 않고 **거부한다** — 중간에서 자르면 문장이 끊겨 더 이상해진다.
  if ([...line].length > DUCK_LINE_MAX_CHARS) return null;
  const mood = (DUCK_LINE_MOODS as readonly string[]).includes(
    obj.mood as string,
  )
    ? (obj.mood as DuckLineMood)
    : (DUCK_LINE_MOODS as readonly string[]).includes(fallbackMood)
      ? (fallbackMood as DuckLineMood)
      : "neutral";
  return { line, mood };
}
