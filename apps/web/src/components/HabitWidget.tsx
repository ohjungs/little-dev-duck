"use client";

import { useEffect, useState } from "react";
import { Bell, Flame, Plus, Repeat, X } from "lucide-react";
import {
  checkHabit,
  createHabit,
  deleteHabit,
  listHabitChecks,
  listHabits,
  uncheckHabit,
} from "@ldd/api";
import { deriveHabitStreak, type Habit, type HabitCheck } from "@ldd/core";
import { reindexSource } from "@ldd/ai";
import { createClient } from "@/lib/supabase/client";
import { subscribeTable } from "@/lib/realtime";
import { emitXpChanged } from "@/lib/xpSignal";
import { todayIso } from "@/lib/today";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WidgetSkeleton } from "@/components/Skeleton";

type LoadState = "loading" | "error" | "ready";
type Frequency = "daily" | "weekly";

export function HabitWidget() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [checks, setChecks] = useState<HabitCheck[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [actionError, setActionError] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newFrequency, setNewFrequency] = useState<Frequency>("daily");

  const supabase = createClient();

  const fetchAll = async () => {
    try {
      const [habitData, checkData] = await Promise.all([
        listHabits(supabase),
        listHabitChecks(supabase),
      ]);
      setHabits(habitData);
      setChecks(checkData);
      setState("ready");
    } catch {
      setState("error");
    }
  };

  useEffect(() => {
    // 마운트 시 1회 조회. 재시도는 reload가 담당.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- SSR/hydration 안전: 마운트 후 1회 동기화
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 마운트 시 1회만 실행
  }, []);

  // Realtime: 다른 탭/기기에서 habits 또는 habit_checks가 변경되면 전체를 다시 조회한다.
  useEffect(() => {
    let cleanupHabits: (() => void) | undefined;
    let cleanupChecks: (() => void) | undefined;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      cleanupHabits = subscribeTable(supabase, "habits", user.id, () => {
        void fetchAll();
      });
      cleanupChecks = subscribeTable(supabase, "habit_checks", user.id, () => {
        void fetchAll();
      });
    });
    return () => {
      cleanupHabits?.();
      cleanupChecks?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 마운트 시 1회만 실행
  }, []);

  const reload = () => {
    setState("loading");
    fetchAll();
  };

  const checkedDatesFor = (habitId: string): string[] =>
    checks.filter((c) => c.habitId === habitId).map((c) => c.checkedDate);

  const handleAdd = async () => {
    const title = newTitle.trim();
    if (!title) return;
    setNewTitle("");
    setActionError(null);
    try {
      const created = await createHabit(supabase, {
        title,
        frequency: newFrequency,
        timesPerWeek: null,
      });
      setHabits((prev) => [created, ...prev]);
      // RAG 인덱싱(fire-and-forget).
      void reindexSource({ sourceType: "habit", sourceId: created.id, text: title });
    } catch {
      setActionError("추가하지 못했습니다.");
    }
  };

  const handleToggle = async (habit: Habit) => {
    const today = todayIso();
    const isCheckedToday = checkedDatesFor(habit.id).includes(today);
    setActionError(null);

    if (isCheckedToday) {
      const prevChecks = checks;
      setChecks((prev) =>
        prev.filter(
          (c) => !(c.habitId === habit.id && c.checkedDate === today),
        ),
      );
      try {
        await uncheckHabit(supabase, habit.id, today);
      } catch {
        setChecks(prevChecks);
        setActionError("변경하지 못했습니다.");
      }
      return;
    }

    try {
      const created = await checkHabit(supabase, habit.id, today);
      setChecks((prev) => [created, ...prev]);
      // checkHabit이 서버에서 XP를 적립하므로 오리 표시 갱신 신호를 보낸다.
      emitXpChanged();
    } catch {
      setActionError("변경하지 못했습니다.");
    }
  };

  const handleDelete = async (id: string) => {
    const prevHabits = habits;
    const prevChecks = checks;
    setHabits((prev) => prev.filter((h) => h.id !== id));
    setChecks((prev) => prev.filter((c) => c.habitId !== id));
    try {
      await deleteHabit(supabase, id);
      void reindexSource({ sourceType: "habit", sourceId: id, text: "" });
    } catch {
      setHabits(prevHabits);
      setChecks(prevChecks);
      setActionError("삭제하지 못했습니다.");
    }
  };

  const today = todayIso();

  // 이번 주(월~일) 중 하나 이상의 습관이 체크된 날짜 수를 센다.
  // 로컬 타임존 기준 이번 주 월요일 ISO 날짜를 구한다.
  const weekCheckCount = (() => {
    const now = new Date();
    // getDay(): 0=일, 1=월 ... 6=토. 월요일 시작 주 기준 오프셋.
    const dayOfWeek = now.getDay();
    const offsetToMonday = (dayOfWeek + 6) % 7; // 월=0, 화=1, ..., 일=6
    const monday = new Date(now);
    monday.setDate(now.getDate() - offsetToMonday);
    const pad = (n: number) => String(n).padStart(2, "0");
    const mondayIso = `${monday.getFullYear()}-${pad(monday.getMonth() + 1)}-${pad(monday.getDate())}`;
    const datesThisWeek = new Set(
      checks
        .map((c) => c.checkedDate)
        .filter((d) => d >= mondayIso && d <= today),
    );
    return datesThisWeek.size;
  })();

  return (
    <Card data-testid="habit-widget" className="h-full">
      <CardHeader>
        <CardTitle>
          <Repeat className="size-4 text-primary-accent" />
          습관
          {state === "ready" && (() => {
            const total = habits.length;
            const doneToday = habits.filter((h) =>
              checks.some((c) => c.habitId === h.id && c.checkedDate === today),
            ).length;
            const pct = total > 0 ? Math.round((doneToday / total) * 100) : 0;
            return (
              <span className="text-xs text-muted-foreground font-normal ml-auto">
                오늘 {doneToday}/{total} ({pct}%) · 이번 주 {weekCheckCount}일
              </span>
            );
          })()}
        </CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col gap-3">
        {(() => {
          const now = new Date();
          const isAfternoon = now.getHours() >= 14;
          const uncheckedToday = habits.filter(
            (h) => !checks.some((c) => c.habitId === h.id && c.checkedDate === todayIso()),
          );
          return isAfternoon && uncheckedToday.length > 0 ? (
            <div className="text-xs text-orange-500 mb-2 flex items-center gap-1">
              <Bell className="size-3" />
              오늘 {uncheckedToday.length}개 습관이 아직 체크되지 않았어요
            </div>
          ) : null;
        })()}
        <div className="flex gap-2">
          <Input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAdd();
            }}
            placeholder="습관 추가"
          />
          <select
            value={newFrequency}
            onChange={(e) => setNewFrequency(e.target.value as Frequency)}
            aria-label="빈도"
            className="h-9 rounded-lg border border-input bg-background px-2 text-sm shadow-sm focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none"
          >
            <option value="daily">매일</option>
            <option value="weekly">주간</option>
          </select>
          <Button
            type="button"
            size="icon"
            onClick={handleAdd}
            aria-label="추가"
          >
            <Plus />
          </Button>
        </div>

        {actionError && (
          <p role="alert" className="text-xs text-destructive">
            {actionError}
          </p>
        )}

        {state === "loading" && <WidgetSkeleton />}
        {state === "error" && (
          <div className="flex flex-col items-start gap-2">
            <p className="text-sm text-muted-foreground">
              목록을 불러오지 못했습니다.
            </p>
            <Button type="button" variant="outline" size="sm" onClick={reload}>
              다시 시도
            </Button>
          </div>
        )}
        {state === "ready" && habits.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">
            새 습관을 만들어볼까요?
          </p>
        )}
        {state === "ready" && habits.length > 0 && (
          <ul className="flex flex-col gap-1">
            {habits.map((habit) => {
              const dates = checkedDatesFor(habit.id);
              const isCheckedToday = dates.includes(today);
              const streak = deriveHabitStreak(dates, today);
              return (
                <li
                  key={habit.id}
                  data-testid={`habit-${habit.id}`}
                  className="group flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted/60"
                >
                  <input
                    type="checkbox"
                    checked={isCheckedToday}
                    onChange={() => handleToggle(habit)}
                    aria-label="오늘 체크"
                    className="size-4 shrink-0 cursor-pointer accent-primary"
                  />
                  <span className="flex-1 text-sm">{habit.title}</span>
                  <Badge variant="muted">
                    {habit.frequency === "daily" ? "매일" : "주간"}
                  </Badge>
                  {streak > 0 && (
                    <Badge variant="success">
                      <Flame className="size-3" />
                      {streak}일
                    </Badge>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDelete(habit.id)}
                    aria-label="삭제"
                    className="text-muted-foreground opacity-0 transition-opacity hover:text-destructive focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring group-hover:opacity-100"
                  >
                    <X className="size-3.5" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
