import { useCallback, useState } from "react";
import type { ChatMessage, ToolCall, ToolResult } from "@ldd/core";

// /api/ai/agent 응답 형태 — Phase 10 AgentResult 계약과 동일 shape(+ unavailable = Calendar 미연동/쿼터).
export type AgentResponse =
  | { status: "final"; text: string }
  | { status: "approval_pending"; calls: ToolCall[] }
  | { status: "unavailable"; message: string };

export type UseAgentChatOptions = {
  endpoint?: string;
  approveEndpoint?: string;
  fetchImpl?: typeof fetch;
  now?: () => string;
};

export type UseAgentChatResult = {
  messages: ChatMessage[];
  pending: boolean;
  error: string | null;
  pendingApproval: ToolCall[] | null;
  send: (text: string) => Promise<void>;
  approve: () => Promise<void>;
  cancel: () => void;
};

// 실행 결과 요약(순수함수, 훅 상태 관리와 분리해 테스트 대상으로).
export function summarizeResults(results: ToolResult[]): string {
  const errors = results.filter((r) => typeof r.response.error === "string");
  if (errors.length > 0) return "일부 작업을 완료하지 못했어요.";
  return "완료했어요!";
}

// 오리 에이전트 대화 훅. /api/ai/agent가 도구 루프를 처리하고, mutating 도구는 승인 대기(pendingApproval)로
// 노출한다 — 실제 실행은 사용자가 approve()를 명시 호출해야만 일어난다(파괴적 액션 자동 실행 금지, T0-4).
export function useAgentChat(options: UseAgentChatOptions = {}): UseAgentChatResult {
  const {
    endpoint = "/api/ai/agent",
    approveEndpoint = "/api/ai/agent/approve",
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
        const data = (await res.json()) as AgentResponse;
        if (data.status === "final") {
          addDuckMessage(data.text);
        } else if (data.status === "approval_pending") {
          setPendingApproval(data.calls);
        } else {
          addDuckMessage(data.message);
        }
      } catch {
        setError("지금은 처리하기 어려워요. 잠시 후 다시 시도해주세요.");
        addDuckMessage("꽥... 지금은 답하기 어려워요.");
      } finally {
        setPending(false);
      }
    },
    [endpoint, fetchImpl, now, pending, addDuckMessage],
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

  return { messages, pending, error, pendingApproval, send, approve, cancel };
}
