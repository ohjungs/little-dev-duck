"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { Drumstick, ImageDown, Sparkles } from "lucide-react";
import { getDuckState } from "@ldd/api";
import { levelProgress, type DuckState } from "@ldd/core";
import { createClient } from "@/lib/supabase/client";
import { onXpChanged } from "@/lib/xpSignal";
import { subscribeTable } from "@/lib/realtime";
import {
  readQuietHours,
  QUIET_HOURS_EVENT,
  type QuietHours,
} from "@/lib/quietHours";
import { notifyDuck } from "@/lib/notify";
import {
  loadInitiativeSnapshot,
  pickFromSnapshot,
  markSpoken,
  type InitiativeSnapshot,
} from "@/lib/duckInitiative";
import { onAppAction } from "@/lib/appActionSignal";
import { todayIso } from "@/lib/today";
import { isQuietNow } from "@ldd/core";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AchievementCard } from "@/components/AchievementCard";
import { useDuckMood } from "./useDuckMood";

const DUCK_HEIGHT = 220;
const CELEBRATE_MS = 1500;

// 2026-07-30 : 주석 정정. 전에는 "r3f Canvas는 WebGL을 쓰므로 서버 렌더링이 불가능해"라고
// 적혀 있었는데 **더 이상 사실이 아니다** — 오리는 CSS 스프라이트이고 r3f Canvas가 없다
// (packages/mascot/src/Duck.tsx). `ssr: false`를 유지하는 실제 이유는 오리가 마운트 시점의
// localStorage(방해금지 설정)와 window 크기에 의존해 SSR 결과와 어긋나기 때문이다.
// 로딩 중에도 같은 높이의 자리를 예약해 청크 로드 후 레이아웃이 밀리지 않게 한다.
const Duck = dynamic(() => import("@ldd/mascot").then((mod) => mod.Duck), {
  ssr: false,
  loading: () => <div style={{ height: DUCK_HEIGHT }} />,
});

