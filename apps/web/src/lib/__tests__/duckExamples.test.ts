import { describe, expect, it } from "vitest";
import { routeUtterance } from "@ldd/core";
import { DUCK_EXAMPLES } from "../duckExamples";

// 이 테스트의 요지: **안내에 적힌 예시가 실제로 오리에게 도달해야 한다.**
// 2026-07-26에 정확히 그 반대가 일어났다 — Phase 19가 명세에 적어둔 "오늘 독서 했어"가
// 라우터에서 캔 답변으로 새어 도구가 한 번도 불리지 않았다. 예시를 화면에 걸어 두고
// 정작 동작하지 않으면 사용자를 속이는 셈이라, 예시마다 라우팅을 검사한다.

describe("DUCK_EXAMPLES", () => {
  it("모든 예시가 오리(LLM)에게 도달한다", () => {
    for (const ex of DUCK_EXAMPLES) {
      expect(routeUtterance(ex.text), ex.text).toBe("llm");
    }
  });

  it("도구 카탈로그의 주요 동작을 고르게 덮는다", () => {
    // 조회(RAG) + 생성 + 완료/체크가 최소 하나씩은 있어야 "뭘 할 수 있는지"가 전달된다.
    const kinds = new Set(DUCK_EXAMPLES.map((e) => e.kind));
    expect(kinds).toContain("ask");
    expect(kinds).toContain("create");
    expect(kinds).toContain("check");
  });

  it("한 화면에 부담 없는 개수다", () => {
    // 많으면 읽지 않고, 적으면 범위를 못 알린다.
    expect(DUCK_EXAMPLES.length).toBeGreaterThanOrEqual(3);
    expect(DUCK_EXAMPLES.length).toBeLessThanOrEqual(5);
  });

  it("예시 문구가 비어 있지 않다", () => {
    for (const ex of DUCK_EXAMPLES) {
      expect(ex.text.trim().length).toBeGreaterThan(0);
    }
  });
});
