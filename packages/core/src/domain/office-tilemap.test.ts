import { describe, expect, it } from "vitest";
import {
  TileType,
  createTileMap,
  getTile,
  setTile,
  isSolid,
  isBlocked,
  getZoneAt,
  fillRect,
  strokeRect,
} from "./office-tilemap";

describe("createTileMap", () => {
  it("올바른 크기와 전체 0(Floor) 초기화", () => {
    const map = createTileMap(10, 5);
    expect(map.cols).toBe(10);
    expect(map.rows).toBe(5);
    expect(map.tiles.length).toBe(50);
    expect(map.zones).toHaveLength(0);
    for (let i = 0; i < map.tiles.length; i++) {
      expect(map.tiles[i]).toBe(TileType.Floor);
    }
  });
});

describe("setTile / getTile", () => {
  it("쓴 타일을 읽으면 같은 값 반환 (round-trip)", () => {
    const map = createTileMap(8, 8);
    setTile(map, 3, 4, TileType.Desk);
    expect(getTile(map, 3, 4)).toBe(TileType.Desk);
  });

  it("다른 좌표는 영향받지 않는다", () => {
    const map = createTileMap(8, 8);
    setTile(map, 3, 4, TileType.Desk);
    expect(getTile(map, 3, 5)).toBe(TileType.Floor);
    expect(getTile(map, 4, 4)).toBe(TileType.Floor);
  });

  it("경계 밖 setTile은 조용히 무시한다", () => {
    const map = createTileMap(5, 5);
    setTile(map, -1, 0, TileType.Wall);
    setTile(map, 5, 0, TileType.Wall);
    setTile(map, 0, -1, TileType.Wall);
    setTile(map, 0, 5, TileType.Wall);
    // 전체가 여전히 Floor
    for (let i = 0; i < map.tiles.length; i++) {
      expect(map.tiles[i]).toBe(TileType.Floor);
    }
  });
});

describe("getTile 경계 밖", () => {
  it("음수 좌표는 Wall 반환", () => {
    const map = createTileMap(5, 5);
    expect(getTile(map, -1, 0)).toBe(TileType.Wall);
    expect(getTile(map, 0, -1)).toBe(TileType.Wall);
  });

  it("cols/rows 이상 좌표는 Wall 반환", () => {
    const map = createTileMap(5, 5);
    expect(getTile(map, 5, 0)).toBe(TileType.Wall);
    expect(getTile(map, 0, 5)).toBe(TileType.Wall);
    expect(getTile(map, 100, 100)).toBe(TileType.Wall);
  });
});

describe("isSolid", () => {
  it("Wall은 solid", () => {
    expect(isSolid(TileType.Wall)).toBe(true);
  });

  it("Floor는 solid 아님", () => {
    expect(isSolid(TileType.Floor)).toBe(false);
  });

  it("Desk는 solid", () => {
    expect(isSolid(TileType.Desk)).toBe(true);
  });

  it("Chair·Door·Corridor·Carpet·Plant 등은 solid 아님 (걸어다닐 수 있다)", () => {
    expect(isSolid(TileType.Chair)).toBe(false);
    expect(isSolid(TileType.Door)).toBe(false);
    expect(isSolid(TileType.Corridor)).toBe(false);
    expect(isSolid(TileType.Carpet)).toBe(false);
    expect(isSolid(TileType.Plant)).toBe(false);
  });

  it("나머지 solid 타일들 확인", () => {
    const solidList = [
      TileType.Table, TileType.Bookshelf, TileType.Server,
      TileType.Reception, TileType.Monitor, TileType.Printer,
      TileType.Sofa, TileType.VendingMachine, TileType.WaterCooler,
      TileType.Fridge, TileType.Whiteboard,
    ];
    for (const t of solidList) {
      expect(isSolid(t)).toBe(true);
    }
  });
});

describe("isBlocked", () => {
  it("맵에 Wall이 있는 좌표는 blocked", () => {
    const map = createTileMap(5, 5);
    setTile(map, 2, 2, TileType.Wall);
    expect(isBlocked(map, 2, 2)).toBe(true);
  });

  it("Floor 좌표는 blocked 아님", () => {
    const map = createTileMap(5, 5);
    expect(isBlocked(map, 1, 1)).toBe(false);
  });

  it("경계 밖은 항상 blocked (getTile이 Wall 반환하므로)", () => {
    const map = createTileMap(5, 5);
    expect(isBlocked(map, -1, 0)).toBe(true);
    expect(isBlocked(map, 5, 5)).toBe(true);
  });

  it("Desk는 blocked, Chair는 아님", () => {
    const map = createTileMap(5, 5);
    setTile(map, 1, 1, TileType.Desk);
    setTile(map, 2, 2, TileType.Chair);
    expect(isBlocked(map, 1, 1)).toBe(true);
    expect(isBlocked(map, 2, 2)).toBe(false);
  });
});

