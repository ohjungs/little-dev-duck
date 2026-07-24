"use client";

// 2026-07-24 : 스프라이트 기반 렌더링 + 35 NPC 통합
// TILE = 32 (오리 스프라이트 프레임 크기와 일치)
// NPC는 DEPT_REGISTRY에서 자동 생성 (총 35명)

import { useCallback, useEffect, useRef, useState } from "react";
import {
  isAdjacent,
  movePlayer,
  buildOfficeMap,
  createCamera,
  followTarget,
  worldToScreen,
  screenToWorld,
  visibleTileRange,
  getTile,
  isBlocked as tileIsBlocked,
  getZoneAt,
  TileType,
  DEPT_REGISTRY,
  DUCK_NAMES,
  createGameClock,
  tickClock,
  formatClockTime,
  schedulePhase,
  phaseToWorkState,
  simulateNpcTasks,
  getTaskTemplates,
  timeOfDay,
  timeOverlay,
  timeOfDayLabel,
  timeOfDayIcon,
  createCompany,
  tickCompany,
  formatMoney,
  findPath,
  pickWanderTarget,
  wanderZone,
  type CompanyStats,
  type DuckWorkState,
  type TileMap,
  type Camera,
  type Vec,
  type Npc,
  type GameClock,
  type DepartmentId,
  type NpcTask,
} from "@ldd/core";
import { InputManager } from "@/lib/office-input";
import { OfficeSoundManager } from "@/lib/office-sound";
import { VirtualDpad } from "@/components/VirtualDpad";
import { OfficeTalkPanel } from "@/components/OfficeTalkPanel";
import { OfficeDashboard } from "@/components/OfficeDashboard";
import { OfficeManagementPanel } from "@/components/OfficeManagementPanel";
import { drawDuckSprite, drawHumanSprite, drawFurnitureSprite, drawFloorTile, drawFurniture, drawFromTileset, drawMinimap, TILESET_MAP } from "@/lib/office-draw";
import { loadAllSprites, type SpriteAssets } from "@/lib/sprite-loader";

// ---------------------------------------------------------------------------
// 상수
// ---------------------------------------------------------------------------
const TILE = 32;          // 오리 스프라이트 프레임 32x32와 맞춤
const FRAME_MS = 60;      // ~16fps (깜빡임 방지)
const ZONE_HUD_MS = 2000;
const CLOCK_START_HOUR = 8;
const MINIMAP_SCALE = 2;  // 타일당 2px
const MINIMAP_MARGIN = 6; // 우상단 여백

// 오리 스프라이트 행 확장: 2열 = idle(frame 0-1), 나머지는 walk(frame 0-3)
const DUCK_SCALE = 1.5; // 32px 타일에서 오리를 약간 크게

// ---------------------------------------------------------------------------
// TileType -> 가구 스프라이트 이름 매핑
// ---------------------------------------------------------------------------
const TILE_TO_SPRITE: Partial<Record<number, string>> = {
  [TileType.Desk]:         "Desk",
  [TileType.Chair]:        "Chair",
  [TileType.Monitor]:      "Desk-2",      // 모니터 → Desk-2(모니터 달린 책상)로 표시
  [TileType.Bookshelf]:    "Bookshelf",
  [TileType.CoffeeMachine]:"Coffee-Machine",
  [TileType.VendingMachine]:"Vending-Machine",
  [TileType.WaterCooler]:  "Water-Dispenser",
  [TileType.Plant]:        "Big-Plant",
  [TileType.Sofa]:         "Big-Sofa",
  [TileType.Table]:        "Big-Round-Table",
  [TileType.Whiteboard]:   "Board",
  [TileType.Printer]:      "Printer",
  [TileType.Toilet]:       "Toilet-Closed",
  [TileType.Server]:       "Big-Filing-Cabinet",  // 서버랙 대신
  [TileType.Fridge]:       "Folders",
  [TileType.Calendar]:     "Wall-Note",
  [TileType.Clock]:        "Wall-Clock",
};

// 타일이 가구 레이어인지 (바닥 위에 그림)
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

function isFurnitureTile(t: number): boolean {
  return SOLID_VISUAL.has(t);
}

// ---------------------------------------------------------------------------
// 상태 아이콘
// ---------------------------------------------------------------------------
const STATE_ICON: Record<DuckWorkState, string> = {
  idle:     "☕",
  typing:   "⌨️",
  reading:  "📖",
  server:   "🖥️",
  question: "🍽️",
  offwork:  "💤",
};

