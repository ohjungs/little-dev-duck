import { describe, expect, it } from "vitest";
import {
  coerceRowPropValue,
  createDefaultDbSchema,
  dbSchemaSchema,
  filterRows,
  groupRowsByProperty,
  sortRows,
  TITLE_PROP_ID,
  viewDefSchema,
  type FilterSpec,
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

// 정렬/필터 테스트용 속성과 행 팩토리.
const PROPS: PropertyDef[] = [
  { id: "score", name: "점수", type: "number", options: [] },
  { id: "done", name: "완료", type: "checkbox", options: [] },
  {
    id: "status",
    name: "상태",
    type: "select",
    options: [
      { id: "todo", name: "할 일", color: "gray" },
      { id: "done", name: "완료", color: "green" },
    ],
  },
  { id: "note", name: "메모", type: "text", options: [] },
];
const dbRow = (id: string, title: string, rowProps: RowProps) => ({
  id,
  title,
  rowProps,
});

describe("sortRows", () => {
  it("정렬 스펙이 null이면 원본 순서의 새 배열을 반환하고 입력을 변형하지 않는다", () => {
    const rows = [dbRow("a", "A", {}), dbRow("b", "B", {})];
    const out = sortRows(rows, null, PROPS);
    expect(out.map((r) => r.id)).toEqual(["a", "b"]);
    expect(out).not.toBe(rows);
  });

  it("숫자 오름차순/내림차순으로 정렬하고 빈 값은 항상 맨 뒤로 보낸다", () => {
    const rows = [
      dbRow("a", "", { score: 30 }),
      dbRow("b", "", {}),
      dbRow("c", "", { score: 10 }),
      dbRow("d", "", { score: 20 }),
    ];
    const asc = sortRows(rows, { propId: "score", direction: "asc" }, PROPS);
    expect(asc.map((r) => r.id)).toEqual(["c", "d", "a", "b"]); // b(빈값) 맨 뒤
    const desc = sortRows(rows, { propId: "score", direction: "desc" }, PROPS);
    expect(desc.map((r) => r.id)).toEqual(["a", "d", "c", "b"]); // 빈값은 desc에서도 맨 뒤
  });

  it("텍스트/제목을 로케일 비교로 정렬한다(TITLE_PROP_ID)", () => {
    const rows = [
      dbRow("a", "바나나", {}),
      dbRow("b", "가지", {}),
      dbRow("c", "사과", {}),
    ];
    const out = sortRows(
      rows,
      { propId: TITLE_PROP_ID, direction: "asc" },
      PROPS,
    );
    // 한글 자모순: 가지(b) < 바나나(a) < 사과(c)
    expect(out.map((r) => r.id)).toEqual(["b", "a", "c"]);
  });

  it("동일 값에 대해 안정 정렬을 유지한다", () => {
    const rows = [
      dbRow("a", "", { score: 5 }),
      dbRow("b", "", { score: 5 }),
      dbRow("c", "", { score: 5 }),
    ];
    const out = sortRows(rows, { propId: "score", direction: "asc" }, PROPS);
    expect(out.map((r) => r.id)).toEqual(["a", "b", "c"]);
  });
});

describe("filterRows", () => {
  const rows = [
    dbRow("a", "회의 준비", { status: "todo", score: 10, note: "긴급" }),
    dbRow("b", "코드 리뷰", { status: "done", score: 30, done: true }),
    dbRow("c", "점심 약속", { status: "todo", score: 20 }),
  ];

  it("빈 필터 배열이면 모든 행을 통과시킨다", () => {
    expect(filterRows(rows, [], PROPS).map((r) => r.id)).toEqual([
      "a",
      "b",
      "c",
    ]);
  });

  it("select equals/not_equals", () => {
    const eq: FilterSpec = { propId: "status", op: "equals", value: "todo" };
    expect(filterRows(rows, [eq], PROPS).map((r) => r.id)).toEqual(["a", "c"]);
    const ne: FilterSpec = {
      propId: "status",
      op: "not_equals",
      value: "todo",
    };
    expect(filterRows(rows, [ne], PROPS).map((r) => r.id)).toEqual(["b"]);
  });

  it("text contains(대소문자 무시)", () => {
    const f: FilterSpec = { propId: "note", op: "contains", value: "긴급" };
    expect(filterRows(rows, [f], PROPS).map((r) => r.id)).toEqual(["a"]);
  });

  it("is_empty/is_not_empty", () => {
    const empty: FilterSpec = { propId: "note", op: "is_empty", value: null };
    expect(filterRows(rows, [empty], PROPS).map((r) => r.id)).toEqual([
      "b",
      "c",
    ]);
    const notEmpty: FilterSpec = {
      propId: "note",
      op: "is_not_empty",
      value: null,
    };
    expect(filterRows(rows, [notEmpty], PROPS).map((r) => r.id)).toEqual(["a"]);
  });

  it("number gt/lt", () => {
    const gt: FilterSpec = { propId: "score", op: "gt", value: 15 };
    expect(filterRows(rows, [gt], PROPS).map((r) => r.id)).toEqual(["b", "c"]);
    const lt: FilterSpec = { propId: "score", op: "lt", value: 15 };
    expect(filterRows(rows, [lt], PROPS).map((r) => r.id)).toEqual(["a"]);
  });

  it("checkbox equals — 미설정은 false로 취급", () => {
    const checked: FilterSpec = { propId: "done", op: "equals", value: true };
    expect(filterRows(rows, [checked], PROPS).map((r) => r.id)).toEqual(["b"]);
    const unchecked: FilterSpec = {
      propId: "done",
      op: "equals",
      value: false,
    };
    expect(filterRows(rows, [unchecked], PROPS).map((r) => r.id)).toEqual([
      "a",
      "c",
    ]);
  });

  it("여러 필터는 AND로 결합된다", () => {
    const filters: FilterSpec[] = [
      { propId: "status", op: "equals", value: "todo" },
      { propId: "score", op: "gt", value: 15 },
    ];
    expect(filterRows(rows, filters, PROPS).map((r) => r.id)).toEqual(["c"]);
  });

  it("제목으로 필터한다(TITLE_PROP_ID contains)", () => {
    const f: FilterSpec = {
      propId: TITLE_PROP_ID,
      op: "contains",
      value: "약속",
    };
    expect(filterRows(rows, [f], PROPS).map((r) => r.id)).toEqual(["c"]);
  });
});

describe("viewDefSchema 하위호환", () => {
  it("sort/filters 없는 기존 뷰도 파싱되며 기본값이 채워진다", () => {
    const parsed = viewDefSchema.parse({
      id: "table",
      name: "표",
      type: "table",
      groupByPropId: null,
    });
    expect(parsed.sort).toBeNull();
    expect(parsed.filters).toEqual([]);
    expect(parsed.hiddenPropIds).toEqual([]);
  });

  it("createDefaultDbSchema의 뷰도 sort/filters/hiddenPropIds 기본값을 가진다", () => {
    const schema = dbSchemaSchema.parse(createDefaultDbSchema());
    for (const v of schema.views) {
      expect(v.sort).toBeNull();
      expect(v.filters).toEqual([]);
      expect(v.hiddenPropIds).toEqual([]);
    }
  });
});
