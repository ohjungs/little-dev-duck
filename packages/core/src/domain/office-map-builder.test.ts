import { describe, expect, it } from "vitest";
import { TileType, isSolid, getTile, type TileMap } from "./office-tilemap";
import { buildOfficeMap, stampRoom, connectCorridor } from "./office-map-builder";
import { createTileMap } from "./office-tilemap";

// ===== buildOfficeMap =====

describe("buildOfficeMap", () => {
  let map: TileMap;
  beforeAll(() => {
    map = buildOfficeMap();
  });

  it("40x30 크기의 유효한 맵을 반환한다", () => {
    expect(map.cols).toBe(40);
    expect(map.rows).toBe(30);
    expect(map.tiles).toBeInstanceOf(Uint8Array);
    expect(map.tiles.length).toBe(40 * 30);
  });

  it("타일 배열이 비어 있지 않다 (0이 아닌 타일이 존재한다)", () => {
    const nonZero = Array.from(map.tiles).some(t => t !== 0);
    expect(nonZero).toBe(true);
  });

  it("최소 14개 이상의 존을 가진다", () => {
    expect(map.zones.length).toBeGreaterThanOrEqual(14);
  });

  it("CEO 오피스 존이 올바른 좌표에 등록되어 있다", () => {
    const ceo = map.zones.find(z => z.id === "ceo-office");
    expect(ceo).toBeDefined();
    expect(ceo!.bounds.x).toBe(0);
    expect(ceo!.bounds.y).toBe(5);
    expect(ceo!.label).toBe("사장실");
  });

  it("로비 존이 존재하고 레이블이 '로비'다", () => {
    const lobby = map.zones.find(z => z.id === "lobby");
    expect(lobby).toBeDefined();
    expect(lobby!.label).toBe("로비");
  });

  it("수평 복도(y=10)는 Corridor 타일이다 (walkable)", () => {
    // mid1 corridor: fillRect(map, 0, 10, 40, 1, Corridor) → row 10, several x values
    for (const x of [1, 5, 15, 25, 35]) {
      const tile = getTile(map, x, 10);
      expect(tile).toBe(TileType.Corridor);
    }
  });

  it("복도 타일은 solid하지 않다 (통과 가능)", () => {
    expect(isSolid(TileType.Corridor)).toBe(false);
  });

  it("도어 타일은 solid하지 않다 (통과 가능)", () => {
    expect(isSolid(TileType.Door)).toBe(false);
  });

  it("로비 도어(19, 4)는 Door 타일이다", () => {
    expect(getTile(map, 19, 4)).toBe(TileType.Door);
    expect(getTile(map, 20, 4)).toBe(TileType.Door);
  });

  it("로비 경계 외벽은 Wall 타일이다", () => {
    // Top wall of lobby (y=0), left wall (x=0)
    expect(getTile(map, 10, 0)).toBe(TileType.Wall);
    expect(getTile(map, 0, 2)).toBe(TileType.Wall);
    // Right wall (x=39, i.e. x+w-1 = 0+40-1 = 39)
    expect(getTile(map, 39, 2)).toBe(TileType.Wall);
  });

  it("로비 내부는 Floor 타일이다", () => {
    expect(getTile(map, 10, 2)).toBe(TileType.Floor);
    expect(getTile(map, 25, 2)).toBe(TileType.Floor);
  });

  it("서버실 존이 존재한다", () => {
    const srv = map.zones.find(z => z.id === "server-room");
    expect(srv).toBeDefined();
  });

  it("화장실 존이 존재한다", () => {
    const wc = map.zones.find(z => z.id === "restroom");
    expect(wc).toBeDefined();
  });

  it("식당 존이 존재한다", () => {
    const cafe = map.zones.find(z => z.id === "cafeteria");
    expect(cafe).toBeDefined();
  });

  it("Wall 타일은 solid하다", () => {
    expect(isSolid(TileType.Wall)).toBe(true);
  });
});

// ===== stampRoom =====

describe("stampRoom", () => {
  it("내부를 floorTile로 채우고 경계를 Wall로 그린다", () => {
    const map = createTileMap(20, 20);
    stampRoom(
      map, 2, 2, 8, 6,
      { id: "test", label: "테스트", bounds: { x: 2, y: 2, w: 8, h: 6 } },
    );
    // Interior tile (not on border)
    expect(getTile(map, 5, 4)).toBe(TileType.Floor);
    // Border corner
    expect(getTile(map, 2, 2)).toBe(TileType.Wall);
    expect(getTile(map, 9, 7)).toBe(TileType.Wall);
    // Top/bottom edge
    expect(getTile(map, 5, 2)).toBe(TileType.Wall);
    expect(getTile(map, 5, 7)).toBe(TileType.Wall);
    // Left/right edge
    expect(getTile(map, 2, 4)).toBe(TileType.Wall);
    expect(getTile(map, 9, 4)).toBe(TileType.Wall);
  });

  it("도어 위치를 Door 타일로 뚫는다", () => {
    const map = createTileMap(20, 20);
    stampRoom(
      map, 2, 2, 8, 6,
      { id: "test", label: "테스트", bounds: { x: 2, y: 2, w: 8, h: 6 } },
      [{ x: 5, y: 7 }],
    );
    expect(getTile(map, 5, 7)).toBe(TileType.Door);
  });

  it("커스텀 floorTile을 적용한다", () => {
    const map = createTileMap(20, 20);
    stampRoom(
      map, 1, 1, 6, 4,
      { id: "carpet-room", label: "카펫", bounds: { x: 1, y: 1, w: 6, h: 4 } },
      [],
      TileType.Carpet,
    );
    expect(getTile(map, 3, 2)).toBe(TileType.Carpet);
  });

  it("존을 map.zones에 등록한다", () => {
    const map = createTileMap(20, 20);
    const zone = { id: "z1", label: "Z1", bounds: { x: 1, y: 1, w: 5, h: 5 } };
    stampRoom(map, 1, 1, 5, 5, zone);
    expect(map.zones).toHaveLength(1);
    expect(map.zones[0].id).toBe("z1");
  });
});

// ===== connectCorridor =====

describe("connectCorridor", () => {
  it("수평 세그먼트를 Corridor로 채운다", () => {
    const map = createTileMap(30, 30);
    connectCorridor(map, 2, 5, 10, 5, 1);
    // All tiles from x=2 to x=10 at y=5 should be Corridor
    for (let x = 2; x <= 10; x++) {
      expect(getTile(map, x, 5)).toBe(TileType.Corridor);
    }
  });

  it("수직 세그먼트를 Corridor로 채운다 (L자형 꺾임)", () => {
    const map = createTileMap(30, 30);
    connectCorridor(map, 2, 5, 10, 15, 1);
    // Vertical segment from y=5 to y=15 at x=10
    for (let y = 5; y <= 15; y++) {
      expect(getTile(map, 10, y)).toBe(TileType.Corridor);
    }
  });

  it("width > 1 이면 복도 폭만큼 Corridor를 채운다", () => {
    const map = createTileMap(30, 30);
    connectCorridor(map, 2, 5, 2, 10, 3);
    // Vertical corridor at x=2,3,4 from y=5 to y=12 (10+3-1)
    expect(getTile(map, 2, 7)).toBe(TileType.Corridor);
    expect(getTile(map, 3, 7)).toBe(TileType.Corridor);
    expect(getTile(map, 4, 7)).toBe(TileType.Corridor);
  });
});

// vitest needs beforeAll imported
import { beforeAll } from "vitest";
