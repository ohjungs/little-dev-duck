"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { eventToState, type DuckWorkState, type OfficeRole } from "@ldd/core";

// Phase 16: Canvas 2D 픽셀 오리 오피스. 캐릭터 바이블 색상(DECISIONS.md 4절)으로 오리를 절차적으로
// 그린다(외부 스프라이트 에셋 없이). 실이벤트 소스(Claude Code hooks/Tauri sidecar)는 데스크톱
// 인프라라 이월 — 지금은 데모 시뮬레이터가 @ldd/core OfficeEvent 계약대로 이벤트를 만든다.
const BODY = "#F6EFDD";
const SHADOW = "#E3D3B9";
const BEAK = "#A99C65";
const OUTLINE = "#352116";

const W = 480;
const H = 300;
const FRAME_MS = 90; // ~11fps (픽셀 아트는 60fps 불필요 = 리소스 예산)
const IDLE_MS = 12_000; // 이 시간 이벤트 없으면 퇴근 모드
const SIM_MS = 2200; // 데모 이벤트 주기

type Role = OfficeRole;

const ROLE_LABEL: Record<Role, string> = {
  plan: "기획 오리",
  do: "개발 오리",
  check: "리뷰 오리",
  boss: "대장오리",
};

const STATE_LABEL: Record<DuckWorkState, string> = {
  idle: "커피 한 잔",
  typing: "코드 작성 중",
  reading: "자료 읽는 중",
  server: "빌드·테스트 중",
  question: "에러 살펴보는 중",
  offwork: "퇴근·수면",
};

const SIM_TOOLS = ["Edit", "Write", "Read", "Grep", "Bash", "Task"] as const;

type Desk = { role: Role; x: number; y: number };
const DESKS: Desk[] = [
  { role: "plan", x: 120, y: 110 },
  { role: "do", x: 360, y: 110 },
  { role: "check", x: 120, y: 235 },
  { role: "boss", x: 360, y: 235 },
];

type Duck = {
  role: Role;
  state: DuckWorkState;
  label: string; // 현재 활동(도구/파일)
  lastTs: number;
};

function drawFloor(ctx: CanvasRenderingContext2D) {
  const tile = 30;
  for (let y = 0; y < H; y += tile) {
    for (let x = 0; x < W; x += tile) {
      ctx.fillStyle = ((x / tile + y / tile) & 1) === 0 ? "#efe9dc" : "#e7e0cf";
      ctx.fillRect(x, y, tile, tile);
    }
  }
}

function drawDesk(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = "#c9a36b";
  ctx.fillRect(x - 34, y + 14, 68, 12);
  ctx.fillStyle = OUTLINE;
  ctx.fillRect(x - 34, y + 24, 68, 3);
}

// 절차적 픽셀 오리. px = 픽셀 블록 크기. bob = 위아래 흔들림(애니메이션 프레임).
function drawDuck(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  state: DuckWorkState,
  frame: number,
  boss: boolean,
) {
  const px = 4;
  const bob = state === "typing" ? (frame % 2 === 0 ? 0 : px) : 0;
  const sleeping = state === "offwork";
  const oy = cy - (sleeping ? -px * 2 : 0) + bob;

  const rect = (gx: number, gy: number, gw: number, gh: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(cx + gx * px, oy + gy * px, gw * px, gh * px);
  };

  // 그림자
  ctx.fillStyle = "rgba(53,33,22,0.15)";
  ctx.fillRect(cx - 5 * px, cy + 5 * px, 10 * px, 2 * px);

  // 몸통(둥근 사각) + 음영
  rect(-4, -1, 8, 5, OUTLINE);
  rect(-3, 0, 6, 4, BODY);
  rect(-3, 3, 6, 1, SHADOW);
  // 머리
  rect(-3, -5, 6, 5, OUTLINE);
  rect(-2, -4, 4, 4, BODY);
  // 부리
  rect(2, -3, 3, 2, BEAK);
  // 발
  rect(-2, 4, 1, 1, BEAK);
  rect(1, 4, 1, 1, BEAK);

  // 눈 / 감은 눈(수면)
  if (sleeping) {
    rect(-1, -3, 2, 1, OUTLINE);
  } else {
    rect(0, -3, 1, 1, OUTLINE);
  }

  // 대장오리 표식(안경)
  if (boss) {
    rect(-2, -3, 4, 1, OUTLINE);
  }

  // 상태 오버레이(머리 위 아이콘)
  ctx.font = "bold 16px system-ui";
  ctx.textAlign = "center";
  const icon: Record<DuckWorkState, string> = {
    idle: "☕",
    typing: "⌨️",
    reading: "📖",
    server: "🖥️",
    question: "❓",
    offwork: "💤",
  };
  ctx.fillText(icon[state], cx, oy - 8 * px);
}

