import {
  TileType,
  createTileMap,
  fillRect,
  strokeRect,
  setTile,
  type TileMap,
  type Zone,
} from "./office-tilemap";

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

// Place rows of desks with chairs inside a room
function furnishDesks(
  map: TileMap,
  x: number,
  y: number,
  count: number,
  cols: number,
): void {
  for (let i = 0; i < count; i++) {
    const row = Math.floor(i / cols);
    const col = i % cols;
    const dx = x + 2 + col * 4;
    const dy = y + 2 + row * 3;
    setTile(map, dx, dy, TileType.Desk);
    setTile(map, dx + 1, dy, TileType.Monitor);
    setTile(map, dx, dy + 1, TileType.Chair);
  }
}

// Build the compact 40x30 office map with all departments
export function buildOfficeMap(): TileMap {
  const map = createTileMap(40, 30);
  fillRect(map, 0, 0, 40, 30, TileType.Wall);

  // ===== ROW 1: LOBBY (top, full width, y=0..4) =====
  // Stamp lobby without doors first; doors are re-placed after corridor fills
  // to prevent the corridor fillRect at y=4 from overwriting them.
  stampRoom(map, 0, 0, 40, 5,
    { id: "lobby", label: "로비", bounds: { x: 0, y: 0, w: 40, h: 5 } },
    []);
  setTile(map, 18, 2, TileType.Reception);
  setTile(map, 19, 2, TileType.Reception);
  setTile(map, 20, 2, TileType.Reception);
  setTile(map, 3, 2, TileType.Plant);
  setTile(map, 36, 2, TileType.Plant);
  setTile(map, 6, 3, TileType.Sofa);
  setTile(map, 7, 3, TileType.Sofa);
  setTile(map, 32, 3, TileType.Sofa);
  setTile(map, 33, 3, TileType.Sofa);

  // ===== VERTICAL CORRIDORS (x=8..9 and x=30..31, y=4..24) =====
  fillRect(map, 8, 4, 2, 21, TileType.Corridor); // left corridor
  fillRect(map, 30, 4, 2, 21, TileType.Corridor); // right corridor

  // ===== HORIZONTAL CORRIDORS =====
  fillRect(map, 0, 4, 40, 1, TileType.Corridor);  // top (y=4)
  fillRect(map, 0, 10, 40, 1, TileType.Corridor); // mid1 (y=10)
  fillRect(map, 0, 15, 40, 1, TileType.Corridor); // mid2 (y=15)
  fillRect(map, 0, 21, 40, 1, TileType.Corridor); // mid3 (y=21)
  fillRect(map, 0, 25, 40, 1, TileType.Corridor); // bottom (y=25)

  // Re-place lobby doors AFTER corridor fills so y=4 corridor does not overwrite them
  setTile(map, 19, 4, TileType.Door);
  setTile(map, 20, 4, TileType.Door);

  // ===== ROW 2: CEO + ENGINEERING + DESIGN + MARKETING (y=5..9) =====
  // Rooms are 5 tiles tall (y=5..9). Interior rows: y=6..8 (3 usable rows).
  // furnishDesks row-0: dy=y+2=7, row-1: dy=y+5=10 → overflows into corridor y=10.
  // Therefore all row-2 dept rooms use a single desk row (cols=count, capped at 2
  // per 10-tile-wide room to stay within the interior x bounds).

  // CEO office (x=0..7, y=5..9) — manual furniture only, no furnishDesks
  stampRoom(map, 0, 5, 8, 5,
    { id: "ceo-office", label: "사장실", bounds: { x: 0, y: 5, w: 8, h: 5 } },
    [{ x: 7, y: 7 }]);
  setTile(map, 3, 7, TileType.Desk);
  setTile(map, 4, 7, TileType.Monitor);
  setTile(map, 3, 8, TileType.Chair);
  setTile(map, 2, 7, TileType.Plant);
  setTile(map, 6, 6, TileType.Bookshelf);

  // Engineering (x=10..19, y=5..9) — 2 desks fit in single row
  stampRoom(map, 10, 5, 10, 5,
    { id: "engineering", label: "개발팀", bounds: { x: 10, y: 5, w: 10, h: 5 } },
    [{ x: 14, y: 9 }], TileType.Carpet);
  furnishDesks(map, 10, 5, 2, 2);
  setTile(map, 16, 7, TileType.Whiteboard);

  // Design (x=20..29, y=5..9) — 2 desks fit in single row
  stampRoom(map, 20, 5, 10, 5,
    { id: "design", label: "디자인팀", bounds: { x: 20, y: 5, w: 10, h: 5 } },
    [{ x: 24, y: 9 }], TileType.Carpet);
  furnishDesks(map, 20, 5, 2, 2);

  // Marketing (x=32..39, y=5..9) — 1 desk fits in single row (w=8 → col=0 only)
  stampRoom(map, 32, 5, 8, 5,
    { id: "marketing", label: "마케팅팀", bounds: { x: 32, y: 5, w: 8, h: 5 } },
    [{ x: 35, y: 9 }], TileType.Carpet);
  furnishDesks(map, 32, 5, 1, 1);

  // ===== ROW 3: HR + CAFETERIA + MEETING (y=11..14) =====
  // Rooms h=4: interior y=12..13. Single desk row at dy=y+2=13 fits; row-1 dy=16 overflows.

  // HR (x=0..7, y=11..14) — 1 desk (w=8 → col=0 only; h=4 → 1 row only)
  stampRoom(map, 0, 11, 8, 4,
    { id: "hr", label: "인사팀", bounds: { x: 0, y: 11, w: 8, h: 4 } },
    [{ x: 7, y: 12 }], TileType.Carpet);
  furnishDesks(map, 0, 11, 1, 1);

  // Cafeteria (x=10..29, y=11..14)
  stampRoom(map, 10, 11, 20, 4,
    { id: "cafeteria", label: "식당", bounds: { x: 10, y: 11, w: 20, h: 4 } },
    [{ x: 19, y: 11 }]);
  setTile(map, 13, 13, TileType.Table);
  setTile(map, 17, 13, TileType.Table);
  setTile(map, 21, 13, TileType.Table);
  setTile(map, 25, 13, TileType.CoffeeMachine);
  setTile(map, 27, 13, TileType.VendingMachine);

  // Meeting room (x=32..39, y=11..14)
  stampRoom(map, 32, 11, 8, 4,
    { id: "meeting-room", label: "회의실", bounds: { x: 32, y: 11, w: 8, h: 4 } },
    [{ x: 35, y: 11 }]);
  fillRect(map, 34, 12, 3, 2, TileType.Table);
  setTile(map, 33, 12, TileType.Chair);
  setTile(map, 37, 12, TileType.Chair);
  setTile(map, 33, 13, TileType.Chair);
  setTile(map, 37, 13, TileType.Chair);

  // ===== ROW 4: QA + FINANCE + OPERATIONS + SUPPORT + SALES (y=16..20) =====
  // Rooms h=5: same overflow constraint as row 2 — single desk row only.

  // QA (x=0..7, y=16..20) — 1 desk (w=8 → col=0 only)
  stampRoom(map, 0, 16, 8, 5,
    { id: "qa", label: "QA", bounds: { x: 0, y: 16, w: 8, h: 5 } },
    [{ x: 7, y: 18 }], TileType.Carpet);
  furnishDesks(map, 0, 16, 1, 1);

  // Finance (x=10..16, y=16..20) — 1 desk (w=7 → col=0 only)
  stampRoom(map, 10, 16, 7, 5,
    { id: "finance", label: "재무팀", bounds: { x: 10, y: 16, w: 7, h: 5 } },
    [{ x: 13, y: 20 }], TileType.Carpet);
  furnishDesks(map, 10, 16, 1, 1);

  // Operations (x=17..23, y=16..20) — 1 desk (w=7 → col=0 only)
  stampRoom(map, 17, 16, 7, 5,
    { id: "operations", label: "운영팀", bounds: { x: 17, y: 16, w: 7, h: 5 } },
    [{ x: 20, y: 20 }], TileType.Carpet);
  furnishDesks(map, 17, 16, 1, 1);

  // Support (x=24..29, y=16..20) — 1 desk (w=6 → col=0 only)
  stampRoom(map, 24, 16, 6, 5,
    { id: "support", label: "고객지원팀", bounds: { x: 24, y: 16, w: 6, h: 5 } },
    [{ x: 27, y: 20 }], TileType.Carpet);
  furnishDesks(map, 24, 16, 1, 1);

  // Sales (x=32..39, y=16..20) — 1 desk (w=8 → col=0 only)
  stampRoom(map, 32, 16, 8, 5,
    { id: "sales", label: "영업팀", bounds: { x: 32, y: 16, w: 8, h: 5 } },
    [{ x: 35, y: 20 }], TileType.Carpet);
  furnishDesks(map, 32, 16, 1, 1);

  // ===== ROW 5: SERVER ROOM + RESTROOM (y=22..24) =====
  // Rooms h=3: interior row y=23 only.

  // Server room (x=0..7, y=22..24)
  stampRoom(map, 0, 22, 8, 3,
    { id: "server-room", label: "서버실", bounds: { x: 0, y: 22, w: 8, h: 3 } },
    [{ x: 7, y: 23 }]);
  setTile(map, 2, 23, TileType.Server);
  setTile(map, 4, 23, TileType.Server);

  // Restroom (x=10..15, y=22..24)
  stampRoom(map, 10, 22, 6, 3,
    { id: "restroom", label: "화장실", bounds: { x: 10, y: 22, w: 6, h: 3 } },
    [{ x: 13, y: 22 }]);
  setTile(map, 11, 23, TileType.Toilet);
  setTile(map, 13, 23, TileType.Toilet);

  // ===== BOTTOM CORRIDOR (y=26..29) =====
  fillRect(map, 0, 26, 40, 4, TileType.Corridor);

  return map;
}
