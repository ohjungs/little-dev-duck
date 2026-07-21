"use client";

import { useEffect, useState } from "react";
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
import { Button, Card, Input, Spinner } from "@ldd/ui";
import { createClient } from "@/lib/supabase/client";
import { emitXpChanged } from "@/lib/xpSignal";
import { todayIso } from "@/lib/today";

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
    <Card
      data-testid="habit-widget"
      style={{ width: "100%", maxWidth: "420px" }}
    >
      <h2 style={{ fontSize: "1.1rem", marginBottom: "0.75rem" }}>습관</h2>

      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
        <Input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleAdd();
          }}
          placeholder="습관 추가"
          style={{ flex: 1 }}
        />
        <select
          value={newFrequency}
          onChange={(e) => setNewFrequency(e.target.value as Frequency)}
          aria-label="빈도"
          style={{ padding: "0.25rem 0.4rem" }}
        >
          <option value="daily">매일</option>
          <option value="weekly">주간</option>
        </select>
        <Button type="button" onClick={handleAdd}>
          추가
        </Button>
      </div>

      {actionError && (
        <p role="alert" style={{ color: "#b3261e", marginBottom: "0.5rem" }}>
          {actionError}
        </p>
      )}

      {state === "loading" && (
        <p style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Spinner size={14} /> 불러오는 중...
        </p>
      )}
      {state === "error" && (
        <div>
          <p>목록을 불러오지 못했습니다.</p>
          <Button type="button" onClick={reload}>
            다시 시도
          </Button>
        </div>
      )}
      {state === "ready" && habits.length === 0 && <p>습관이 없습니다.</p>}
      {state === "ready" && habits.length > 0 && (
        <ul
          style={{
            listStyle: "none",
            display: "flex",
            flexDirection: "column",
            gap: "0.4rem",
          }}
        >
          {habits.map((habit) => {
            const dates = checkedDatesFor(habit.id);
            const isCheckedToday = dates.includes(today);
            const streak = deriveHabitStreak(dates, today);
            return (
              <li
                key={habit.id}
                data-testid={`habit-${habit.id}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                <input
                  type="checkbox"
                  checked={isCheckedToday}
                  onChange={() => handleToggle(habit)}
                  aria-label="오늘 체크"
                />
                <span style={{ flex: 1 }}>{habit.title}</span>
                <span style={{ fontSize: "0.8rem", opacity: 0.7 }}>
                  {habit.frequency === "daily" ? "매일" : "주간"}
                </span>
                <span style={{ fontSize: "0.8rem" }}>연속 {streak}일</span>
                <button
                  type="button"
                  onClick={() => handleDelete(habit.id)}
                  aria-label="삭제"
                  style={{ background: "none", border: "none", cursor: "pointer" }}
                >
                  ✕
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
