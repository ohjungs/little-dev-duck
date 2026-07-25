import {
  TileType,
  createTileMap,
  fillRect,
  strokeRect,
  setTile,
  type TileMap,
  type Zone,
} from "./office-tilemap";
import { DEPT_REGISTRY, type DepartmentId } from "./office-department";

// Stamp a room: fill interior with floor, draw walls around border, punch doors
export function stampRoom(
  map: TileMap,
  x: number,
  y: number,
  w: number,
  h: number,
  zone: Zone,
  doors: { x: number; y: number }[] = [],
  floorTile: number = TileType.Floor,
): void {
  fillRect(map, x, y, w, h, floorTile);
  strokeRect(map, x, y, w, h, TileType.Wall);
  for (const d of doors) {
    setTile(map, d.x, d.y, TileType.Door);
  }
  map.zones.push(zone);
}

// Connect two points with an L-shaped corridor (horizontal then vertical)
export function connectCorridor(
  map: TileMap,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  width: number = 3,
): void {
  const minX = Math.min(fromX, toX);
  const maxX = Math.max(fromX, toX);
  fillRect(map, minX, fromY, maxX - minX + 1, width, TileType.Corridor);
  const minY = Math.min(fromY, toY);
  const maxY = Math.max(fromY, toY);
  fillRect(map, toX, minY, width, maxY - minY + width, TileType.Corridor);
}

// ---------------------------------------------------------------------------
// 2026-07-25 : 대형 데이터 기반 플로어플랜 재작성.
// 기존 40x30 압축 맵(부서당 책상 1~2개)을 60x48 큰 스케일로 교체.
// 각 부서방은 정원(headcount)만큼 책상을 3열 그리드로 배치하고, 부서별로 카펫(Carpet)을 깔아
// 렌더에서 부서 색으로 칠한다. 복도 격자로 모든 방이 연결된다.
// ---------------------------------------------------------------------------

const MAP_W = 60;
const MAP_H = 48;

// 부서방 그리드: 4열 x 3행. 방 크기 13x10(내부 11x8 → 책상 3열 x 2행 = 최대 6석).
const ROOM_W = 13;
const ROOM_H = 10;
const COL_PITCH = 15; // ROOM_W + 2(복도 폭)
const ROW_PITCH = 12; // ROOM_H + 2(복도 폭)
const GRID_X0 = 1;
const GRID_Y0 = 8; // 로비(0..5) + 복도(6..7) 아래

const LOBBY_H = 6;

type SlotKind = "ceo" | "dept" | "cafeteria" | "meeting";
type Slot = { id: string; label: string; kind: SlotKind };

// 그리드 슬롯 배치(행 우선). 9개 부서 + 사장실 + 식당 + 회의실 = 12칸.
const GRID_SLOTS: Slot[] = [
  { id: "ceo-office", label: "사장실", kind: "ceo" },
  { id: "engineering", label: "개발팀", kind: "dept" },
  { id: "design", label: "디자인팀", kind: "dept" },
  { id: "marketing", label: "마케팅팀", kind: "dept" },
  { id: "qa", label: "QA팀", kind: "dept" },
  { id: "hr", label: "인사팀", kind: "dept" },
  { id: "finance", label: "재무팀", kind: "dept" },
  { id: "sales", label: "영업팀", kind: "dept" },
  { id: "support", label: "고객지원팀", kind: "dept" },
  { id: "operations", label: "운영팀", kind: "dept" },
  { id: "cafeteria", label: "식당", kind: "cafeteria" },
  { id: "meeting-room", label: "회의실", kind: "meeting" },
];

function slotOrigin(index: number): { x: number; y: number } {
  const col = index % 4;
  const row = Math.floor(index / 4);
  return { x: GRID_X0 + col * COL_PITCH, y: GRID_Y0 + row * ROW_PITCH };
}

