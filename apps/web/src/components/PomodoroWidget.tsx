"use client";

import { useEffect, useState } from "react";
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

type LoadState = "loading" | "error" | "ready";

// 선택 가능한 집중 길이(분). 기본값은 첫 번째 항목.
const DURATION_OPTIONS = [25, 50] as const;
const SECONDS_PER_MINUTE = 60;

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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 카운트다운: running일 때만 인터벌을 돌리고, 정지/언마운트 시 정리한다.
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [running]);

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
        setRunning(false);
        setActiveId(null);
        setCelebrate(true);
        await fetchSessions();
        // completePomodoro가 서버에서 XP를 적립하므로 오리 표시 갱신 신호를 보낸다.
        emitXpChanged();
      } catch {
        if (!cancelled) {
          setRunning(false);
          setActiveId(null);
          setActionError("완료 처리하지 못했습니다.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, remaining, activeId]);

  const reload = () => {
    setState("loading");
    fetchSessions();
  };

  const handleStart = async () => {
    setActionError(null);
    setCelebrate(false);
    try {
      const session = await startPomodoro(supabase, { durationMinutes });
      setActiveId(session.id);
      setRemaining(durationMinutes * SECONDS_PER_MINUTE);
      setRunning(true);
    } catch {
      setActionError("시작하지 못했습니다.");
    }
  };

  // 정지/취소: 완료 처리하지 않는다. 시작된 세션 행은 completed_at null(중단)로 남는다.
  const handleStop = () => {
    setRunning(false);
    setActiveId(null);
    setRemaining(0);
  };

  const todayCount = sessions.filter(
    (s) => s.completedAt && localDateIso(s.completedAt) === todayIso(),
  ).length;

  return (
    <Card data-testid="pomodoro-widget" className="h-full">
      <CardHeader>
        <CardTitle>
          <Timer className="size-4 text-primary" />
          뽀모도로
        </CardTitle>
        {state === "ready" && (
          <Badge variant="muted">오늘 {todayCount}회</Badge>
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
            <Button type="button" onClick={handleStart} className="w-full">
              <Play className="fill-current" />
              시작
            </Button>
          </div>
        )}

        <div className="text-sm text-muted-foreground">
          {state === "loading" && (
            <span className="flex items-center gap-2">
              <span className="size-3.5 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground" />
              불러오는 중...
            </span>
          )}
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
      </CardContent>
    </Card>
  );
}
