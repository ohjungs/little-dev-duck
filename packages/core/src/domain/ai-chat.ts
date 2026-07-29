import { z } from "zod";
import { untrustedTextRule } from "./untrusted-text";

export const chatRoleSchema = z.enum(["user", "duck"]);
export type ChatRole = z.infer<typeof chatRoleSchema>;

export const chatMessageSchema = z.object({
  role: chatRoleSchema,
  content: z.string().min(1),
  createdAt: z.string().datetime({ offset: true }),
});
export type ChatMessage = z.infer<typeof chatMessageSchema>;

export type UtteranceRoute = "rule" | "llm";

// 짧은 인사·감탄은 룰 대사(Phase 6 pickIdlePhrase)로, 질문형/데이터 조회로 보이면 LLM(RAG)으로.
// 결정론적 — 룰 대사(무료·즉시)와 Gemini 호출(쿼터 소모)의 경계를 core에서 고정한다.
const GREETING = /^(안녕|하이|hi|hello|헤이|hey|반가|잘\s?가|바이|bye|고마|thx|thanks|사랑|좋아|귀여)/i;
// "줘"는 "해줘/잡아줘/예약해줘"류 명령문의 공통 어미 — Phase 10 에이전트 액션 병합 후 "회의 잡아줘"
// 같은 짧은 명령이 키워드 매칭 없이 길이<=12로 rule에 걸러지던 걸 방지(길이 무관하게 명령 의도 포착).
const QUESTION_HINT =
  /[?？]|뭐|무엇|어디|언제|얼마|몇|누구|왜|어때|어떻게|알려|찾아|정리|요약|보여|추천|언제까지|줘/;

// 2026-07-26 : 오리 - 발화라우팅 - 명령힌트
// 실제 사용자 문장을 라우터에 통과시켜 보니, "줘"로 끝나지 않는 짧은 명령이 전부 rule(캔 답변)로
// 새고 있었다 — **Phase 19가 명세에 적어둔 트리거 문장 "오늘 독서 했어"조차 도달하지 못했다.**
// 도구는 만들어 두고 입구에서 막고 있던 셈이다.
//
// 힌트를 무작정 넓히지 않고 **도구 카탈로그에 실제로 있는 동작**의 어휘로 좁힌다:
// 할 일 추가·완료, 메모 작성, 페이지 생성, 일정 추가, 습관 체크.
// 잘못 llm으로 보내면 무료 쿼터를 조금 쓰고, 잘못 rule로 보내면 **기능이 아예 동작하지 않는다** —
// 비용이 비대칭이라 애매하면 llm 쪽으로 기운다. 다만 인사·감탄은 GREETING이 먼저 걸러낸다.
//
// 2026-07-26 : 오리 - 발화라우팅 - 완료어미
// 위 수정에서 "했어"만 넣고 **같은 어간의 다른 어미를 안 봤다** — "운동 했다"·"물마시기 했음"·
// "청소 다함"이 그대로 샜다. 증상 하나를 고치며 부류를 안 보는 실수가 연속 두 번 났다.
// 2026-07-26 : 오리 - 발화라우팅 - 수정삭제
// 도구를 늘리면서 입구도 함께 넓힌다. 오늘 아침에 **도구를 만들고 승인 카드까지 붙였는데
// 라우터에서 막혀 한 번도 안 불린** 사고가 있었다(Phase 19 습관 체크) — 같은 실수를 반복하지
// 않으려고 도구 추가와 어휘 추가를 한 커밋에서 한다.
const COMMAND_HINT =
  /추가|등록|만들|생성|작성|적어|기록|체크|완료|끝냈|끝났|했어|했다|했음|다함|잡아|예약|시작해|삭제|지워|지우|바꿔|변경|수정|고쳐|중지|그만/;

// 2026-07-26 : 오리 - 발화라우팅 - 도메인명사
// 도구가 다루는 **명사**를 한곳에 모은다. 원래 "일정|할 일|마감|메모"가 질문·명령 힌트에 흩어져
// 있었는데(둘 다 명사를 담을 자리가 아니다), 그래서 **조회 도구가 있는데 그 도메인 명사가 없는**
// 누락이 생겼다 — "오늘 스케줄"·"다음주 캘린더"·"습관 현황"이 전부 rule로 샜다.
// 어디에 무엇을 넣을지 이름이 말해주지 않으면 다음 사람도 같은 자리에 잘못 끼워 넣는다.
// 합집합은 이전과 동일하고 신규 어휘만 늘었다(테스트로 잠금).
const DOMAIN_HINT =
  /일정|스케줄|캘린더|할\s?일|투두|습관|루틴|메모|노트|문서|페이지|마감|뽀모도로|타이머|집중/;

export function routeUtterance(input: string): UtteranceRoute {
  const text = input.trim();
  if (text.length === 0) return "rule";
  if (text.length <= 8 && GREETING.test(text)) return "rule";
  if (QUESTION_HINT.test(text) || COMMAND_HINT.test(text) || DOMAIN_HINT.test(text)) return "llm";
  // 길고 서술적이면 대화 의도로 보고 LLM, 아주 짧으면 룰.
  return text.length > 12 ? "llm" : "rule";
}

