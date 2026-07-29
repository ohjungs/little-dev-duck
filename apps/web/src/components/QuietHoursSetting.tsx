"use client";

import { useEffect, useState } from "react";
import { readQuietHours, writeQuietHours } from "@/lib/quietHours";
import { cn } from "@/lib/utils";

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const DEFAULT_START = 22;
const DEFAULT_END = 7;
const fmt = (h: number) => `${String(h).padStart(2, "0")}:00`;

const SELECT_CLASS =
  "rounded-md border border-border bg-transparent px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-primary/40 disabled:cursor-not-allowed";

// 2026-07-29 (Phase 56 T1 M-011): 요일 선택. days는 "켜진 요일" — 전부 켜짐이면
// 저장 시 undefined(매일)로 정규화해 옛 셰이프를 유지한다(백업 파일도 단순해진다).
const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"] as const;
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

type State = { enabled: boolean; start: number; end: number; days: number[] };

// Phase 12 T2 방해금지(DND) 설정. localStorage에 저장(quietHours.ts) — DuckWidget이 이를 읽어
// 조용 시간대엔 오리 혼잣말을 억제한다. 값 변경 시 즉시 저장 + 커스텀 이벤트로 위젯에 반영.
export function QuietHoursSetting() {
  const [s, setS] = useState<State>({
    enabled: false,
    start: DEFAULT_START,
    end: DEFAULT_END,
    days: ALL_DAYS,
  });

  // localStorage는 클라이언트 전용이라 SSR 초기값(기본값) 이후 마운트 후 1회 실제 값으로 초기화한다.
  useEffect(() => {
    const q = readQuietHours();
    if (!q) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- SSR/hydration 안전: 마운트 후 1회 동기화
    setS({ enabled: true, start: q.start, end: q.end, days: q.days ?? ALL_DAYS });
  }, []);

  const apply = (next: State) => {
    setS(next);
    // 전부 켜짐 = 매일 → days를 저장하지 않는다(옛 셰이프 유지·하위호환).
    const days = next.days.length === ALL_DAYS.length ? undefined : [...next.days].sort();
    writeQuietHours(
      next.enabled
        ? days === undefined
          ? { start: next.start, end: next.end }
          : { start: next.start, end: next.end, days }
        : null,
    );
  };

  const toggleDay = (d: number) => {
    const days = s.days.includes(d) ? s.days.filter((x) => x !== d) : [...s.days, d];
    apply({ ...s, days });
  };

  return (
    <div className="flex flex-col gap-3">
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={s.enabled}
          onChange={(e) => apply({ ...s, enabled: e.target.checked })}
          className="size-4 accent-primary"
        />
        이 시간대엔 오리가 조용히 있어요(혼잣말 안 함)
      </label>
      <div
        className={cn(
          "flex flex-wrap items-center gap-2 text-sm text-muted-foreground",
          !s.enabled && "opacity-50",
        )}
      >
        <select
          value={s.start}
          disabled={!s.enabled}
          aria-label="방해금지 시작 시각"
          onChange={(e) => apply({ ...s, start: Number(e.target.value) })}
          className={SELECT_CLASS}
        >
          {HOURS.map((h) => (
            <option key={h} value={h}>
              {fmt(h)}
            </option>
          ))}
        </select>
        <span>부터</span>
        <select
          value={s.end}
          disabled={!s.enabled}
          aria-label="방해금지 종료 시각"
          onChange={(e) => apply({ ...s, end: Number(e.target.value) })}
          className={SELECT_CLASS}
        >
          {HOURS.map((h) => (
            <option key={h} value={h}>
              {fmt(h)}
            </option>
          ))}
        </select>
        <span>까지</span>
      </div>

      {/* 요일 선택(M-011) — 기본은 매일. 자정을 넘는 구간은 "지금 요일" 기준이다(core 주석 참조). */}
      <div
        className={cn(
          "flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground",
          !s.enabled && "opacity-50",
        )}
      >
        <span>요일</span>
        {ALL_DAYS.map((d) => (
          <label key={d} className="flex cursor-pointer items-center gap-0.5 text-xs">
            <input
              type="checkbox"
              checked={s.days.includes(d)}
              disabled={!s.enabled}
              onChange={() => toggleDay(d)}
              aria-label={`${WEEKDAY_LABELS[d]}요일 방해금지`}
              className="size-3.5 accent-primary"
            />
            {WEEKDAY_LABELS[d]}
          </label>
        ))}
      </div>
      {s.enabled && s.days.length === 0 && (
        // 요일이 하나도 없으면 방해금지가 실질적으로 꺼진 것 — 말하지 않으면 고장으로 안다.
        <p className="text-xs text-amber-600 dark:text-amber-500 break-keep">
          켜진 요일이 없어 방해금지가 적용되지 않아요. 요일을 골라 주세요.
        </p>
      )}
    </div>
  );
}
