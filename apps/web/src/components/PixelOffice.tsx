"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  eventToState,
  deskSlots,
  describeActivity,
  isAdjacent,
  movePlayer,
  type Dir,
  type DuckWorkState,
  type OfficeRole,
  type Vec,
} from "@ldd/core";
import { cn } from "@/lib/utils";

// Phase 16+17: Canvas 2D 픽셀 오리 오피스. 캐릭터 바이블 색상(DECISIONS.md 4절)으로 절차적 드로잉.
// P16: 이벤트→상태 애니메이션, 유휴 퇴근, 클릭 말풍선. P17: 대장오리 키보드 조작(그리드 이동·충돌),
// 근접 상호작용("지금 뭐 하는 중?"), 에이전트 수 동적 배치. 이동/인접/배치 로직은 @ldd/core 순수함수.
const BODY = "#F6EFDD";
const SHADOW = "#E3D3B9";
const BEAK = "#A99C65";
const OUTLINE = "#352116";

const TILE = 32;
const COLS = 15;
const ROWS = 9;
const W = COLS * TILE; // 480
const H = ROWS * TILE; // 288
const FRAME_MS = 90; // ~11fps (리소스 예산)
const IDLE_MS = 12_000;
const SIM_MS = 2200;

const ROLE_LABEL: Record<OfficeRole, string> = {
  plan: "기획 오리",
  do: "개발 오리",
  check: "리뷰 오리",
  boss: "대장오리",
};
const WORKER_ROLES: OfficeRole[] = ["plan", "do", "check"];
const SIM_TOOLS = ["Edit", "Write", "Read", "Grep", "Bash", "Task"] as const;
const SIM_FILES = ["Duck.tsx", "news.ts", "office.ts", "route.ts", "page.tsx"];
const LOG_MAX = 30; // 활동 로그 링버퍼 상한(더블클릭 패널).

type LogEntry = {
  id: number;
  role: OfficeRole;
  tool: string;
  file: string;
  status: "ok" | "error";
  ts: number; // performance.now() 기준
};

type Worker = {
  role: OfficeRole;
  tile: Vec;
  state: DuckWorkState;
  label: string;
  lastTs: number;
};

const tileCenter = (t: number) => t * TILE + TILE / 2;

// 활동 로그 상대시간(performance.now 기준). 새 이벤트마다 리렌더돼 갱신된다.
function agoLabel(ts: number): string {
  const s = Math.max(0, Math.round((performance.now() - ts) / 1000));
  if (s < 5) return "방금";
  if (s < 60) return `${s}초 전`;
  return `${Math.floor(s / 60)}분 전`;
}

function buildWorkers(count: number): Worker[] {
  return deskSlots(count, COLS, ROWS).map((tile, i) => ({
    role: WORKER_ROLES[i % WORKER_ROLES.length],
    tile,
    state: "idle" as DuckWorkState,
    label: "대기 중",
    lastTs: 0,
  }));
}

const KEY_DIR: Record<string, Dir> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  w: "up",
  s: "down",
  a: "left",
  d: "right",
  W: "up",
  S: "down",
  A: "left",
  D: "right",
};

function drawFloor(ctx: CanvasRenderingContext2D) {
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      ctx.fillStyle = (x + y) % 2 === 0 ? "#efe9dc" : "#e7e0cf";
      ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
    }
  }
}

function drawDesk(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
  ctx.fillStyle = "#c9a36b";
  ctx.fillRect(cx - 15, cy + 12, 30, 8);
  ctx.fillStyle = OUTLINE;
  ctx.fillRect(cx - 15, cy + 19, 30, 2);
}

