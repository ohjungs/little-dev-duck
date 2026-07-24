"use client";

import { useState } from "react";
import { RefreshCw, Send, Sparkles } from "lucide-react";
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

// 오리 대화 패널(단일). RAG 질답과 에이전트 액션을 같은 대화창에서 자연스럽게 다룬다 —
// /api/ai/agent가 라우팅·검색·도구 루프·폴백을 전부 처리하고, 여기선 입력·표시·승인 카드만 담당한다.
type ReindexState = "idle" | "running" | "done" | "error";

const REINDEX_LABEL: Record<ReindexState, string> = {
  idle: "기존 메모·할일 인덱싱",
  running: "인덱싱 중...",
  done: "인덱싱 완료",
  error: "다시 인덱싱",
};

// 도구 이름을 사람이 읽을 라벨로. 카탈로그가 늘면 여기만 추가(어댑터 자체는 core에 라벨을 안 둠 —
// Gemini 계약과 UI 표현을 분리).
const TOOL_LABELS: Record<string, string> = {
  createCalendarEvent: "캘린더 일정 만들기",
  createGithubIssue: "GitHub 이슈 만들기",
  trashEmail: "이메일 휴지통으로 이동",
};

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

function formatWhen(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("ko-KR", { dateStyle: "medium", timeStyle: "short" });
}

// 승인 카드는 사용자가 정확히 무엇을 승인하는지 안전하게 판단할 수 있어야 한다(CLAUDE.md 5절 안전 규칙
// + T0-4 승인 게이트 취지) — 도구명뿐 아니라 LLM이 채운 실제 파라미터(제목/시간)를 전부 노출한다.
// 제목·시간은 LLM 산출이라 신뢰 불가한 텍스트일 수 있으므로 지시문처럼 렌더링하지 않고 순수 텍스트로만
// 표시(HTML 삽입 없음, React가 이스케이프) — 승인 카드 자체가 프롬프트 인젝션의 실행 표면이 되지 않게.
function describeCall(call: ToolCall): string {
  const label = TOOL_LABELS[call.name] ?? call.name;
  // title(캘린더/GitHub 이슈)과 subject(Gmail, T6 — messageId만으론 사람이 어느 메일인지 알 수 없어
  // listRecentEmails에서 본 제목을 표시용으로만 되돌려 받는다)는 둘 다 "이 승인이 무엇에 대한 것인지"
  // 보여주는 같은 역할이라 하나로 합쳐 표시한다.
  const title =
    (typeof call.args.title === "string" ? call.args.title : null) ??
    (typeof call.args.subject === "string" ? call.args.subject : null);
  const start = formatWhen(call.args.start);
  const end = formatWhen(call.args.end);
  // GitHub 이슈 도구의 owner/repo — 어느 저장소에 만들지도 승인 판단에 필요한 정보(T5).
  const owner = typeof call.args.owner === "string" ? call.args.owner : null;
  const repo = typeof call.args.repo === "string" ? call.args.repo : null;
  const parts = [
    owner && repo ? `${owner}/${repo}` : null,
    title ? `"${title}"` : null,
    start && end ? `${start} ~ ${end}` : null,
  ].filter(Boolean);
  return parts.length > 0 ? `${label}: ${parts.join(", ")}` : label;
}

export function DuckChatPanel() {
  const { messages, pending, error, pendingApproval, send, approve, cancel } =
    useDuckChat();
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
          <Sparkles className="size-4 text-primary-accent" />
          오리에게 물어보고 시키기
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
  );
}
