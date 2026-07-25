import { useCallback, useState } from "react";
import { ruleReply, type ChatMessage, type ToolCall, type ToolResult } from "@ldd/core";

// /api/ai/agent 응답 형태 — Phase 10 DuckTurnResult 계약 + 클라 전용 unavailable(Calendar 미연동/쿼터).
// rule = 룰 대사로 답할 발화(Gemini 미호출), final = LLM 텍스트 답, approval_pending = mutating 도구 승인
// 대기, unavailable = 일시적으로 처리 불가(쿼터 소진·토큰 만료 등, message 포함).
export type DuckChatResponse =
  | { status: "rule" }
  | { status: "final"; text: string }
  // text: 같은 턴에 섞여 온 조회의 답(있을 때만). 승인 카드와 별개로 오리가 먼저 말한다.
  | { status: "approval_pending"; calls: ToolCall[]; text?: string }
  | { status: "unavailable"; message: string };

const DEFAULT_RULE_REPLY =
  "꽥? 그건 아직 잘 모르겠어요. 메모나 할 일을 적어두면 기억해둘게요!";

// 서버 응답 → 오리가 말할 내용. approval_pending은 승인 카드로 표현하므로 여기선 null이다
// (섞여 온 조회 답 text는 훅에서 별도 메시지로 먼저 출력한다 — 카드와 답은 다른 표현이다).
// 순수함수라 테스트 대상(훅의 상태 관리는 얇게 유지, Phase 8 resolveDuckReply와 동일 취지).
export function resolveDuckMessage(
  response: DuckChatResponse,
  rulePhrase?: () => string,
): string | null {
  switch (response.status) {
    case "rule":
      return rulePhrase?.() ?? DEFAULT_RULE_REPLY;
    case "final":
      return response.text;
    case "unavailable":
      return response.message;
    case "approval_pending":
      return null;
  }
}

export type UseDuckChatOptions = {
  endpoint?: string;
  approveEndpoint?: string;
  rulePhrase?: () => string; // rule 분기 시 오리 룰 대사(Phase 6 pickIdlePhrase 등) 주입
  fetchImpl?: typeof fetch;
  now?: () => string; // 타임스탬프 주입(테스트용)
};

export type UseDuckChatResult = {
  messages: ChatMessage[];
  pending: boolean;
  error: string | null;
  pendingApproval: ToolCall[] | null;
  send: (text: string) => Promise<void>;
  approve: () => Promise<void>;
  cancel: () => void;
  clear: () => void;
};

// 2026-07-26 : 오리 - 승인실행 - 실패이유전달
// 이전엔 실패 시 "일부 작업을 완료하지 못했어요."만 말하고 **어댑터가 준 이유를 버렸다.**
// 사용자는 무엇을 고쳐야 할지 알 수 없었다 — 예: "그런 습관을 찾지 못했어요"라면 이름을 바꿔
// 다시 말하면 되는데, 그 사실이 전달되지 않았다.
//
// 이유를 그대로 보여도 안전하다: response.error에 담기는 문자열은 appActions.errorResult가
// 손으로 쓴 한국어 문구뿐이고, 외부 API 예외는 승인 라우트 바깥 catch로 빠져 여기 오지 않는다
// (2026-07-26 전 호출 지점 확인). 그래도 계약이 깨질 때를 대비해 길이·개수 상한을 둔다.
const MAX_REASON_LEN = 120;
const MAX_REASONS = 3;

// 실행 결과 요약(순수함수, 훅 상태 관리와 분리해 테스트 대상으로).
export function summarizeResults(results: ToolResult[]): string {
  // 실패 판정은 error 키의 존재로 한다 — 문자열이 아니어도 성공으로 둔갑하면 안 된다.
  const failed = results.filter((r) => r.response.error != null);
  if (failed.length === 0) return "완료했어요!";

  const reasons = [
    ...new Set(
      failed
        .map((r) => r.response.error)
        .filter((e): e is string => typeof e === "string" && e.trim().length > 0)
        .map((e) => e.trim().slice(0, MAX_REASON_LEN)),
    ),
  ].slice(0, MAX_REASONS);

  const succeeded = results.length - failed.length;
  const head = succeeded > 0 ? `${succeeded}개는 처리했어요. ` : "";
  // 이유를 하나도 못 건졌으면(계약 위반·빈 문자열) 원본을 억지로 노출하지 않고 일반 문구로.
  if (reasons.length === 0) return `${head}일부 작업을 완료하지 못했어요.`;
  return `${head}${reasons.join(" ")}`;
}

