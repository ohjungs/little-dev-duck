import { describe, expect, it } from "vitest";
import { findPath } from "./office-pathfind";
import { createTileMap, setTile, TileType, type TileMap } from "./office-tilemap";

// 10x10 open map — all Floor tiles (0 = floor, not blocked)
function openMap(cols = 10, rows = 10): TileMap {
  return createTileMap(cols, rows);
}

// 10x10 map with a vertical wall at x=5, y=0..7 (leaving a gap at y=8,9)
function mapWithWall(): TileMap {
  const map = createTileMap(10, 10);
  for (let y = 0; y <= 7; y++) {
    setTile(map, 5, y, TileType.Wall);
  }
  return map;
}

// Fully walled map — no walkable tiles
function fullyBlockedMap(): TileMap {
  const map = createTileMap(5, 5);
  for (let y = 0; y < 5; y++) {
    for (let x = 0; x < 5; x++) {
      setTile(map, x, y, TileType.Wall);
    }
  }
  return map;
}

describe("findPath", () => {
  it("start === goal returns single-element path [start]", () => {
    const map = openMap();
    const result = findPath(map, { x: 3, y: 3 }, { x: 3, y: 3 });
    expect(result).toEqual([{ x: 3, y: 3 }]);
  });

  it("goal blocked returns empty path", () => {
    const map = openMap();
    setTile(map, 5, 5, TileType.Wall);
    const result = findPath(map, { x: 3, y: 3 }, { x: 5, y: 5 });
    expect(result).toEqual([]);
  });

  it("straight path on open map — correct length", () => {
    const map = openMap();
    const result = findPath(map, { x: 0, y: 0 }, { x: 3, y: 0 });
    // Should find a path from (0,0) to (3,0): 4 tiles
    expect(result.length).toBe(4);
    expect(result[0]).toEqual({ x: 0, y: 0 });
    expect(result[result.length - 1]).toEqual({ x: 3, y: 0 });
  });

  it("path around a wall reaches goal", () => {
    const map = mapWithWall();
    // wall at x=5, y=0..7. Gap at y=8,9.
    // Start (3,3), goal (7,3) — must go around the bottom gap
    const result = findPath(map, { x: 3, y: 3 }, { x: 7, y: 3 });
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toEqual({ x: 3, y: 3 });
    expect(result[result.length - 1]).toEqual({ x: 7, y: 3 });
    // No tile in the path should pass through a walled cell (x=5 at y<=7)
    for (const tile of result) {
      if (tile.x === 5) {
        expect(tile.y).toBeGreaterThan(7); // gap rows only (y=8,9)
      }
    }
  });

  it("completely blocked map returns empty path", () => {
    const map = fullyBlockedMap();
    // Both start and goal are walled — goal check fires first
    const result = findPath(map, { x: 0, y: 0 }, { x: 4, y: 4 });
    expect(result).toEqual([]);
  });

  it("avoids occupied tiles passed in as Set", () => {
    const map = openMap();
    // Block tile (1,0) via occupiedTiles — direct right step from (0,0) is blocked
    const occupied = new Set<string>(["1,0"]);
    const result = findPath(map, { x: 0, y: 0 }, { x: 2, y: 0 }, 200, occupied);
    // Must reach goal but not step on (1,0)
    expect(result.length).toBeGreaterThan(0);
    expect(result[result.length - 1]).toEqual({ x: 2, y: 0 });
    for (const tile of result) {
      expect(`${tile.x},${tile.y}`).not.toBe("1,0");
    }
  });

  it("maxSteps cap — returns empty when search is cut short", () => {
    const map = mapWithWall();
    // Requires going around the wall (long path). Limit to 1 step so it cannot complete.
    const result = findPath(map, { x: 3, y: 3 }, { x: 7, y: 3 }, 1);
    expect(result).toEqual([]);
  });

  it("each step in returned path is adjacent (4-connected)", () => {
    const map = openMap();
    const result = findPath(map, { x: 0, y: 0 }, { x: 4, y: 4 });
    expect(result.length).toBeGreaterThan(0);
    for (let i = 1; i < result.length; i++) {
      const prev = result[i - 1]!;
      const curr = result[i]!;
      const dist = Math.abs(curr.x - prev.x) + Math.abs(curr.y - prev.y);
      expect(dist).toBe(1);
    }
  });
});