// 방 내부에 책상 그리드 배치(desk + monitor + chair 세트). 최대 3열 x 2행 = 6석.
// 반환: 실제로 배치된 책상 수.
function furnishDesks(
  map: TileMap,
  rx: number,
  ry: number,
  count: number,
): number {
  const colXs = [rx + 2, rx + 6, rx + 10]; // 3열
  const rowYs = [ry + 2, ry + 5]; // 2행
  let placed = 0;
  for (let i = 0; i < count && i < colXs.length * rowYs.length; i++) {
    const cx = colXs[i % colXs.length]!;
    const cy = rowYs[Math.floor(i / colXs.length)]!;
    setTile(map, cx, cy, TileType.Desk);
    setTile(map, cx + 1, cy, TileType.Monitor);
    setTile(map, cx, cy + 1, TileType.Chair);
    placed++;
  }
  return placed;
}

// 부서 특성 가구 — 방 하단 공간에 배치(책상과 겹치지 않게 ry+rh-2 행 사용).
const DEPT_FEATURE: Partial<Record<DepartmentId, number>> = {
  engineering: TileType.Server,
  design: TileType.Whiteboard,
  qa: TileType.Whiteboard,
  marketing: TileType.Whiteboard,
  finance: TileType.Bookshelf,
  hr: TileType.Sofa,
  sales: TileType.Bookshelf,
  support: TileType.Printer,
  operations: TileType.Bookshelf,
};

function furnishDeptRoom(map: TileMap, id: DepartmentId, rx: number, ry: number): void {
  const dept = DEPT_REGISTRY[id];
  furnishDesks(map, rx, ry, dept.headcount);
  // 화분(좌하 코너) + 부서 특성 가구(우하 코너)
  setTile(map, rx + 1, ry + ROOM_H - 2, TileType.Plant);
  const feature = DEPT_FEATURE[id];
  if (feature !== undefined) {
    setTile(map, rx + ROOM_W - 2, ry + ROOM_H - 2, feature);
  }
}