// 오리 대화 훅(단일). RAG 질답(Phase 8)과 에이전트 액션(Phase 10)을 한 대화창에서 자연스럽게 다룬다 —
// /api/ai/agent가 룰 라우팅·RAG·도구 루프를 전부 처리하고, 여기선 메시지·승인대기 상태만 관리한다.
// mutating 도구는 승인 대기(pendingApproval)로 노출되며, 실제 실행은 사용자가 approve()를 명시 호출해야만
// 일어난다(파괴적 액션 자동 실행 금지, T0-4).
export function useDuckChat(options: UseDuckChatOptions = {}): UseDuckChatResult {
  const {
    endpoint = "/api/ai/agent",
    approveEndpoint = "/api/ai/agent/approve",
    rulePhrase,
    fetchImpl = fetch,
    now = () => new Date().toISOString(),
  } = options;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingApproval, setPendingApproval] = useState<ToolCall[] | null>(null);

  const addDuckMessage = useCallback(
    (content: string) => {
      setMessages((prev) => [...prev, { role: "duck", content, createdAt: now() }]);
    },
    [now],
  );

  const send = useCallback(
    async (text: string) => {
      const question = text.trim();
      if (question.length === 0 || pending) return;

      setError(null);
      setPending(true);
      setMessages((prev) => [
        ...prev,
        { role: "user", content: question, createdAt: now() },
      ]);

      try {
        const res = await fetchImpl(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question }),
        });
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as DuckChatResponse;
        if (data.status === "approval_pending") {
          // 조회+변경이 섞인 턴이면 조회 답을 먼저 말한 뒤 승인 카드를 띄운다.
          // 이걸 빠뜨리면 서버가 만든 답이 화면에 닿지 않아 조회 질문이 무시된 것처럼 보인다.
          if (data.text) addDuckMessage(data.text);
          setPendingApproval(data.calls);
        } else if (data.status === "rule") {
          // rule 분기: 인사·감사 등 사회적 발화를 먼저 알아듣고(무료·즉시), 아니면 idle 대사/기본 폴백.
          addDuckMessage(ruleReply(question) ?? rulePhrase?.() ?? DEFAULT_RULE_REPLY);
        } else {
          addDuckMessage(resolveDuckMessage(data, rulePhrase) ?? DEFAULT_RULE_REPLY);
        }
      } catch {
        // 실패해도 오리가 침묵하지 않도록 폴백 대사 + 에러 표시.
        setError("지금은 답하기 어려워요. 잠시 후 다시 시도해주세요.");
        addDuckMessage(rulePhrase?.() ?? DEFAULT_RULE_REPLY);
      } finally {
        setPending(false);
      }
    },
    [endpoint, rulePhrase, fetchImpl, now, pending, addDuckMessage],
  );

  const approve = useCallback(async () => {
    if (!pendingApproval || pending) return;
    const calls = pendingApproval;
    setPendingApproval(null);
    setPending(true);
    setError(null);
    try {
      const res = await fetchImpl(approveEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ calls }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as { results: ToolResult[] };
      addDuckMessage(summarizeResults(data.results));
    } catch {
      setError("실행 중 문제가 생겼어요. 잠시 후 다시 시도해주세요.");
      addDuckMessage("꽥... 작업을 완료하지 못했어요.");
    } finally {
      setPending(false);
    }
  }, [pendingApproval, pending, fetchImpl, approveEndpoint, addDuckMessage]);

  const cancel = useCallback(() => {
    setPendingApproval(null);
    addDuckMessage("알겠어요, 취소할게요.");
  }, [addDuckMessage]);

  const clear = useCallback(() => {
    setMessages([]);
    setPendingApproval(null);
    setError(null);
  }, []);

  return { messages, pending, error, pendingApproval, send, approve, cancel, clear };
}
