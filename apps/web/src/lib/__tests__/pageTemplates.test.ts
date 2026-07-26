import { describe, it, expect } from "vitest";
import { dbSchemaSchema } from "@ldd/core";
import { PAGE_TEMPLATES, templateTitle } from "../pageTemplates";

describe("PAGE_TEMPLATES", () => {
  it("has at least one template", () => {
    expect(PAGE_TEMPLATES.length).toBeGreaterThan(0);
  });

  it("every template has a non-empty key and label", () => {
    for (const tpl of PAGE_TEMPLATES) {
      expect(typeof tpl.key).toBe("string");
      expect(tpl.key.length).toBeGreaterThan(0);
      expect(typeof tpl.label).toBe("string");
      expect(tpl.label.length).toBeGreaterThan(0);
    }
  });

  it("every template has a content array", () => {
    for (const tpl of PAGE_TEMPLATES) {
      expect(Array.isArray(tpl.content)).toBe(true);
    }
  });

  it("blank template has empty content and empty title", () => {
    const blank = PAGE_TEMPLATES.find((t) => t.key === "blank");
    expect(blank).toBeDefined();
    expect(blank!.content).toHaveLength(0);
    expect(blank!.title).toBe("");
  });

  it("all keys are unique", () => {
    const keys = PAGE_TEMPLATES.map((t) => t.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

// Phase 18 T2: 데이터베이스 템플릿(열·뷰가 미리 잡힌 페이지) + 날짜가 들어가는 제목.
const MONDAY = new Date(2026, 6, 20, 9, 0);

describe("데이터베이스 템플릿", () => {
  const dbTemplates = PAGE_TEMPLATES.filter((t) => t.dbSchema);

  it("데이터베이스 템플릿이 존재한다", () => {
    expect(dbTemplates.length).toBeGreaterThan(0);
  });

  it("dbSchema가 core 스키마 검증을 통과한다(createPage가 저장 전 parse함)", () => {
    for (const t of dbTemplates) {
      expect(() => dbSchemaSchema.parse(t.dbSchema), t.key).not.toThrow();
    }
  });

  it("보드 뷰의 groupByPropId는 실재하는 select 속성을 가리킨다", () => {
    for (const t of dbTemplates) {
      for (const view of t.dbSchema!.views.filter((v) => v.type === "board")) {
        const target = t.dbSchema!.properties.find(
          (p) => p.id === view.groupByPropId,
        );
        expect(target, `${t.key}: 보드 groupBy 대상 없음`).toBeDefined();
        expect(target!.type).toBe("select");
      }
    }
  });

  it("속성 id가 템플릿 안에서 겹치지 않는다", () => {
    for (const t of dbTemplates) {
      const ids = t.dbSchema!.properties.map((p) => p.id);
      expect(new Set(ids).size, t.key).toBe(ids.length);
    }
  });
});

describe("templateTitle", () => {
  it("고정 제목 템플릿은 그대로 돌려준다", () => {
    const meeting = PAGE_TEMPLATES.find((t) => t.key === "meeting")!;
    expect(templateTitle(meeting, MONDAY)).toBe("회의록");
  });

  it("빈 페이지는 빈 제목을 유지한다", () => {
    const blank = PAGE_TEMPLATES.find((t) => t.key === "blank")!;
    expect(templateTitle(blank, MONDAY)).toBe("");
  });

  it("일일 노트 제목에 그날 날짜가 붙는다", () => {
    const daily = PAGE_TEMPLATES.find((t) => t.key === "daily")!;
    expect(templateTitle(daily, MONDAY)).toContain("2026-07-20");
  });

  it("주간 회고는 요일과 무관하게 그 주 월요일로 묶인다", () => {
    const retro = PAGE_TEMPLATES.find((t) => t.key === "weekly-retro")!;
    const wednesday = new Date(2026, 6, 22, 23, 30);
    expect(templateTitle(retro, wednesday)).toBe(
      templateTitle(retro, MONDAY),
    );
    expect(templateTitle(retro, MONDAY)).toContain("2026-07-20");
  });

  it("자정 직후에도 날짜가 하루 밀리지 않는다", () => {
    const daily = PAGE_TEMPLATES.find((t) => t.key === "daily")!;
    expect(templateTitle(daily, new Date(2026, 6, 21, 0, 30))).toContain(
      "2026-07-21",
    );
  });
});

// 2026-07-26 : 활성화 - 템플릿 - 일기·포트폴리오·회고록 (피드백 2-3)
// 사용자가 이름을 직접 댄 템플릿들이다. 지우거나 이름을 바꾸면 요구가 조용히 사라지므로
// 존재 자체를 검사로 잠근다.
describe("사용자가 요청한 템플릿(피드백 2-3)", () => {
  it.each(["회의록", "일기", "포트폴리오", "회고록"])("'%s' 템플릿이 있다", (label) => {
    expect(PAGE_TEMPLATES.some((t) => t.label === label)).toBe(true);
  });

  it("새로 추가한 템플릿들도 본문이 비어 있지 않다(고르면 백지가 아니어야 한다)", () => {
    for (const key of ["diary", "portfolio", "retrospective"]) {
      const t = PAGE_TEMPLATES.find((x) => x.key === key);
      expect(t, `${key} 템플릿이 없다`).toBeDefined();
      expect(t!.content.length).toBeGreaterThan(0);
    }
  });
});
