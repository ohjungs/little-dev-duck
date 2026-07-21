"use client";

import { useEffect, useState } from "react";
import {
  createCalendarEvent,
  deleteCalendarEvent,
  listCalendarEvents,
} from "@ldd/api";
import { daysUntil, type CalendarEvent } from "@ldd/core";
import { Button, Card, Input, Spinner } from "@ldd/ui";
import { createClient } from "@/lib/supabase/client";
import { todayIso } from "@/lib/today";

type LoadState = "loading" | "error" | "ready";

// D-day 라벨: 0=오늘, 양수=D-N(다가옴), 음수=D+N(지남).
function ddayLabel(startAt: string): string {
  const diff = daysUntil(startAt, todayIso());
  if (diff === 0) return "오늘";
  if (diff > 0) return `D-${diff}`;
  return `D+${-diff} 지남`;
}

function byStartAt(a: CalendarEvent, b: CalendarEvent): number {
  return new Date(a.startAt).getTime() - new Date(b.startAt).getTime();
}

export function CalendarWidget() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [actionError, setActionError] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newDate, setNewDate] = useState("");

  const supabase = createClient();

  const fetchEvents = async () => {
    try {
      const data = await listCalendarEvents(supabase);
      setEvents(data);
      setState("ready");
    } catch {
      setState("error");
    }
  };

  useEffect(() => {
    // 마운트 시 1회 조회. 재시도는 reload가 담당.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reload = () => {
    setState("loading");
    fetchEvents();
  };

  const handleAdd = async () => {
    const title = newTitle.trim();
    if (!title || !newDate) return;
    // 날짜 input(YYYY-MM-DD)을 그 날짜의 ISO(UTC 자정)로. 스키마는 offset 포함 datetime 요구.
    const startAt = new Date(newDate).toISOString();
    setNewTitle("");
    setNewDate("");
    setActionError(null);
    try {
      const created = await createCalendarEvent(supabase, { title, startAt });
      setEvents((prev) => [...prev, created].sort(byStartAt));
    } catch {
      setActionError("추가하지 못했습니다.");
    }
  };

  const handleDelete = async (id: string) => {
    const prevEvents = events;
    setEvents((prev) => prev.filter((e) => e.id !== id));
    try {
      await deleteCalendarEvent(supabase, id);
    } catch {
      setEvents(prevEvents);
      setActionError("삭제하지 못했습니다.");
    }
  };

  return (
    <Card
      data-testid="calendar-widget"
      style={{ width: "100%", maxWidth: "420px" }}
    >
      <h2 style={{ fontSize: "1.1rem", marginBottom: "0.75rem" }}>캘린더</h2>

      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          marginBottom: "0.5rem",
          flexWrap: "wrap",
        }}
      >
        <Input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleAdd();
          }}
          placeholder="일정 제목"
          style={{ flex: 1, minWidth: "8rem" }}
        />
        <Input
          type="date"
          value={newDate}
          onChange={(e) => setNewDate(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleAdd();
          }}
          aria-label="날짜"
        />
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
          <p>일정을 불러오지 못했습니다.</p>
          <Button type="button" onClick={reload}>
            다시 시도
          </Button>
        </div>
      )}
      {state === "ready" && events.length === 0 && <p>다가오는 일정이 없습니다.</p>}
      {state === "ready" && events.length > 0 && (
        <ul
          style={{
            listStyle: "none",
            display: "flex",
            flexDirection: "column",
            gap: "0.4rem",
          }}
        >
          {events.map((event) => (
            <li
              key={event.id}
              data-testid={`calendar-event-${event.id}`}
              style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
            >
              <span
                style={{
                  minWidth: "4.5rem",
                  fontVariantNumeric: "tabular-nums",
                  fontWeight: 600,
                }}
              >
                {ddayLabel(event.startAt)}
              </span>
              <span style={{ flex: 1 }}>{event.title}</span>
              <span style={{ opacity: 0.6, fontSize: "0.8rem" }}>
                {event.startAt.slice(0, 10)}
              </span>
              <button
                type="button"
                onClick={() => handleDelete(event.id)}
                aria-label="삭제"
                style={{ background: "none", border: "none", cursor: "pointer" }}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
