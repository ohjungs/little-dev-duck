"use client";

import { useEffect, useState } from "react";
import type { ContributionDay, ContributionSummary } from "@ldd/core";
import { Button, Card } from "@ldd/ui";

type LoadState = "loading" | "error" | "ready";

type ContributionsResponse =
  | { linked: true; summary: ContributionSummary }
  | { linked: false };

const LEVEL_MIX_PERCENT = [0, 25, 50, 75, 100] as const;

function levelForCount(count: number): 0 | 1 | 2 | 3 | 4 {
  if (count === 0) return 0;
  if (count <= 2) return 1;
  if (count <= 5) return 2;
  if (count <= 9) return 3;
  return 4;
}

function cellStyle(count: number) {
  const percent = LEVEL_MIX_PERCENT[levelForCount(count)];
  return {
    width: "10px",
    height: "10px",
    borderRadius: "2px",
    background: `color-mix(in srgb, var(--ldd-color-accent) ${percent}%, var(--ldd-color-surface))`,
  };
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchContributions();
  }, []);

  const reload = () => {
    setState("loading");
    fetchContributions();
  };

  return (
    <Card
      data-testid="github-contribution-widget"
      style={{ width: "100%", maxWidth: "900px" }}
    >
      <h2 style={{ fontSize: "1.1rem", marginBottom: "0.75rem" }}>GitHub 잔디</h2>

      {state === "loading" && <p>불러오는 중...</p>}

      {state === "error" && (
        <div>
          <p>잔디를 불러오지 못했습니다.</p>
          <Button type="button" onClick={reload}>
            다시 시도
          </Button>
        </div>
      )}

      {state === "ready" && data && !data.linked && (
        <p>GitHub 계정으로 로그인하면 잔디를 볼 수 있어요.</p>
      )}

      {state === "ready" && data && data.linked && (
        <div>
          <p style={{ marginBottom: "0.5rem", fontSize: "0.85rem" }}>
            최근 1년간 {data.summary.totalCount}개의 기여
          </p>
          <div style={{ display: "flex", gap: "3px", overflowX: "auto" }}>
            {chunkIntoWeeks(data.summary.days).map((week, weekIndex) => (
              <div
                key={weekIndex}
                style={{ display: "flex", flexDirection: "column", gap: "3px" }}
              >
                {week.map((day) => (
                  <div
                    key={day.date}
                    title={`${day.date}: ${day.count}개 기여`}
                    style={cellStyle(day.count)}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
