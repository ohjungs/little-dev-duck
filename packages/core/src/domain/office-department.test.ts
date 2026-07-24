import { describe, expect, it } from "vitest";
import {
  DEPARTMENTS,
  DEPT_REGISTRY,
  DUCK_NAMES,
  getDepartment,
} from "./office-department";

describe("DEPARTMENTS", () => {
  it("9개 항목을 가진다", () => {
    expect(DEPARTMENTS).toHaveLength(9);
  });
});

describe("DEPT_REGISTRY", () => {
  it("각 부서가 필수 필드를 갖는다", () => {
    for (const id of DEPARTMENTS) {
      const dept = DEPT_REGISTRY[id];
      expect(dept.id).toBe(id);
      expect(dept.label.length).toBeGreaterThan(0);
      expect(dept.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(dept.accessory.length).toBeGreaterThan(0);
      expect(dept.headcount).toBeGreaterThan(0);
      expect(dept.roles.length).toBeGreaterThan(0);
    }
  });

  it("roles 배열 길이가 headcount와 일치한다", () => {
    for (const id of DEPARTMENTS) {
      const dept = DEPT_REGISTRY[id];
      expect(dept.roles).toHaveLength(dept.headcount);
    }
  });
});

describe("getDepartment", () => {
  it("올바른 부서를 반환한다", () => {
    const eng = getDepartment("engineering");
    expect(eng.id).toBe("engineering");
    expect(eng.label).toBe("개발팀");
    expect(eng.accessory).toBe("glasses");
  });

  it("qa 부서를 반환한다", () => {
    const qa = getDepartment("qa");
    expect(qa.color).toBe("#F1C40F");
    expect(qa.accessory).toBe("magnifier");
  });
});

describe("DUCK_NAMES", () => {
  it("전체 headcount 합계 이상의 이름을 갖는다", () => {
    const totalHeadcount = DEPARTMENTS.reduce(
      (sum, id) => sum + DEPT_REGISTRY[id].headcount,
      0,
    );
    expect(DUCK_NAMES.length).toBeGreaterThanOrEqual(totalHeadcount);
  });

  it("중복이 없다", () => {
    const unique = new Set(DUCK_NAMES);
    expect(unique.size).toBe(DUCK_NAMES.length);
  });
});
