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

// r3f Canvas는 WebGL을 쓰므로 서버 렌더링이 불가능해 클라이언트 전용으로 로드한다.
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
