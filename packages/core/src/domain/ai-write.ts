import { z } from "zod";

// 에디터 AI 작문 보조(노션 격차 P1 — 신규 인프라 0, 기존 Gemini 프록시 재사용). 프롬프트 빌더는 순수함수로
// core에 두고, 실제 생성 호출은 api, 라우트/UI는 web이 담당한다. core는 외부 호출/전역을 쓰지 않는다.

export const WRITE_ACTIONS = [
  "summarize",
  "polish",
  "shorten",
  "translate_en",
  "continue",
] as const;
export const writeActionSchema = z.enum(WRITE_ACTIONS);
export type WriteAction = z.infer<typeof writeActionSchema>;

// 입력 글 최대 길이(프롬프트 남용/쿼터 보호). UI/route에서도 동일 상한.
export const WRITE_INPUT_MAX = 4000;

const INSTRUCTION: Record<WriteAction, string> = {
  summarize: "아래 글을 한국어로 핵심만 간결히 요약하세요.",
  polish: "아래 글의 문법과 표현을 자연스럽게 다듬으세요. 의미는 바꾸지 마세요.",
  shorten: "아래 글을 의미를 유지하며 더 짧게 줄이세요.",
  translate_en: "아래 글을 자연스러운 영어로 번역하세요.",
  continue: "아래 글에 이어질 다음 문단을 한국어로 자연스럽게 이어 쓰세요.",
};

// 작문 보조 프롬프트. 모델이 설명·머리말 없이 결과 텍스트만 출력하도록 강제한다.
export function buildWriteAssistPrompt(action: WriteAction, text: string): string {
  return `${INSTRUCTION[action]}\n부연 설명이나 머리말 없이 결과만 출력하세요.\n\n---\n${text}`;
}
