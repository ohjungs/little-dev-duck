"use client";

import { useEffect, useRef } from "react";
import { createPage, generateWeeklyDigest } from "@ldd/api";
import { previousWeekRange, shouldCreateDigest } from "@ldd/core";
import { createClient } from "@/lib/supabase/client";
import { notifyDuck } from "@/lib/notify";
import {
  digestLinesToBlocks,
  readLastDigestWeek,
  writeLastDigestWeek,
} from "@/lib/weeklyDigest";

// Phase 18 T4: 오리 주간 다이제스트. 화면이 없는 배경 컴포넌트(DesktopCollectorSync와 같은 패턴).
// 앱에 들어올 때 "지난 주 다이제스트를 아직 안 만들었으면" 한 번 만든다. 서버 스케줄러가 없으므로
// (무료 원칙) 방문이 곧 트리거다 — 안 들어오면 안 만들어지지만, 복귀 훅이 목적이라 그걸로 충분하다.
//
// 2026-07-26 : 리텐션 - 주간다이제스트 - 조용한실패
// 실패해도 사용자에게 아무것도 띄우지 않는다. 사용자가 요청한 작업이 아니라 배경 작업이라,
// 에러 토스트를 띄우면 "내가 뭘 잘못했나" 싶은 노이즈만 된다. 주차 키는 성공했을 때만 저장하므로
// 실패하면 다음 방문에 자연히 재시도된다.
export function WeeklyDigestTrigger() {
  // StrictMode 이중 마운트·리렌더로 두 번 만들지 않게 잠근다(주차 키 저장은 비동기 뒤라 늦다).
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    const now = new Date();
    if (!shouldCreateDigest({ now, lastWeekKey: readLastDigestWeek() })) return;

    const range = previousWeekRange(now);
    let cancelled = false;

    (async () => {
      try {
        const digest = await generateWeeklyDigest(createClient(), range);
        if (cancelled) return;
        // 활동이 전혀 없던 주는 만들지 않는다. 주차 키는 남겨 매 방문마다 재조회하지 않는다.
        if (!digest) {
          writeLastDigestWeek(range.start);
          return;
        }
        await createPage(createClient(), {
          title: digest.title,
          icon: "🗒️",
          content: digestLinesToBlocks(digest.lines),
        });
        if (cancelled) return;
        writeLastDigestWeek(range.start);
        // 권한·방해금지·일일 상한은 notifyDuck이 판단한다.
        notifyDuck("주간 다이제스트", "지난 주 기록을 페이지로 정리해뒀어요.");
      } catch {
        // 조용히 실패 — 주차 키를 안 남겼으므로 다음 방문에 재시도된다.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
