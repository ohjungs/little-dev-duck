import { describe, expect, it } from "vitest";
import { dbEmptyMessage } from "../dbEmptyState";

describe("dbEmptyMessage", () => {
  it("행 자체가 없으면 시작을 안내한다", () => {
    const msg = dbEmptyMessage({ total: 0, hasFilters: false });
    expect(msg).toContain("새 행");
    expect(msg).not.toContain("필터");
  });

  it("행은 있는데 필터가 다 가리면 그렇다고 말한다(거짓말 금지)", () => {
    const msg = dbEmptyMessage({ total: 20, hasFilters: true });
    expect(msg).toContain("필터");
    expect(msg).toContain("20");
  });

  it("필터가 걸려 있어도 원본이 0개면 '행 없음'으로 안내한다", () => {
    // 새로 만든 데이터베이스에 필터만 걸어둔 상태 — "필터가 가렸다"는 오해를 주면 안 된다
    const msg = dbEmptyMessage({ total: 0, hasFilters: true });
    expect(msg).toContain("새 행");
    expect(msg).not.toContain("필터");
  });

  it("필터가 없는데 원본이 있으면 이 함수를 부를 상황이 아니지만 안전하게 답한다", () => {
    // 표시 행 0 + 필터 없음 + 원본 있음 = 모순 상태. throw하지 않고 기본 안내로 떨어진다.
    expect(() => dbEmptyMessage({ total: 5, hasFilters: false })).not.toThrow();
    expect(dbEmptyMessage({ total: 5, hasFilters: false })).toContain("새 행");
  });

  it("음수 total 같은 이상값에도 throw하지 않는다", () => {
    expect(() => dbEmptyMessage({ total: -1, hasFilters: true })).not.toThrow();
  });
});
