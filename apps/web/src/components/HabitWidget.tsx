"use client";

import { useEffect, useState } from "react";
import { Flame, Plus, Repeat, X } from "lucide-react";
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  return (
    <Card data-testid="habit-widget" className="h-full">
      <CardHeader>
        <CardTitle>
          <Repeat className="size-4 text-primary" />
          습관
        </CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col gap-3">
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

        {state === "loading" && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="size-3.5 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground" />
            불러오는 중...
          </p>
        )}
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
            습관이 없습니다.
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
                    className="text-muted-foreground opacity-0 transition-opacity hover:text-destructive focus-visible:opacity-100 group-hover:opacity-100"
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
