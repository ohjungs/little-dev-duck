"use client";

import { useEffect, useState, type CSSProperties } from "react";
import type { ContributionDay, ContributionSummary } from "@ldd/core";
import { GitHubMark } from "@/components/ui/github-mark";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { WidgetSkeleton } from "@/components/Skeleton";

type LoadState = "loading" | "error" | "ready";

type ContributionsResponse =
  | { linked: true; summary: ContributionSummary }
  | { linked: false };

// 잔디 색은 GitHub식 진짜 초록 스케일(--gh-0..4, globals.css). 강도가 오를수록 진한 초록이 된다.
// 레벨 0(기여 없음)은 중립 회색이라 빈 칸도 카드 배경과 구분된다.
const LEVEL_VAR = ["--gh-0", "--gh-1", "--gh-2", "--gh-3", "--gh-4"] as const;

function levelForCount(count: number): 0 | 1 | 2 | 3 | 4 {
  if (count === 0) return 0;
  if (count <= 2) return 1;
  if (count <= 5) return 2;
  if (count <= 9) return 3;
  return 4;
}

function cellStyle(count: number): CSSProperties {
  return { background: `var(${LEVEL_VAR[levelForCount(count)]})` };
}

function chunkIntoWeeks(days: ContributionDay[]): ContributionDay[][] {
  const weeks: ContributionDay[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }
  return weeks;
}

export function GithubContributionWidget() {
  const [state, setState] = useState<LoadState>("loading");
  const [data, setData] = useState<ContributionsResponse | null>(null);

  const fetchContributions = async () => {
    try {
      const res = await fetch("/api/github/contributions");
      if (!res.ok) throw new Error("요청 실패");
      const json = (await res.json()) as ContributionsResponse;
      setData(json);
      setState("ready");
    } catch {
      setState("error");
    }
  };

  useEffect(() => {
    // 마운트 시 1회 조회. 재시도는 이벤트 핸들러(reload)가 담당.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- SSR/hydration 안전: 마운트 후 1회 동기화
    fetchContributions();
  }, []);

  const reload = () => {
    setState("loading");
    fetchContributions();
  };

  return (
    <Card data-testid="github-contribution-widget" className="h-full">
      <CardHeader>
        <CardTitle>
          <GitHubMark className="size-4 text-primary-accent" />
          GitHub 잔디
        </CardTitle>
        {state === "ready" && data && data.linked && (
          <>
            <Badge variant="muted">최근 1년 {data.summary.totalCount}개</Badge>
            {(() => {
              const contributions = data.summary.days;
              let streak = 0;
              for (let i = contributions.length - 1; i >= 0; i--) {
                if (contributions[i].count > 0) {
                  streak++;
                } else if (i < contributions.length - 1) {
                  break; // today can be 0
                }
              }
              return streak > 0 ? (
                <Badge variant="muted">연속 {streak}일</Badge>
              ) : null;
            })()}
          </>
        )}
      </CardHeader>

      <CardContent>
        {state === "loading" && <WidgetSkeleton />}

        {state === "error" && (
          <div className="flex flex-col items-start gap-2">
            <p className="text-sm text-muted-foreground">
              잔디를 불러오지 못했습니다.
            </p>
            <Button type="button" variant="outline" size="sm" onClick={reload}>
              다시 시도
            </Button>
          </div>
        )}

        {state === "ready" && data && !data.linked && (
          <p className="text-sm text-muted-foreground">
            GitHub 계정으로 로그인하면 잔디를 볼 수 있어요.
          </p>
        )}

        {state === "ready" && data && data.linked && (
          <div className="flex gap-[3px] overflow-x-auto pb-1">
            {chunkIntoWeeks(data.summary.days).map((week, weekIndex) => (
              <div key={weekIndex} className="flex flex-col gap-[3px]">
                {week.map((day) => (
                  <div
                    key={day.date}
                    title={`${day.date}: ${day.count}개 기여`}
                    style={cellStyle(day.count)}
                    className="size-2.5 rounded-[3px]"
                  />
                ))}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
