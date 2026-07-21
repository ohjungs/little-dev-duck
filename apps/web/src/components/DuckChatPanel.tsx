"use client";

import { useState } from "react";
import { useChat } from "@ldd/ai";
import { Button, Card } from "@ldd/ui";

const inputStyle = {
  flex: 1,
  background: "var(--ldd-color-bg)",
  color: "var(--ldd-color-text)",
  border: "1px solid var(--ldd-color-accent)",
  borderRadius: "6px",
  padding: "0.5rem",
  fontFamily: "inherit",
  fontSize: "1rem",
} as const;

function bubbleStyle(isUser: boolean) {
  return {
    alignSelf: isUser ? ("flex-end" as const) : ("flex-start" as const),
    background: isUser ? "var(--ldd-color-accent)" : "var(--ldd-color-bg)",
    color: isUser ? "var(--ldd-color-text-on-accent)" : "var(--ldd-color-text)",
    border: "1px solid var(--ldd-color-accent)",
    borderRadius: "10px",
    padding: "0.4rem 0.6rem",
    maxWidth: "80%",
    whiteSpace: "pre-wrap" as const,
  };
}

// 오리 RAG 대화 패널. /api/ai/chat이 라우팅·검색·폴백을 처리하고 여기선 입력·표시만 담당.
export function DuckChatPanel() {
  const { messages, pending, error, send } = useChat();
  const [input, setInput] = useState("");

  const submit = async () => {
    const text = input.trim();
    if (text.length === 0 || pending) return;
    setInput("");
    await send(text);
  };

  return (
    <Card data-testid="duck-chat" style={{ width: "100%", maxWidth: "560px" }}>
      <h2 style={{ fontSize: "1.1rem", marginBottom: "0.75rem" }}>오리에게 물어보기</h2>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.5rem",
          maxHeight: "260px",
          overflowY: "auto",
          marginBottom: "0.75rem",
        }}
      >
        {messages.length === 0 && (
          <p style={{ opacity: 0.7 }}>
            메모·할 일에 대해 물어보세요. 예: &quot;이번 주 마감 뭐 있어?&quot;
          </p>
        )}
        {messages.map((m, i) => (
          <div key={`${m.createdAt}-${i}`} style={bubbleStyle(m.role === "user")}>
            {m.content}
          </div>
        ))}
        {pending && <p style={{ opacity: 0.7 }}>오리가 생각 중...</p>}
      </div>

      {error && (
        <p role="alert" style={{ color: "#b3261e", marginBottom: "0.5rem" }}>
          {error}
        </p>
      )}

      <div style={{ display: "flex", gap: "0.5rem" }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
          placeholder="오리에게 물어보기"
          style={inputStyle}
        />
        <Button type="button" onClick={submit} disabled={pending}>
          보내기
        </Button>
      </div>
    </Card>
  );
}
