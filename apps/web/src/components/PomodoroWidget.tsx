"use client";

import { useEffect, useRef, useState } from "react";
import { Play, Square, Timer } from "lucide-react";
import {
  completePomodoro,
  listPomodoroSessions,
  startPomodoro,
} from "@ldd/api";
import type { PomodoroSession } from "@ldd/core";
import { cn } from "@/lib/utils";
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
import { WidgetSkeleton } from "@/components/Skeleton";

function playCompletionSound(): void {
  const ctx = new AudioContext();
  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.value = 523; // C5
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.3, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.5);
}

// 집중 모드 플래그. DuckWidget 등 다른 컴포넌트가 이 이벤트를 수신해 알림을 억제한다.
const FOCUS_MODE_KEY = "ldd-focus-mode";
const FOCUS_CHANGED_EVENT = "ldd:focus-changed";

function enableFocusMode(): void {
  localStorage.setItem(FOCUS_MODE_KEY, "true");
  window.dispatchEvent(new Event(FOCUS_CHANGED_EVENT));
}

function disableFocusMode(): void {
  localStorage.removeItem(FOCUS_MODE_KEY);
  window.dispatchEvent(new Event(FOCUS_CHANGED_EVENT));
}

type LoadState = "loading" | "error" | "ready";

// 선택 가능한 집중 길이(분). 기본값은 첫 번째 항목.
const DURATION_OPTIONS = [25, 50] as const;
const SECONDS_PER_MINUTE = 60;

// 태그 이력 localStorage 키. max 20개 보관.
const TAGS_KEY = "ldd-pomodoro-tags";

function getSavedTags(): string[] {
  try {
    return JSON.parse(localStorage.getItem(TAGS_KEY) || "[]") as string[];
  } catch {
    return [];
  }
}

function saveTag(tag: string): void {
  const tags = getSavedTags().filter((t) => t !== tag);
  tags.unshift(tag);
  localStorage.setItem(TAGS_KEY, JSON.stringify(tags.slice(0, 20)));
}

function formatMmss(totalSeconds: number): string {
  const mm = String(Math.floor(totalSeconds / SECONDS_PER_MINUTE)).padStart(
    2,
    "0",
  );
  const ss = String(totalSeconds % SECONDS_PER_MINUTE).padStart(2, "0");
  return `${mm}:${ss}`;
}

// ISO 시각의 "로컬" 달력 날짜("YYYY-MM-DD"). completed_at은 UTC(Z)로 저장되므로
// slice(0,10)로 자르면 자정 부근에서 하루가 밀 수 있어, 로컬 기준으로 변환해 비교한다.
// sv-SE 로케일은 ISO 형식(YYYY-MM-DD)을 로컬 타임존으로 반환한다.
function localDateIso(iso: string): string {
  return new Date(iso).toLocaleDateString("sv-SE");
}

// 완료 시각을 "N분 전", "N시간 전" 형식으로 변환한다.
function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "방금";
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}시간 전`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}일 전`;
}

