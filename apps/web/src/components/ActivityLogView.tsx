"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { listActionLog } from "@ldd/api";
import {
  LOG_KIND_LABELS,
  logKind,
  logName,
  summarizeLogs,
  summarizeVisits,
  type ActionLogEntry,
  type LogKind,
} from "@ldd/core";
import { createClient } from "@/lib/supabase/client";
import { timeAgo } from "@/lib/timeAgo";
import { cn } from "@/lib/utils";

// 2026-07-26 : 통계 - 로그 화면 (피드백 3-1·3-2)
// "에러로그, 배치로그, 작업한 로그, 행동 로그 등을 볼수있는 통계",
// "방문자가 자주 방문하는 페이지, 평균 방문횟수, 방문 시간".
//
// 계산은 전부 core `log-stats`에 있다. 여기서는 고르고 그리기만 한다.
// 시각(hour)은 **브라우저의 지역 시**로 뽑아 넘긴다 — 서버(UTC)에서 뽑으면 한국 사용자에게
// 9시간 어긋난 시간대 분포가 나온다(이 저장소가 여러 번 밟은 함정이라 계산에서 아예 뺐다).

const KINDS: LogKind[] = ["visit", "batch", "app", "tool"];
const FETCH_LIMIT = 200;

export function ActivityLogView() {
  const [entries, setEntries] = useState<ActionLogEntry[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [kind, setKind] = useState<LogKind | "all">("all");

  const load = useCallback(async () => {
    try {
      setEntries(await listActionLog(createClient(), FETCH_LIMIT));
      setState("ready");
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 마운트 후 1회 서버 동기화
    void load();
  }, [load]);

  const stats = useMemo(
    () => summarizeLogs(entries, kind === "all" ? {} : { kind }),
    [entries, kind],
  );

  const visits = useMemo(
    () =>
      summarizeVisits(
        entries.map((e) => ({ ...e, hour: new Date(e.createdAt).getHours() })),
      ),
    [entries],
  );

  const shown = useMemo(
    () => (kind === "all" ? entries : entries.filter((e) => logKind(e.toolName) === kind)),
    [entries, kind],
  );

  if (state === "loading") {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> 불러오는 중...
      </p>
    );
  }
  if (state === "error") {
    return <p className="text-sm text-muted-foreground">로그를 불러오지 못했어요.</p>;
  }
  if (entries.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm leading-relaxed text-muted-foreground">
        아직 기록이 없어요. 페이지를 열거나 뉴스를 수집하면 여기에 쌓입니다.
      </p>
    );
  }

  const peakHour = visits.byHour.indexOf(Math.max(...visits.byHour));
  const maxHour = Math.max(...visits.byHour, 1);

  return (
    <div className="flex flex-col gap-5">
      {/* 요약 숫자 */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="전체 기록" value={`${entries.length}건`} />
        <Stat
          label="실패"
          value={`${stats.errors}건`}
          tone={stats.errors > 0 ? "warn" : undefined}
        />
        <Stat label="실패율" value={`${stats.errorRate}%`} />
        <Stat label="방문한 페이지" value={`${visits.pages}개`} />
      </div>

      {/* 종류 필터 */}
      <div className="flex flex-wrap gap-1.5">
        <FilterChip active={kind === "all"} onClick={() => setKind("all")}>
          전체 {entries.length}
        </FilterChip>
        {KINDS.map((k) => (
          <FilterChip key={k} active={kind === k} onClick={() => setKind(k)}>
            {LOG_KIND_LABELS[k]} {stats.byKind[k]}
          </FilterChip>
        ))}
      </div>

      {/* 방문 통계 (3-1) */}
      {visits.totalVisits > 0 && (
        <section className="rounded-xl border border-border p-3">
          <h3 className="mb-2 text-sm font-semibold tracking-tight">페이지 방문</h3>
          <p className="mb-2 text-xs text-muted-foreground">
            총 {visits.totalVisits}번 · 페이지당 평균 {visits.avgVisitsPerPage}번 · 가장
            많이 여는 시간대 {peakHour}시
          </p>
          <ol className="mb-3 flex flex-col gap-1">
            {visits.topPages.map((p, i) => (
              <li key={p.name} className="flex items-center gap-2 text-xs">
                <span className="w-4 text-muted-foreground">{i + 1}</span>
                <span className="min-w-0 flex-1 truncate">{p.name}</span>
                <span className="text-muted-foreground">{p.count}번</span>
              </li>
            ))}
          </ol>
          {/* 시간대 분포 — 24칸 막대. 라이브러리 없이 div 높이로 그린다. */}
          <div
            className="flex h-12 items-end gap-px"
            role="img"
            aria-label={`시간대별 방문 분포. 가장 많은 시간은 ${peakHour}시.`}
          >
            {visits.byHour.map((n, h) => (
              <div
                key={h}
                title={`${h}시 · ${n}번`}
                className={cn(
                  "flex-1 rounded-sm",
                  n > 0 ? "bg-primary/60" : "bg-muted",
                )}
                style={{ height: `${Math.max(6, (n / maxHour) * 100)}%` }}
              />
            ))}
          </div>
          <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
            <span>0시</span>
            <span>12시</span>
            <span>23시</span>
          </div>
        </section>
      )}

      {/* 최근 실패 (3-2 에러 로그) */}
      {stats.recentErrors.length > 0 && (
        <section className="rounded-xl border border-destructive/30 bg-destructive/[0.03] p-3">
          <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold tracking-tight">
            <AlertTriangle className="size-4 text-destructive" />
            최근 실패
          </h3>
          <ul className="flex flex-col gap-1.5">
            {stats.recentErrors.map((e, i) => (
              <li key={i} className="text-xs">
                <span className="font-medium">{logName(e.toolName)}</span>
                <span className="ml-1.5 text-muted-foreground">
                  {timeAgo(e.createdAt)}
                </span>
                {e.resultSummary && (
                  <p className="mt-0.5 line-clamp-2 text-muted-foreground/80">
                    {e.resultSummary}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 기록 목록 */}
      <section>
        <h3 className="mb-2 text-sm font-semibold tracking-tight">
          기록 {shown.length}건
        </h3>
        {shown.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
            이 종류의 기록이 아직 없어요.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-border/60">
            {shown.slice(0, 50).map((e) => (
              <li key={e.id} className="flex items-start gap-2 py-1.5 text-xs">
                <span
                  className={cn(
                    "mt-1 size-1.5 shrink-0 rounded-full",
                    e.status === "error" ? "bg-destructive" : "bg-green-500/70",
                  )}
                  title={e.status === "error" ? "실패" : "성공"}
                />
                <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                  {LOG_KIND_LABELS[logKind(e.toolName)]}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="font-medium">{logName(e.toolName)}</span>
                  {e.argsSummary && (
                    <span className="ml-1.5 text-muted-foreground">{e.argsSummary}</span>
                  )}
                </span>
                <span className="shrink-0 text-muted-foreground/70">
                  {timeAgo(e.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
        {shown.length > 50 && (
          <p className="mt-2 text-[10px] text-muted-foreground">
            최근 50건만 표시했어요(전체 {shown.length}건).
          </p>
        )}
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "warn";
}) {
  return (
    <div className="rounded-lg border border-border px-3 py-2">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p
        className={cn(
          "text-lg font-semibold tabular-nums",
          tone === "warn" && "text-destructive",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full border px-2.5 py-1 text-xs transition-colors",
        active
          ? "border-primary/40 bg-primary/10 font-medium text-primary-accent"
          : "border-border text-muted-foreground hover:bg-muted",
      )}
    >
      {children}
    </button>
  );
}
