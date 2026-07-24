"use client";

import { useEffect, useState } from "react";
import { CalendarDays, Plus, X } from "lucide-react";
import {
  createCalendarEvent,
  deleteCalendarEvent,
  listCalendarEvents,
} from "@ldd/api";
import { daysUntil, type CalendarEvent } from "@ldd/core";
import { reindexSource } from "@ldd/ai";
import { createClient } from "@/lib/supabase/client";
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

// D-day 라벨: 0=오늘, 양수=D-N(다가옴), 음수=D+N(지남).
function ddayLabel(startAt: string): string {
  const diff = daysUntil(startAt, todayIso());
  if (diff === 0) return "오늘";
  if (diff > 0) return `D-${diff}`;
  return `D+${-diff} 지남`;
}

// 오늘=강조, 지난 일정=흐리게, 다가오는 일정=기본.
function ddayVariant(startAt: string): "default" | "muted" | "secondary" {
  const diff = daysUntil(startAt, todayIso());
  if (diff === 0) return "default";
  if (diff < 0) return "muted";
  return "secondary";
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
    fetchEvents();
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
      // RAG 인덱싱(fire-and-forget).
      void reindexSource({ sourceType: "calendar_event", sourceId: created.id, text: title });
    } catch {
      setActionError("추가하지 못했습니다.");
    }
  };

  const handleDelete = async (id: string) => {
    const prevEvents = events;
    setEvents((prev) => prev.filter((e) => e.id !== id));
    try {
      await deleteCalendarEvent(supabase, id);
      void reindexSource({ sourceType: "calendar_event", sourceId: id, text: "" });
    } catch {
      setEvents(prevEvents);
      setActionError("삭제하지 못했습니다.");
    }
  };

  return (
    <Card data-testid="calendar-widget" className="h-full">
      <CardHeader>
        <CardTitle>
          <CalendarDays className="size-4 text-primary-accent" />
          캘린더
        </CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          <Input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAdd();
            }}
            placeholder="일정 제목"
            className="min-w-32 flex-1"
          />
          <Input
            type="date"
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAdd();
            }}
            aria-label="날짜"
            className="w-auto"
          />
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
              일정을 불러오지 못했습니다.
            </p>
            <Button type="button" variant="outline" size="sm" onClick={reload}>
              다시 시도
            </Button>
          </div>
        )}
        {state === "ready" && events.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">
            다가오는 일정이 없습니다.
          </p>
        )}
        {state === "ready" && events.length > 0 && (
          <ul className="flex flex-col gap-1">
            {events.map((event) => (
              <li
                key={event.id}
                data-testid={`calendar-event-${event.id}`}
                className="group flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted/60"
              >
                <Badge
                  variant={ddayVariant(event.startAt)}
                  className="min-w-16 justify-center tabular-nums"
                >
                  {ddayLabel(event.startAt)}
                </Badge>
                <span className="flex-1 truncate text-sm">{event.title}</span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {event.startAt.slice(0, 10)}
                </span>
                <button
                  type="button"
                  onClick={() => handleDelete(event.id)}
                  aria-label="삭제"
                  className="text-muted-foreground opacity-0 transition-opacity hover:text-destructive focus-visible:opacity-100 group-hover:opacity-100"
                >
                  <X className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