// ---------------------------------------------------------------------------
// NPC 초기화 — DEPT_REGISTRY에서 모든 직원 생성
// ---------------------------------------------------------------------------
function buildAllNpcs(map: TileMap): Npc[] {
  const npcs: Npc[] = [];
  let nameIdx = 0;
  let globalId = 0;

  for (const dept of Object.values(DEPT_REGISTRY)) {
    const walkable = deskTilesInZone(map, dept.id);
    const templates = getTaskTemplates(dept.id);

    for (let i = 0; i < dept.headcount; i++) {
      const name = DUCK_NAMES[nameIdx % DUCK_NAMES.length] ?? `오리${nameIdx}`;
      nameIdx++;
      const tile = walkable[i % Math.max(1, walkable.length)] ?? { x: 40, y: 20 };

      // 초기 태스크 2개 할당
      const tasks: NpcTask[] = [
        {
          id: `t-${globalId}-0`,
          title: templates[i % templates.length] ?? "업무 중",
          status: "active",
          progress: Math.floor(Math.random() * 60),
        },
        {
          id: `t-${globalId}-1`,
          title: templates[(i + 1) % templates.length] ?? "태스크",
          status: "waiting",
          progress: 0,
        },
      ];

      const npc: Npc = {
        id: `npc-${globalId}`,
        name,
        department: dept.id as DepartmentId,
        role: dept.roles[i % dept.roles.length] ?? "직원",
        accessory: dept.accessory,
        accessoryColor: dept.color,
        tile: { ...tile },
        deskTile: { ...tile },
        facing: "down",
        workState: "typing",
        schedulePhase: "working",
        tasks,
        recentDone: [],
        mood: "neutral",
        // 직원 통계 초기값
        productivity: 60 + Math.floor(Math.random() * 30), // 60-89
        satisfaction: 60 + Math.floor(Math.random() * 30), // 60-89
        salary: 10,
        tasksCompleted: 0,
      };

      npcs.push(npc);
      globalId++;
    }
  }

  return npcs;
}

