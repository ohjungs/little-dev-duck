import type { TileMap, Vec } from "./office-tilemap";
import { isBlocked } from "./office-tilemap";

type PathNode = { x: number; y: number; g: number; h: number; f: number; parent: PathNode | null };

function heuristic(a: Vec, b: Vec): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y); // Manhattan
}

// A* pathfinding. Returns array of Vec from start to goal (inclusive), or empty if no path.
// maxSteps limits search to prevent hanging on large maps.
export function findPath(
  map: TileMap,
  start: Vec,
  goal: Vec,
  maxSteps: number = 200,
  occupiedTiles?: Set<string>, // "x,y" strings to avoid (other NPCs)
): Vec[] {
  if (start.x === goal.x && start.y === goal.y) return [start];
  if (isBlocked(map, goal.x, goal.y)) return [];

  const openSet: PathNode[] = [];
  const closedSet = new Set<string>();
  const key = (x: number, y: number) => `${x},${y}`;

  const startNode: PathNode = { x: start.x, y: start.y, g: 0, h: heuristic(start, goal), f: 0, parent: null };
  startNode.f = startNode.h;
  openSet.push(startNode);

  let steps = 0;
  while (openSet.length > 0 && steps < maxSteps) {
    steps++;
    // Find node with lowest f
    openSet.sort((a, b) => a.f - b.f);
    const current = openSet.shift()!;

    if (current.x === goal.x && current.y === goal.y) {
      // Reconstruct path
      const path: Vec[] = [];
      let node: PathNode | null = current;
      while (node) {
        path.unshift({ x: node.x, y: node.y });
        node = node.parent;
      }
      return path;
    }

    closedSet.add(key(current.x, current.y));

    // 4-directional neighbors
    for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
      const nx = current.x + (dx as number);
      const ny = current.y + (dy as number);
      const nk = key(nx, ny);

      if (closedSet.has(nk)) continue;
      if (isBlocked(map, nx, ny)) continue;
      if (occupiedTiles?.has(nk)) continue;

      const g = current.g + 1;
      const existing = openSet.find(n => n.x === nx && n.y === ny);
      if (existing && g >= existing.g) continue;

      const h = heuristic({ x: nx, y: ny }, goal);
      const node: PathNode = { x: nx, y: ny, g, h, f: g + h, parent: current };

      if (existing) {
        existing.g = g; existing.f = g + h; existing.parent = current;
      } else {
        openSet.push(node);
      }
    }
  }

  return []; // No path found
}
