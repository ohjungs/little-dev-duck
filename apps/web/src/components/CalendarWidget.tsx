"use client";

import { useEffect, useState } from "react";
import { CalendarDays, Plus, X } from "lucide-react";
import {
  createCalendarEvent,
  deleteCalendarEvent,
  listCalendarEvents,
} from "@ldd/api";
import {
  calendarEventEmbedText,
  daysUntil,
  type CalendarEvent,
} from "@ldd/core";
import { reindexSource } from "@ldd/ai";
import { createClient } from "@/lib/supabase/client";
import { eventStartAt, isEndBeforeStart } from "@/lib/eventDateTime";
import { localDateKey } from "@/lib/localDateKey";
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

// 시작 시간을 한국어 오전/오후 형식으로 반환. 자정(0:00)이면 시간 부분을 숨긴다.
function formatEventTime(startAt: string): string | null {
  const d = new Date(startAt);
  const h = d.getHours();
  const m = d.getMinutes();
  if (h === 0 && m === 0) return null;
  const period = h < 12 ? "오전" : "오후";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${period} ${h12}:${String(m).padStart(2, "0")}`;
}

// 지난 일정 표시 여부(기기별 취향이라 서버가 아니라 localStorage에 둔다).
const SHOW_PAST_KEY = "ldd-calendar-show-past";

// 2026-07-27 : 캘린더 - 크기 (2차 피드백 1-7 "너무 뭉개지고 … 사이징도 변경가능하게")
// **"작게"에서는 월 그리드를 아예 그리지 않는다.** 뭉개짐의 직접 원인이 좁은 카드에 7열을
// 억지로 쥐어짜는 것이라, 칸을 더 줄이는 대신 **목록으로 바꾼다**(계획이 정한 방향).
// 자유 리사이즈는 하지 않는다 — 그리드 안에서 임의 크기는 다른 카드를 밀어내고,
// 그 상태를 저장·복원하는 비용이 크다.
const SIZE_KEY = "ldd-calendar-size";
const SIZES = [
  { key: "sm", label: "작게" },
  { key: "md", label: "보통" },
  { key: "lg", label: "크게" },
] as const;
type CalendarSize = (typeof SIZES)[number]["key"];

function isCalendarSize(v: string | null): v is CalendarSize {
  return v === "sm" || v === "md" || v === "lg";
}

// D-day 라벨: 0=오늘, 양수=D-N(다가옴), 음수=D+N(지남).
function ddayLabel(startAt: string): string {
  // startAt은 타임스탬프다. daysUntil은 문자열 앞 10자리(=UTC 날짜)를 쓰므로 로컬 자정
  // 저장값을 그대로 넘기면 KST에서 하루 밀린다 — 로컬 날짜 키로 바꿔 넘긴다.
  const diff = daysUntil(localDateKey(startAt), todayIso());
  if (diff === 0) return "오늘";
  if (diff > 0) return `D-${diff}`;
  return `D+${-diff} 지남`;
}

// 오늘=강조, 지난 일정=흐리게, 다가오는 일정=기본.
function ddayVariant(startAt: string): "default" | "muted" | "secondary" {
  // startAt은 타임스탬프다. daysUntil은 문자열 앞 10자리(=UTC 날짜)를 쓰므로 로컬 자정
  // 저장값을 그대로 넘기면 KST에서 하루 밀린다 — 로컬 날짜 키로 바꿔 넘긴다.
  const diff = daysUntil(localDateKey(startAt), todayIso());
  if (diff === 0) return "default";
  if (diff < 0) return "muted";
  return "secondary";
}

// "오늘"/"내일"/"모레" 라벨. 그 외는 null — 호출부에서 조건 렌더링.
function relativeLabel(startAt: string): string | null {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(startAt);
  d.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - today.getTime()) / 86_400_000);
  if (diff === 0) return "오늘";
  if (diff === 1) return "내일";
  if (diff === 2) return "모레";
  return null;
}

function byStartAt(a: CalendarEvent, b: CalendarEvent): number {
  return new Date(a.startAt).getTime() - new Date(b.startAt).getTime();
}

function ymdKey(y: number, m0: number, day: number): string {
  return `${y}-${String(m0 + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"] as const;

const EVENT_COLORS = [
  "border-l-blue-400",
  "border-l-green-400",
  "border-l-purple-400",
  "border-l-orange-400",
  "border-l-pink-400",
  "border-l-teal-400",
];

function eventColor(title: string): string {
  let hash = 0;
  for (const c of title) hash = (hash * 31 + c.charCodeAt(0)) & 0xffff;
  return EVENT_COLORS[hash % EVENT_COLORS.length]!;
}

export function CalendarWidget() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [actionError, setActionError] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");
  const [newEndTime, setNewEndTime] = useState("");
  // 월 그리드가 보는 연/월(0-11)과 선택된 날짜(YYYY-MM-DD). 초기값은 현재 월(로컬=KST).
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  // 2026-07-27 (2차 피드백 1-7 "아무것도 안골르면 당장 오늘로하고"): 기본 선택을 오늘로.
  // **날짜 계산을 새로 쓰지 않는다** — `todayIso`가 로컬 기준으로 이미 있다(이 저장소는
  // 하루 밀림을 여러 번 겪어 eslint 규칙까지 만들었다).
  const [selectedDate, setSelectedDate] = useState<string | null>(() => todayIso());

  // 2026-07-27 (2차 피드백 1-7 "지난거는 볼건지안볼건지도 중요하고"): 지난 일정 표시 토글.
  // **기본값은 숨김이다** — 사용자가 "볼지 말지"를 물었다는 것 자체가 지금 보이는 게
  // 방해된다는 뜻이다. 선택은 기기별 취향이라 localStorage에 남긴다(이 저장소의 다른
  // 화면 설정과 같은 방식 — 서버 설정은 마이그레이션 대기 중이라 여기에 얹지 않는다).
  const [showPast, setShowPast] = useState(false);
  useEffect(() => {
    // 초기값을 useState 초기화 함수에서 읽지 않는 이유: 서버 렌더에는 localStorage가 없어
    // 하이드레이션이 어긋난다. 이 파일이 일정 조회에 쓰는 것과 같은 예외다(마운트 후 1회 동기화).
    // eslint-disable-next-line react-hooks/set-state-in-effect -- SSR/hydration 안전: 마운트 후 1회 동기화
    setShowPast(window.localStorage.getItem(SHOW_PAST_KEY) === "1");
  }, []);
  // 크기. 기본은 "보통"(지금까지의 모습)이라 아무것도 안 고른 사용자에게는 화면이 그대로다.
  const [size, setSize] = useState<CalendarSize>("md");
  useEffect(() => {
    const saved = window.localStorage.getItem(SIZE_KEY);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- SSR/hydration 안전: 마운트 후 1회 동기화
    if (isCalendarSize(saved)) setSize(saved);
  }, []);
  const changeSize = (next: CalendarSize) => {
    setSize(next);
    window.localStorage.setItem(SIZE_KEY, next);
  };

  const toggleShowPast = () => {
    setShowPast((prev) => {
      const next = !prev;
      window.localStorage.setItem(SHOW_PAST_KEY, next ? "1" : "0");
      return next;
    });
  };

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
    // eslint-disable-next-line react-hooks/set-state-in-effect -- SSR/hydration 안전: 마운트 후 1회 동기화
    fetchEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 마운트 시 1회만 실행
  }, []);

  const reload = () => {
    setState("loading");
    fetchEvents();
  };

  const handleAdd = async () => {
    const title = newTitle.trim();
    if (!title || !newDate) return;

    // 로컬 자정 기준으로 만든다. 화면이 getHours()로 시각을 읽어 0시 0분이면 "종일"로 보고
    // 감추기 때문이다. 예전에는 `new Date(newDate)`로 만들었는데, 날짜만 있는 ISO 문자열은
    // UTC로 해석돼서 한국에선 9시가 됐다 — 고른 적 없는 "오전 9:00"이 모든 일정에 붙었다.
    const startAt = eventStartAt(newDate, newTime);
    if (!startAt) {
      setActionError("날짜나 시각을 이해하지 못했습니다.");
      return;
    }
    if (newTime !== "" && isEndBeforeStart(newTime, newEndTime)) {
      setActionError("종료 시각이 시작보다 빠릅니다.");
      return;
    }
    const endAt =
      newTime !== "" && newEndTime !== "" ? eventStartAt(newDate, newEndTime) : null;

    setNewTitle("");
    setNewDate("");
    setNewTime("");
    setNewEndTime("");
    setActionError(null);
    try {
      const created = await createCalendarEvent(supabase, { title, startAt, endAt });
      setEvents((prev) => [...prev, created].sort(byStartAt));
      // RAG 인덱싱(fire-and-forget).
      void reindexSource({
        sourceType: "calendar_event",
        sourceId: created.id,
        text: calendarEventEmbedText(created.title, created.startAt, created.endAt),
      });
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

  // 월 그리드 계산: 날짜별 일정 수 + 이번 달 셀(앞 빈칸 + 1..말일).
  const eventsByDay = new Map<string, number>();
  for (const e of events) {
    const k = localDateKey(e.startAt);
    eventsByDay.set(k, (eventsByDay.get(k) ?? 0) + 1);
  }
  const todayKey = todayIso();
  const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array<null>(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  const gotoMonth = (delta: number) => {
    const d = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
    setSelectedDate(null);
  };
  // 날짜를 고르면 그날 것만, 안 고르면 전체. 그 위에 "지난 일정 숨김"을 얹는다.
  // **날짜를 직접 고른 경우에는 숨기지 않는다** — 사용자가 과거 날짜를 눌렀는데 빈 화면이
  // 나오면 고장으로 보인다(고르는 행위 자체가 "그날을 보겠다"는 뜻이다).
  const byDate = selectedDate
    ? events.filter((e) => localDateKey(e.startAt) === selectedDate)
    : events;
  const visibleEvents =
    showPast || selectedDate !== null
      ? byDate
      : byDate.filter((e) => localDateKey(e.startAt) >= todayKey);
  const hiddenPastCount =
    showPast || selectedDate !== null
      ? 0
      : byDate.length - visibleEvents.length;

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
          {/* 시각은 선택이다. 비우면 종전대로 종일 일정(시각 표시 없음) — 날짜만 넣던
              흐름을 깨지 않는다. 종료는 시작을 넣었을 때만 받는다(시작 없는 종료는 의미가
              없고, 칸이 셋이면 폼이 무거워진다). */}
          <Input
            type="time"
            value={newTime}
            onChange={(e) => setNewTime(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAdd();
            }}
            aria-label="시작 시각(선택)"
            className="w-auto"
          />
          {newTime !== "" && (
            <Input
              type="time"
              value={newEndTime}
              onChange={(e) => setNewEndTime(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAdd();
              }}
              aria-label="종료 시각(선택)"
              className="w-auto"
            />
          )}
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

        {/* 2026-07-27 (2차 피드백 1-7): 크기 3단계. 자유 리사이즈 대신 정해진 세 단계다 —
            그리드 안에서 임의 크기는 다른 카드를 밀어내고 그 상태를 저장·복원하는 비용이 크다. */}
        <div className="flex items-center justify-end gap-1" role="group" aria-label="캘린더 크기">
          {SIZES.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => changeSize(s.key)}
              aria-pressed={size === s.key}
              className={`rounded-md px-2 py-1 text-xs transition-colors ${
                size === s.key
                  ? "bg-muted font-medium text-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* 월 그리드 달력. **"작게"에서는 그리지 않는다** — 좁은 카드에 7열을 쥐어짜는 것이
            "뭉개진다"의 직접 원인이라, 칸을 더 줄이는 대신 아래 목록만 남긴다. */}
        {size !== "sm" && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => gotoMonth(-1)}
              aria-label="이전 달"
              className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              ‹
            </button>
            <span className="text-sm font-semibold tabular-nums">
              {viewYear}년 {viewMonth + 1}월
            </span>
            <button
              type="button"
              onClick={() => gotoMonth(1)}
              aria-label="다음 달"
              className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              ›
            </button>
          </div>
          <div
            className={`grid grid-cols-7 gap-0.5 text-center ${size === "lg" ? "text-sm" : "text-xs"}`}
          >
            {WEEKDAYS.map((w, i) => (
              <span
                key={w}
                className={`py-1 text-[10px] font-medium ${i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : "text-muted-foreground"}`}
              >
                {w}
              </span>
            ))}
            {cells.map((day, idx) => {
              if (day === null) return <span key={`b${idx}`} />;
              const key = ymdKey(viewYear, viewMonth, day);
              const count = eventsByDay.get(key) ?? 0;
              const isToday = key === todayKey;
              const isSelected = key === selectedDate;
              const dow = idx % 7;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setSelectedDate(isSelected ? null : key);
                    setNewDate(key);
                  }}
                  aria-label={`${viewMonth + 1}월 ${day}일${count > 0 ? `, 일정 ${count}개` : ""}`}
                  aria-pressed={isSelected}
                  className={`relative flex aspect-square flex-col items-center justify-center rounded-md tabular-nums transition-colors ${
                    size === "lg" ? "min-h-11 text-sm" : "min-h-8 text-xs"
                  } ${
                    isSelected
                      ? "bg-primary text-primary-foreground"
                      : isToday
                        ? "bg-primary/15 font-semibold text-foreground"
                        : "hover:bg-muted"
                  } ${!isSelected && dow === 0 ? "text-red-400" : ""} ${!isSelected && dow === 6 ? "text-blue-400" : ""}`}
                >
                  {day}
                  {count > 0 && (
                    <span
                      className={`absolute bottom-1 size-1 rounded-full ${isSelected ? "bg-primary-foreground" : "bg-primary"}`}
                    />
                  )}
                </button>
              );
            })}
          </div>
          {selectedDate && (
            <button
              type="button"
              onClick={() => setSelectedDate(null)}
              className="self-end text-[11px] text-muted-foreground hover:text-foreground"
            >
              전체 일정 보기
            </button>
          )}
        </div>
        )}

        {/* "작게"에서는 달력이 없으므로 날짜 선택을 풀 수단이 사라진다 — 여기서 대신 제공한다.
            (그렇지 않으면 오늘 자동 선택된 상태에서 다른 날 일정을 영영 볼 수 없다.) */}
        {size === "sm" && selectedDate && (
          <button
            type="button"
            onClick={() => setSelectedDate(null)}
            className="self-end text-[11px] text-muted-foreground hover:text-foreground"
          >
            전체 일정 보기
          </button>
        )}

        {state === "loading" && <WidgetSkeleton />}
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
        {/* 2026-07-27 (2차 피드백 1-7): 지난 일정 보기 토글. 날짜를 직접 고른 상태에서는
            숨기지 않으므로 토글도 감춘다 — 눌러도 아무 일이 없으면 고장으로 보인다. */}
        {state === "ready" && selectedDate === null && (
          <div className="flex items-center justify-between gap-2 text-xs">
            <button
              type="button"
              onClick={toggleShowPast}
              aria-pressed={showPast}
              className="rounded-md px-2 py-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {showPast ? "지난 일정 숨기기" : "지난 일정 보기"}
            </button>
            {/* 숨긴 건수를 말한다 — 말 없이 사라지면 "일정이 없어졌다"가 된다. */}
            {hiddenPastCount > 0 && (
              <span className="text-muted-foreground">
                지난 일정 {hiddenPastCount}건 숨김
              </span>
            )}
          </div>
        )}
        {state === "ready" && visibleEvents.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {selectedDate
              ? "이 날은 일정이 없어요"
              : hiddenPastCount > 0
                ? `앞으로의 일정이 없어요. 지난 일정 ${hiddenPastCount}건은 숨겨져 있어요.`
                : "아직 일정이 없어요"}
          </p>
        )}
        {state === "ready" && visibleEvents.length > 0 && (
          <ul className="flex flex-col gap-1">
            {visibleEvents.map((event) => {
              const isToday = daysUntil(localDateKey(event.startAt), todayIso()) === 0;
              const startTime = formatEventTime(event.startAt);
              const endTime = event.endAt ? formatEventTime(event.endAt) : null;
              const relLabel = relativeLabel(event.startAt);
              return (
                <li
                  key={event.id}
                  data-testid={`calendar-event-${event.id}`}
                  className={`group flex items-center gap-2.5 rounded-lg border-l-2 px-2 py-1.5 transition-colors hover:bg-muted/60 ${eventColor(event.title)}${isToday ? " bg-primary/5" : ""}`}
                >
                  <Badge
                    variant={ddayVariant(event.startAt)}
                    className="min-w-16 justify-center tabular-nums"
                  >
                    {ddayLabel(event.startAt)}
                  </Badge>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className={`truncate text-sm${isToday ? " font-medium" : ""}`}>
                      {event.title}
                    </span>
                    {startTime && (
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {startTime}{endTime ? ` ~ ${endTime}` : ""}
                      </span>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col items-end">
                    {relLabel && (
                      <span className="text-[10px] font-medium text-primary leading-none mb-0.5">
                        {relLabel}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {localDateKey(event.startAt)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(event.id)}
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