function walkableTilesInZone(map: TileMap, zoneId: string): Vec[] {
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

// Chair 타일 위치 반환 — NPC를 책상 앞 의자에 배치하기 위함
function deskTilesInZone(map: TileMap, zoneId: string): Vec[] {
  const zone = map.zones.find((z) => z.id === zoneId);
  if (!zone) return [];
  const chairs: Vec[] = [];
  for (let dy = 1; dy < zone.bounds.h - 1; dy++) {
    for (let dx = 1; dx < zone.bounds.w - 1; dx++) {
      const x = zone.bounds.x + dx;
      const y = zone.bounds.y + dy;
      if (getTile(map, x, y) === TileType.Chair) {
        chairs.push({ x, y });
      }
    }
  }
  return chairs.length > 0 ? chairs : walkableTilesInZone(map, zoneId);
}

function ceoStartPos(map: TileMap): Vec {
  const ceo = map.zones.find((z) => z.id === "ceo-office");
  if (!ceo) return { x: 40, y: 17 };
  return {
    x: Math.floor(ceo.bounds.x + ceo.bounds.w / 2),
    y: Math.floor(ceo.bounds.y + ceo.bounds.h / 2),
  };
}

// ---------------------------------------------------------------------------
// 대화 패널용 NPC 정보
// ---------------------------------------------------------------------------
type TalkTarget = {
  npc: Npc;
  text: string;
};

// ---------------------------------------------------------------------------
// 부서 ID -> 캐릭터 인덱스 (0-2, PixelOfficeAssets row 3 캐릭터)
// ---------------------------------------------------------------------------
const DEPT_CHAR_INDEX: Partial<Record<string, number>> = {
  engineering: 0,
  marketing:   1,
  design:      2,
  hr:          0,
  finance:     1,
  sales:       0,
  support:     1,
  qa:          2,
  operations:  0,
};

// ---------------------------------------------------------------------------
// Props — realTasks를 받으면 시뮬레이터 대신 실제 데이터 사용
// ---------------------------------------------------------------------------
type RealTask = { title: string; progress: number; department: string };

type OfficeProps = {
  realTasks?: RealTask[];
};

// ---------------------------------------------------------------------------
// 메인 컴포넌트
// ---------------------------------------------------------------------------
export function PixelOffice({ realTasks }: OfficeProps = {}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const mapRef = useRef<TileMap | null>(null);
  const camRef = useRef<Camera | null>(null);
  const spritesRef = useRef<SpriteAssets | null>(null);
  const spritesLoadedRef = useRef(false);

  const inputRef = useRef<InputManager>(new InputManager());
  const soundRef = useRef<OfficeSoundManager>(new OfficeSoundManager());
  const lastFootstepRef = useRef<number>(0); // 발소리 쓰로틀 (200ms)

  const npcsRef = useRef<Npc[]>([]);
  const playerRef = useRef<Vec>({ x: 40, y: 17 });
  const nearbyNpcRef = useRef<Npc | null>(null);
  const playerFacingRef = useRef<"up" | "down" | "left" | "right">("down");
  const playerMovingRef = useRef(false);

  const clockRef = useRef<GameClock>(createGameClock(CLOCK_START_HOUR));
  const lastTickRef = useRef<number>(0);
  // 회사 재정 상태
  const companyRef = useRef<CompanyStats>(createCompany());
  // 마지막으로 시간당 회사 틱을 실행한 게임 hour
  const lastCompanyHourRef = useRef<number>(CLOCK_START_HOUR);

  // NPC 배회 경로 추적 (Npc 타입 미수정, 외부 Map 사용)
  // nextMoveAt: 다음 타일 이동을 실행할 timestamp(ms). idleUntil: 목적지 도착 후 대기 종료 timestamp.
  type NpcPathState = { path: Vec[]; index: number; nextMoveAt: number; idleUntil: number };
  const npcPathsRef = useRef<Map<string, NpcPathState>>(new Map());

  const [talking, setTalking] = useState<TalkTarget | null>(null);
  const [showDashboard, setShowDashboard] = useState(false);
  const [showManagement, setShowManagement] = useState(false);
  const [soundMuted, setSoundMuted] = useState(false);
  const [dashboardClock, setDashboardClock] = useState<GameClock>(createGameClock(CLOCK_START_HOUR));
  const [dashboardNpcs, setDashboardNpcs] = useState<Npc[]>([]);
  // management panel용 스냅샷 (React 렌더 트리거용)
  const [managementSnapshot, setManagementSnapshot] = useState<{
    company: CompanyStats;
    npcs: Npc[];
    clock: GameClock;
  } | null>(null);
  const [paused, setPaused] = useState(false);
  const [zoneHud, setZoneHud] = useState<string | null>(null);
  const [showMinimap, setShowMinimap] = useState(true);
  const [clockDisplay, setClockDisplay] = useState("08:00 ☀️ 오전");

  const pausedRef = useRef(false);
  const showDashboardRef = useRef(false);
  const lastZoneRef = useRef<string | null>(null);
  const zoneHudTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showMinimapRef = useRef(true);

  // RNG — seeded lcg for determinism within session
  const seedRef = useRef(42);
  const rand = useCallback((): number => {
    seedRef.current = (seedRef.current * 1103515245 + 12345) & 0x7fffffff;
    return seedRef.current / 0x7fffffff;
  }, []);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    showDashboardRef.current = showDashboard;
  }, [showDashboard]);

  useEffect(() => {
    showMinimapRef.current = showMinimap;
  }, [showMinimap]);

  // 맵 + NPC 초기화
  useEffect(() => {
    const map = buildOfficeMap();
    mapRef.current = map;
    playerRef.current = ceoStartPos(map);
    const npcs = buildAllNpcs(map);

    // realTasks가 있으면 해당 부서 NPC에 배분
    if (realTasks && realTasks.length > 0) {
      // 부서별 인덱스 추적
      const deptCounter: Record<string, number> = {};
      for (const rt of realTasks) {
        const deptNpcs = npcs.filter((n) => n.department === rt.department);
        if (deptNpcs.length === 0) continue;
        const idx = (deptCounter[rt.department] ?? 0) % deptNpcs.length;
        deptCounter[rt.department] = idx + 1;
        const npc = deptNpcs[idx];
        if (!npc) continue;
        // 실제 태스크를 NPC 태스크 목록 앞에 삽입
        npc.tasks.unshift({
          id: `real-${rt.department}-${idx}`,
          title: rt.title,
          status: "active",
          progress: Math.max(0, Math.min(100, rt.progress)),
        });
      }
    }

    npcsRef.current = npcs;
    clockRef.current = createGameClock(CLOCK_START_HOUR);
  // realTasks는 마운트 시 한 번만 반영 (빈 deps 의도적)
  }, []);

  // 스프라이트 비동기 로드
  useEffect(() => {
    loadAllSprites()
      .then((assets) => {
        spritesRef.current = assets;
        spritesLoadedRef.current = true;
      })
      .catch((err) => {
        // 스프라이트 로드 실패 — 폴백 렌더러로 계속 동작
        console.warn("스프라이트 로드 실패, 폴백 렌더러 사용:", err);
      });
  }, []);

  // 충돌 판정: 타일맵 + NPC 위치
  const isBlockedFn = useCallback((x: number, y: number): boolean => {
    const map = mapRef.current;
    if (!map) return true;
    if (tileIsBlocked(map, x, y)) return true;
    return npcsRef.current.some((n) => n.tile.x === x && n.tile.y === y);
  }, []);

  // 키보드 바인딩
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    return inputRef.current.bindKeyboard(canvas);
  }, []);

  // BGM — 첫 사용자 제스처(클릭 또는 키다운)에서 AudioContext 초기화 후 시작
  // autoplay 정책 준수: 제스처 없이 init하면 suspended 상태로 막힘
  useEffect(() => {
    const sound = soundRef.current;
    const start = () => {
      sound.startBgm();
      window.removeEventListener("pointerdown", start);
      window.removeEventListener("keydown", start);
    };
    window.addEventListener("pointerdown", start, { once: true });
    window.addEventListener("keydown", start, { once: true });
    return () => {
      window.removeEventListener("pointerdown", start);
      window.removeEventListener("keydown", start);
      sound.dispose();
    };
  }, []);

  // 캔버스 터치 탭 — NPC 탭하면 대화
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onTouchEnd = (e: TouchEvent) => {
      if (e.changedTouches.length !== 1) return;
      const touch = e.changedTouches[0];
      if (!touch) return;
      const cam = camRef.current;
      if (!cam) return;
      const rect = canvas.getBoundingClientRect();
      const sx = touch.clientX - rect.left;
      const sy = touch.clientY - rect.top;
      const { x: wx, y: wy } = screenToWorld(cam, sx, sy);
      const tileX = Math.floor(wx / TILE);
      const tileY = Math.floor(wy / TILE);
      const npc = npcsRef.current.find(
        (n) => isAdjacent(n.tile, { x: tileX, y: tileY }),
      );
      if (npc) {
        inputRef.current.setTapWorld(wx, wy);
        setTalking({ npc, text: buildNpcDescription(npc) });
      }
    };

    canvas.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => canvas.removeEventListener("touchend", onTouchEnd);
  }, []);

  // ResizeObserver — 캔버스 크기 + 카메라 뷰포트 갱신
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

  // 메인 게임 루프
  useEffect(() => {
    let raf = 0;
    let lastDraw = 0;
    let frame = 0;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const tick = (t: number) => {
      raf = requestAnimationFrame(tick);
      const map = mapRef.current;
      if (!map) return;

      // 게임 클럭 업데이트 (1실초 = 1게임분)
      if (!pausedRef.current && lastTickRef.current > 0) {
        const deltaMs = t - lastTickRef.current;
        clockRef.current = tickClock(clockRef.current, deltaMs);
      }
      lastTickRef.current = t;

      // NPC 스케줄 + 태스크 시뮬레이션 (매 프레임, pausedRef 외부)
      if (!pausedRef.current) {
        const clock = clockRef.current;
        npcsRef.current = npcsRef.current.map((npc) => {
          const phase = schedulePhase(clock.hour);
          const workState = phaseToWorkState(phase);
          const updated = simulateNpcTasks({ ...npc, schedulePhase: phase, workState }, clock, rand);
          return updated;
        });
      }

      // NPC 배회 이동 (점심/휴식 NPC만. 300ms마다 한 타일씩 이동)
      if (!pausedRef.current) {
        // 배회 중인 NPC가 점유하는 타일 집합 (충돌 회피용)
        const occupiedByWanderers = new Set<string>();
        for (const npc of npcsRef.current) {
          const phase = npc.schedulePhase;
          if (phase === "lunch" || phase === "break") {
            occupiedByWanderers.add(`${npc.tile.x},${npc.tile.y}`);
          }
        }

        npcsRef.current = npcsRef.current.map((npc) => {
          const phase = npc.schedulePhase;
          // 배회 대상: lunch 또는 break
          if (phase !== "lunch" && phase !== "break") {
            // 배회하지 않는 NPC는 책상으로 복귀 (working/commuting/leaving/offwork)
            if (phase === "working") {
              npcPathsRef.current.delete(npc.id);
              return { ...npc, tile: { ...npc.deskTile } };
            }
            return npc;
          }

          const pathState = npcPathsRef.current.get(npc.id);

          // 대기 중이면 아직 이동하지 않음
          if (pathState && t < pathState.idleUntil) return npc;

          // 경로가 없거나 소진됐으면 새 목적지 계산
          if (!pathState || pathState.index >= pathState.path.length) {
            const zone = wanderZone(phase);
            const target = pickWanderTarget(map, zone, rand);
            if (!target) return npc;

            // 현재 NPC 점유 타일을 occupied에서 제외하고 경로 계산 (자기 자신 제외)
            const othersOccupied = new Set(occupiedByWanderers);
            othersOccupied.delete(`${npc.tile.x},${npc.tile.y}`);

            const path = findPath(map, npc.tile, target, 200, othersOccupied);
            if (path.length <= 1) {
              // 경로 없음 — 잠시 대기 후 재시도
              npcPathsRef.current.set(npc.id, { path: [], index: 0, nextMoveAt: t + 800, idleUntil: t + 800 });
              return npc;
            }
            npcPathsRef.current.set(npc.id, { path, index: 1, nextMoveAt: t, idleUntil: 0 });
          }

          const state = npcPathsRef.current.get(npc.id)!;

          // 이동 시각 미달이면 대기
          if (t < state.nextMoveAt) return npc;

          const nextTile = state.path[state.index];
          if (!nextTile) return npc;

          // 목적지 타일이 다른 NPC에 점유됐으면 이동 보류
          const nextKey = `${nextTile.x},${nextTile.y}`;
          const isOccupied = [...npcsRef.current].some(
            (other) => other.id !== npc.id && other.tile.x === nextTile.x && other.tile.y === nextTile.y,
          );
          if (isOccupied) {
            // 다음 프레임에 재시도
            state.nextMoveAt = t + 300;
            return npc;
          }

          // 이동 방향 결정 → facing 갱신
          const dx = nextTile.x - npc.tile.x;
          const dy = nextTile.y - npc.tile.y;
          let facing: Npc["facing"] = npc.facing;
          if (dx > 0) facing = "right";
          else if (dx < 0) facing = "left";
          else if (dy > 0) facing = "down";
          else if (dy < 0) facing = "up";

          // 경로 인덱스 전진
          state.index += 1;
          state.nextMoveAt = t + 300; // 300ms per tile (플레이어보다 느림)

          // 경로 소진 시 목적지 도착 — 잠시 아이들 대기 (1~3초 랜덤)
          if (state.index >= state.path.length) {
            const idleMs = 1000 + Math.floor(rand() * 2000);
            state.idleUntil = t + idleMs;
          }

          // 점유 집합 업데이트 (같은 프레임 내 다른 NPC가 참조하도록)
          occupiedByWanderers.delete(`${npc.tile.x},${npc.tile.y}`);
          occupiedByWanderers.add(nextKey);

          return { ...npc, tile: { ...nextTile }, facing };
        });
      }

      // 플레이어 인접 NPC 탐지
      const player = playerRef.current;
      nearbyNpcRef.current =
        npcsRef.current.find((n) => isAdjacent(player, n.tile)) ?? null;

      // 구역 진입 HUD
      const zone = getZoneAt(map, player.x, player.y);
      const zoneId = zone?.id ?? null;
      if (zoneId !== lastZoneRef.current) {
        lastZoneRef.current = zoneId;
        if (zone) {
          setZoneHud(zone.label);
          if (zoneHudTimerRef.current) clearTimeout(zoneHudTimerRef.current);
          zoneHudTimerRef.current = setTimeout(() => setZoneHud(null), ZONE_HUD_MS);
          // 새 구역 진입 시 문 소리
          soundRef.current.playDoor();
        }
      }

      // CEO 책상 근접 감지: ceo-office 내 책상(8-9,15) 기준 2타일 이내
      const atCeoDesk =
        zoneId === "ceo-office" &&
        Math.abs(player.x - 9) <= 2 &&
        Math.abs(player.y - 15) <= 2;

      // 클럭 표시 갱신 (매 초 단위) — 시간대 레이블 + 아이콘 포함
      {
        const clock = clockRef.current;
        const tod = timeOfDay(clock.hour);
        setClockDisplay(
          `${formatClockTime(clock)} ${timeOfDayIcon(tod)} ${timeOfDayLabel(tod)}`,
        );

        // 게임 hour 변경 시 회사 재정 틱
        if (clock.hour !== lastCompanyHourRef.current) {
          lastCompanyHourRef.current = clock.hour;
          companyRef.current = tickCompany(companyRef.current, npcsRef.current.length);
        }
      }

      // 프레임 게이트
      if (t - lastDraw < FRAME_MS) return;
      lastDraw = t;
      if (!reduce) frame += 1;

      // 입력 처리
      const input = inputRef.current;
      const sound = soundRef.current;
      playerMovingRef.current = false;
      for (const dir of ["up", "down", "left", "right"] as const) {
        if (input.isPressed(dir)) {
          playerFacingRef.current = dir;
          const prevPos = { ...playerRef.current };
          playerRef.current = movePlayer(
            playerRef.current,
            dir,
            map.cols,
            map.rows,
            isBlockedFn,
          );
          // 실제로 이동한 경우에만 발소리 (200ms 쓰로틀)
          const moved =
            playerRef.current.x !== prevPos.x ||
            playerRef.current.y !== prevPos.y;
          if (moved) playerMovingRef.current = true;
          if (moved && t - lastFootstepRef.current > 200) {
            sound.playFootstep();
            lastFootstepRef.current = t;
          }
          setTalking(null);
          break;
        }
      }
      if (input.consumeJustPressed("interact")) {
        if (atCeoDesk && !showDashboardRef.current) {
          showDashboardRef.current = true;
          setShowDashboard(true);
          setDashboardClock(clockRef.current);
          setDashboardNpcs([...npcsRef.current]);
        } else if (showDashboardRef.current) {
          showDashboardRef.current = false;
          setShowDashboard(false);
        } else {
          const near = nearbyNpcRef.current;
          if (near) {
            setTalking({ npc: near, text: buildNpcDescription(near) });
            sound.playInteract();
          }
        }
      }
      // M 키 — 미니맵 토글
      if (input.consumeJustPressed("minimap")) {
        setShowMinimap((prev) => !prev);
      }
      // N 키 — 사운드 뮤트 토글
      if (input.consumeJustPressed("sound")) {
        const nowMuted = sound.toggleMute();
        setSoundMuted(nowMuted);
      }
      // ESC 키 — 패널 닫기
      if (input.consumeJustPressed("menu")) {
        setShowManagement(false);
        showDashboardRef.current = false;
        setShowDashboard(false);
        setTalking(null);
      }
      // TAB 키 — 경영 관리 패널 토글
      if (input.consumeJustPressed("management")) {
        setShowManagement((prev) => {
          if (!prev) {
            // 패널 열 때 스냅샷 갱신
            setManagementSnapshot({
              company: { ...companyRef.current },
              npcs: [...npcsRef.current],
              clock: { ...clockRef.current },
            });
          }
          return !prev;
        });
      }

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const currentPlayer = playerRef.current;
      const viewW = camRef.current?.viewW ?? canvas.width;
      const viewH = camRef.current?.viewH ?? canvas.height;
      if (!camRef.current) camRef.current = createCamera(viewW, viewH);

      camRef.current = followTarget(
        camRef.current,
        currentPlayer.x * TILE + TILE / 2,
        currentPlayer.y * TILE + TILE / 2,
        map.cols * TILE,
        map.rows * TILE,
        0.12,
      );
      const cam = camRef.current;

      ctx.clearRect(0, 0, viewW, viewH);
      const { minCol, maxCol, minRow, maxRow } = visibleTileRange(cam, TILE);
      const c0 = Math.max(0, minCol);
      const c1 = Math.min(map.cols, maxCol);
      const r0 = Math.max(0, minRow);
      const r1 = Math.min(map.rows, maxRow);

      const sprites = spritesRef.current;

      // --- Pass 1: 바닥 타일 ---
      const officeTilesetPass1 = sprites?.officeTileset ?? null;
      for (let row = r0; row < r1; row++) {
        for (let col = c0; col < c1; col++) {
          const tt = getTile(map, col, row);
          if (tt === TileType.Wall) continue;
          const { x: sx, y: sy } = worldToScreen(cam, col * TILE, row * TILE);
          drawFloorTile(ctx, officeTilesetPass1, sx, sy, tt, TILE, col, row);
        }
      }

      // --- Pass 2: 가구 / 벽 ---
      for (let row = r0; row < r1; row++) {
        for (let col = c0; col < c1; col++) {
          const tt = getTile(map, col, row);
          if (!isFurnitureTile(tt)) continue;
          const { x: sx, y: sy } = worldToScreen(cam, col * TILE, row * TILE);

          // 우선순위: 1) PixelOffice 타일셋  2) 개별 가구 스프라이트  3) 폴백 프로시저럴
          const tilesetRect = TILESET_MAP[tt];
          const officeTileset = sprites?.officeTileset ?? null;

          if (tilesetRect && officeTileset) {
            // 타일셋에서 16px 셀을 32px(2x)로 확대 출력 — 1차 우선순위
            drawFromTileset(
              ctx,
              officeTileset,
              tilesetRect.sx, tilesetRect.sy, tilesetRect.sw, tilesetRect.sh,
              sx, sy, TILE, TILE,
            );
          } else if (officeTileset && tt === TileType.Wall) {
            // 벽: 타일셋 맵에 없어도 오피스 타일셋의 벽 텍스처(row3 col6) 사용
            drawFromTileset(ctx, officeTileset, 96, 48, 16, 16, sx, sy, TILE, TILE);
          } else {
            // 2차: 개별 가구 스프라이트 PNG
            const spriteName = TILE_TO_SPRITE[tt];
            const spriteImg = sprites && spriteName ? sprites.furniture.get(spriteName) : undefined;

            if (spriteImg) {
              drawFurnitureSprite(ctx, spriteImg, sx, sy, TILE);
            } else {
              // 최후 폴백: 절차적 렌더러 (타일셋 없을 때만)
              if (tt === TileType.Wall) {
                ctx.fillStyle = "#5C5C5C";
                ctx.fillRect(sx, sy, TILE, TILE);
                ctx.fillStyle = "#7A7A7A";
                ctx.fillRect(sx, sy, TILE, 2);
              } else {
                // TILE=32이므로 16px 폴백을 2배 스케일로 그린다
                ctx.save();
                ctx.translate(sx, sy);
                ctx.scale(2, 2);
                drawFurniture(ctx, 0, 0, tt, 16);
                ctx.restore();
              }
            }
          }
        }
      }

      // --- Pass 3: NPC (Y순 정렬 — 앞쪽이 위에 그려짐) ---
      // offwork/commuting/leaving NPC는 그리지 않음 (퇴근 또는 아직 미출근)
      const visibleNpcs = npcsRef.current.filter(
        (n) => n.schedulePhase !== "offwork" && n.schedulePhase !== "commuting" && n.schedulePhase !== "leaving",
      );
      const sortedNpcs = [...visibleNpcs].sort((a, b) => a.tile.y - b.tile.y);
      for (const npc of sortedNpcs) {
        if (
          npc.tile.x < c0 || npc.tile.x >= c1 ||
          npc.tile.y < r0 || npc.tile.y >= r1
        ) continue;

        const wx = npc.tile.x * TILE;
        const wy = npc.tile.y * TILE;
        const { x: sx, y: sy } = worldToScreen(cam, wx, wy);

        // 인간 캐릭터 스프라이트 렌더 (직원은 항상 인간 스프라이트)
        const officeTileset = sprites?.officeTileset ?? null;
        const charIdx = DEPT_CHAR_INDEX[npc.department] ?? 0;
        // 점심/휴식 중이면 idle 처리 (반투명)
        const isIdle = npc.schedulePhase === "lunch" || npc.schedulePhase === "break";

        if (officeTileset) {
          drawHumanSprite(ctx, officeTileset, sx, sy, TILE, charIdx, isIdle);
        } else {
          // 폴백: 색 원형
          ctx.globalAlpha = isIdle ? 0.45 : 1.0;
          ctx.fillStyle = npc.accessoryColor || "#F6EFDD";
          ctx.beginPath();
          ctx.arc(sx + TILE / 2, sy + TILE / 2, TILE / 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1.0;
        }

        // 이름 태그
        const isNearby = nearbyNpcRef.current?.id === npc.id;
        ctx.save();
        ctx.textAlign = "center";
        ctx.font = `bold ${isNearby ? 10 : 8}px sans-serif`;

        // 이름 배경
        const nameLabel = npc.name;
        const nameWidth = ctx.measureText(nameLabel).width + 4;
        const nameX = sx + TILE / 2;
        const nameY = sy + TILE + 10;

        ctx.fillStyle = "rgba(0,0,0,0.55)";
        ctx.fillRect(nameX - nameWidth / 2, nameY - 9, nameWidth, 11);
        ctx.fillStyle = "#FFFFFF";
        ctx.fillText(nameLabel, nameX, nameY);

        // 현재 태스크 표시 (인접할 때 + 작업 중)
        if (isNearby && npc.workState === "typing") {
          const activeTask = npc.tasks.find((tk) => tk.status === "active");
          if (activeTask) {
            const taskLabel = `${activeTask.title} ${Math.floor(activeTask.progress)}%`;
            ctx.font = "9px sans-serif";
            const tw = ctx.measureText(taskLabel).width + 6;
            const tx = sx + TILE / 2;
            const ty = sy - 8;
            ctx.fillStyle = "rgba(0,0,0,0.7)";
            ctx.fillRect(tx - tw / 2, ty - 10, tw, 12);
            ctx.fillStyle = "#AAFFAA";
            ctx.fillText(taskLabel, tx, ty);
          }
        }

        // 상태 아이콘 — idle(점심/휴식)이면 💤 표시
        const stateIcon = isIdle ? "💤" : (STATE_ICON[npc.workState] ?? "❓");
        ctx.font = "10px serif";
        ctx.fillText(stateIcon, sx + TILE / 2, sy + TILE - 2);

        ctx.restore();
      }

      // --- Pass 4: 플레이어(CEO 오리) ---
      const pwx = currentPlayer.x * TILE;
      const pwy = currentPlayer.y * TILE;
      const { x: psx, y: psy } = worldToScreen(cam, pwx, pwy);

      const bossSheet = sprites?.duckBoss;
      // 이동 중일 때만 걷기 애니메이션, 멈추면 idle (frame 0)
      const bossFrame = playerMovingRef.current ? Math.floor(frame / 4) % 4 : 0;
      if (bossSheet) {
        drawDuckSprite(ctx, bossSheet, psx, psy, TILE, playerFacingRef.current, bossFrame, DUCK_SCALE);
      } else {
        ctx.fillStyle = "#FFD700";
        ctx.beginPath();
        ctx.arc(psx + TILE / 2, psy + TILE / 2, TILE / 3, 0, Math.PI * 2);
        ctx.fill();
      }

      // CEO 이름 태그
      ctx.save();
      ctx.textAlign = "center";
      ctx.font = "bold 9px sans-serif";
      const ceoLabel = "대장오리 👑";
      const ceoW = ctx.measureText(ceoLabel).width + 4;
      const ceoX = psx + TILE / 2;
      const ceoY = psy + TILE + 10;
      ctx.fillStyle = "rgba(0,0,0,0.65)";
      ctx.fillRect(ceoX - ceoW / 2, ceoY - 9, ceoW, 11);
      ctx.fillStyle = "#FFD700";
      ctx.fillText(ceoLabel, ceoX, ceoY);
      ctx.restore();

      // 인접 NPC 또는 CEO 책상 프롬프트
      const promptLabel = atCeoDesk
        ? (showDashboardRef.current ? "E: 대시보드 닫기" : "E: 대시보드 열기")
        : nearbyNpcRef.current
          ? "E: 말 걸기"
          : null;
      if (promptLabel) {
        ctx.save();
        ctx.font = "bold 9px sans-serif";
        ctx.textAlign = "center";
        const pw2 = ctx.measureText(promptLabel).width + 6;
        ctx.fillStyle = "rgba(0,0,0,0.7)";
        ctx.fillRect(psx + TILE / 2 - pw2 / 2, psy - 20, pw2, 12);
        ctx.fillStyle = "#FFFFFF";
        ctx.fillText(promptLabel, psx + TILE / 2, psy - 11);
        ctx.restore();
      }

      // --- Pass 5: 시간대 색상 오버레이 (씬 전체에 단일 fillRect) ---
      {
        const tod = timeOfDay(clockRef.current.hour);
        const ov = timeOverlay(tod);
        if (ov.a > 0) {
          ctx.fillStyle = `rgba(${ov.r},${ov.g},${ov.b},${ov.a})`;
          ctx.fillRect(0, 0, viewW, viewH);
        }
      }

      // --- HUD: 미니맵 (우상단, 플레이어 이동 시에만 의미 있게 변경됨) ---
      if (showMinimapRef.current) {
        const mmW = map.cols * MINIMAP_SCALE;
        const mmX = viewW - mmW - MINIMAP_MARGIN;
        const mmY = MINIMAP_MARGIN;
        drawMinimap(
          ctx,
          map,
          currentPlayer,
          visibleNpcs.map((n) => ({ tile: n.tile, department: n.department })),
          mmX,
          mmY,
          MINIMAP_SCALE,
        );
      }

      input.endFrame();
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isBlockedFn, rand]);

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
          role="img"
          aria-label="픽셀 오리 오피스 — 방향키/WASD로 대장오리를 움직이고, 직원 오리 옆에서 E로 말을 겁니다"
          className="block h-full w-full cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
          style={{ imageRendering: "pixelated" }}
        />
        <VirtualDpad input={inputRef.current} />

        {/* 구역 이름 HUD — 페이드인/아웃 */}
        {zoneHud && (
          <div
            className="pointer-events-none absolute left-1/2 top-6 -translate-x-1/2 animate-fade-zone rounded-lg bg-black/65 px-4 py-1.5 text-sm font-semibold text-white"
            aria-live="polite"
            style={{
              animation: "zoneHudFade 2.3s ease forwards",
            }}
          >
            {zoneHud}
          </div>
        )}

        {/* 회사 HUD + 시계 — 우상단 반투명 바 */}
        <div className="pointer-events-none absolute right-2 top-2 flex flex-col items-end gap-0.5">
          <div className="rounded bg-black/60 px-2 py-0.5 font-mono text-xs font-bold text-white">
            {clockDisplay}
          </div>
          <div className="rounded bg-black/60 px-2 py-0.5 font-mono text-[10px] text-gray-200 flex gap-2">
            <span className="text-green-400">₩{formatMoney(companyRef.current.money)}</span>
            <span className="text-gray-400">{npcsRef.current.length}명</span>
          </div>
        </div>

        {/* 경영 패널 토글 버튼 (좌상단) */}
        <button
          type="button"
          onClick={() => {
            setShowManagement((prev) => {
              if (!prev) {
                setManagementSnapshot({
                  company: { ...companyRef.current },
                  npcs: [...npcsRef.current],
                  clock: { ...clockRef.current },
                });
              }
              return !prev;
            });
          }}
          aria-label="경영 관리 패널 열기"
          className="absolute left-2 top-2 rounded bg-black/60 border border-gray-600
                     px-2 py-0.5 font-mono text-[10px] text-gray-200
                     hover:bg-black/80 hover:text-white transition-colors z-10"
        >
          경영 [TAB]
        </button>

        {/* NPC 대화 패널 — canvas 위에 절대 오버레이 */}
        {talking && (
          <OfficeTalkPanel
            npc={talking.npc}
            onClose={() => setTalking(null)}
          />
        )}

        {/* CEO 전사 대시보드 — 사장실 책상 근접 시 자동 표시 */}
        {showDashboard && !talking && !showManagement && (
          <OfficeDashboard
            npcs={dashboardNpcs}
            clock={dashboardClock}
            onClose={() => setShowDashboard(false)}
          />
        )}

        {/* 경영 관리 패널 — TAB 키 또는 버튼으로 열림 */}
        {showManagement && managementSnapshot && (
          <OfficeManagementPanel
            company={managementSnapshot.company}
            npcs={managementSnapshot.npcs}
            clock={managementSnapshot.clock}
            onClose={() => setShowManagement(false)}
          />
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          캔버스를 클릭해 포커스한 뒤 방향키/WASD로 대장오리를 움직여요. 직원 오리 옆에서 E를 누르면
          지금 뭐 하는지 물어볼 수 있어요. TAB으로 경영 패널, M 키로 미니맵, N 키로 사운드를 켜고 끌 수 있습니다.
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              const nowMuted = soundRef.current.toggleMute();
              setSoundMuted(nowMuted);
            }}
            className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
            aria-label={soundMuted ? "사운드 켜기" : "사운드 끄기"}
          >
            {soundMuted ? "사운드 켜기" : "사운드 끄기"}
          </button>
          <button
            type="button"
            onClick={() => setShowMinimap((p) => !p)}
            className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
          >
            {showMinimap ? "미니맵 끄기" : "미니맵 켜기"}
          </button>
          <button
            type="button"
            onClick={() => setPaused((p) => !p)}
            className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
          >
            {paused ? "시뮬 재개" : "시뮬 정지"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// NPC 설명 문자열 생성
// ---------------------------------------------------------------------------
function buildNpcDescription(npc: Npc): string {
  const activeTask = npc.tasks.find((t) => t.status === "active");
  if (npc.workState === "offwork") return "오늘 업무를 마쳤어요. 퇴근 중입니다.";
  if (npc.schedulePhase === "lunch") return "점심 식사 중이에요.";
  if (npc.schedulePhase === "break") return "잠깐 휴식 중이에요.";
  if (activeTask) {
    return `"${activeTask.title}" 작업 중이에요. (${Math.floor(activeTask.progress)}% 완료)`;
  }
  return "잠깐 여유를 즐기는 중이에요.";
}