export function DuckWidget() {
  const mood = useDuckMood();
  const [duckState, setDuckState] = useState<DuckState | null>(null);
  const [celebrate, setCelebrate] = useState(false);
  const [quietHours, setQuietHours] = useState<QuietHours | null>(null);
  const [showCard, setShowCard] = useState(false);
  // 오리가 먼저 건네는 말(피드백 1-3). 규칙으로 고른 문장이라 LLM 호출이 없다.
  const [initiative, setInitiative] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<InitiativeSnapshot | null>(null);
  const levelRef = useRef<number | null>(null);
  const celebrateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 방해금지(DND) 설정을 localStorage에서 읽고, 설정 페이지에서 바뀌면(커스텀/다른탭 storage 이벤트) 반영.
  useEffect(() => {
    const sync = () => setQuietHours(readQuietHours());
    sync();
    window.addEventListener(QUIET_HOURS_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(QUIET_HOURS_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    const refresh = () => {
      getDuckState(supabase)
        .then((next) => {
          if (cancelled) return;
          // XP 적립으로 레벨이 오른 순간에만 축하 연출을 잠깐 켠다(최초 로드는 levelRef null이라 제외).
          if (levelRef.current !== null && next.level > levelRef.current) {
            setCelebrate(true);
            if (celebrateTimer.current) clearTimeout(celebrateTimer.current);
            celebrateTimer.current = setTimeout(
              () => setCelebrate(false),
              CELEBRATE_MS,
            );
            // 브라우저 알림(T4) — 권한/방해금지/일일 상한은 notifyDuck이 처리.
            notifyDuck("레벨 업!", `오리가 레벨 ${next.level}이 되었어요!`);
          }
          levelRef.current = next.level;
          setDuckState(next);
        })
        .catch(() => {
          // 게임화 정보는 부가 표시라 조회 실패 시 조용히 생략하고 오리는 그대로 둔다.
        });
    };

    refresh();
    // 투두/습관/뽀모도로에서 XP를 적립하면 이 신호로 오리 표시를 갱신한다.
    const unsubscribe = onXpChanged(refresh);

    // Realtime: 다른 탭/기기에서 duck_state가 변경되면(XP·기분) 오리 표시를 갱신한다.
    let realtimeCleanup: (() => void) | undefined;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (cancelled || !user) return;
      realtimeCleanup = subscribeTable(supabase, "duck_state", user.id, () => {
        refresh();
      });
    });

    return () => {
      cancelled = true;
      unsubscribe();
      realtimeCleanup?.();
      if (celebrateTimer.current) clearTimeout(celebrateTimer.current);
    };
  }, []);

  const progress = duckState ? levelProgress(duckState.xp) : null;
  const ratioPercent = progress ? Math.round(progress.ratio * 100) : 0;

  // 워크스페이스 상태는 **한 번만** 읽는다. 새 일정·할 일이 생기면 승인 실행 신호가 다시 읽게 한다
  // (오리가 만든 것도, 위젯에서 만든 것도 아닌 경우는 다음 방문에 반영된다 — 조회를 늘리지 않는다).
  useEffect(() => {
    let cancelled = false;
    const load = () => {
      void (async () => {
        const snap = await loadInitiativeSnapshot(createClient(), {
          now: new Date(),
          today: todayIso(),
        });
        if (!cancelled) setSnapshot(snap);
      })();
    };
    load();
    const off = onAppAction(
      ["createTodo", "addCalendarEvent", "editTodo", "deleteTodo", "checkHabit", "completeTodo"],
      load,
    );
    return () => {
      cancelled = true;
      off();
    };
  }, []);

  // 판단은 **1분마다 다시** 한다(네트워크 0회 — 스냅샷과 지금 시각만 쓴다).
  // 처음엔 화면을 연 순간에만 판단했는데, 그러면 오후 1시에 열어 둔 채 3시 일정을 맞아도
  // 아무 말도 안 한다 — "내일 아침에 알려줘" 같은 예약이 실제로는 알려주지 않는 셈이었다.
  useEffect(() => {
    if (!snapshot) return;
    const tick = () => {
      const today = todayIso();
      const now = new Date();
      const quiet = quietHours
        ? isQuietNow({ hour: now.getHours(), weekday: now.getDay() }, quietHours)
        : false;
      const picked = pickFromSnapshot(snapshot, { now, today, quiet });
      if (!picked) return;
      // **템플릿 문장을 먼저 띄운다.** LLM 응답을 기다리며 비워 두면 오리가 늦게 말하는 것처럼
      // 보이고, 응답이 실패하면 아예 말을 못 한다. 저하 모드가 곧 기존 동작이라 이게 안전하다.
      setInitiative(picked.message);
      // 2026-07-27 (2차 피드백 1-3, Phase 45 T1): 같은 사실을 매번 다르게 말하게 한다.
      // 규칙이 "무엇을"을 정하고 LLM은 "어떻게"만 바꾼다 — 사실은 picked.message에서 온다.
      // 실패·쿼터 초과는 서버가 `line: null`로 답하고, 그러면 위 템플릿이 그대로 남는다.
      void fetch("/api/ai/duck-line", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ factLine: picked.message, mood: picked.mood }),
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((data: { line?: string | null } | null) => {
          if (data?.line) setInitiative(data.line);
        })
        .catch(() => {
          // 네트워크 실패도 조용히 넘긴다 — 오리 위젯이 죽는 것보다 템플릿 문장이 낫다.
        });
      // 일정은 시간이 지나면 되돌릴 수 없다 — 탭이 뒤에 있어도 보이도록 알림도 함께 띄운다.
      // 권한·방해금지·하루 상한은 notifyDuck이 알아서 판단한다.
      if (picked.kind === "upcomingEvent") notifyDuck("곧 일정이 있어요", picked.message);
      // 실제로 띄운 뒤에 기록한다 — 계산만 하고 세면 하지도 않은 말이 상한을 깎는다.
      markSpoken(today, picked.kind);
    };
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, [snapshot, quietHours]);


  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>
          <Sparkles className="size-4 text-primary-accent" />
          오리
        </CardTitle>
        {duckState && (
          <Badge data-testid="duck-level">Lv {duckState.level}</Badge>
        )}
      </CardHeader>

      <CardContent className="flex flex-col items-center gap-4">
        <div className="flex w-full items-center justify-center rounded-xl bg-gradient-to-b from-secondary/60 to-secondary/20">
          <Duck
            height={DUCK_HEIGHT}
            mood={mood}
            celebrate={celebrate}
            quietHours={quietHours}
            say={initiative}
          />
        </div>

        {duckState && (
          <div data-testid="duck-stats" className="flex w-full flex-col gap-2">
            <div
              role="progressbar"
              aria-label="레벨 진행도"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={ratioPercent}
              className="h-2 w-full overflow-hidden rounded-full bg-muted"
            >
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-300"
                style={{ width: `${ratioPercent}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-medium text-foreground">
                XP {duckState.xp}
              </span>
              <span className="flex items-center gap-1">
                <Drumstick className="size-3.5" />
                먹이 {duckState.feed}
              </span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowCard(true)}
              className="self-end text-muted-foreground"
            >
              <ImageDown className="size-3.5" /> 성과 카드
            </Button>
          </div>
        )}
      </CardContent>

      {showCard && duckState && (
        <AchievementCard
          level={duckState.level}
          xp={duckState.xp}
          feed={duckState.feed}
          onClose={() => setShowCard(false)}
        />
      )}
    </Card>
  );
}
