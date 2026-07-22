"use client";

import { useState } from "react";
import { RefreshCw, Send, Sparkles } from "lucide-react";
import { useChat } from "@ldd/ai";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// 오리 RAG 대화 패널. /api/ai/chat이 라우팅·검색·폴백을 처리하고 여기선 입력·표시만 담당.
type ReindexState = "idle" | "running" | "done" | "error";

const REINDEX_LABEL: Record<ReindexState, string> = {
  idle: "기존 메모·할일 인덱싱",
  running: "인덱싱 중...",
  done: "인덱싱 완료",
  error: "다시 인덱싱",
};

export function DuckChatPanel() {
  const { messages, pending, error, send } = useChat();
  const [input, setInput] = useState("");
  const [reindexState, setReindexState] = useState<ReindexState>("idle");

  // 기존 메모·할일 일괄 인덱싱(백필). 저장 시 인덱싱은 신규분만 다루므로 최초 1회 필요.
  const runReindex = async () => {
    if (reindexState === "running") return;
    setReindexState("running");
    try {
      const res = await fetch("/api/ai/reindex-all", { method: "POST" });
      setReindexState(res.ok ? "done" : "error");
    } catch {
      setReindexState("error");
    }
  };

  const submit = async () => {
    const text = input.trim();
    if (text.length === 0 || pending) return;
    setInput("");
    await send(text);
  };

  return (
    <Card data-testid="duck-chat" className="flex h-full flex-col">
      <CardHeader>
        <CardTitle>
          <Sparkles className="size-4 text-primary" />
          오리에게 물어보기
        </CardTitle>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={runReindex}
          disabled={reindexState === "running"}
          title="이미 저장된 메모·할일을 검색 가능하게 만듭니다"
        >
          <RefreshCw
            className={cn(reindexState === "running" && "animate-spin")}
          />
          {REINDEX_LABEL[reindexState]}
        </Button>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col">
        <div className="mb-3 flex min-h-[220px] flex-1 flex-col gap-2 overflow-y-auto pr-1">
          {messages.length === 0 && (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 py-8 text-center">
              <span className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Sparkles className="size-5" />
              </span>
              <p className="text-sm text-muted-foreground">
                메모·할 일에 대해 물어보세요.
                <br />
                예: &quot;이번 주 마감 뭐 있어?&quot;
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
            placeholder="오리에게 물어보기"
          />
          <Button
            type="button"
            size="icon"
            onClick={submit}
            disabled={pending}
            aria-label="보내기"
          >
            <Send />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
