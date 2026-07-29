"use client";

// 2026-07-29 : 뉴스 - 오늘의 브리핑 (Phase 61 T2, cherrypick.today 벤치마킹)
// 하루 10개 이슈 카드 + "오늘의 진행 n/10". 선정은 core dailyIssues 한 벌(24시간 창·
// 피드 상한·카테고리), 읽음은 기존 read-articles 한 벌 — 카드에서 원문을 열면 아래
// 기사 목록의 읽음 표시와 같이 움직인다(추적이 두 벌이면 진행률과 목록이 어긋난다).
// 10개를 다 읽으면 오리가 칭찬하고 XP를 준다(하루 1회 — briefingXp 게이트).

import { useEffect, useMemo, useRef, useState } from "react";

import { applyXpAward } from "@ldd/api";
import {
  briefingRange,
  dailyIssues,
  kstDateString,
  topicForUrl,
  type Article,
  type BriefingMode,
  type DailyIssue,
  type Feed,
} from "@ldd/core";
import { createClient } from "@/lib/supabase/client";
import { markArticleRead } from "@/lib/readArticles";
import { safeHref } from "@/lib/safeHref";
import {
  getBriefingFont,
  getBriefingView,
  setBriefingFont,
  setBriefingView,
  type BriefingFont,
  type BriefingView,
} from "@/lib/briefingPref";
import { consumeBriefingXpBudget } from "@/lib/briefingXp";
import { emitXpChanged } from "@/lib/xpSignal";
import { recordClientError } from "@/lib/clientErrorLog";

type Props = {
  articles: Article[];
  feeds: Feed[];
  readSet: Set<string>;
};