describe("getZoneAt", () => {
  it("좌표가 zone 경계 안이면 zone 반환", () => {
    const map = createTileMap(20, 20);
    map.zones.push({ id: "z1", label: "회의실", bounds: { x: 2, y: 2, w: 4, h: 3 } });
    expect(getZoneAt(map, 2, 2)?.id).toBe("z1");
    expect(getZoneAt(map, 5, 4)?.id).toBe("z1"); // x+w-1=5, y+h-1=4
  });

  it("경계 밖(오른쪽·아래)은 해당 zone 없음 (w/h가 exclusive)", () => {
    const map = createTileMap(20, 20);
    map.zones.push({ id: "z1", label: "회의실", bounds: { x: 2, y: 2, w: 4, h: 3 } });
    expect(getZoneAt(map, 6, 2)).toBeUndefined(); // x = x+w (exclusive)
    expect(getZoneAt(map, 2, 5)).toBeUndefined(); // y = y+h (exclusive)
  });

  it("zone이 없으면 undefined 반환", () => {
    const map = createTileMap(10, 10);
    expect(getZoneAt(map, 5, 5)).toBeUndefined();
  });

  it("여러 zone 중 올바른 것을 찾는다", () => {
    const map = createTileMap(30, 30);
    map.zones.push({ id: "lounge", label: "라운지", bounds: { x: 0, y: 0, w: 5, h: 5 } });
    map.zones.push({ id: "server", label: "서버실", bounds: { x: 10, y: 10, w: 5, h: 5 } });
    expect(getZoneAt(map, 1, 1)?.id).toBe("lounge");
    expect(getZoneAt(map, 12, 12)?.id).toBe("server");
    expect(getZoneAt(map, 7, 7)).toBeUndefined();
  });
});

describe("fillRect", () => {
  it("지정한 영역 전체를 해당 타일로 채운다", () => {
    const map = createTileMap(10, 10);
    fillRect(map, 2, 3, 3, 2, TileType.Carpet);
    // 채워진 영역: x=[2,3,4], y=[3,4]
    for (let y = 3; y < 5; y++) {
      for (let x = 2; x < 5; x++) {
        expect(getTile(map, x, y)).toBe(TileType.Carpet);
      }
    }
  });

  it("fillRect 밖 영역은 변경되지 않는다", () => {
    const map = createTileMap(10, 10);
    fillRect(map, 2, 3, 3, 2, TileType.Carpet);
    expect(getTile(map, 1, 3)).toBe(TileType.Floor);
    expect(getTile(map, 5, 3)).toBe(TileType.Floor);
    expect(getTile(map, 2, 2)).toBe(TileType.Floor);
    expect(getTile(map, 2, 5)).toBe(TileType.Floor);
  });
});

describe("strokeRect", () => {
  it("테두리(border)만 지정 타일로 그린다", () => {
    const map = createTileMap(10, 10);
    // 4x3 사각형: x=1,y=1,w=4,h=3 → 테두리만 Wall
    strokeRect(map, 1, 1, 4, 3, TileType.Wall);

    // 상단 행: y=1, x=[1,2,3,4]
    for (let x = 1; x <= 4; x++) {
      expect(getTile(map, x, 1)).toBe(TileType.Wall);
    }
    // 하단 행: y=3, x=[1,2,3,4]
    for (let x = 1; x <= 4; x++) {
      expect(getTile(map, x, 3)).toBe(TileType.Wall);
    }
    // 왼쪽 열: x=1, y=[1,2,3]
    for (let y = 1; y <= 3; y++) {
      expect(getTile(map, 1, y)).toBe(TileType.Wall);
    }
    // 오른쪽 열: x=4, y=[1,2,3]
    for (let y = 1; y <= 3; y++) {
      expect(getTile(map, 4, y)).toBe(TileType.Wall);
    }
  });

  it("내부는 변경되지 않는다 (border only)", () => {
    const map = createTileMap(10, 10);
    strokeRect(map, 1, 1, 5, 5, TileType.Wall);
    // 내부: x=[2,3,4], y=[2,3,4]
    for (let y = 2; y <= 4; y++) {
      for (let x = 2; x <= 4; x++) {
        expect(getTile(map, x, y)).toBe(TileType.Floor);
      }
    }
  });

  it("strokeRect 뒤 fillRect로 내부를 채우면 전체가 덮인다", () => {
    const map = createTileMap(10, 10);
    strokeRect(map, 0, 0, 5, 5, TileType.Wall);
    fillRect(map, 1, 1, 3, 3, TileType.Carpet);
    // 테두리는 Wall
    expect(getTile(map, 0, 0)).toBe(TileType.Wall);
    // 내부는 Carpet
    expect(getTile(map, 1, 1)).toBe(TileType.Carpet);
    expect(getTile(map, 3, 3)).toBe(TileType.Carpet);
  });
});
