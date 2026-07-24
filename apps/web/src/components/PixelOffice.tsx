"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  eventToState,
  describeActivity,
  isAdjacent,
  movePlayer,
  buildOfficeMap,
  createCamera,
  followTarget,
  worldToScreen,
  visibleTileRange,
  getTile,
  isBlocked as tileIsBlocked,
  getZoneAt,
  TileType,
  type Dir,
  type DuckWorkState,
  type OfficeRole,
  type Vec,
  type TileMap,
  type Camera,
} from "@ldd/core";
import { cn } from "@/lib/utils";

// Phase 16+17+AC-5+6: Camera-tracked tilemap rendering, 80x60 map at TILE=16.
// AC-5: Camera follows player, visible tile range culling, worldToScreen for all entities.
// AC-6: movePlayer uses tilemap isBlocked + worker collision combined.

const BODY = "#F6EFDD";
const SHADOW = "#E3D3B9";
const BEAK = "#A99C65";
const OUTLINE = "#352116";

const TILE = 16; // 16px per tile — map is 80x60 = 1280x960 world pixels
const FRAME_MS = 90; // ~11fps
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
const LOG_MAX = 30;

// Zone name HUD — shown for 2 seconds on zone entry
const ZONE_HUD_MS = 2000;

type LogEntry = {
  id: number;
  role: OfficeRole;
  tool: string;
  file: string;
  status: "ok" | "error";
  ts: number;
};

type Worker = {
  role: OfficeRole;
  tile: Vec;
  state: DuckWorkState;
  label: string;
  lastTs: number;
};

function agoLabel(ts: number): string {
  const s = Math.max(0, Math.round((performance.now() - ts) / 1000));
  if (s < 5) return "방금";
  if (s < 60) return `${s}초 전`;
  return `${Math.floor(s / 60)}분 전`;
}

// Find walkable tiles inside a zone by scanning the map
function walkableTilesInZone(
  map: TileMap,
  zoneId: string,
): Vec[] {
  const zone = map.zones.find((z) => z.id === zoneId);
  if (!zone) return [];
  const tiles: Vec[] = [];
  for (let dy = 1; dy < zone.bounds.h - 1; dy++) {
    for (let dx = 1; dx < zone.bounds.w - 1; dx++) {
      const x = zone.bounds.x + dx;
      const y = zone.bounds.y + dy;
      if (!tileIsBlocked(map, x, y)) {
        tiles.push({ x, y });
      }
    }
  }
  return tiles;
}

// Place workers on walkable desk-adjacent tiles across department zones
function buildWorkers(map: TileMap, count: number): Worker[] {
  const deptZones = ["engineering", "design", "qa", "marketing", "hr", "finance", "operations", "support", "sales"];
  const workers: Worker[] = [];
  let zoneIdx = 0;
  for (let i = 0; i < count; i++) {
    // Rotate through department zones
    const zId = deptZones[zoneIdx % deptZones.length];
    zoneIdx++;
    const walkable = walkableTilesInZone(map, zId);
    // Pick a stable slot based on i
    const tile = walkable[i % Math.max(1, walkable.length)] ?? { x: 40, y: 15 };
    workers.push({
      role: WORKER_ROLES[i % WORKER_ROLES.length],
      tile,
      state: "idle" as DuckWorkState,
      label: "대기 중",
      lastTs: 0,
    });
  }
  return workers;
}

