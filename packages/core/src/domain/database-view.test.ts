import { describe, expect, it } from "vitest";
import {
  coerceRowPropValue,
  createDefaultDbSchema,
  dbSchemaSchema,
  groupRowsByProperty,
  type PropertyDef,
  type RowProps,
} from "./database-view";

describe("createDefaultDbSchema", () => {
  it("파싱 가능한 스키마를 만든다(상태 select + 표/보드 뷰)", () => {
    const schema = createDefaultDbSchema();
    expect(() => dbSchemaSchema.parse(schema)).not.toThrow();
    expect(schema.properties).toHaveLength(1);
    expect(schema.properties[0].type).toBe("select");
  });

  it("보드 뷰는 상태 속성으로 그룹된다", () => {
    const board = createDefaultDbSchema().views.find((v) => v.type === "board");
    expect(board?.groupByPropId).toBe("status");
  });
});

describe("coerceRowPropValue", () => {
  it("checkbox: true/'true'만 참, 그 외 거짓", () => {
    expect(coerceRowPropValue("checkbox", true)).toBe(true);
    expect(coerceRowPropValue("checkbox", "true")).toBe(true);
    expect(coerceRowPropValue("checkbox", false)).toBe(false);
    expect(coerceRowPropValue("checkbox", null)).toBe(false);
  });

  it("number: 숫자로 파싱, 실패 시 null", () => {
    expect(coerceRowPropValue("number", "42")).toBe(42);
    expect(coerceRowPropValue("number", 3.5)).toBe(3.5);
    expect(coerceRowPropValue("number", "")).toBeNull();
    expect(coerceRowPropValue("number", "abc")).toBeNull();
    expect(coerceRowPropValue("number", null)).toBeNull();
    // 공백만 있는 문자열은 Number()가 0으로 만들지만 빈 값으로 취급해야 한다(코드 리뷰 LOW).
    expect(coerceRowPropValue("number", "   ")).toBeNull();
  });

  it("date: YYYY-MM-DD만 통과, 그 외 null", () => {
    expect(coerceRowPropValue("date", "2026-07-23")).toBe("2026-07-23");
    expect(coerceRowPropValue("date", "2026/07/23")).toBeNull();
    expect(coerceRowPropValue("date", "오늘")).toBeNull();
    expect(coerceRowPropValue("date", 20260723)).toBeNull();
  });

  it("text/select: 트림, 빈 문자열은 null", () => {
    expect(coerceRowPropValue("text", "  안녕  ")).toBe("안녕");
    expect(coerceRowPropValue("text", "   ")).toBeNull();
    expect(coerceRowPropValue("select", "todo")).toBe("todo");
    expect(coerceRowPropValue("select", null)).toBeNull();
  });
});

describe("groupRowsByProperty", () => {
  const prop: PropertyDef = {
    id: "status",
    name: "상태",
    type: "select",
    options: [
      { id: "todo", name: "할 일", color: "gray" },
      { id: "done", name: "완료", color: "green" },
    ],
  };
  const row = (id: string, status: RowProps["x"] | undefined) => ({
    id,
    rowProps: (status === undefined ? {} : { status }) as RowProps,
  });

  it("옵션별 열로 나누고 옵션 순서를 유지한다", () => {
    const groups = groupRowsByProperty(
      [row("a", "todo"), row("b", "done"), row("c", "todo")],
      prop,
    );
    // todo, done, 없음(null) 순
    expect(groups.map((g) => g.option?.id ?? null)).toEqual([
      "todo",
      "done",
      null,
    ]);
    expect(groups[0].rows.map((r) => r.id)).toEqual(["a", "c"]);
    expect(groups[1].rows.map((r) => r.id)).toEqual(["b"]);
  });

  it("값 없음/미지의 옵션은 '없음' 그룹으로 모은다", () => {
    const groups = groupRowsByProperty(
      [row("a", undefined), row("b", "deleted-option"), row("c", null)],
      prop,
    );
    const none = groups[groups.length - 1];
    expect(none.option).toBeNull();
    expect(none.rows.map((r) => r.id)).toEqual(["a", "b", "c"]);
  });

  it("빈 옵션이어도 '없음' 그룹은 항상 존재한다", () => {
    const groups = groupRowsByProperty([row("a", undefined)], {
      ...prop,
      options: [],
    });
    expect(groups).toHaveLength(1);
    expect(groups[0].option).toBeNull();
    expect(groups[0].rows.map((r) => r.id)).toEqual(["a"]);
  });
});