// Build the large 60x48 office map with all departments
export function buildOfficeMap(): TileMap {
  const map = createTileMap(MAP_W, MAP_H);
  fillRect(map, 0, 0, MAP_W, MAP_H, TileType.Wall);

  // ===== LOBBY (top, full width, y=0..5) =====
  stampRoom(map, 0, 0, MAP_W, LOBBY_H,
    { id: "lobby", label: "로비", bounds: { x: 0, y: 0, w: MAP_W, h: LOBBY_H } },
    []);
  // 리셉션 데스크(중앙) + 소파 + 화분
  setTile(map, 28, 2, TileType.Reception);
  setTile(map, 29, 2, TileType.Reception);
  setTile(map, 30, 2, TileType.Reception);
  setTile(map, 31, 2, TileType.Reception);
  setTile(map, 3, 2, TileType.Plant);
  setTile(map, 56, 2, TileType.Plant);
  setTile(map, 8, 3, TileType.Sofa);
  setTile(map, 9, 3, TileType.Sofa);
  setTile(map, 50, 3, TileType.Sofa);
  setTile(map, 51, 3, TileType.Sofa);
  setTile(map, 4, 2, TileType.Clock);

  // ===== CORRIDOR LATTICE =====
  // 수평 복도: 로비 아래(6), 그리드 행 사이(18,30), 그리드 아래(42)
  for (const cy of [6, 18, 30, 42]) {
    fillRect(map, 1, cy, MAP_W - 2, 2, TileType.Corridor);
  }
  // 수직 복도: 열 사이 간격(x=14,29,44), 좌우 가장자리(x=... 방이 붙어있어 불필요)
  for (const cx of [14, 29, 44]) {
    fillRect(map, cx, 6, 2, 38, TileType.Corridor);
  }

  // ===== GRID ROOMS (부서 + 사장실 + 식당 + 회의실) =====
  GRID_SLOTS.forEach((slot, index) => {
    const { x, y } = slotOrigin(index);
    const zone: Zone = {
      id: slot.id,
      label: slot.label,
      bounds: { x, y, w: ROOM_W, h: ROOM_H },
    };
    const floor = slot.kind === "dept" ? TileType.Carpet : TileType.Floor;
    stampRoom(map, x, y, ROOM_W, ROOM_H, zone, [], floor);

    if (slot.kind === "dept") {
      furnishDeptRoom(map, slot.id as DepartmentId, x, y);
    } else if (slot.kind === "ceo") {
      // 사장실 — 큰 책상 + 의자 + 소파 + 책장 + 화분
      setTile(map, x + 3, y + 3, TileType.Desk);
      setTile(map, x + 4, y + 3, TileType.Monitor);
      setTile(map, x + 3, y + 4, TileType.Chair);
      setTile(map, x + 2, y + 3, TileType.Plant);
      setTile(map, x + ROOM_W - 3, y + 2, TileType.Bookshelf);
      setTile(map, x + 2, y + ROOM_H - 2, TileType.Sofa);
      setTile(map, x + 3, y + ROOM_H - 2, TileType.Sofa);
    } else if (slot.kind === "cafeteria") {
      // 식당 — 테이블 여러 개 + 커피머신 + 자판기 + 정수기
      setTile(map, x + 2, y + 3, TileType.Table);
      setTile(map, x + 5, y + 3, TileType.Table);
      setTile(map, x + 8, y + 3, TileType.Table);
      setTile(map, x + 2, y + 6, TileType.Table);
      setTile(map, x + 5, y + 6, TileType.Table);
      setTile(map, x + ROOM_W - 2, y + 2, TileType.CoffeeMachine);
      setTile(map, x + ROOM_W - 2, y + 4, TileType.VendingMachine);
      setTile(map, x + ROOM_W - 2, y + 6, TileType.WaterCooler);
    } else if (slot.kind === "meeting") {
      // 회의실 — 대형 테이블 + 의자 둘러앉기 + 화이트보드
      fillRect(map, x + 4, y + 3, 4, 3, TileType.Table);
      setTile(map, x + 3, y + 3, TileType.Chair);
      setTile(map, x + 8, y + 3, TileType.Chair);
      setTile(map, x + 3, y + 5, TileType.Chair);
      setTile(map, x + 8, y + 5, TileType.Chair);
      setTile(map, x + 5, y + ROOM_H - 2, TileType.Whiteboard);
    }
  });

  // ===== BOTTOM BAND: 서버실 + 화장실 (y=43..46) =====
  const bandY = 43;
  const bandH = 4;
  stampRoom(map, 1, bandY, 24, bandH,
    { id: "server-room", label: "서버실", bounds: { x: 1, y: bandY, w: 24, h: bandH } },
    []);
  setTile(map, 3, bandY + 1, TileType.Server);
  setTile(map, 5, bandY + 1, TileType.Server);
  setTile(map, 7, bandY + 1, TileType.Server);
  setTile(map, 9, bandY + 1, TileType.Server);

  stampRoom(map, 26, bandY, 20, bandH,
    { id: "restroom", label: "화장실", bounds: { x: 26, y: bandY, w: 20, h: bandH } },
    []);
  setTile(map, 28, bandY + 1, TileType.Toilet);
  setTile(map, 31, bandY + 1, TileType.Toilet);
  setTile(map, 34, bandY + 1, TileType.WaterCooler);

  // ===== DOORS (복도 채운 뒤에 뚫어 corridor fill에 덮이지 않게) =====
  // 로비 → 아래 복도(문 2칸)
  setTile(map, 29, LOBBY_H - 1, TileType.Door);
  setTile(map, 30, LOBBY_H - 1, TileType.Door);
  // 각 그리드 방 상단 중앙에 문(위쪽 복도로 연결)
  GRID_SLOTS.forEach((_, index) => {
    const { x, y } = slotOrigin(index);
    setTile(map, x + Math.floor(ROOM_W / 2), y, TileType.Door);
  });
  // 바닥 밴드(서버실/화장실) 상단 문
  setTile(map, 12, bandY, TileType.Door);
  setTile(map, 36, bandY, TileType.Door);

  return map;
}
