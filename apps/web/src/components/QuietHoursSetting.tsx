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

type State = { enabled: boolean; start: number; end: number };

// Phase 12 T2 방해금지(DND) 설정. localStorage에 저장(quietHours.ts) — DuckWidget이 이를 읽어
// 조용 시간대엔 오리 혼잣말을 억제한다. 값 변경 시 즉시 저장 + 커스텀 이벤트로 위젯에 반영.
export function QuietHoursSetting() {
  const [s, setS] = useState<State>({
    enabled: false,
    start: DEFAULT_START,
    end: DEFAULT_END,
  });

  // localStorage는 클라이언트 전용이라 SSR 초기값(기본값) 이후 마운트 후 1회 실제 값으로 초기화한다.
  useEffect(() => {
    const q = readQuietHours();
    if (!q) return;
    setS({ enabled: true, start: q.start, end: q.end });
  }, []);

  const apply = (next: State) => {
    setS(next);
    writeQuietHours(
      next.enabled ? { start: next.start, end: next.end } : null,
    );
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
    </div>
  );
}