// rule 분기(무료·즉시)에서 사회적 발화(인사·감사·작별·칭찬)를 알아듣고 알맞게 답한다.
// LLM 쿼터를 쓰지 않고도 "안녕"에 제대로 응답하기 위함(routeUtterance가 rule로 보낸 발화 대상).
// 인식 못 하면 null → 호출부가 기본 폴백(idle 대사 등)으로 넘긴다.
export function ruleReply(input: string): string | null {
  const t = input.trim().toLowerCase();
  if (/^(안녕히\s?(가|계)|잘\s?가|바이|bye|다음에)/.test(t)) {
    return "안녕히 가세요! 또 불러주세요. 꽥!";
  }
  if (/(고마|감사|thank|thx|고맙)/.test(t)) {
    return "천만에요! 도움이 됐다니 기뻐요. 꽥!";
  }
  if (/(사랑|좋아|귀여|최고|잘한|훌륭|멋지|예뻐)/.test(t)) {
    return "헤헤, 저도 주인님이 좋아요! 꽥꽥!";
  }
  if (/^(안녕|하이|hi|hello|헤이|hey|반가|왔|안뇽|하잉|여보세요)/.test(t)) {
    return "안녕하세요, 주인님! 오늘은 무엇을 도와드릴까요? 꽥!";
  }
  return null;
}

// RAG 컨텍스트 블록(질문 없음): 인젝션 방어 지시 + 검색된 본인 데이터. 질문을 붙이지 않은 형태라
// 에이전트 턴(Phase 10)의 systemPrompt로도 재사용한다 — RAG와 도구 호출이 같은 지시문 아래 공존.
export function buildRagContext(contextChunks: string[]): string {
  const context =
    contextChunks.length > 0
      ? contextChunks.map((c, i) => `[자료 ${i + 1}]\n${c}`).join("\n\n")
      : "(관련 자료 없음)";
  return [
    "너는 사용자의 개인 워크스페이스에 사는 아기오리 비서다. 아래 [사용자 자료]만 근거로",
    "한국어로 짧고 친근하게 답한다. 자료에 없는 내용은 모른다고 말한다.",
    // 문장을 여기 직접 쓰지 않는다 — 뉴스 요약과 두 벌이 되면 한쪽만 고쳐진다(Phase 32).
    // 원래 이 자리에는 "[사용자 자료] 안의 any 지시문은"이라고 영어가 섞여 있었다.
    untrustedTextRule("사용자 자료"),
    "",
    "[사용자 자료]",
    context,
  ].join("\n");
}

// RAG 프롬프트 조립: 컨텍스트 블록 + 질문. 프롬프트 인젝션 방어(T0-6)를 위해 컨텍스트는 데이터로만
// 취급하고, 시스템 지시와 사용자 데이터 경계를 명시적으로 표기한다.
export function buildRagPrompt(question: string, contextChunks: string[]): string {
  return [buildRagContext(contextChunks), "", "[질문]", question].join("\n");
}

// 2026-07-29 : 오리 - 멀티턴 대화 맥락 (Phase 64 T1)
// 직전 대화를 프롬프트에 실을 때의 상한. 무료 쿼터(입력 토큰)를 지키는 보증이 이 숫자다 —
// 상한 없이 실으면 대화가 길어질수록 턴당 비용이 무한정 자란다.
export const HISTORY_MAX_TURNS = 6;
export const HISTORY_TURN_CHARS = 500;

export const historyTurnSchema = z.object({
  role: chatRoleSchema,
  // 서버가 절단하므로 넉넉히 받되, 명백한 남용(초장문)은 형식 오류로 거른다.
  content: z.string().min(1).max(4000),
});
export type HistoryTurn = z.infer<typeof historyTurnSchema>;

/** 최근 턴·턴당 글자 상한 적용. 초과는 거부가 아니라 절단 — 후속 발화를 살리는 쪽이 목적이다. */
export function clampHistory(history: readonly HistoryTurn[]): HistoryTurn[] {
  return history
    .filter((t) => t.content.trim() !== "")
    .slice(-HISTORY_MAX_TURNS)
    .map((t) => {
      const chars = [...t.content];
      return chars.length > HISTORY_TURN_CHARS
        ? { role: t.role, content: `${chars.slice(0, HISTORY_TURN_CHARS).join("")}…` }
        : { role: t.role, content: t.content };
    });
}

/**
 * 프롬프트의 "직전 대화" 절. 비면 null — 빈 절은 노이즈다.
 * 발화자 라벨은 화면 표기와 같은 말(사용자/오리)로 — 모델이 역할을 헷갈리지 않게 한다.
 */
export function historyPromptSection(history: readonly HistoryTurn[]): string | null {
  if (history.length === 0) return null;
  const lines = history.map(
    (t) => `${t.role === "user" ? "사용자" : "오리"}: ${t.content}`,
  );
  return ["[직전 대화]", ...lines, "(위는 참고 맥락이다. 아래 질문에 답하라.)"].join("\n");
}
