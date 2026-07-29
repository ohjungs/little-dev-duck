import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { draftKey } from "../messageDraft";

// 2026-07-29 : 메신저 - 입력 임시저장 (Phase 54 선행)
// vitest가 node 환경이라 localStorage 실동작은 여기서 못 본다(55번 실기검증 항목).
// 대신 결정적으로 검사할 수 있는 것을 검사한다: 키 규칙과 단일 출처.

describe("draftKey", () => {
  it("방마다 다른 키를 만든다 (섞이면 다른 방 초안이 나타난다)", () => {
    expect(draftKey("room-a")).not.toBe(draftKey("room-b"));
  });

  it("ldd- 접두사 규칙을 따른다 (백업·정리 코드가 이 규칙으로 우리 키를 찾는다)", () => {
    expect(draftKey("r1").startsWith("ldd-")).toBe(true);
  });
});

describe("초안 키 단일 출처", () => {
  it("MessageRoom은 lib을 통해서만 초안을 다룬다 (키 문자열 재작성 금지)", () => {
    const src = readFileSync(
      join(process.cwd(), "src/components/MessageRoom.tsx"),
      "utf8",
    );
    expect(src).toContain("loadDraft");
    expect(src).toContain("saveDraft");
    expect(src).not.toMatch(/"ldd-msg-draft/);
  });
});
