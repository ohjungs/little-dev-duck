"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Copy,
  FileText,
  Flame,
  ListTodo,
  Loader2,
  Newspaper,
  Sparkles,
  StickyNote,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import {
  getDuckState,
  listArticles,
  listHabitChecksInRange,
  listHabits,
  listMemos,
  listPages,
  listPomodoroSessions,
  listTodos,
} from "@ldd/api";
import {
  dashboardSummary,
  habitHeatmapData,
  pomodoroStats,
  type DashboardSummary,
  type HabitCheck,
  type HeatmapDay,
  type PomodoroStats,
  type Todo,
} from "@ldd/core";
import { HabitHeatmap } from "./HabitHeatmap";
import { createClient } from "@/lib/supabase/client";
import { todayIso } from "@/lib/today";
import { activeStreak, shiftDate, weekBounds } from "@/lib/insightsDates";
import { localDateKey } from "@/lib/localDateKey";

function StatTile({
  icon,
  value,
  label,
}: {
  icon: ReactNode;
  value: number | string;
  label: string;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4">
      <span className="text-muted-foreground">{icon}</span>
      <span className="text-3xl font-bold tabular-nums tracking-tight">
        {value}
      </span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

// Phase 12 T6: 요약 통계. 여러 소스를 병렬 조회해 core dashboardSummary로 집계, 스탯 타일로 표시.
export function InsightsView() {
  const router = useRouter();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [pomStats, setPomStats] = useState<PomodoroStats | null>(null);
  const [heatmap, setHeatmap] = useState<HeatmapDay[] | null>(null);
  const [rawTodos, setRawTodos] = useState<Todo[]>([]);
  const [rawChecks, setRawChecks] = useState<HabitCheck[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [standupState, setStandupState] = useState<
    "idle" | "loading" | "error"
  >("idle");
  const [standupError, setStandupError] = useState<string | null>(null);
  const [copyState, setCopyState] = useState<"idle" | "done">("idle");
  const [tab, setTab] = useState<"overview" | "tasks" | "focus">("overview");

  useEffect(() => {
    const supabase = createClient();
    const run = async () => {
      try {
        // toISOString()은 UTC 날짜다. KST 00:00~09:00 사이엔 어제가 되어, 그 시간에 한
        // 체크가 히트맵 범위 밖으로 빠졌다. 로컬 기준으로 계산한다.
        const today = todayIso();
        const ninetyDaysAgo = shiftDate(today, -89);
        const [todos, pages, memos, habits, articles, duck, pomSessions, checks] =
          await Promise.all([
            listTodos(supabase),
            listPages(supabase),
            listMemos(supabase),
            listHabits(supabase),
            listArticles(supabase, 200),
            getDuckState(supabase).catch(() => null),
            listPomodoroSessions(supabase),
            listHabitChecksInRange(supabase, ninetyDaysAgo, today),
          ]);
        setSummary(
          dashboardSummary({
            todos,
            pageCount: pages.length,
            memoCount: memos.length,
            habitCount: habits.length,
            articleCount: articles.length,
            duckXp: duck?.xp ?? null,
          }),
        );
        setPomStats(pomodoroStats(pomSessions));
        setHeatmap(habitHeatmapData(checks.map((c) => ({ checkedDate: c.checkedDate })), today));
        setRawTodos(todos);
        setRawChecks(checks);
        setState("ready");
      } catch {
        setState("error");
      }
    };
    void run();
  }, []);

  async function handleStandup() {
    setStandupState("loading");
    setStandupError(null);
    try {
      const res = await fetch("/api/ai/standup", { method: "POST" });
      const json = (await res.json()) as { pageId?: string; error?: string };
      if (!res.ok || !json.pageId) {
        setStandupError(json.error ?? "스탠드업 생성에 실패했어요.");
        setStandupState("error");
        return;
      }
      router.push(`/pages/${json.pageId}`);
    } catch {
      setStandupError("네트워크 오류가 발생했어요.");
      setStandupState("error");
    }
  }

  async function handleCopyStats() {
    if (!summary) return;
    const streak = calculateStreak(rawTodos, rawChecks);
    const totalTodos = summary.todosDone + summary.todosRemaining;
    const totalFocusHours = pomStats
      ? Math.round((pomStats.totalMinutes / 60) * 10) / 10
      : 0;
    const lines = [
      `연속 활동: ${streak}일`,
      `총 페이지: ${summary.pageCount}개`,
      `총 할 일: ${totalTodos}개 (완료 ${summary.todosDone})`,
      `총 메모: ${summary.memoCount}개`,
      `총 습관 체크: ${rawChecks.length}일`,
      `총 집중: ${totalFocusHours}시간`,
      `오리 레벨: Lv.${summary.level}`,
    ];
    if (pomStats) {
      lines.push(`집중 세션: ${pomStats.sessionsCount}회`);
      lines.push(`주요 태그: ${pomStats.topTag ?? "-"}`);
    }
    await navigator.clipboard.writeText(lines.join("\n"));
    setCopyState("done");
    setTimeout(() => setCopyState("idle"), 2000);
  }

  if (state === "loading") {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> 집계 중...
      </p>
    );
  }
  if (state === "error" || !summary) {
    return (
      <p className="text-sm text-muted-foreground">통계를 불러오지 못했어요.</p>
    );
  }

  function formatMinutes(minutes: number): string {
    if (minutes < 60) return `${minutes}분`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m === 0 ? `${h}시간` : `${h}시간 ${m}분`;
  }

  function calculateStreak(todos: Todo[], checks: HabitCheck[]): number {
    const activeDates = new Set<string>();
    for (const t of todos) {
      // updatedAt은 타임스탬프다. slice(0,10)은 UTC 날짜라 같은 Set에 담기는
      // checkedDate(로컬 날짜)와 기준이 어긋난다 — KST 새벽 완료분이 전날로 셌다.
      if (t.isDone && t.updatedAt) activeDates.add(localDateKey(t.updatedAt));
    }
    for (const h of checks) {
      activeDates.add(h.checkedDate);
    }
    // 날짜 계산은 lib으로 분리했다. 원래는 로컬 Date를 toISOString()으로 잘라 UTC 날짜를
    // 얻었는데, 비교 대상 checkedDate는 로컬(KST) 날짜라 KST 새벽엔 스트릭이 어긋났다.
    return activeStreak(activeDates, todayIso());
  }

  const streak = calculateStreak(rawTodos, rawChecks);

  const dayLabels = ["일", "월", "화", "수", "목", "금", "토"];
  const dayOfWeekCounts = [0, 0, 0, 0, 0, 0, 0];
  for (const t of rawTodos) {
    if (t.isDone && t.updatedAt) {
      const day = new Date(`${localDateKey(t.updatedAt)}T00:00:00`).getDay();
      dayOfWeekCounts[day]++;
    }
  }
  for (const h of rawChecks) {
    // `new Date("2026-07-26")`는 날짜만 있는 ISO라 **UTC로 해석**된다. 음수 오프셋 지역에선
    // getDay()가 전날 요일을 준다. T00:00:00을 붙여 로컬로 파싱한다(HabitHeatmap과 같은 방식).
    const day = new Date(`${h.checkedDate}T00:00:00`).getDay();
    dayOfWeekCounts[day]++;
  }
  const maxCount = Math.max(...dayOfWeekCounts);
  const bestDay = maxCount > 0 ? dayLabels[dayOfWeekCounts.indexOf(maxCount)] : null;

  // 이번 주(월~오늘) / 지난 주(월~일) 범위. 원래는 로컬 자정 Date를 toISOString()으로 잘라
  // **일요일**을 시작일로 내놓고 있었다(KST 기준 창이 통째로 하루 밀림) — lib으로 분리해 고쳤다.
  const bounds = weekBounds(todayIso());

  const weeklyComparison = (() => {
    const { thisStart, thisEnd, lastStart, lastEnd } = bounds;
    const thisTodos = rawTodos.filter(
      (t) =>
        t.isDone &&
        t.updatedAt &&
        localDateKey(t.updatedAt) >= thisStart &&
        localDateKey(t.updatedAt) <= thisEnd,
    ).length;
    const lastTodos = rawTodos.filter(
      (t) =>
        t.isDone &&
        t.updatedAt &&
        localDateKey(t.updatedAt) >= lastStart &&
        localDateKey(t.updatedAt) <= lastEnd,
    ).length;
    const thisHabits = new Set(
      rawChecks
        .filter((c) => c.checkedDate >= thisStart && c.checkedDate <= thisEnd)
        .map((c) => c.checkedDate),
    ).size;
    const lastHabits = new Set(
      rawChecks
        .filter((c) => c.checkedDate >= lastStart && c.checkedDate <= lastEnd)
        .map((c) => c.checkedDate),
    ).size;
    const pct = (curr: number, prev: number) =>
      prev === 0 ? null : Math.round(((curr - prev) / prev) * 100);
    return {
      thisTodos,
      lastTodos,
      todosPct: pct(thisTodos, lastTodos),
      thisHabits,
      lastHabits,
      habitsPct: pct(thisHabits, lastHabits),
    };
  })();

  const totalTodos = summary.todosDone + summary.todosRemaining;

  const lifetimeStats = [
    { label: "총 페이지", value: `${summary.pageCount}개` },
    { label: "총 할 일", value: `${totalTodos}개 (완료 ${summary.todosDone})` },
    { label: "총 메모", value: `${summary.memoCount}개` },
    { label: "총 습관 체크", value: `${rawChecks.length}일` },
    {
      label: "총 집중",
      value: pomStats ? formatMinutes(pomStats.totalMinutes) : "0분",
    },
  ];

  const TABS = [
    { id: "overview" as const, label: "개요" },
    { id: "tasks" as const, label: "할 일·습관" },
    { id: "focus" as const, label: "집중" },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* 전역 액션(스탠드업·복사)은 탭 위에 상시 노출 */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void handleStandup()}
            disabled={standupState === "loading"}
            className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-accent disabled:opacity-50"
          >
            {standupState === "loading" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Sparkles className="size-4" />
            )}
            스탠드업 생성
          </button>
          <button
            type="button"
            onClick={() => void handleCopyStats()}
            className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-accent"
          >
            <Copy className="size-4" />
            {copyState === "done" ? "복사됨" : "통계 텍스트 복사"}
          </button>
        </div>
        {standupState === "error" && standupError && (
          <p className="text-sm text-destructive">{standupError}</p>
        )}
      </div>

      {/* 탭 바 */}
      <div role="tablist" aria-label="통계 분류" className="flex gap-1 rounded-lg bg-muted p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={
              tab === t.id
                ? "flex-1 rounded-md bg-card px-3 py-1.5 text-sm font-medium text-foreground shadow-sm"
                : "flex-1 rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
      <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {lifetimeStats.map(({ label, value }) => (
          <div
            key={label}
            className="rounded-lg bg-muted/50 p-2 text-center"
          >
            <div className="text-lg font-bold tabular-nums">{value}</div>
            <div className="text-xs text-muted-foreground">{label}</div>
          </div>
        ))}
      </div>
      <div className="rounded-lg border bg-primary/5 p-4 text-center">
        <div className="text-3xl font-bold">{streak}일</div>
        <div className="text-sm text-muted-foreground">연속 활동</div>
        {bestDay && (
          <div className="mt-2 text-xs text-muted-foreground">
            가장 활발한 요일: {bestDay}요일
          </div>
        )}
      </div>
      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-muted-foreground">이번 주 vs 지난 주</h2>
        <div className="grid grid-cols-2 gap-3">
          {(
            [
              {
                label: "완료한 할 일",
                thisVal: weeklyComparison.thisTodos,
                lastVal: weeklyComparison.lastTodos,
                pct: weeklyComparison.todosPct,
              },
              {
                label: "습관 체크일",
                thisVal: weeklyComparison.thisHabits,
                lastVal: weeklyComparison.lastHabits,
                pct: weeklyComparison.habitsPct,
              },
            ] as const
          ).map(({ label, thisVal, lastVal, pct }) => (
            <div
              key={label}
              className="flex flex-col gap-1 rounded-lg bg-muted/50 p-3"
            >
              <span className="text-xs text-muted-foreground">{label}</span>
              <span className="text-2xl font-bold tabular-nums">{thisVal}</span>
              <div className="flex items-center gap-1 text-xs">
                {pct === null ? (
                  <span className="text-muted-foreground">지난 주 {lastVal}</span>
                ) : pct > 0 ? (
                  <>
                    <TrendingUp className="size-3 text-green-500" />
                    <span className="text-green-600">+{pct}%</span>
                    <span className="text-muted-foreground">vs 지난 주 {lastVal}</span>
                  </>
                ) : pct < 0 ? (
                  <>
                    <TrendingDown className="size-3 text-red-500" />
                    <span className="text-red-600">{pct}%</span>
                    <span className="text-muted-foreground">vs 지난 주 {lastVal}</span>
                  </>
                ) : (
                  <span className="text-muted-foreground">지난 주와 동일 ({lastVal})</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
      </div>
      )}

      {tab === "tasks" && (
      <div className="flex flex-col gap-4">
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      <StatTile
        icon={<ListTodo className="size-5" />}
        value={summary.todosRemaining}
        label="남은 할 일"
      />
      <StatTile
        icon={<CheckCircle2 className="size-5" />}
        value={summary.todosDone}
        label="완료한 할 일"
      />
      <StatTile
        icon={<Sparkles className="size-5" />}
        value={`Lv.${summary.level}`}
        label="오리 레벨"
      />
      <StatTile
        icon={<Flame className="size-5" />}
        value={summary.habitCount}
        label="습관"
      />
      <StatTile
        icon={<FileText className="size-5" />}
        value={summary.pageCount}
        label="페이지"
      />
      <StatTile
        icon={<StickyNote className="size-5" />}
        value={summary.memoCount}
        label="메모"
      />
      <StatTile
        icon={<Newspaper className="size-5" />}
        value={summary.articleCount}
        label="수집 기사"
      />
    </div>
    {heatmap && (
      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-muted-foreground">습관 체크 (최근 90일)</h2>
        <HabitHeatmap data={heatmap} />
      </section>
    )}
      </div>
      )}

      {tab === "focus" && (
      <div className="flex flex-col gap-4">
    {pomStats ? (
      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-muted-foreground">집중 세션</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile
            icon={<Flame className="size-5" />}
            value={formatMinutes(pomStats.totalMinutes)}
            label="총 집중 시간"
          />
          <StatTile
            icon={<Flame className="size-5" />}
            value={pomStats.sessionsCount}
            label="세션 수"
          />
          <StatTile
            icon={<Flame className="size-5" />}
            value={formatMinutes(pomStats.avgMinutes)}
            label="세션 평균"
          />
          <StatTile
            icon={<Flame className="size-5" />}
            value={pomStats.topTag ?? "-"}
            label="주요 태그"
          />
        </div>
      </section>
    ) : (
      <p className="py-8 text-center text-sm text-muted-foreground">
        아직 집중 세션 기록이 없어요. 뽀모도로를 완료해보세요!
      </p>
    )}
      </div>
      )}
    </div>
  );
}
