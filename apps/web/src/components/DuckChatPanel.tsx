"use client";

import { useEffect, useState } from "react";
import { Send, Sparkles, Trash2 } from "lucide-react";
import { describeCall } from "@/lib/approvalLabel";
import { useDuckChat } from "@ldd/ai";
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
import { ConfirmDialog } from "@/components/ConfirmDialog";

// 오리 대화 패널(단일). RAG 질답과 에이전트 액션을 같은 대화창에서 자연스럽게 다룬다 —
// /api/ai/agent가 라우팅·검색·도구 루프·폴백을 전부 처리하고, 여기선 입력·표시·승인 카드만 담당한다.

// 기존 메모·할일 백필 인덱싱: 최초 1회만 자동 실행(버튼 없이). 성공 시 플래그를 남겨 재실행 안 함.
// 신규 저장분은 CRUD 시점에 이미 인덱싱되므로, 백필은 사전 데이터에 대해 한 번이면 충분하다.
const REINDEX_DONE_KEY = "ldd-reindex-backfilled";

// 상대 시각 표시. createdAt은 ISO 8601 문자열(useDuckChat이 new Date().toISOString()으로 기록).
// 외부 라이브러리 없이 인라인 계산 — 분 단위까지, 그 이상은 시각 그대로.
function timeAgo(createdAt: string): string {
  const diffMs = Date.now() - new Date(createdAt).getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "방금";
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}시간 전`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}일 전`;
}

export function DuckChatPanel() {
  const { messages, pending, error, pendingApproval, send, approve, cancel, clear } =
    useDuckChat();
  const [input, setInput] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);

  // 최초 1회 자동 백필 인덱싱(버튼 제거 — 사용자가 신경 쓸 필요 없이 알아서 연동).
  // 실패하면 플래그를 남기지 않아 다음 세션에 자동 재시도한다(멱등 upsert).
  useEffect(() => {
    if (localStorage.getItem(REINDEX_DONE_KEY)) return;
    void (async () => {
      try {
        const res = await fetch("/api/ai/reindex-all", { method: "POST" });
        if (res.ok) localStorage.setItem(REINDEX_DONE_KEY, "1");
      } catch {
        // 다음 세션에 재시도
      }
    })();
  }, []);

  const submit = async () => {
    const text = input.trim();
    if (text.length === 0 || pending) return;
    setInput("");
    await send(text);
  };

  return (
    <>
    <Card data-testid="duck-chat" className="flex h-full flex-col">
      <CardHeader>
        <CardTitle>
          <Sparkles className="size-4 text-primary-accent" />
          오리에게 물어보고 시키기
        </CardTitle>
        <div className="flex gap-2">
          {messages.length > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setConfirmClear(true)}
              title="대화 내역을 지웁니다"
            >
              <Trash2 className="size-3.5" />
              대화 지우기
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col">
        <div className="mb-3 flex min-h-[220px] flex-1 flex-col gap-2 overflow-y-auto pr-1">
          {messages.length === 0 && !pendingApproval && (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 py-8 text-center">
              <span className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary-accent">
                <Sparkles className="size-5" />
              </span>
              <p className="text-sm text-muted-foreground">
                메모·할 일을 물어보거나 일을 시켜보세요.
                <br />
                예: &quot;이번 주 마감 뭐 있어?&quot; · &quot;내일 오후 3시에 회의 잡아줘&quot;
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
              <span className="text-[10px] text-muted-foreground mt-0.5 block">
                {timeAgo(m.createdAt)}
              </span>
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
            placeholder="오리에게 물어보거나 시키기"
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

    <ConfirmDialog
      open={confirmClear}
      title="대화 지우기"
      description="대화 내역을 모두 지울까요? 이 작업은 되돌릴 수 없습니다."
      confirmLabel="지우기"
      onConfirm={() => {
        setConfirmClear(false);
        clear();
      }}
      onCancel={() => setConfirmClear(false)}
    />
    </>
  );
}
