"use client";

import { useEffect, useState } from "react";
import {
  daysSinceLastCommit,
  deriveDuckMood,
  type ContributionSummary,
  type DuckMood,
  type TodayTodoTally,
} from "@ldd/core";
import { onTodosChanged } from "@/lib/todoSignal";
import { todayIso } from "@/lib/today";

type ContributionsResponse =
  | { linked: true; summary: ContributionSummary }
  | { linked: false };

// 오리 기분을 클라이언트에서 파생한다(Phase 6 T1, DB 없음). 투두는 TodoWidget이 쏘는
// 신호로, 커밋 잔디는 기존 API로 얻어 deriveDuckMood에 넣는다.
export function useDuckMood(): DuckMood {
  const [todayTodos, setTodayTodos] = useState<TodayTodoTally>({
    total: 0,
    done: 0,
  });
  const [commitGap, setCommitGap] = useState<number | null>(null);

  // 투두 변경 신호 구독. 카운트만 받으므로 여기서 투두를 다시 네트워크 조회하지 않는다.
  useEffect(() => onTodosChanged(setTodayTodos), []);

  useEffect(() => {
    let cancelled = false;
    // 요청 순번. 포커스가 빠르게 오가면 load가 겹치는데, 나중에 시작된(최신) 요청의 결과만
    // 반영하도록 순번이 최신일 때만 setState 한다(느린 응답이 최신 값을 덮어쓰는 경쟁 방지).
    let latestRequest = 0;

    const load = async () => {
      const requestId = ++latestRequest;
      try {
        const res = await fetch("/api/github/contributions");
        if (!res.ok) return;
        const json = (await res.json()) as ContributionsResponse;
        if (cancelled || requestId !== latestRequest) return;
        setCommitGap(
          json.linked
            ? daysSinceLastCommit(json.summary.days, todayIso())
            : null,
        );
      } catch {
        // 기분은 부가 신호다. 조회 실패(미연동/일시 오류) 시 조용히 neutral을 유지한다.
      }
    };

    load();
    // 다른 앱에서 커밋하고 돌아왔을 수 있으니 창 포커스 복귀 시 커밋 상태를 다시 읽는다.
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  return deriveDuckMood({ todayTodos, daysSinceLastCommit: commitGap });
}
