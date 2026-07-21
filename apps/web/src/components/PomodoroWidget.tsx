"use client";

import { useEffect, useState } from "react";
import {
  completePomodoro,
  listPomodoroSessions,
  startPomodoro,
} from "@ldd/api";
import type { PomodoroSession } from "@ldd/core";
import { Button, Card, Spinner } from "@ldd/ui";
import { createClient } from "@/lib/supabase/client";
import { emitXpChanged } from "@/lib/xpSignal";
import { todayIso } from "@/lib/today";

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
    <Card
      data-testid="pomodoro-widget"
      style={{ width: "100%", maxWidth: "420px" }}
    >
      <h2 style={{ fontSize: "1.1rem", marginBottom: "0.75rem" }}>뽀모도로</h2>

      {actionError && (
        <p role="alert" style={{ color: "#b3261e", marginBottom: "0.5rem" }}>
          {actionError}
        </p>
      )}

      {running ? (
        <div style={{ textAlign: "center" }}>
          <p
            aria-live="polite"
            style={{
              fontSize: "2.6rem",
              fontVariantNumeric: "tabular-nums",
              letterSpacing: "0.05em",
              marginBottom: "0.25rem",
            }}
          >
            {formatMmss(remaining)}
          </p>
          <p style={{ opacity: 0.7, marginBottom: "0.75rem" }}>
            오리가 함께 집중 중...
          </p>
          <Button type="button" onClick={handleStop}>
            정지
          </Button>
        </div>
      ) : (
        <div>
          {celebrate && (
            <p style={{ marginBottom: "0.75rem", fontWeight: 600 }}>
              집중 완료! 오리가 뿌듯해합니다.
            </p>
          )}
          <div
            style={{
              display: "flex",
              gap: "0.5rem",
              marginBottom: "0.75rem",
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: "0.9rem", opacity: 0.8 }}>집중 길이</span>
            {DURATION_OPTIONS.map((min) => (
              <Button
                key={min}
                type="button"
                onClick={() => setDurationMinutes(min)}
                aria-pressed={durationMinutes === min}
                style={{
                  padding: "0.25rem 0.6rem",
                  fontSize: "0.85rem",
                  opacity: durationMinutes === min ? 1 : 0.55,
                }}
              >
                {min}분
              </Button>
            ))}
          </div>
          <Button type="button" onClick={handleStart} style={{ width: "100%" }}>
            시작
          </Button>
        </div>
      )}

      <div style={{ marginTop: "1rem", fontSize: "0.9rem", opacity: 0.85 }}>
        {state === "loading" && (
          <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Spinner size={14} /> 불러오는 중...
          </span>
        )}
        {state === "error" && (
          <span
            style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
          >
            집계를 불러오지 못했습니다.
            <Button
              type="button"
              onClick={reload}
              style={{ padding: "0.2rem 0.5rem", fontSize: "0.8rem" }}
            >
              다시 시도
            </Button>
          </span>
        )}
        {state === "ready" && <span>오늘 완료한 집중 {todayCount}회</span>}
      </div>
    </Card>
  );
}
