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

  useEffect(() => {
    const supabase = createClient();
    const run = async () => {
      try {
        const today = new Date().toISOString().slice(0, 10);
        const ninetyDaysAgo = (() => {
          const d = new Date();
          d.setDate(d.getDate() - 89);
          return d.toISOString().slice(0, 10);
        })();
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
      if (t.isDone && t.updatedAt) activeDates.add(t.updatedAt.slice(0, 10));
    }
    for (const h of checks) {
      activeDates.add(h.checkedDate);
    }
    let streak = 0;
    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      if (activeDates.has(iso)) {
        streak++;
      } else if (i === 0) {
        // 오늘 아직 활동 없음 — 어제부터 체크
        continue;
      } else {
        break;
      }
    }
    return streak;
  }

  const streak = calculateStreak(rawTodos, rawChecks);

  const dayLabels = ["일", "월", "화", "수", "목", "금", "토"];
  const dayOfWeekCounts = [0, 0, 0, 0, 0, 0, 0];
  for (const t of rawTodos) {
    if (t.isDone && t.updatedAt) {
      const day = new Date(t.updatedAt).getDay();
      dayOfWeekCounts[day]++;
    }
  }
  for (const h of rawChecks) {
    const day = new Date(h.checkedDate).getDay();
    dayOfWeekCounts[day]++;
  }
  const maxCount = Math.max(...dayOfWeekCounts);
  const bestDay = maxCount > 0 ? dayLabels[dayOfWeekCounts.indexOf(maxCount)] : null;

  const totalTodos = summary.todosDone + summary.todosRemaining;
  const totalFocusHours = pomStats
    ? Math.round((pomStats.totalMinutes / 60) * 10) / 10
    : 0;

  const lifetimeStats = [
    { label: "총 페이지", value: `${summary.pageCount}개` },
    { label: "총 할 일", value: `${totalTodos}개 (완료 ${summary.todosDone})` },
    { label: "총 메모", value: `${summary.memoCount}개` },
    { label: "총 습관 체크", value: `${rawChecks.length}일` },
    { label: "총 집중", value: `${totalFocusHours}시간` },
  ];

  return (
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
      <div className="flex items-center justify-between gap-2">
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
    {pomStats && (
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
    )}
    {heatmap && (
      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-muted-foreground">습관 체크 (최근 90일)</h2>
        <HabitHeatmap data={heatmap} />
      </section>
    )}
    </div>
  );
}