export function DailyBriefing({ articles, feeds, readSet }: Props) {
  // 카테고리는 피드 URL → 추천 목록 주제. 모르는 피드는 core가 "종합"으로 처리한다.
  const topicByFeedId = useMemo(() => {
    const map: Record<string, string> = {};
    for (const f of feeds) {
      const topic = topicForUrl(f.url);
      if (topic) map[f.id] = topic;
    }
    return map;
  }, [feeds]);

  // 2026-07-29 : 날짜 탭·달력 (Phase 61 T3). 창 계산은 core briefingRange 한 벌(KST 경계).
  const [mode, setMode] = useState<BriefingMode>("today");
  const [pickedDate, setPickedDate] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const todayKst = kstDateString(new Date());
  // 2026-07-29 : 보기 옵션 (Phase 61 T4). 취향은 기기별 localStorage(briefingPref 한 곳).
  const [view, setView] = useState<BriefingView>(() => getBriefingView());
  const [font, setFont] = useState<BriefingFont>(() => getBriefingFont());
  const [idx, setIdx] = useState(0);

  const briefing = useMemo(() => {
    const range = briefingRange(mode, todayKst, pickedDate || undefined);
    // 날짜를 아직 안 골랐거나 잘못됐으면 판정하지 않는다 — 빈 결과에 이유를 지어내지 않는다.
    if (range === null) return null;
    return dailyIssues(articles, { ...range, topicByFeedId });
  }, [articles, topicByFeedId, mode, todayKst, pickedDate]);

  const items = briefing?.items ?? [];
  // 카테고리 필터는 보기다 — 선정(10개)을 다시 돌리지 않고 보이는 것만 거른다.
  const categories = useMemo(() => [...new Set(items.map((i) => i.category))], [items]);
  const visibleItems = category === null ? items : items.filter((i) => i.category === category);
  // 한 장씩 보기의 현재 위치. 필터·날짜가 바뀌어 목록이 줄어도 범위를 벗어나지 않게 잘라 쓴다
  // (effect로 리셋하지 않는다 — 파생값이면 파생으로 계산한다).
  const safeIdx = Math.min(idx, Math.max(0, visibleItems.length - 1));

  const total = items.length;
  const done = items.filter((i) => readSet.has(i.article.id)).length;
  // 진행·XP는 오늘 탭에서만 — 과거 날짜를 넘겨 보는 것은 "오늘의 진행"이 아니다.
  const isToday = mode === "today";

  // 완주 보상 — 하루 1회(briefingXp), 마운트당 1회(ref). 실패는 조용히 기록만
  // (읽기는 이미 끝났는데 XP 에러가 보이면 읽기가 실패한 줄 안다 — Y-007과 같은 결).
  const awarded = useRef(false);
  useEffect(() => {
    if (!isToday || awarded.current || total === 0 || done < total) return;
    if (!consumeBriefingXpBudget()) return;
    awarded.current = true;
    void (async () => {
      const {
        data: { user },
      } = await createClient().auth.getUser();
      if (!user) return;
      await applyXpAward(createClient(), user.id, "briefingDone");
      emitXpChanged();
    })().catch((e: unknown) =>
      recordClientError(e instanceof Error ? e.message : String(e)),
    );
  }, [done, total, isToday]);

  return (
    <section aria-labelledby="daily-briefing-title" className="mb-6">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h2 id="daily-briefing-title" className="text-sm font-semibold">
          오늘의 브리핑
        </h2>
        {isToday && total > 0 && (
          <span className="text-xs text-muted-foreground" role="status">
            {done === total ? `꽥! 오늘 브리핑을 다 읽었어요 (${done}/${total})` : `오늘의 진행 ${done}/${total}`}
          </span>
        )}
      </div>

      {/* 날짜 탭(T3) — 창 계산은 core 한 벌. 달력을 고르면 그 날짜 모드가 된다. */}
      <div className="mb-2 flex flex-wrap items-center gap-1 text-xs">
        {(
          [
            ["today", "오늘"],
            ["yesterday", "어제"],
            ["week", "지난주"],
          ] as const
        ).map(([m, label]) => (
          <button
            key={m}
            type="button"
            aria-pressed={mode === m}
            onClick={() => {
              setMode(m);
              setCategory(null);
            }}
            className={
              "rounded-full border border-border px-2.5 py-1 transition-colors hover:bg-accent" +
              (mode === m ? " bg-primary/15 font-medium" : "")
            }
          >
            {label}
          </button>
        ))}
        <input
          type="date"
          value={pickedDate}
          max={todayKst}
          aria-label="브리핑 날짜 선택"
          onChange={(e) => {
            setPickedDate(e.target.value);
            setMode(e.target.value === "" ? "today" : "date");
            setCategory(null);
          }}
          className="rounded border border-border bg-background px-1.5 py-0.5"
        />
        {/* 보기 옵션(T4): 목록/한 장씩 전환 + 글자 크기. */}
        <button
          type="button"
          onClick={() => {
            const next: BriefingView = view === "list" ? "single" : "list";
            setView(next);
            setBriefingView(next);
            setIdx(0);
          }}
          className="rounded-full border border-border px-2.5 py-1 transition-colors hover:bg-accent"
        >
          {view === "list" ? "한 장씩 보기" : "목록으로 보기"}
        </button>
        <button
          type="button"
          aria-pressed={font === "large"}
          aria-label="브리핑 글자 크게"
          onClick={() => {
            const next: BriefingFont = font === "large" ? "base" : "large";
            setFont(next);
            setBriefingFont(next);
          }}
          className={
            "rounded-full border border-border px-2.5 py-1 transition-colors hover:bg-accent" +
            (font === "large" ? " bg-primary/15 font-medium" : "")
          }
        >
          가+
        </button>
        {categories.length > 1 && (
          <span className="ml-auto flex flex-wrap items-center gap-1">
            <button
              type="button"
              aria-pressed={category === null}
              onClick={() => setCategory(null)}
              className={
                "rounded-full border border-border px-2 py-0.5 hover:bg-accent" +
                (category === null ? " bg-primary/15 font-medium" : "")
              }
            >
              전체
            </button>
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                aria-pressed={category === c}
                onClick={() => setCategory(c)}
                className={
                  "rounded-full border border-border px-2 py-0.5 hover:bg-accent" +
                  (category === c ? " bg-primary/15 font-medium" : "")
                }
              >
                {c}
              </button>
            ))}
          </span>
        )}
      </div>

      {articles.length === 0 ? (
        <p className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground break-keep">
          아직 모은 기사가 없어요. 피드를 등록하고 수집하면 매일 10개의 이슈를 골라 드려요.
        </p>
      ) : briefing === null ? (
        <p className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground break-keep">
          달력에서 날짜를 골라 주세요.
        </p>
      ) : total === 0 ? (
        <p className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground break-keep">
          {isToday
            ? "오늘 발행·수집된 기사가 아직 없어요. 수집을 눌러 새 기사를 모아 보세요."
            : "이 기간에 발행·수집된 기사가 없어요."}
        </p>
      ) : view === "single" && visibleItems.length > 0 ? (
        // 한 장씩 보기(T4) — 카드 한 장 + 이전/다음. 요약은 줄이지 않는다(넘겨 읽는 모드다).
        <div>
          {issueCard(visibleItems[safeIdx]!, false)}
          <div className="mt-2 flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={() => setIdx(Math.max(0, safeIdx - 1))}
              disabled={safeIdx === 0}
              className="rounded-md border border-border px-3 py-1.5 hover:bg-accent disabled:opacity-40"
            >
              이전
            </button>
            <span className="text-muted-foreground">{`${safeIdx + 1} / ${visibleItems.length}`}</span>
            <button
              type="button"
              onClick={() => setIdx(Math.min(visibleItems.length - 1, safeIdx + 1))}
              disabled={safeIdx >= visibleItems.length - 1}
              className="rounded-md border border-border px-3 py-1.5 hover:bg-accent disabled:opacity-40"
            >
              다음
            </button>
          </div>
        </div>
      ) : (
        <ol className="grid gap-2 sm:grid-cols-2">
          {visibleItems.map((item) => (
            <li key={item.article.id}>{issueCard(item, true)}</li>
          ))}
        </ol>
      )}
    </section>
  );

  // 카드 한 장 — 목록·한 장씩이 같은 마크업을 쓴다(갈라지면 한쪽만 고쳐진다).
  function issueCard(item: DailyIssue<Article>, clampSummary: boolean) {
    const { rank, category: cat, article: a, feedCount } = item;
    const read = readSet.has(a.id);
    return (
      <a
        href={safeHref(a.link)}
        target="_blank"
        rel="noreferrer"
        onClick={() => markArticleRead(a.id)}
        className={
          "block h-full rounded-2xl border border-border bg-card p-3 transition-colors hover:border-primary/40" +
          (read ? " opacity-60" : "")
        }
      >
        <div className="mb-1 flex items-center gap-2 text-[11px] text-muted-foreground">
          <span className="font-mono font-semibold text-primary-accent">
            {String(rank).padStart(2, "0")}
          </span>
          <span className="rounded border border-border px-1">{cat}</span>
          {feedCount > 1 && <span>{feedCount}개 매체</span>}
          {read && <span>읽음</span>}
        </div>
        <p
          className={
            (font === "large" ? "text-base" : "text-sm") + " font-medium leading-snug break-keep"
          }
        >
          {a.title}
        </p>
        {(a.summary ?? a.snippet) && (
          <p
            className={
              (font === "large" ? "text-sm" : "text-xs") +
              (clampSummary ? " line-clamp-2" : "") +
              " mt-1 text-muted-foreground break-keep"
            }
          >
            {a.summary ?? a.snippet}
          </p>
        )}
      </a>
    );
  }
}
