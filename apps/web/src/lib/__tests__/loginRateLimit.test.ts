import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// 2026-07-27 : 로그인 - 시도 상한 - 인벤토리 (Phase 41 T2)
// CLAUDE.md 3-5절: 공통 기능 재구현은 **최고 심각도 인벤토리 위반**이다.
// 이 저장소는 Phase 36에서 정확히 그걸로 데였다(교훈 L-16 — 레이트 리밋을 두 벌 만들었다).
// 계획이 "공용 allowRequest를 쓴다"고 못박았으므로, 그게 지켜지는지 코드로 검사한다.
// 사람 눈으로만 보면 다음 사람이 "간단하니까"라며 Map을 하나 더 만든다.
const source = readFileSync(
  join(process.cwd(), "src/app/login/LoginForm.tsx"),
  "utf8",
);

describe("로그인 시도 상한", () => {
  it("공용 allowRequest를 쓴다", () => {
    expect(source).toContain('from "@ldd/api"');
    expect(source).toContain("allowRequest(");
  });

  it("자체 상한 자료구조를 만들지 않는다", () => {
    // new Map()/new Set()으로 시도 기록을 직접 들고 있으면 두 벌이 된다.
    expect(source).not.toMatch(/new Map\s*\(/);
    expect(source).not.toMatch(/attempts\s*(?::|=)/i);
  });

  it("한계를 주석에 적어 둔다 (적지 않으면 다음 사람이 방어선이라고 믿는다)", () => {
    // 계획이 명시적으로 요구한 항목이다: 이 상한은 탭 메모리에 살고, 실제 방어선은
    // Supabase Auth 자체의 상한이다.
    expect(source).toContain("보안 통제가 아니다");
    expect(source).toContain("Supabase Auth");
  });

  it("상한을 넘겼을 때 사람 말로 알린다", () => {
    expect(source).toContain("잠시 뒤에 다시 시도해 주세요");
  });
});