function drawBubble(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  text: string,
) {
  ctx.font = "11px system-ui";
  ctx.textAlign = "left";
  const padX = 8;
  const w = ctx.measureText(text).width + padX * 2;
  const h = 22;
  let bx = cx - w / 2;
  const by = cy - 78;
  bx = Math.max(4, Math.min(bx, W - w - 4));
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 1.5;
  const r = 6;
  ctx.beginPath();
  ctx.moveTo(bx + r, by);
  ctx.arcTo(bx + w, by, bx + w, by + h, r);
  ctx.arcTo(bx + w, by + h, bx, by + h, r);
  ctx.arcTo(bx, by + h, bx, by, r);
  ctx.arcTo(bx, by, bx + w, by, r);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = OUTLINE;
  ctx.fillText(text, bx + padX, by + 15);
}

export function PixelOffice() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ducksRef = useRef<Map<Role, Duck>>(
    new Map(
      DESKS.map((d) => [
        d.role,
        { role: d.role, state: "idle" as DuckWorkState, label: "대기 중", lastTs: 0 },
      ]),
    ),
  );
  const selectedRef = useRef<Role | null>(null);
  const [selected, setSelected] = useState<Role | null>(null);
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  // 데모 이벤트 주입: 실 Claude Code 이벤트 대신 OfficeEvent 계약대로 랜덤 생성.
  const applyEvent = useCallback(
    (role: Role, tool: string, status: "ok" | "error", target: string, now: number) => {
      const duck = ducksRef.current.get(role);
      if (!duck) return;
      duck.state = eventToState({ tool, status });
      duck.label = `${tool}${target ? ` · ${target}` : ""}`;
      duck.lastTs = now;
    },
    [],
  );

  useEffect(() => {
    let raf = 0;
    let lastDraw = 0;
    let frame = 0;
    let simAt = 0;
    let startPerf = 0;
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

    // 데모 시뮬레이터: 시간 기반(Date.now 대신 performance.now 경과로 결정).
    const SIM_FILES = ["Duck.tsx", "news.ts", "office.ts", "route.ts", "page.tsx"];
    let simSeed = 7;
    const rand = () => {
      simSeed = (simSeed * 1103515245 + 12345) & 0x7fffffff;
      return simSeed / 0x7fffffff;
    };

    const tick = (t: number) => {
      raf = requestAnimationFrame(tick);
      if (!startPerf) startPerf = t;
      const now = t;

      // 데모 이벤트 주기(일시정지 아닐 때).
      if (!pausedRef.current && now - simAt > SIM_MS) {
        simAt = now;
        const role = DESKS[Math.floor(rand() * DESKS.length)].role;
        const tool = SIM_TOOLS[Math.floor(rand() * SIM_TOOLS.length)];
        const status = rand() < 0.12 ? "error" : "ok";
        const target = SIM_FILES[Math.floor(rand() * SIM_FILES.length)];
        applyEvent(role, tool, status, target, now);
      }

      // 유휴 -> 퇴근 모드.
      for (const duck of ducksRef.current.values()) {
        if (duck.state !== "offwork" && now - duck.lastTs > IDLE_MS) {
          duck.state = "offwork";
          duck.label = "퇴근";
        }
      }

      if (now - lastDraw < FRAME_MS) return;
      lastDraw = now;
      if (!reduce) frame += 1;

      drawFloor(ctx);
      for (const desk of DESKS) {
        drawDesk(ctx, desk.x, desk.y);
        const duck = ducksRef.current.get(desk.role)!;
        drawDuck(ctx, desk.x, desk.y, duck.state, frame, desk.role === "boss");
        // 역할 이름표
        ctx.font = "10px system-ui";
        ctx.fillStyle = OUTLINE;
        ctx.textAlign = "center";
        ctx.fillText(ROLE_LABEL[desk.role], desk.x, desk.y + 40);
      }

      const sel = selectedRef.current;
      if (sel) {
        const desk = DESKS.find((d) => d.role === sel)!;
        const duck = ducksRef.current.get(sel)!;
        drawBubble(ctx, desk.x, desk.y, `${ROLE_LABEL[sel]}: ${duck.label}`);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [applyEvent]);

  const onClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const r = canvas.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * W;
    const y = ((e.clientY - r.top) / r.height) * H;
    // 가장 가까운 책상 히트테스트(오리 주변 44px).
    let hit: Role | null = null;
    for (const desk of DESKS) {
      if (Math.abs(x - desk.x) < 40 && Math.abs(y - desk.y) < 44) hit = desk.role;
    }
    selectedRef.current = hit;
    setSelected(hit);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <canvas
          ref={canvasRef}
          onClick={onClick}
          role="img"
          aria-label="픽셀 오리 오피스 — 기획·개발·리뷰·대장 오리가 작업 상태를 애니메이션으로 보여줍니다"
          className="block w-full cursor-pointer"
          style={{ aspectRatio: `${W} / ${H}`, imageRendering: "pixelated" }}
        />
      </div>
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {selected
            ? `${ROLE_LABEL[selected]} — ${STATE_LABEL[ducksRef.current.get(selected)!.state]}`
            : "오리를 클릭하면 지금 뭘 하는지 보여줘요. (데모: 실제 Claude Code 이벤트 연동은 데스크톱 앱에서)"}
        </p>
        <button
          type="button"
          onClick={() => setPaused((p) => !p)}
          className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
        >
          {paused ? "데모 재생" : "데모 일시정지"}
        </button>
      </div>
    </div>
  );
}
