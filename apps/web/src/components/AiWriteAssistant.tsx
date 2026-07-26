"use client";

import { useState } from "react";
import { ChevronDown, Copy, Loader2 } from "lucide-react";
import { WRITE_ACTIONS, type WriteAction } from "@ldd/core";
import { cn } from "@/lib/utils";
import { DuckLogo } from "@/components/DuckLogo";
import { PAGE_TEMPLATES, templateToText } from "@/lib/pageTemplates";
import { listPages, searchPages } from "@ldd/api";
import { createClient } from "@/lib/supabase/client";
import type { Page } from "@ldd/core";

const LABELS: Record<WriteAction, string> = {
  summarize: "요약",
  polish: "다듬기",
  shorten: "짧게",
  expand: "자세히",
  bullets: "목록으로",
  title: "제목 짓기",
  translate_en: "영어로",
  continue: "이어쓰기",
};

// 2026-07-26 : 작문 - 오리표현 - 진행상태 (피드백 2-5)
// "오리 이미지 (오리가 생각중 .. 오리가 생성중 ..) 등으로". 액션마다 오리가 무엇을 하는
// 중인지 다르게 말한다 — 전부 "생성 중"이면 어떤 걸 눌렀는지 알 수 없다.
const BUSY_LABELS: Record<WriteAction, string> = {
  summarize: "오리가 읽는 중",
  polish: "오리가 다듬는 중",
  shorten: "오리가 줄이는 중",
  expand: "오리가 살 붙이는 중",
  bullets: "오리가 정리하는 중",
  title: "오리가 제목 고르는 중",
  translate_en: "오리가 옮기는 중",
  continue: "오리가 이어 쓰는 중",
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
  // 2026-07-27 (2차 피드백 2-5, Phase 45 T2): "다른 페이지 가져오기".
  // **LLM을 부르지 않는다** — 이미 쓴 글을 그대로 가져오는 일이라 생성할 것이 없다.
  // 검색도 `searchPages`(제목·본문 부분 일치)를 그대로 쓴다. 임베딩 검색은 이 용도에
  // 과하고(비용·지연), 사용자는 보통 자기가 쓴 제목을 기억한다.
  const [pageHits, setPageHits] = useState<Page[] | null>(null);
  const [pageBusy, setPageBusy] = useState(false);

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

  // 2026-07-27 (2차 피드백 2-5, Phase 45 T2): "템플릿 이용"이 요청에 있었는데 입구가 없었다.
  // **LLM을 부르지 않는다** — 템플릿은 정해진 구조라 생성할 이유가 없다(쿼터도 아낀다).
  // 정의는 새 페이지가 쓰는 `PAGE_TEMPLATES` 그대로다. 두 곳이 다른 구조를 보여주면 안 된다.
  const applyTemplate = (key: string) => {
    const template = PAGE_TEMPLATES.find((t) => t.key === key);
    if (!template) return;
    setError(null);
    setCopied(false);
    setResult(templateToText(template));
  };

  // 지금 글을 검색어로 관련 페이지를 찾는다. 글이 비었으면 최근 페이지를 보여 준다 —
  // 빈 화면에서 "가져오기"를 누르는 것이 가장 흔한 경우인데 거기서 아무것도 안 나오면 막힌다.
  const findPages = async () => {
    if (pageBusy) return;
    setPageBusy(true);
    setError(null);
    try {
      const supabase = createClient();
      const query = text.trim().slice(0, 60);
      const hits = query
        ? await searchPages(supabase, query, 8)
        : (await listPages(supabase)).slice(0, 8);
      setPageHits(hits);
    } catch {
      setError("페이지를 불러오지 못했어요.");
    } finally {
      setPageBusy(false);
    }
  };

  // 고른 페이지의 본문을 결과 칸에 넣는다. 붙여넣기는 사용자가 한다 —
  // 지금 쓰던 글을 말없이 덮으면 되돌릴 수 없다.
  const pullPage = (page: Page) => {
    setPageHits(null);
    setCopied(false);
    setResult(
      page.plainText.trim() || "(그 페이지는 아직 본문이 비어 있어요.)",
    );
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
        {/* 피드백 2-5: 반짝이 아이콘 대신 오리가 돕는다는 걸 보이게 한다. */}
        <DuckLogo size={18} />
        오리에게 부탁하기
        {busy && (
          <span className="flex items-center gap-1 text-xs font-normal text-primary-accent">
            <Loader2 className="size-3 animate-spin" />
            {BUSY_LABELS[busy]}
          </span>
        )}
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
            placeholder="오리에게 맡길 글을 붙여넣으세요 (요약·다듬기·목록·제목·번역)"
            aria-label="오리에게 맡길 글"
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

          {/* 2026-07-27 (2차 피드백 2-5): "템플릿 이용". 글이 없어도 쓸 수 있어야 한다 —
              템플릿은 **빈 문서에서 시작할 때** 가장 필요하다(위 액션들과 달리 입력이 필요 없다). */}
          {/* 2026-07-27 (2차 피드백 2-5): "다른 페이지 가져오기". 지금 글을 검색어로 쓰고,
              글이 비었으면 최근 페이지를 보여 준다. **LLM을 부르지 않는다** — 이미 쓴 글을
              그대로 가져오는 일이라 생성할 것이 없다(쿼터도 아낀다). */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-muted-foreground">다른 페이지</span>
            <button
              type="button"
              onClick={findPages}
              disabled={busy !== null || pageBusy}
              className="flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-xs transition-colors hover:bg-muted disabled:opacity-40"
            >
              {pageBusy && <Loader2 className="size-3 animate-spin" />}
              {text.trim() ? "관련 페이지 찾기" : "최근 페이지"}
            </button>
            {pageHits !== null && pageHits.length === 0 && (
              <span className="text-xs text-muted-foreground">
                맞는 페이지가 없어요
              </span>
            )}
          </div>
          {pageHits !== null && pageHits.length > 0 && (
            <ul className="flex flex-col gap-1">
              {pageHits.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => pullPage(p)}
                    className="w-full truncate rounded-md border border-border px-2.5 py-1 text-left text-xs transition-colors hover:bg-muted"
                  >
                    {p.icon ? `${p.icon} ` : ""}
                    {p.title.trim() || "제목 없음"}
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-muted-foreground">템플릿</span>
            {PAGE_TEMPLATES.filter((t) => t.content.length > 0)
              .slice(0, 6)
              .map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => applyTemplate(t.key)}
                  disabled={busy !== null}
                  className="rounded-md border border-border px-2.5 py-1 text-xs transition-colors hover:bg-muted disabled:opacity-40"
                >
                  {t.label}
                </button>
              ))}
          </div>
          {busy && (
            // 결과가 오기까지 몇 초가 걸린다. 그 사이 아무것도 없으면 눌린 건지 알 수 없다.
            <p
              role="status"
              className="flex items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2 text-xs text-muted-foreground"
            >
              {/* 2026-07-27 (2차 피드백 2-5 "오리가 돌아다니면서"): 1차에서는 오리가 가만히
                  있었다. 기다리는 동안 좌우로 걷게 한다 — 움직임 줄이기 설정을 켠 사용자에게는
                  `motion-safe`가 애니메이션을 빼 준다(이 저장소가 다른 화면에서 쓰는 방식). */}
              <span className="motion-safe:animate-[duck-walk_1.6s_ease-in-out_infinite]">
                <DuckLogo size={20} />
              </span>
              {BUSY_LABELS[busy]}...
            </p>
          )}
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
