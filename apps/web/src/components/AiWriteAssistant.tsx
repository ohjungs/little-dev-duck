"use client";

import { useState } from "react";
import { ChevronDown, Copy, Loader2, Sparkles } from "lucide-react";
import { WRITE_ACTIONS, type WriteAction } from "@ldd/core";
import { cn } from "@/lib/utils";

const LABELS: Record<WriteAction, string> = {
  summarize: "요약",
  polish: "다듬기",
  shorten: "짧게",
  translate_en: "영어로",
  continue: "이어쓰기",
};

// 에디터 AI 작문 도우미(노션 격차 P1). BlockNote 내부를 건드리지 않고 별도 패널로 제공 — 글을 붙여넣고
// 액션을 고르면 기존 Gemini 프록시(/api/ai/write)로 변환. 결과는 복사해 본문에 붙인다.
export function AiWriteAssistant() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [result, setResult] = useState("");
  const [busy, setBusy] = useState<WriteAction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const run = async (action: WriteAction) => {
    if (!text.trim() || busy) return;
    setBusy(action);
    setError(null);
    setResult("");
    setCopied(false);
    try {
      const res = await fetch("/api/ai/write", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, text }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "실패했어요.");
      else setResult(data.result ?? "");
    } catch {
      setError("요청에 실패했어요.");
    } finally {
      setBusy(null);
    }
  };

  const copy = () => {
    if (!result) return;
    void navigator.clipboard?.writeText(result).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <div className="mx-4 rounded-xl border border-border bg-card/40">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <Sparkles className="size-4 text-primary-accent" /> AI 작문 도우미
        <ChevronDown
          className={cn("ml-auto size-4 transition-transform", open && "rotate-180")}
        />
      </button>
      {open && (
        <div className="flex flex-col gap-3 px-4 pb-4">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            placeholder="요약·다듬기·번역할 글을 붙여넣으세요"
            aria-label="AI 작문 입력"
            className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/40"
          />
          <div className="flex flex-wrap gap-1.5">
            {WRITE_ACTIONS.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => run(a)}
                disabled={!text.trim() || busy !== null}
                className="flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-xs transition-colors hover:bg-muted disabled:opacity-40"
              >
                {busy === a && <Loader2 className="size-3 animate-spin" />}
                {LABELS[a]}
              </button>
            ))}
          </div>
          {error && (
            <p role="alert" className="text-xs text-destructive">
              {error}
            </p>
          )}
          {result && (
            <div className="rounded-lg border border-border bg-background p-3">
              <div className="flex items-start justify-between gap-2">
                <p className="min-w-0 flex-1 whitespace-pre-wrap text-sm">
                  {result}
                </p>
                <button
                  type="button"
                  onClick={copy}
                  aria-label="결과 복사"
                  className="shrink-0 rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Copy className="size-3.5" />
                </button>
              </div>
              {copied && (
                <p className="mt-1 text-xs text-primary-accent">복사됨</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