// Find center of CEO office for player start
function ceoStartPos(map: TileMap): Vec {
  const ceo = map.zones.find((z) => z.id === "ceo-office");
  if (!ceo) return { x: 40, y: 17 };
  return {
    x: Math.floor(ceo.bounds.x + ceo.bounds.w / 2),
    y: Math.floor(ceo.bounds.y + ceo.bounds.h / 2),
  };
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

// --- Inline drawing helpers (placeholder until office-draw.ts is available) ---

function drawFloorTile(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  tileType: number,
  tileSize: number,
  col: number,
  row: number,
): void {
  const even = (col + row) % 2 === 0;
  if (tileType === TileType.Corridor) {
    ctx.fillStyle = even ? "#D4C9B0" : "#CCC0A8";
  } else if (tileType === TileType.Carpet) {
    ctx.fillStyle = even ? "#C8D4E8" : "#BEC9DF";
  } else {
    ctx.fillStyle = even ? "#EFE9DC" : "#E7E0CF";
  }
  ctx.fillRect(sx, sy, tileSize, tileSize);
}

function drawFurnitureTile(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  tileType: number,
  tileSize: number,
): void {
  const S = tileSize;
  switch (tileType) {
    case TileType.Wall:
      ctx.fillStyle = "#6B5B4E";
      ctx.fillRect(sx, sy, S, S);
      ctx.fillStyle = "#5A4A3E";
      ctx.fillRect(sx, sy, S, 2);
      break;
    case TileType.Desk:
      ctx.fillStyle = "#C9A36B";
      ctx.fillRect(sx + 1, sy + 3, S - 2, S - 5);
      ctx.fillStyle = OUTLINE;
      ctx.fillRect(sx + 1, sy + S - 3, S - 2, 1);
      break;
    case TileType.Chair:
      ctx.fillStyle = "#7B9EA8";
      ctx.fillRect(sx + 3, sy + 3, S - 6, S - 6);
      break;
    case TileType.Monitor:
      ctx.fillStyle = "#2A2A3A";
      ctx.fillRect(sx + 2, sy + 2, S - 4, S - 6);
      ctx.fillStyle = "#4AF";
      ctx.fillRect(sx + 3, sy + 3, S - 6, S - 9);
      break;
    case TileType.Server:
      ctx.fillStyle = "#3A4A3A";
      ctx.fillRect(sx + 1, sy + 1, S - 2, S - 2);
      ctx.fillStyle = "#4F4";
      ctx.fillRect(sx + 2, sy + 2, 2, 2);
      ctx.fillRect(sx + 2, sy + 6, 2, 2);
      break;
    case TileType.Door:
      ctx.fillStyle = "#C9B06B";
      ctx.fillRect(sx + 2, sy, S - 4, S);
      ctx.fillStyle = "#A89050";
      ctx.fillRect(sx + 3, sy + 4, 2, 2);
      break;
    case TileType.Plant:
      ctx.fillStyle = "#5A7A3A";
      ctx.fillRect(sx + 4, sy + 1, S - 8, S - 5);
      ctx.fillStyle = "#8B6B3A";
      ctx.fillRect(sx + 5, sy + S - 5, S - 10, 4);
      break;
    case TileType.Sofa:
      ctx.fillStyle = "#8B6B8B";
      ctx.fillRect(sx + 1, sy + 3, S - 2, S - 5);
      ctx.fillStyle = "#7A5A7A";
      ctx.fillRect(sx + 1, sy + 3, S - 2, 3);
      break;
    case TileType.Bookshelf:
      ctx.fillStyle = "#8B6B3A";
      ctx.fillRect(sx + 1, sy + 1, S - 2, S - 2);
      ctx.fillStyle = "#6B4B2A";
      for (let i = 0; i < 3; i++) {
        ctx.fillRect(sx + 2 + i * 3, sy + 2, 2, S - 4);
      }
      break;
    case TileType.Table:
      ctx.fillStyle = "#B89A6B";
      ctx.fillRect(sx + 1, sy + 2, S - 2, S - 5);
      ctx.fillStyle = "#A08050";
      ctx.fillRect(sx + 1, sy + 2, S - 2, 1);
      break;
    case TileType.Whiteboard:
      ctx.fillStyle = "#F0EEE8";
      ctx.fillRect(sx + 1, sy + 1, S - 2, S - 3);
      ctx.fillStyle = "#2A7AC8";
      ctx.fillRect(sx + 3, sy + 4, S - 7, 1);
      ctx.fillRect(sx + 3, sy + 7, S - 9, 1);
      break;
    case TileType.CoffeeMachine:
      ctx.fillStyle = "#3A2A1A";
      ctx.fillRect(sx + 2, sy + 1, S - 4, S - 3);
      ctx.fillStyle = "#C84A00";
      ctx.fillRect(sx + 4, sy + 3, 2, 2);
      break;
    case TileType.Reception:
      ctx.fillStyle = "#A0785A";
      ctx.fillRect(sx + 1, sy + 2, S - 2, S - 4);
      ctx.fillStyle = "#C8A07A";
      ctx.fillRect(sx + 2, sy + 3, S - 4, 2);
      break;
    case TileType.Toilet:
      ctx.fillStyle = "#E8E8F0";
      ctx.fillRect(sx + 2, sy + 2, S - 4, S - 4);
      ctx.fillStyle = "#C8C8D8";
      ctx.fillRect(sx + 3, sy + 3, S - 6, S - 6);
      break;
    case TileType.VendingMachine:
      ctx.fillStyle = "#2A5A8A";
      ctx.fillRect(sx + 2, sy + 1, S - 4, S - 2);
      ctx.fillStyle = "#F0C830";
      ctx.fillRect(sx + 4, sy + 3, 3, 2);
      ctx.fillRect(sx + 4, sy + 7, 3, 2);
      break;
    case TileType.WaterCooler:
      ctx.fillStyle = "#AAD0E8";
      ctx.fillRect(sx + 4, sy + 1, S - 8, S - 6);
      ctx.fillStyle = "#78A8C8";
      ctx.fillRect(sx + 5, sy + 2, S - 10, 3);
      break;
    case TileType.Fridge:
      ctx.fillStyle = "#D0D8E0";
      ctx.fillRect(sx + 2, sy + 1, S - 4, S - 2);
      ctx.fillStyle = "#A8B8C8";
      ctx.fillRect(sx + 3, sy + 2, S - 6, (S - 4) / 2);
      break;
    default:
      // Unknown furniture — draw a generic gray block
      ctx.fillStyle = "#8A8A8A";
      ctx.fillRect(sx + 2, sy + 2, S - 4, S - 4);
      break;
  }
}

// Tiles considered "furniture" (rendered on top of floor)
const SOLID_VISUAL = new Set<number>([
  TileType.Wall,
  TileType.Desk,
  TileType.Chair,
  TileType.Door,
  TileType.Plant,
  TileType.Bookshelf,
  TileType.Table,
  TileType.Monitor,
  TileType.Server,
  TileType.Reception,
  TileType.Printer,
  TileType.Sofa,
  TileType.VendingMachine,
  TileType.WaterCooler,
  TileType.Toilet,
  TileType.Fridge,
  TileType.Whiteboard,
  TileType.CoffeeMachine,
  TileType.Calendar,
  TileType.Clock,
  TileType.FireExtinguisher,
]);

function isFurniture(t: number): boolean {
  return SOLID_VISUAL.has(t);
}

function drawDuck(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  state: DuckWorkState,
  frame: number,
  boss: boolean,
): void {
  const px = 2; // scaled down from original px=3 to fit TILE=16
  const bob = state === "typing" && frame % 2 === 1 ? px : 0;
  const sleeping = state === "offwork";
  const oy = cy + bob;
  const rect = (gx: number, gy: number, gw: number, gh: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(cx + gx * px, oy + gy * px, gw * px, gh * px);
  };

  // Shadow
  ctx.fillStyle = "rgba(53,33,22,0.15)";
  ctx.fillRect(cx - 4 * px, cy + 4 * px, 8 * px, 2 * px);

  // Body
  rect(-4, -1, 8, 5, OUTLINE);
  rect(-3, 0, 6, 4, BODY);
  rect(-3, 3, 6, 1, SHADOW);
  // Head
  rect(-3, -5, 6, 5, OUTLINE);
  rect(-2, -4, 4, 4, BODY);
  rect(2, -3, 3, 2, BEAK);
  // Feet
  rect(-2, 4, 1, 1, BEAK);
  rect(1, 4, 1, 1, BEAK);
  // Eyes
  if (sleeping) rect(-1, -3, 2, 1, OUTLINE);
  else rect(0, -3, 1, 1, OUTLINE);
  // Boss glasses
  if (boss) rect(-2, -3, 4, 1, OUTLINE);

  // Icon above head
  ctx.font = "bold 10px system-ui";
  ctx.textAlign = "center";
  const icon: Record<DuckWorkState, string> = {
    idle: "☕",
    typing: "⌨️",
    reading: "📖",
    server: "🖥️",
    question: "❓",
    offwork: "💤",
  };
  ctx.fillText(boss ? "👑" : icon[state], cx, oy - 6 * px);
}

export function PixelOffice() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Map and camera — built once, stored in refs
  const mapRef = useRef<TileMap | null>(null);
  const camRef = useRef<Camera | null>(null);

  const [count, setCount] = useState(3);
  const workersRef = useRef<Worker[]>([]);
  const playerRef = useRef<Vec>({ x: 40, y: 17 });
  const nearbyRef = useRef<OfficeRole | null>(null);

  const [talking, setTalking] = useState<{ role: OfficeRole; text: string } | null>(null);
  const [paused, setPaused] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [zoneHud, setZoneHud] = useState<string | null>(null);

  const logIdRef = useRef(0);
  const pausedRef = useRef(false);
  const lastZoneRef = useRef<string | null>(null);
  const zoneHudTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  // Initialize map once
  useEffect(() => {
    const map = buildOfficeMap();
    mapRef.current = map;
    playerRef.current = ceoStartPos(map);
    workersRef.current = buildWorkers(map, count);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Rebuild workers when count changes (map already built)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    workersRef.current = buildWorkers(map, count);
  }, [count]);

  // Combined blocked check: tilemap solids + worker bodies
  const isBlockedFn = useCallback(
    (x: number, y: number): boolean => {
      const map = mapRef.current;
      if (!map) return true;
      return (
        tileIsBlocked(map, x, y) ||
        workersRef.current.some((w) => w.tile.x === x && w.tile.y === y)
      );
    },
    [],
  );

  const talkToNearby = useCallback(() => {
    const near = nearbyRef.current;
    if (!near) return;
    const worker = workersRef.current.find((w) => w.role === near);
    if (!worker) return;
    setTalking({ role: near, text: describeActivity(worker) });
  }, []);

  const onKeyDown = (e: React.KeyboardEvent<HTMLCanvasElement>) => {
    if (e.key === "e" || e.key === "E" || e.key === "Enter") {
      e.preventDefault();
      talkToNearby();
      return;
    }
    const dir = KEY_DIR[e.key];
    if (!dir) return;
    e.preventDefault();
    const map = mapRef.current;
    if (!map) return;
    playerRef.current = movePlayer(
      playerRef.current,
      dir,
      map.cols,
      map.rows,
      isBlockedFn,
    );
    setTalking(null);
  };

  // ResizeObserver — update canvas size and camera viewW/viewH
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const applySize = (w: number) => {
      const h = Math.round(w * (9 / 15));
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.scale(dpr, dpr);
        ctx.imageSmoothingEnabled = false;
      }
      // Create or update camera
      if (!camRef.current) {
        camRef.current = createCamera(w, h);
      } else {
        camRef.current = { ...camRef.current, viewW: w, viewH: h };
      }
    };

    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) applySize(entry.contentRect.width);
    });
    ro.observe(container);
    applySize(container.getBoundingClientRect().width || 480);

    return () => ro.disconnect();
  }, []);

  // Main game loop
  useEffect(() => {
    let raf = 0;
    let lastDraw = 0;
    let frame = 0;
    let simAt = 0;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const canvas = canvasRef.current;
    if (!canvas) return;

    let seed = 7;
    const rand = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };

    const tick = (t: number) => {
      raf = requestAnimationFrame(tick);
      const now = t;
      const workers = workersRef.current;
      const map = mapRef.current;
      if (!map) return;

      // Simulator
      if (!pausedRef.current && now - simAt > SIM_MS && workers.length > 0) {
        simAt = now;
        const w = workers[Math.floor(rand() * workers.length)];
        const tool = SIM_TOOLS[Math.floor(rand() * SIM_TOOLS.length)];
        const file = SIM_FILES[Math.floor(rand() * SIM_FILES.length)];
        const status: "ok" | "error" = rand() < 0.12 ? "error" : "ok";
        w.state = eventToState({ tool, status });
        w.label = `${tool} · ${file}`;
        w.lastTs = now;
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
      nearbyRef.current = workers.find((w) => isAdjacent(player, w.tile))?.role ?? null;

      // Zone detection for HUD
      const zone = getZoneAt(map, player.x, player.y);
      const zoneId = zone?.id ?? null;
      if (zoneId !== lastZoneRef.current) {
        lastZoneRef.current = zoneId;
        if (zone) {
          setZoneHud(zone.label);
          if (zoneHudTimerRef.current) clearTimeout(zoneHudTimerRef.current);
          zoneHudTimerRef.current = setTimeout(() => setZoneHud(null), ZONE_HUD_MS);
        }
      }

      // Frame rate gate
      if (now - lastDraw < FRAME_MS) return;
      lastDraw = now;
      if (!reduce) frame += 1;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Update camera to follow player
      const viewW = camRef.current?.viewW ?? canvas.width;
      const viewH = camRef.current?.viewH ?? canvas.height;
      if (!camRef.current) {
        camRef.current = createCamera(viewW, viewH);
      }
      camRef.current = followTarget(
        camRef.current,
        player.x * TILE + TILE / 2,
        player.y * TILE + TILE / 2,
        map.cols * TILE,
        map.rows * TILE,
        0.1,
      );
      const cam = camRef.current;

      // Clear canvas
      ctx.clearRect(0, 0, viewW, viewH);

      // Get visible tile range
      const { minCol, maxCol, minRow, maxRow } = visibleTileRange(cam, TILE);
      const clampedMinCol = Math.max(0, minCol);
      const clampedMaxCol = Math.min(map.cols, maxCol);
      const clampedMinRow = Math.max(0, minRow);
      const clampedMaxRow = Math.min(map.rows, maxRow);

      // Pass 1: Render floor tiles
      for (let row = clampedMinRow; row < clampedMaxRow; row++) {
        for (let col = clampedMinCol; col < clampedMaxCol; col++) {
          const tileType = getTile(map, col, row);
          if (tileType === TileType.Wall) continue; // walls drawn in pass 2
          const { x: sx, y: sy } = worldToScreen(cam, col * TILE, row * TILE);
          drawFloorTile(ctx, sx, sy, tileType, TILE, col, row);
        }
      }

      // Pass 2: Render furniture and walls on top of floor
      for (let row = clampedMinRow; row < clampedMaxRow; row++) {
        for (let col = clampedMinCol; col < clampedMaxCol; col++) {
          const tileType = getTile(map, col, row);
          if (!isFurniture(tileType)) continue;
          const { x: sx, y: sy } = worldToScreen(cam, col * TILE, row * TILE);
          drawFurnitureTile(ctx, sx, sy, tileType, TILE);
        }
      }

      // Render workers
      for (const w of workers) {
        const wx = w.tile.x * TILE + TILE / 2;
        const wy = w.tile.y * TILE + TILE / 2;
        // Only render if within visible range
        if (
          w.tile.x < clampedMinCol || w.tile.x >= clampedMaxCol ||
          w.tile.y < clampedMinRow || w.tile.y >= clampedMaxRow
        ) continue;
        const { x: sx, y: sy } = worldToScreen(cam, wx, wy);
        drawDuck(ctx, sx, sy, w.state, frame, false);
        ctx.font = "8px system-ui";
        ctx.fillStyle = OUTLINE;
        ctx.textAlign = "center";
        ctx.fillText(ROLE_LABEL[w.role], sx, sy + 22);
      }

      // Render player (boss duck)
      const pwx = player.x * TILE + TILE / 2;
      const pwy = player.y * TILE + TILE / 2;
      const { x: psx, y: psy } = worldToScreen(cam, pwx, pwy);
      drawDuck(ctx, psx, psy, "idle", frame, true);

      // Proximity prompt
      const near = nearbyRef.current;
      if (near) {
        ctx.font = "9px system-ui";
        ctx.fillStyle = OUTLINE;
        ctx.textAlign = "center";
        ctx.fillText("E: 말 걸기", psx, psy - 28);
      }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isBlockedFn]);

  // Canvas aspect ratio: 15:9 to match the 80x60 tile map proportion
  const aspectRatio = "15 / 9";

  return (
    <div className="flex flex-col gap-3">
      <div
        ref={containerRef}
        className="relative overflow-hidden rounded-2xl border border-border bg-card"
        style={{ aspectRatio }}
      >
        <canvas
          ref={canvasRef}
          tabIndex={0}
          onKeyDown={onKeyDown}
          onDoubleClick={() => setShowLog((s) => !s)}
          role="img"
          aria-label="픽셀 오리 오피스 — 방향키/WASD로 대장오리를 움직이고, 직원 오리 옆에서 E로 말을 겁니다. 더블클릭하면 활동 로그가 열립니다"
          className="block h-full w-full cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
          style={{ imageRendering: "pixelated" }}
        />
        {/* Zone name HUD overlay */}
        {zoneHud && (
          <div
            className="pointer-events-none absolute left-1/2 top-4 -translate-x-1/2 rounded-lg bg-black/60 px-3 py-1 text-sm font-semibold text-white"
            aria-live="polite"
          >
            {zoneHud}
          </div>
        )}
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