export function PomodoroWidget() {
  const [sessions, setSessions] = useState<PomodoroSession[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [durationMinutes, setDurationMinutes] = useState<number>(
    DURATION_OPTIONS[0],
  );
  const [running, setRunning] = useState(false);
  const [remaining, setRemaining] = useState(0);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [celebrate, setCelebrate] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // 태그 입력 상태
  const [tagInput, setTagInput] = useState("");
  const [tagFocused, setTagFocused] = useState(false);
  const tagWrapperRef = useRef<HTMLDivElement>(null);

  const supabase = createClient();

  const fetchSessions = async () => {
    try {
      const data = await listPomodoroSessions(supabase);
      setSessions(data);
      setState("ready");
    } catch {
      setState("error");
    }
  };

  useEffect(() => {
    // 마운트 시 1회 조회(오늘 완료 집계용). 재시도는 reload가 담당.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- SSR/hydration 안전: 마운트 후 1회 동기화
    fetchSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 마운트 시 1회만 실행
  }, []);

  // 카운트다운: running일 때만 인터벌을 돌리고, 정지/언마운트 시 정리한다.
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [running]);

  // 컴포넌트 언마운트 시 집중 모드 플래그가 남지 않도록 정리한다.
  useEffect(() => {
    return () => {
      disableFocusMode();
    };
  }, []);

  // 0초 도달 시 완료 처리. 상태 변경은 async 콜백 안에서만 해 이펙트 본문 동기 setState를 피한다.
  // 완료 후 running/activeId를 내려 재진입을 막고, cancelled 가드로 언마운트 경쟁을 막는다.
  useEffect(() => {
    if (!running || remaining > 0 || !activeId) return;
    const id = activeId;
    let cancelled = false;
    (async () => {
      try {
        await completePomodoro(supabase, id);
        if (cancelled) return;
        disableFocusMode();
        setRunning(false);
        setActiveId(null);
        playCompletionSound();
        setCelebrate(true);
        await fetchSessions();
        // completePomodoro가 서버에서 XP를 적립하므로 오리 표시 갱신 신호를 보낸다.
        emitXpChanged();
      } catch {
        if (!cancelled) {
          disableFocusMode();
          setRunning(false);
          setActiveId(null);
          setActionError("완료 처리하지 못했습니다.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchSessions/supabase는 안정적이라 의도적으로 제외
  }, [running, remaining, activeId]);

  const reload = () => {
    setState("loading");
    fetchSessions();
  };

  const handleStart = async () => {
    setActionError(null);
    setCelebrate(false);
    const tag = tagInput.trim() || null;
    if (tag) saveTag(tag);
    try {
      const session = await startPomodoro(supabase, { durationMinutes, tag });
      setActiveId(session.id);
      setRemaining(durationMinutes * SECONDS_PER_MINUTE);
      setRunning(true);
      enableFocusMode();
    } catch {
      setActionError("시작하지 못했습니다.");
    }
  };

  // 정지/취소: 완료 처리하지 않는다. 시작된 세션 행은 completed_at null(중단)로 남는다.
  const handleStop = () => {
    setRunning(false);
    setActiveId(null);
    setRemaining(0);
    disableFocusMode();
  };

  const todaySessions = sessions.filter(
    (s) => s.completedAt && localDateIso(s.completedAt) === todayIso(),
  );
  const todayCount = todaySessions.length;
  const todayMinutes = todaySessions.reduce((sum, s) => sum + s.durationMinutes, 0);

  // 최근 완료 세션 최대 5개 (completed_at 기준 내림차순은 listPomodoroSessions의 started_at 정렬 덕분에 유지됨)
  const recentCompleted = sessions
    .filter((s) => s.completedAt !== null)
    .slice(0, 5);

  // 자동완성 후보: 입력값을 포함하는 저장 태그 최대 5개
  const tagSuggestions =
    tagFocused && tagInput
      ? getSavedTags()
          .filter((t) => t.toLowerCase().includes(tagInput.toLowerCase()))
          .slice(0, 5)
      : [];

  return (
    <Card data-testid="pomodoro-widget" className="h-full">
      <CardHeader>
        <CardTitle>
          <Timer className="size-4 text-primary-accent" />
          뽀모도로
        </CardTitle>
        {state === "ready" && (
          <div className="flex items-center gap-1.5">
            <Badge variant="muted">오늘 {todayCount}회</Badge>
            {todayMinutes > 0 && (
              <span className="text-xs text-muted-foreground">오늘 {todayMinutes}분 집중</span>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent className="flex flex-col gap-3">
        {actionError && (
          <p role="alert" className="text-xs text-destructive">
            {actionError}
          </p>
        )}

        {running ? (
          <div className="flex flex-col items-center gap-3 py-4">
            <p
              aria-live="polite"
              className="font-mono text-5xl font-semibold tabular-nums tracking-tight"
            >
              {formatMmss(remaining)}
            </p>
            <Badge variant="muted" className="text-xs">
              집중 모드
            </Badge>
            <p className="text-sm text-muted-foreground">
              오리가 함께 집중 중...
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={handleStop}
              className="w-full"
            >
              <Square className="fill-current" />
              정지
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {celebrate && (
              <div className="rounded-lg bg-success/12 px-3 py-2 text-center text-sm font-medium text-success">
                집중 완료! 오리가 뿌듯해합니다.
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">집중 길이</span>
              <div className="flex gap-1 rounded-lg bg-muted p-1">
                {DURATION_OPTIONS.map((min) => (
                  <button
                    key={min}
                    type="button"
                    onClick={() => setDurationMinutes(min)}
                    aria-pressed={durationMinutes === min}
                    className={cn(
                      "rounded-md px-3 py-1 text-sm font-medium transition-colors",
                      durationMinutes === min
                        ? "bg-card text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {min}분
                  </button>
                ))}
              </div>
            </div>

            {/* 태그 입력 + 자동완성 드롭다운 */}
            <div ref={tagWrapperRef} className="relative">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onFocus={() => setTagFocused(true)}
                onBlur={() => setTagFocused(false)}
                placeholder="태그 (선택)"
                maxLength={50}
                className="w-full rounded-md border bg-background px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
              {tagSuggestions.length > 0 && (
                <div className="absolute top-full z-10 mt-1 max-h-32 w-full overflow-y-auto rounded-md border bg-background shadow-lg">
                  {tagSuggestions.map((t) => (
                    <button
                      key={t}
                      type="button"
                      // onMouseDown: blur 이전에 실행돼 tagFocused가 false가 되기 전에 값을 채운다.
                      onMouseDown={() => setTagInput(t)}
                      className="block w-full px-2 py-1 text-left text-xs hover:bg-accent"
                    >
                      {t}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <Button type="button" onClick={handleStart} className="w-full">
              <Play className="fill-current" />
              시작
            </Button>
          </div>
        )}

        <div className="text-sm text-muted-foreground">
          {state === "loading" && <WidgetSkeleton />}
          {state === "error" && (
            <span className="flex items-center gap-2">
              집계를 불러오지 못했습니다.
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={reload}
              >
                다시 시도
              </Button>
            </span>
          )}
        </div>

        {/* 최근 완료 세션 이력 */}
        {recentCompleted.length > 0 && (
          <div className="flex flex-col gap-1">
            <p className="text-xs font-medium text-muted-foreground">최근 기록</p>
            <ul className="flex flex-col gap-0.5">
              {recentCompleted.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center justify-between rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted/50"
                >
                  <span className="flex items-center gap-1.5 truncate">
                    <span className="font-medium text-foreground">
                      {s.durationMinutes}분
                    </span>
                    {s.tag && (
                      <span className="truncate text-muted-foreground">
                        #{s.tag}
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 pl-2">
                    {s.completedAt ? timeAgo(s.completedAt) : ""}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
