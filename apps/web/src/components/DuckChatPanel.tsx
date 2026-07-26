"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Sparkles, Trash2 } from "lucide-react";
import { describeCall } from "@/lib/approvalLabel";
import { timeAgo } from "@/lib/timeAgo";
import { DUCK_EXAMPLES } from "@/lib/duckExamples";
import { useDuckChat } from "@ldd/ai";
import { emitAppAction } from "@/lib/appActionSignal";
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

// 상대 시각 표시. createdAt은 ISO 8601 문자열(useDuckChat이 new Date().toISOString()으로 기록).
// 외부 라이브러리 없이 인라인 계산 — 분 단위까지, 그 이상은 시각 그대로.
export function DuckChatPanel() {
  const { messages, pending, error, pendingApproval, send, approve, cancel, clear } =
    useDuckChat({
      // 승인 실행이 끝나면 같은 탭의 위젯이 바뀐 데이터를 다시 읽게 한다.
      // 오리가 뽀모도로를 시작했는데 화면은 그대로면 사용자는 아무 일도 안 일어났다고 본다.
      onExecuted: (results) => emitAppAction(results.map((r) => r.name)),
    });
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  // 자동 색인 복구(버튼 없이 — 사용자가 신경 쓸 필요 없이 알아서 연동).
  //
  // 2026-07-26 : 예전엔 "최초 1회"만 돌고 완료 플래그를 남겼다. 그런데 저장 시 색인은
  // fire-and-forget이라 조용히 실패한다(무료 티어 쿼터가 바닥나면 반드시). 플래그가 남은 뒤
  // 실패한 항목은 **영영 오리에게 안 보였다.** 그래서 매 세션 돌리되 서버가 **빠진 것만**
  // 고르게 했다 — 빠진 게 없으면 Gemini 호출이 0이라 쿼터를 쓰지 않는다.
  //
  // offset은 보내지 않는다. 이 모드는 대상 목록이 실행할 때마다 줄어들어 **그 자체가 진행
  // 장치**다. 옛 offset을 줄어든 목록에 적용하면 앞부분을 건너뛰고 남았는데도 "다 됐다"가 된다.
  // 한 번에 상한(200)까지만 하고 나머지는 다음 세션에 이어서 — 쿼터를 아끼기 위해서다.
  useEffect(() => {
    void (async () => {
      try {
        await fetch("/api/ai/reindex-all", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
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
              </p>
              {/* 예시를 눌러 입력창에 채운다. **바로 보내지 않는다** — 의도 없이 눌렀을 때
                  무료 쿼터를 쓰지 않게 하고, 문장을 고쳐 쓸 여지를 남긴다.
                  예시가 실제로 오리에게 도달하는지는 테스트로 잠갔다(duckExamples.test.ts). */}
              <div className="flex flex-wrap justify-center gap-1.5">
                {DUCK_EXAMPLES.map((ex) => (
                  <button
                    key={ex.text}
                    type="button"
                    onClick={() => {
                      setInput(ex.text);
                      inputRef.current?.focus();
                    }}
                    className="rounded-full border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {ex.text}
                  </button>
                ))}
              </div>
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
            ref={inputRef}
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