function drawDuck(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  state: DuckWorkState,
  frame: number,
  boss: boolean,
) {
  const px = 3;
  const bob = state === "typing" && frame % 2 === 1 ? px : 0;
  const sleeping = state === "offwork";
  const oy = cy + bob;
  const rect = (gx: number, gy: number, gw: number, gh: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(cx + gx * px, oy + gy * px, gw * px, gh * px);
  };

  ctx.fillStyle = "rgba(53,33,22,0.15)";
  ctx.fillRect(cx - 5 * px, cy + 5 * px, 10 * px, 2 * px);

  rect(-4, -1, 8, 5, OUTLINE);
  rect(-3, 0, 6, 4, BODY);
  rect(-3, 3, 6, 1, SHADOW);
  rect(-3, -5, 6, 5, OUTLINE);
  rect(-2, -4, 4, 4, BODY);
  rect(2, -3, 3, 2, BEAK);
  rect(-2, 4, 1, 1, BEAK);
  rect(1, 4, 1, 1, BEAK);
  if (sleeping) rect(-1, -3, 2, 1, OUTLINE);
  else rect(0, -3, 1, 1, OUTLINE);
  if (boss) rect(-2, -3, 4, 1, OUTLINE); // 안경

  ctx.font = "bold 14px system-ui";
  ctx.textAlign = "center";
  const icon: Record<DuckWorkState, string> = {
    idle: "☕",
    typing: "⌨️",
    reading: "📖",
    server: "🖥️",
    question: "❓",
    offwork: "💤",
  };
  ctx.fillText(boss ? "👑" : icon[state], cx, oy - 7 * px);
}

