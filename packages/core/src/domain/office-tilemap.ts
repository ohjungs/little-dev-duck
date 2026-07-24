// Tile types as numeric constants (not const enum — better for iteration/debugging)
export const TileType = {
  Floor: 0,
  Wall: 1,
  Desk: 2,
  Chair: 3,
  Door: 4,
  Corridor: 5,
  Carpet: 6,
  Table: 7,
  Plant: 8,
  Bookshelf: 9,
  CoffeeMachine: 10,
  Whiteboard: 11,
  Server: 12,
  Reception: 13,
  Monitor: 14,
  Printer: 15,
  Sofa: 16,
  VendingMachine: 17,
  WaterCooler: 18,
  Toilet: 19,
  Fridge: 20,
  Calendar: 21,
  Clock: 22,
  FireExtinguisher: 23,
} as const;
export type TileTypeValue = (typeof TileType)[keyof typeof TileType];

// Blocked tiles — solid objects you can't walk through
const SOLID_TILES = new Set<number>([
  TileType.Wall, TileType.Desk, TileType.Table, TileType.Bookshelf,
  TileType.Server, TileType.Reception, TileType.Monitor, TileType.Printer,
  TileType.Sofa, TileType.VendingMachine, TileType.WaterCooler,
  TileType.Fridge, TileType.Whiteboard,
]);

export type Vec = { x: number; y: number };

export type Zone = {
  id: string;
  label: string;
  bounds: { x: number; y: number; w: number; h: number };
};

export type TileMap = {
  cols: number;
  rows: number;
  tiles: Uint8Array; // cols * rows, row-major
  zones: Zone[];
};

export function createTileMap(cols: number, rows: number): TileMap {
  return { cols, rows, tiles: new Uint8Array(cols * rows), zones: [] };
}

export function getTile(map: TileMap, x: number, y: number): number {
  if (x < 0 || y < 0 || x >= map.cols || y >= map.rows) return TileType.Wall;
  return map.tiles[y * map.cols + x];
}

export function setTile(map: TileMap, x: number, y: number, t: number): void {
  if (x >= 0 && y >= 0 && x < map.cols && y < map.rows) {
    map.tiles[y * map.cols + x] = t;
  }
}

export function isSolid(t: number): boolean {
  return SOLID_TILES.has(t);
}

export function isBlocked(map: TileMap, x: number, y: number): boolean {
  return isSolid(getTile(map, x, y));
}

export function getZoneAt(map: TileMap, x: number, y: number): Zone | undefined {
  return map.zones.find(z =>
    x >= z.bounds.x && x < z.bounds.x + z.bounds.w &&
    y >= z.bounds.y && y < z.bounds.y + z.bounds.h
  );
}

// Fill a rectangular area with a tile type
export function fillRect(map: TileMap, x: number, y: number, w: number, h: number, t: number): void {
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      setTile(map, x + dx, y + dy, t);
    }
  }
}

// Draw walls around a rect (border only)
export function strokeRect(map: TileMap, x: number, y: number, w: number, h: number, t: number): void {
  for (let dx = 0; dx < w; dx++) {
    setTile(map, x + dx, y, t);
    setTile(map, x + dx, y + h - 1, t);
  }
  for (let dy = 0; dy < h; dy++) {
    setTile(map, x, y + dy, t);
    setTile(map, x + w - 1, y + dy, t);
  }
}
