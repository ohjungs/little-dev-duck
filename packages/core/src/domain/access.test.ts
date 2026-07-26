import { describe, expect, it } from "vitest";
import {
  FEATURES,
  ROLES,
  canAdminister,
  canUseFeature,
  isFeatureKey,
  parseDisabledFeatures,
  parseRole,
  roleLabel,
  type Access,
  type FeatureKey,
} from "./access";

function access(over: Partial<Access> = {}): Access {
  return { role: "user", disabledFeatures: [], ...over };
}

describe("parseRole", () => {
  it("아는 역할은 그대로", () => {
    for (const r of ROLES) expect(parseRole(r)).toBe(r);
  });

  it.each([undefined, null, "", "superuser", 42, {}])(
    "모르는 값(%s)은 가장 낮은 권한으로 떨어진다",
    (bad) => {
      // 모르면 더 주지 않는다 — 오타 하나로 관리자가 생기면 안 된다.
      expect(parseRole(bad)).toBe("user");
    },
  );

  it("컬럼이 아직 없는 상태(undefined)에서도 앱이 동작한다", () => {
    // 마이그레이션 적용 전에는 role 컬럼이 없다. 그때 throw하면 로그인 직후 화면이 죽는다.
    expect(() => parseRole(undefined)).not.toThrow();
  });
});

describe("FEATURES", () => {
  it("key가 중복되지 않는다(중복이면 토글이 서로를 덮는다)", () => {
    const keys = FEATURES.map((f) => f.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("모든 항목에 이름과 설명이 있다(관리자 화면에 그대로 나온다)", () => {
    for (const f of FEATURES) {
      expect(f.label.length).toBeGreaterThan(0);
      expect(f.description.length).toBeGreaterThan(0);
    }
  });
});

describe("parseDisabledFeatures", () => {
  it("아는 key만 남긴다", () => {
    expect(parseDisabledFeatures(["news", "존재하지않음", "office"])).toEqual([
      "news",
      "office",
    ]);
  });

  it("중복을 없앤다", () => {
    expect(parseDisabledFeatures(["news", "news"])).toEqual(["news"]);
  });

  it.each([undefined, null, "news", 42, {}])(
    "배열이 아닌 값(%s)은 빈 목록",
    (bad) => {
      expect(parseDisabledFeatures(bad)).toEqual([]);
    },
  );

  it("문자열이 아닌 원소가 섞여도 throw하지 않는다", () => {
    expect(parseDisabledFeatures(["news", 1, null, {}])).toEqual(["news"]);
  });
});

describe("canUseFeature", () => {
  it("기본값(아무것도 안 껐을 때)은 전부 쓸 수 있다", () => {
    // 끄는 목록 방식의 핵심: 새 기능이 생겨도 기존 사용자가 자동으로 쓸 수 있다.
    for (const f of FEATURES) {
      expect(canUseFeature(access(), f.key)).toBe(true);
    }
  });

  it("끈 기능만 막힌다", () => {
    const a = access({ disabledFeatures: ["news"] });
    expect(canUseFeature(a, "news")).toBe(false);
    expect(canUseFeature(a, "pages")).toBe(true);
  });

  it("관리자도 끈 기능은 못 쓴다(토글은 역할과 별개다)", () => {
    expect(canUseFeature(access({ role: "admin", disabledFeatures: ["news"] }), "news")).toBe(
      false,
    );
  });

  it("열람 전용은 작성 계열 기능이 역할 수준에서 막힌다", () => {
    const a = access({ role: "customer" });
    for (const f of ["todo", "memo", "habit", "duck-chat"] as FeatureKey[]) {
      expect(canUseFeature(a, f), f).toBe(false);
    }
  });

  it("열람 전용도 페이지 열람은 된다", () => {
    expect(canUseFeature(access({ role: "customer" }), "pages")).toBe(true);
  });
});

describe("canAdminister", () => {
  it("관리자만 통과한다", () => {
    expect(canAdminister({ role: "admin" })).toBe(true);
    expect(canAdminister({ role: "user" })).toBe(false);
    expect(canAdminister({ role: "customer" })).toBe(false);
  });

  it("기능 토글로는 관리 권한을 끌 수 없다", () => {
    // 관리자가 자기 관리 권한을 꺼 버리면 되돌릴 방법이 사라진다.
    // canAdminister는 disabledFeatures를 아예 보지 않는다는 계약을 고정한다.
    const a = access({ role: "admin", disabledFeatures: FEATURES.map((f) => f.key) });
    expect(canAdminister(a)).toBe(true);
  });
});

describe("isFeatureKey / roleLabel", () => {
  it("실재하는 key만 참", () => {
    expect(isFeatureKey("news")).toBe(true);
    expect(isFeatureKey("없는기능")).toBe(false);
  });

  it("모든 역할에 한국어 이름이 있다", () => {
    for (const r of ROLES) expect(roleLabel(r).length).toBeGreaterThan(0);
  });
});
