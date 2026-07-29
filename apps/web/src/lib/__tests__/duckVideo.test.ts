import { describe, it, expect } from "vitest";
import { existsSync, statSync } from "node:fs";
import path from "node:path";
import {
  DUCK_QUACK_EMBLEM_BOUNDS,
  coverRect,
  getDuckVideoSpec,
  objectPositionCss,
} from "../duckVideo";

const PUBLIC_DIR = path.resolve(__dirname, "../../../public");

describe("coverRect", () => {
  it("컨테이너가 원본보다 가로로 넓으면 폭을 다 쓰고 높이를 자른다", () => {
    // 세로 영상(720x1280)을 정사각 틀에 담으면 높이만 잘린다
    const r = coverRect({ w: 720, h: 1280 }, 1, 0.5, 0.5);
    expect(r.w).toBe(720);
    expect(r.h).toBe(720);
    expect(r.y).toBe(280); // (1280-720)/2
    expect(r.x).toBe(0);
  });

  it("컨테이너가 원본보다 세로로 길면 높이를 다 쓰고 폭을 자른다", () => {
    // 가로 영상(1280x720)을 정사각 틀에 담으면 좌우가 잘린다
    const r = coverRect({ w: 1280, h: 720 }, 1, 0.5, 0.5);
    expect(r.h).toBe(720);
    expect(r.w).toBe(720);
    expect(r.x).toBe(280);
    expect(r.y).toBe(0);
  });

  it("object-position이 0이면 위(또는 왼쪽)에 붙고 1이면 끝에 붙는다", () => {
    expect(coverRect({ w: 720, h: 1280 }, 1, 0.5, 0).y).toBe(0);
    expect(coverRect({ w: 720, h: 1280 }, 1, 0.5, 1).y).toBe(560);
    expect(coverRect({ w: 1280, h: 720 }, 1, 0, 0.5).x).toBe(0);
    expect(coverRect({ w: 1280, h: 720 }, 1, 1, 0.5).x).toBe(560);
  });
});

describe("getDuckVideoSpec", () => {
  it("로그인 영상의 크롭 창이 엠블럼(아치 문구~리본)을 잘라내지 않는다", () => {
    const spec = getDuckVideoSpec("login");
    const rect = coverRect(
      spec.source,
      spec.aspectRatio,
      spec.objectPosition.x,
      spec.objectPosition.y,
    );
    // 이게 깨지면 "QUACK GRATIA ARTIS" 윗줄이나 리본 아래가 잘려 나간다
    expect(rect.y).toBeLessThanOrEqual(DUCK_QUACK_EMBLEM_BOUNDS.top);
    expect(rect.y + rect.h).toBeGreaterThanOrEqual(DUCK_QUACK_EMBLEM_BOUNDS.bottom);
  });

  it("로그인은 한 번만 재생하고(완성 엠블럼에서 정지), 랜딩은 반복한다", () => {
    expect(getDuckVideoSpec("login").loop).toBe(false);
    expect(getDuckVideoSpec("welcome").loop).toBe(true);
  });

  it("두 화면이 서로 다른 영상과 포스터를 쓴다", () => {
    const login = getDuckVideoSpec("login");
    const welcome = getDuckVideoSpec("welcome");
    expect(login.src).not.toBe(welcome.src);
    expect(login.poster).not.toBe(welcome.poster);
  });

  it("참조하는 mp4와 포스터가 public에 실제로 존재한다", () => {
    for (const surface of ["login", "welcome", "logo"] as const) {
      const spec = getDuckVideoSpec(surface);
      for (const asset of [spec.src, spec.poster]) {
        expect(
          existsSync(path.join(PUBLIC_DIR, asset)),
          `${asset} 가 public에 없다`,
        ).toBe(true);
      }
    }
  });

  it("대체 텍스트가 비어 있지 않다", () => {
    for (const surface of ["login", "welcome", "logo"] as const) {
      expect(getDuckVideoSpec(surface).label.length, surface).toBeGreaterThan(0);
    }
  });

  // 2026-07-26 (피드백 1-6): 로고는 24px인데 랜딩 영상은 1280x720이다. 그걸 그대로 쓰면
  // 브라우저가 24px을 그리려고 720p 프레임을 **모든 앱 화면에서 상시** 디코딩한다.
  // 로고용으로 줄인 파일을 쓰는 것이 이 변경의 핵심이라, 되돌아가면 실패하게 잠근다.
  it("로고는 랜딩용 720p 원본을 쓰지 않는다", () => {
    const logo = getDuckVideoSpec("logo");
    const welcome = getDuckVideoSpec("welcome");
    expect(logo.src).not.toBe(welcome.src);
    // 2026-07-29 (사용자 피드백 "로고 해상도 깨짐"): 96 → 192로 재인코딩. 잠그는 것은
    // "720p 원본 금지"이지 특정 픽셀이 아니다 — 상한만 256으로 올려 원본 회귀를 계속 막는다.
    expect(logo.source.w).toBeLessThanOrEqual(256);
    expect(logo.source.h).toBeLessThanOrEqual(256);
  });

  it("로고 영상은 정사각이고 반복 재생한다", () => {
    // "계속 움직이는것처럼" — 한 번 재생하고 멈추면 요구를 만족하지 못한다.
    const logo = getDuckVideoSpec("logo");
    expect(logo.loop).toBe(true);
    expect(logo.aspectRatio).toBe(1);
    expect(logo.source.w).toBe(logo.source.h);
  });

  it("로고 파일이 원본보다 확실히 작다 (상시 노출이라 무게가 곧 비용)", () => {
    const sizeOf = (p: string) => statSync(path.join(PUBLIC_DIR, p)).size;
    expect(sizeOf(getDuckVideoSpec("logo").src)).toBeLessThan(
      sizeOf(getDuckVideoSpec("welcome").src) / 4,
    );
  });
});

describe("objectPositionCss", () => {
  it("비율을 퍼센트 CSS 값으로 바꾼다", () => {
    expect(objectPositionCss({ x: 0.5, y: 0.395 })).toBe("50% 39.5%");
    expect(objectPositionCss({ x: 0, y: 1 })).toBe("0% 100%");
  });
});

