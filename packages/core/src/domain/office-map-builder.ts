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

// Build the full 80x60 office map with all departments
export function buildOfficeMap(): TileMap {
  const map = createTileMap(80, 60);

  // Fill everything with Wall — outside areas are solid
  fillRect(map, 0, 0, 80, 60, TileType.Wall);

  // ===== LOBBY (top center) =====
  stampRoom(
    map, 1, 1, 78, 8,
    { id: "lobby", label: "로비", bounds: { x: 1, y: 1, w: 78, h: 8 } },
    [{ x: 39, y: 8 }, { x: 40, y: 8 }],
  );
  setTile(map, 38, 4, TileType.Reception);
  setTile(map, 39, 4, TileType.Reception);
  setTile(map, 40, 4, TileType.Reception);
  setTile(map, 5, 3, TileType.Plant);
  setTile(map, 74, 3, TileType.Plant);
  setTile(map, 10, 5, TileType.Sofa);
  setTile(map, 11, 5, TileType.Sofa);
  setTile(map, 68, 5, TileType.Sofa);
  setTile(map, 69, 5, TileType.Sofa);

  // ===== MAIN CORRIDOR (horizontal) =====
  fillRect(map, 1, 9, 78, 3, TileType.Corridor);

  // ===== CEO OFFICE (top-left below corridor) =====
  stampRoom(
    map, 1, 12, 16, 12,
    { id: "ceo-office", label: "사장실", bounds: { x: 1, y: 12, w: 16, h: 12 } },
    [{ x: 16, y: 17 }],
  );
  setTile(map, 8, 15, TileType.Desk);
  setTile(map, 9, 15, TileType.Desk);
  setTile(map, 8, 16, TileType.Monitor);
  setTile(map, 10, 15, TileType.Chair);
  setTile(map, 5, 14, TileType.Sofa);
  setTile(map, 5, 15, TileType.Sofa);
  setTile(map, 3, 20, TileType.Plant);
  setTile(map, 13, 14, TileType.Bookshelf);

  // ===== ENGINEERING (개발팀) =====
  stampRoom(
    map, 18, 12, 16, 12,
    { id: "engineering", label: "개발팀", bounds: { x: 18, y: 12, w: 16, h: 12 } },
    [{ x: 25, y: 12 }],
    TileType.Carpet,
  );
  furnishDesks(map, 18, 12, 6, 3);
  setTile(map, 31, 14, TileType.Server);
  setTile(map, 31, 16, TileType.Whiteboard);

  // ===== DESIGN (디자인팀) =====
  stampRoom(
    map, 34, 12, 14, 12,
    { id: "design", label: "디자인팀", bounds: { x: 34, y: 12, w: 14, h: 12 } },
    [{ x: 40, y: 12 }],
    TileType.Carpet,
  );
  furnishDesks(map, 34, 12, 4, 2);
  setTile(map, 45, 14, TileType.Whiteboard);

  // ===== QA =====
  stampRoom(
    map, 48, 12, 14, 12,
    { id: "qa", label: "QA", bounds: { x: 48, y: 12, w: 14, h: 12 } },
    [{ x: 54, y: 12 }],
    TileType.Carpet,
  );
  furnishDesks(map, 48, 12, 4, 2);
  setTile(map, 59, 14, TileType.Whiteboard);

  // ===== MARKETING (마케팅팀) =====
  stampRoom(
    map, 62, 12, 17, 12,
    { id: "marketing", label: "마케팅팀", bounds: { x: 62, y: 12, w: 17, h: 12 } },
    [{ x: 69, y: 12 }],
    TileType.Carpet,
  );
  furnishDesks(map, 62, 12, 4, 2);
  setTile(map, 76, 14, TileType.Whiteboard);

  // ===== VERTICAL CORRIDOR (left side, connecting all horizontal corridors) =====
  fillRect(map, 16, 9, 3, 42, TileType.Corridor);

  // ===== SECOND HORIZONTAL CORRIDOR =====
  fillRect(map, 1, 24, 78, 3, TileType.Corridor);

  // ===== MEETING ROOM (회의실) =====
  stampRoom(
    map, 62, 27, 17, 12,
    { id: "meeting-room", label: "회의실", bounds: { x: 62, y: 27, w: 17, h: 12 } },
    [{ x: 69, y: 27 }],
  );
  fillRect(map, 67, 31, 4, 2, TileType.Table);
  setTile(map, 66, 31, TileType.Chair);
  setTile(map, 66, 32, TileType.Chair);
  setTile(map, 71, 31, TileType.Chair);
  setTile(map, 71, 32, TileType.Chair);
  setTile(map, 67, 30, TileType.Chair);
  setTile(map, 70, 30, TileType.Chair);
  setTile(map, 67, 33, TileType.Chair);
  setTile(map, 70, 33, TileType.Chair);
  setTile(map, 76, 29, TileType.Whiteboard);

  // ===== HR (인사팀) =====
  stampRoom(
    map, 1, 27, 15, 10,
    { id: "hr", label: "인사팀", bounds: { x: 1, y: 27, w: 15, h: 10 } },
    [{ x: 15, y: 31 }],
    TileType.Carpet,
  );
  furnishDesks(map, 1, 27, 3, 2);
  setTile(map, 3, 34, TileType.Sofa);
  setTile(map, 4, 34, TileType.Sofa);

  // ===== CAFETERIA (식당/휴게실) =====
  stampRoom(
    map, 19, 27, 42, 10,
    { id: "cafeteria", label: "식당", bounds: { x: 19, y: 27, w: 42, h: 10 } },
    [{ x: 39, y: 27 }],
  );
  fillRect(map, 23, 30, 2, 2, TileType.Table);
  fillRect(map, 28, 30, 2, 2, TileType.Table);
  fillRect(map, 33, 30, 2, 2, TileType.Table);
  fillRect(map, 38, 30, 2, 2, TileType.Table);
  setTile(map, 55, 29, TileType.CoffeeMachine);
  setTile(map, 55, 31, TileType.VendingMachine);
  setTile(map, 57, 29, TileType.WaterCooler);
  setTile(map, 57, 31, TileType.Fridge);

  // ===== THIRD HORIZONTAL CORRIDOR =====
  fillRect(map, 1, 37, 78, 3, TileType.Corridor);

  // ===== SERVER ROOM (서버실) =====
  stampRoom(
    map, 1, 40, 15, 10,
    { id: "server-room", label: "서버실", bounds: { x: 1, y: 40, w: 15, h: 10 } },
    [{ x: 15, y: 44 }],
  );
  setTile(map, 4, 43, TileType.Server);
  setTile(map, 6, 43, TileType.Server);
  setTile(map, 8, 43, TileType.Server);
  setTile(map, 10, 43, TileType.Server);
  setTile(map, 4, 46, TileType.Server);
  setTile(map, 6, 46, TileType.Server);

  // ===== FINANCE (재무팀) =====
  stampRoom(
    map, 19, 40, 14, 10,
    { id: "finance", label: "재무팀", bounds: { x: 19, y: 40, w: 14, h: 10 } },
    [{ x: 25, y: 40 }],
    TileType.Carpet,
  );
  furnishDesks(map, 19, 40, 3, 2);
  setTile(map, 30, 42, TileType.Bookshelf);
  setTile(map, 30, 44, TileType.Bookshelf);

  // ===== OPERATIONS (운영팀) =====
  stampRoom(
    map, 33, 40, 14, 10,
    { id: "operations", label: "운영팀", bounds: { x: 33, y: 40, w: 14, h: 10 } },
    [{ x: 39, y: 40 }],
    TileType.Carpet,
  );
  furnishDesks(map, 33, 40, 3, 2);
  setTile(map, 44, 42, TileType.Monitor);

  // ===== SUPPORT (고객지원팀) =====
  stampRoom(
    map, 47, 40, 16, 10,
    { id: "support", label: "고객지원팀", bounds: { x: 47, y: 40, w: 16, h: 10 } },
    [{ x: 54, y: 40 }],
    TileType.Carpet,
  );
  furnishDesks(map, 47, 40, 4, 2);

  // ===== SALES (영업팀) =====
  stampRoom(
    map, 63, 40, 16, 10,
    { id: "sales", label: "영업팀", bounds: { x: 63, y: 40, w: 16, h: 10 } },
    [{ x: 70, y: 40 }],
    TileType.Carpet,
  );
  furnishDesks(map, 63, 40, 4, 2);
  setTile(map, 76, 42, TileType.Whiteboard);

  // ===== RESTROOM (화장실) =====
  stampRoom(
    map, 1, 50, 10, 8,
    { id: "restroom", label: "화장실", bounds: { x: 1, y: 50, w: 10, h: 8 } },
    [{ x: 10, y: 53 }],
  );
  setTile(map, 3, 52, TileType.Toilet);
  setTile(map, 5, 52, TileType.Toilet);
  setTile(map, 7, 52, TileType.Toilet);

  // ===== RIGHT SIDE VERTICAL CORRIDOR =====
  fillRect(map, 60, 9, 3, 42, TileType.Corridor);

  return map;
}
