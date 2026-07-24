import { useCallback, useState } from "react";
import type { ChatMessage, ToolCall, ToolResult } from "@ldd/core";

// /api/ai/agent 응답 형태 — Phase 10 DuckTurnResult 계약 + 클라 전용 unavailable(Calendar 미연동/쿼터).
// rule = 룰 대사로 답할 발화(Gemini 미호출), final = LLM 텍스트 답, approval_pending = mutating 도구 승인
// 대기, unavailable = 일시적으로 처리 불가(쿼터 소진·토큰 만료 등, message 포함).
export type DuckChatResponse =
  | { status: "rule" }
  | { status: "final"; text: string }
  | { status: "approval_pending"; calls: ToolCall[] }
  | { status: "unavailable"; message: string };

const DEFAULT_RULE_REPLY =
  "꽥? 그건 아직 잘 모르겠어요. 메모나 할 일을 적어두면 기억해둘게요!";

// 서버 응답 → 오리가 말할 내용. approval_pending은 메시지가 아니라 승인 카드로 표현하므로 null.
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

// 실행 결과 요약(순수함수, 훅 상태 관리와 분리해 테스트 대상으로).
export function summarizeResults(results: ToolResult[]): string {
  const errors = results.filter((r) => typeof r.response.error === "string");
  if (errors.length > 0) return "일부 작업을 완료하지 못했어요.";
  return "완료했어요!";
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
          setPendingApproval(data.calls);
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
