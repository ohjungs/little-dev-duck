"use client";

import { useState } from "react";
import { CalendarClock, Send } from "lucide-react";
import { useAgentChat } from "@ldd/ai";
import type { ToolCall } from "@ldd/core";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// 도구 이름을 사람이 읽을 라벨로. 카탈로그가 늘면 여기만 추가(어댑터 자체는 core에 라벨을 안 둠 —
// Gemini 계약과 UI 표현을 분리).
const TOOL_LABELS: Record<string, string> = {
  createCalendarEvent: "캘린더 일정 만들기",
};

function describeCall(call: ToolCall): string {
  const label = TOOL_LABELS[call.name] ?? call.name;
  const title = typeof call.args.title === "string" ? call.args.title : null;
  return title ? `${label}: "${title}"` : label;
}

// Phase 10 에이전트 액션 패널. RAG 대화(DuckChatPanel)와 관심사가 달라 별도 컴포넌트로 분리했다 —
// 여긴 오리가 실제로 외부 서비스에 작업을 수행하며, mutating 도구는 여기서만 뜨는 승인 카드를 거친다.
export function AgentChatPanel() {
  const { messages, pending, error, pendingApproval, send, approve, cancel } =
    useAgentChat();
  const [input, setInput] = useState("");

  const submit = async () => {
    const text = input.trim();
    if (text.length === 0 || pending) return;
    setInput("");
    await send(text);
  };

  return (
    <Card data-testid="agent-chat" className="flex h-full flex-col">
      <CardHeader>
        <CardTitle>
          <CalendarClock className="size-4 text-primary-accent" />
          오리에게 시키기
        </CardTitle>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col">
        <div className="mb-3 flex min-h-[220px] flex-1 flex-col gap-2 overflow-y-auto pr-1">
          {messages.length === 0 && !pendingApproval && (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 py-8 text-center">
              <span className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary-accent">
                <CalendarClock className="size-5" />
              </span>
              <p className="text-sm text-muted-foreground">
                일정을 시켜보세요.
                <br />
                예: &quot;내일 오후 3시에 회의 잡아줘&quot;
              </p>
            </div>
          )}
          {messages.map((m, i) => (
            <div
              key={`${m.createdAt}-${i}`}
              className={cn(
                "max-w-[80%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm",
                m.role === "user"
                  ? "self-end bg-primary text-primary-foreground rounded-br-md"
                  : "self-start bg-muted text-foreground rounded-bl-md",
              )}
            >
              {m.content}
            </div>
          ))}
          {pendingApproval && (
            <div
              role="alertdialog"
              aria-label="에이전트 작업 승인"
              className="self-start rounded-2xl rounded-bl-md border border-primary/30 bg-primary/5 px-3.5 py-3 text-sm"
            >
              <p className="mb-2 font-medium">이 작업을 할까요?</p>
              <ul className="mb-3 list-disc space-y-0.5 pl-4 text-muted-foreground">
                {pendingApproval.map((call, i) => (
                  <li key={`${call.id ?? i}`}>{describeCall(call)}</li>
                ))}
              </ul>
              <div className="flex gap-2">
                <Button type="button" size="sm" onClick={approve} disabled={pending}>
                  승인
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={cancel}
                  disabled={pending}
                >
                  취소
                </Button>
              </div>
            </div>
          )}
          {pending && (
            <div className="flex items-center gap-1.5 self-start rounded-2xl rounded-bl-md bg-muted px-3.5 py-2.5">
              <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:-0.3s]" />
              <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:-0.15s]" />
              <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/60" />
            </div>
          )}
        </div>

        {error && (
          <p role="alert" className="mb-2 text-xs text-destructive">
            {error}
          </p>
        )}

        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
            }}
            placeholder="오리에게 시키기"
            disabled={!!pendingApproval}
          />
          <Button
            type="button"
            size="icon"
            onClick={submit}
            disabled={pending || !!pendingApproval}
            aria-label="보내기"
          >
            <Send />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
