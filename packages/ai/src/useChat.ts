import { useCallback, useState } from "react";
import type { ChatMessage } from "@ldd/core";

// /api/ai/chat 응답 형태(서버 answerQuestion 결과와 동일 shape).
export type ChatResponse = {
  route: "rule" | "llm";
  answer: string | null;
  sources?: {
    sourceType: string;
    sourceId: string;
    content: string;
    similarity: number;
  }[];
};

const DEFAULT_RULE_REPLY =
  "꽥? 그건 아직 잘 모르겠어요. 메모나 할 일을 적어두면 기억해둘게요!";

// 서버 응답 → 오리가 말할 내용. llm 답변이 있으면 그대로, rule이거나 답변이 비면 룰 대사(주입) 또는
// 기본 문구. 순수함수라 테스트 대상(훅의 상태 관리는 얇게 유지).
export function resolveDuckReply(
  response: ChatResponse,
  rulePhrase?: () => string,
): string {
  if (response.route === "llm" && response.answer && response.answer.trim()) {
    return response.answer;
  }
  return rulePhrase?.() ?? DEFAULT_RULE_REPLY;
}

export type UseChatOptions = {
  endpoint?: string;
  rulePhrase?: () => string; // rule 분기 시 오리 룰 대사(Phase 6 pickIdlePhrase 등) 주입
  fetchImpl?: typeof fetch;
  now?: () => string; // 타임스탬프 주입(테스트용)
};

export type UseChatResult = {
  messages: ChatMessage[];
  pending: boolean;
  error: string | null;
  send: (text: string) => Promise<void>;
};

// 오리 대화 훅. /api/ai/chat 프록시가 라우팅·RAG·폴백을 처리하고, 여기선 메시지 상태만 관리한다.
export function useChat(options: UseChatOptions = {}): UseChatResult {
  const {
    endpoint = "/api/ai/chat",
    rulePhrase,
    fetchImpl = fetch,
    now = () => new Date().toISOString(),
  } = options;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        const data = (await res.json()) as ChatResponse;
        const reply = resolveDuckReply(data, rulePhrase);
        setMessages((prev) => [
          ...prev,
          { role: "duck", content: reply, createdAt: now() },
        ]);
      } catch {
        // 실패해도 오리가 침묵하지 않도록 폴백 대사 + 에러 표시.
        setError("지금은 답하기 어려워요. 잠시 후 다시 시도해주세요.");
        setMessages((prev) => [
          ...prev,
          {
            role: "duck",
            content: rulePhrase?.() ?? DEFAULT_RULE_REPLY,
            createdAt: now(),
          },
        ]);
      } finally {
        setPending(false);
      }
    },
    [endpoint, rulePhrase, fetchImpl, now, pending],
  );

  return { messages, pending, error, send };
}
