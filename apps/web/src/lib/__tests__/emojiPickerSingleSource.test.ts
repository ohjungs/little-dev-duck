import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// 2026-07-29 : 공용 이모지 피커 - 단일 출처 (Phase 54 T1)
// PageEditor 안에 있던 피커를 공용으로 추출했다. 최근 이모지 키가 다시 두 곳에 생기면
// "자주 쓰는" 목록이 화면마다 갈라진다 — 그 회귀를 정적으로 막는다.

describe("이모지 피커 단일 출처", () => {
  it("최근 이모지 키는 EmojiPicker에만 있다", () => {
    const files = ["src/components/PageEditor.tsx"];
    for (const f of files) {
      const src = readFileSync(join(process.cwd(), f), "utf8");
      expect(src).not.toContain("ldd:recent-emojis");
      expect(src).toContain("EmojiPicker");
    }
    const picker = readFileSync(join(process.cwd(), "src/components/EmojiPicker.tsx"), "utf8");
    expect(picker).toContain("ldd:recent-emojis");
  });

  it("PageEditor에 IconPicker 구현이 남아 있지 않다 (두 벌 방지)", () => {
    const src = readFileSync(join(process.cwd(), "src/components/PageEditor.tsx"), "utf8");
    expect(src).not.toMatch(/function IconPicker/);
  });
});
