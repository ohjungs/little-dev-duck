"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { getDuckState } from "@ldd/api";
import { levelProgress, type DuckState } from "@ldd/core";
import { Card } from "@ldd/ui";
import { createClient } from "@/lib/supabase/client";
import { onXpChanged } from "@/lib/xpSignal";
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
  const levelRef = useRef<number | null>(null);
  const celebrateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    return () => {
      cancelled = true;
      unsubscribe();
      if (celebrateTimer.current) clearTimeout(celebrateTimer.current);
    };
  }, []);

  const progress = duckState ? levelProgress(duckState.xp) : null;
  const ratioPercent = progress ? Math.round(progress.ratio * 100) : 0;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "0.5rem",
        width: "100%",
      }}
    >
      {duckState && (
        <span
          data-testid="duck-level"
          style={{
            fontSize: "0.9rem",
            fontWeight: 700,
            color: "var(--ldd-color-text, #352116)",
          }}
        >
          Lv {duckState.level}
        </span>
      )}

      <Duck height={DUCK_HEIGHT} mood={mood} celebrate={celebrate} />

      {duckState && (
        <Card
          data-testid="duck-stats"
          style={{
            width: "100%",
            maxWidth: "200px",
            padding: "0.6rem 0.75rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.4rem",
          }}
        >
          <div
            role="progressbar"
            aria-label="레벨 진행도"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={ratioPercent}
            style={{
              height: "8px",
              background: "rgba(0, 0, 0, 0.15)",
              borderRadius: "999px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${ratioPercent}%`,
                background: "var(--ldd-color-accent, #A99C65)",
                transition: "width 300ms ease",
              }}
            />
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "0.75rem",
            }}
          >
            <span>XP {duckState.xp}</span>
            <span>먹이 {duckState.feed}</span>
          </div>
        </Card>
      )}
    </div>
  );
}
