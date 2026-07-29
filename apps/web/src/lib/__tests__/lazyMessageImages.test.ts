import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// 2026-07-29 : 메신저 - 첨부 이미지 지연 로딩 (Phase 55 T3 K-024)
// 무료 티어 대역폭이 월 5GB다. 대화·갤러리의 <img>가 화면 밖 것까지 전부 내려받으면
// 오래된 방을 열 때마다 대역폭이 샌다 — 모든 <img>에 loading="lazy"를 정적으로 강제한다.
// (뷰어 확대 이미지는 사용자가 연 것이라 예외가 필요해지면 이 검사에 명시하고 사유를 적는다.)

describe("메시지 이미지 지연 로딩", () => {
  it("MessageRoom의 모든 <img>에 loading=\"lazy\"가 있다", () => {
    const src = readFileSync(
      join(process.cwd(), "src/components/MessageRoom.tsx"),
      "utf8",
    );
    const imgTags = src.match(/<img[\s\S]*?\/>/g) ?? [];
    expect(imgTags.length).toBeGreaterThan(0);
    for (const tag of imgTags) {
      expect(tag, `loading="lazy" 누락: ${tag.slice(0, 80)}`).toContain('loading="lazy"');
    }
  });
});