export function PixelOffice() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [count, setCount] = useState(3);
  const workersRef = useRef<Worker[]>(buildWorkers(3));
  const playerRef = useRef<Vec>({ x: Math.floor(COLS / 2), y: ROWS - 2 });
  const nearbyRef = useRef<OfficeRole | null>(null);
  const [talking, setTalking] = useState<{ role: OfficeRole; text: string } | null>(
    null,
  );
  const [paused, setPaused] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const [log, setLog] = useState<LogEntry[]>([]);
  const logIdRef = useRef(0);
  const pausedRef = useRef(false);
  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  // 에이전트 수 변경 시 책상 재배치(플레이어 위치·카메라 유실 없음 — 워커 배열만 교체).
  useEffect(() => {
    workersRef.current = buildWorkers(count);
  }, [count]);

  const isBlocked = useCallback(
    (x: number, y: number) =>
      workersRef.current.some((w) => w.tile.x === x && w.tile.y === y),
    [],
  );

  const talkToNearby = useCallback(() => {
    const near = nearbyRef.current;
    if (!near) return;
    const worker = workersRef.current.find((w) => w.role === near);
    if (!worker) return;
    setTalking({ role: near, text: describeActivity(worker) });
  }, []);

  // 키 입력은 캔버스가 포커스일 때만(포커스 게이트) — 전역 단축키·페이지 스크롤과 충돌 방지.
  const onKeyDown = (e: React.KeyboardEvent<HTMLCanvasElement>) => {
    if (e.key === "e" || e.key === "E" || e.key === "Enter") {
      e.preventDefault();
      talkToNearby();
      return;
    }
    const dir = KEY_DIR[e.key];
    if (!dir) return;
    e.preventDefault();
    playerRef.current = movePlayer(playerRef.current, dir, COLS, ROWS, isBlocked);
    setTalking(null); // 이동하면 대화창 닫기
  };

  useEffect(() => {
    let raf = 0;
    let lastDraw = 0;
    let frame = 0;
    let simAt = 0;
    const reduce = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.scale(dpr, dpr);
    ctx.imageSmoothingEnabled = false;

    let seed = 7;
    const rand = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };

    const tick = (t: number) => {
      raf = requestAnimationFrame(tick);
      const now = t;
      const workers = workersRef.current;

      if (!pausedRef.current && now - simAt > SIM_MS && workers.length > 0) {
        simAt = now;
        const w = workers[Math.floor(rand() * workers.length)];
        const tool = SIM_TOOLS[Math.floor(rand() * SIM_TOOLS.length)];
        const file = SIM_FILES[Math.floor(rand() * SIM_FILES.length)];
        const status: "ok" | "error" = rand() < 0.12 ? "error" : "ok";
        w.state = eventToState({ tool, status });
        w.label = `${tool} · ${file}`;
        w.lastTs = now;
        // 활동 로그 누적(최신이 앞, 상한 유지). 더블클릭 패널에서 본다.
        const entry: LogEntry = {
          id: (logIdRef.current += 1),
          role: w.role,
          tool,
          file,
          status,
          ts: now,
        };
        setLog((prev) => [entry, ...prev].slice(0, LOG_MAX));
      }
      for (const w of workers) {
        if (w.state !== "offwork" && w.lastTs > 0 && now - w.lastTs > IDLE_MS) {
          w.state = "offwork";
          w.label = "퇴근";
        }
      }

      const player = playerRef.current;
      nearbyRef.current =
        workers.find((w) => isAdjacent(player, w.tile))?.role ?? null;

      if (now - lastDraw < FRAME_MS) return;
      lastDraw = now;
      if (!reduce) frame += 1;

      drawFloor(ctx);
      for (const w of workers) {
        const cx = tileCenter(w.tile.x);
        const cy = tileCenter(w.tile.y);
        drawDesk(ctx, cx, cy);
        drawDuck(ctx, cx, cy, w.state, frame, false);
        ctx.font = "9px system-ui";
        ctx.fillStyle = OUTLINE;
        ctx.textAlign = "center";
        ctx.fillText(ROLE_LABEL[w.role], cx, cy + 30);
      }
      // 플레이어(대장오리)
      const px = tileCenter(player.x);
      const py = tileCenter(player.y);
      drawDuck(ctx, px, py, "idle", frame, true);

      // 근접 프롬프트
      const near = nearbyRef.current;
      if (near) {
        ctx.font = "10px system-ui";
        ctx.fillStyle = OUTLINE;
        ctx.textAlign = "center";
        ctx.fillText("E: 말 걸기", px, py - 34);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isBlocked]);

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <canvas
          ref={canvasRef}
          tabIndex={0}
          onKeyDown={onKeyDown}
          onDoubleClick={() => setShowLog((s) => !s)}
          role="img"
          aria-label="픽셀 오리 오피스 — 방향키/WASD로 대장오리를 움직이고, 직원 오리 옆에서 E로 말을 겁니다. 더블클릭하면 활동 로그가 열립니다"
          className="block w-full cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
          style={{ aspectRatio: `${W} / ${H}`, imageRendering: "pixelated" }}
        />
      </div>

      {talking && (
        <div className="rounded-xl border border-border bg-card p-3 text-sm">
          <span className="font-semibold">{ROLE_LABEL[talking.role]}</span>
          <span className="text-muted-foreground"> — {talking.text}</span>
        </div>
      )}

      {showLog && (
        <div className="rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <span className="text-xs font-semibold">활동 로그</span>
            <button
              type="button"
              onClick={() => setShowLog(false)}
              className="text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              닫기
            </button>
          </div>
          {log.length === 0 ? (
            <p className="px-3 py-4 text-xs text-muted-foreground">
              아직 기록된 활동이 없어요. 데모가 재생되면 쌓여요.
            </p>
          ) : (
            <ul className="max-h-52 overflow-y-auto">
              {log.map((e) => (
                <li
                  key={e.id}
                  className="flex items-center gap-2 border-b border-border/40 px-3 py-1.5 text-xs last:border-0"
                >
                  <span
                    className={cn(
                      "size-1.5 shrink-0 rounded-full",
                      e.status === "error" ? "bg-destructive" : "bg-primary/60",
                    )}
                  />
                  <span className="font-medium">{ROLE_LABEL[e.role]}</span>
                  <span className="min-w-0 truncate text-muted-foreground">
                    {e.tool} · {e.file}
                  </span>
                  {e.status === "error" && (
                    <span className="text-destructive">오류</span>
                  )}
                  <span className="ml-auto shrink-0 tabular-nums text-muted-foreground/60">
                    {agoLabel(e.ts)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          캔버스를 클릭해 포커스한 뒤 방향키/WASD로 대장오리를 움직여요. 직원 오리 옆에서 E를 누르면
          지금 뭐 하는지 물어보고, 캔버스를 더블클릭하면 활동 로그가 열려요. (데모 구동 — 실 Claude
          Code 이벤트 연동은 데스크톱 앱)
        </p>
        <div className="flex items-center gap-1 text-xs">
          <span className="text-muted-foreground">직원 오리</span>
          <button
            type="button"
            onClick={() => setCount((c) => Math.max(1, c - 1))}
            aria-label="직원 오리 줄이기"
            className="rounded-md border border-border px-2 py-1 hover:bg-muted"
          >
            −
          </button>
          <span className="w-5 text-center tabular-nums">{count}</span>
          <button
            type="button"
            onClick={() => setCount((c) => Math.min(6, c + 1))}
            aria-label="직원 오리 늘리기"
            className="rounded-md border border-border px-2 py-1 hover:bg-muted"
          >
            +
          </button>
          <button
            type="button"
            onClick={() => setPaused((p) => !p)}
            className="ml-2 rounded-md border border-border px-2 py-1 text-muted-foreground hover:text-foreground"
          >
            {paused ? "데모 재생" : "데모 정지"}
          </button>
        </div>
      </div>
    </div>
  );
}
