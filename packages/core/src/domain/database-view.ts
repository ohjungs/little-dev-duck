import { z } from "zod";

// Phase 11 DB 뷰(표/보드). 데이터베이스 = db_schema가 설정된 페이지, 행 = 그 페이지의 자식 페이지.
// 행의 속성값은 pages.row_props(jsonb). 새 테이블 없이 pages 재사용(ponytail — phase_11.md 설계 판단).

export const PROPERTY_TYPES = [
  "text",
  "number",
  "select",
  "checkbox",
  "date",
] as const;
export const propertyTypeSchema = z.enum(PROPERTY_TYPES);
export type PropertyType = z.infer<typeof propertyTypeSchema>;

// select 속성의 선택지. id로 row_props가 참조, name/color는 표시용.
export const selectOptionSchema = z.object({
  id: z.string().min(1).max(64),
  name: z.string().min(1).max(100),
  color: z.string().max(32).default("gray"),
});
export type SelectOption = z.infer<typeof selectOptionSchema>;

// 속성 정의(열). options는 select 타입에서만 의미 — 그 외 타입은 빈 배열.
export const propertyDefSchema = z.object({
  id: z.string().min(1).max(64),
  name: z.string().min(1).max(100),
  type: propertyTypeSchema,
  options: z.array(selectOptionSchema).default([]),
});
export type PropertyDef = z.infer<typeof propertyDefSchema>;

export const VIEW_TYPES = ["table", "board"] as const;
export const viewTypeSchema = z.enum(VIEW_TYPES);
export type ViewType = z.infer<typeof viewTypeSchema>;

// 뷰 정의. board는 groupByPropId(select 속성)로 카드를 열로 나눈다. table은 groupBy 무시.
export const viewDefSchema = z.object({
  id: z.string().min(1).max(64),
  name: z.string().min(1).max(100),
  type: viewTypeSchema,
  groupByPropId: z.string().max(64).nullable().default(null),
});
export type ViewDef = z.infer<typeof viewDefSchema>;

// 데이터베이스 스키마(페이지의 db_schema). properties=열, views=뷰 목록(최소 1개).
export const dbSchemaSchema = z.object({
  properties: z.array(propertyDefSchema),
  views: z.array(viewDefSchema).min(1),
});
export type DbSchema = z.infer<typeof dbSchemaSchema>;

// 행의 속성값. propId -> 값. select는 optionId(문자열), checkbox는 불리언, date는 'YYYY-MM-DD'.
export const rowPropValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
]);
export type RowPropValue = z.infer<typeof rowPropValueSchema>;
// Zod v4는 z.record(valueSchema) 단일 인자를 키 스키마로 해석하므로(값=unknown) 반드시 (key, value) 두 인자.
export const rowPropsSchema = z.record(z.string(), rowPropValueSchema);
export type RowProps = z.infer<typeof rowPropsSchema>;

// 새 데이터베이스의 기본 스키마: "상태" select 1열 + 표·보드 뷰. 보드는 상태로 그룹돼 바로 kanban.
// id는 스키마 내 유일하면 되므로 읽기 쉬운 고정값(사용자가 추가하는 열·옵션은 UI가 uuid 생성).
export function createDefaultDbSchema(): DbSchema {
  return {
    properties: [
      {
        id: "status",
        name: "상태",
        type: "select",
        options: [
          { id: "todo", name: "할 일", color: "gray" },
          { id: "doing", name: "진행 중", color: "yellow" },
          { id: "done", name: "완료", color: "green" },
        ],
      },
    ],
    views: [
      { id: "table", name: "표", type: "table", groupByPropId: null },
      { id: "board", name: "보드", type: "board", groupByPropId: "status" },
    ],
  };
}

// 원시 입력을 속성 타입에 맞는 저장값으로 정규화. 빈 값은 null로 통일해 row_props를 sparse하게 유지.
// select 옵션 유효성(실제 존재하는 optionId인지)은 호출부(드롭다운)가 보장 — 여기선 타입만.
export function coerceRowPropValue(
  type: PropertyType,
  raw: unknown,
): RowPropValue {
  switch (type) {
    case "checkbox":
      return raw === true || raw === "true";
    case "number": {
      if (raw === "" || raw == null) return null;
      const n = typeof raw === "number" ? raw : Number(raw);
      return Number.isFinite(n) ? n : null;
    }
    case "date": {
      if (typeof raw !== "string") return null;
      return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : null;
    }
    case "select":
    case "text":
    default: {
      if (typeof raw !== "string") return raw == null ? null : String(raw);
      const s = raw.trim();
      return s === "" ? null : s;
    }
  }
}

export interface RowGroup<T> {
  option: SelectOption | null; // null = "없음"(값 없음/미지의 옵션) 그룹
  rows: T[];
}

// 보드 뷰용 그룹핑: select 속성값으로 행을 열로 나눈다. 옵션 순서 유지 + 맨 끝에 "없음" 그룹.
// 알 수 없는 optionId(옵션 삭제 등)나 null/미설정은 전부 "없음"으로 모은다(유실 방지).
export function groupRowsByProperty<T extends { rowProps: RowProps }>(
  rows: readonly T[],
  prop: PropertyDef,
): RowGroup<T>[] {
  const byOption = new Map<string, T[]>();
  for (const opt of prop.options) byOption.set(opt.id, []);
  const none: T[] = [];
  for (const row of rows) {
    const v = row.rowProps[prop.id];
    const bucket = typeof v === "string" ? byOption.get(v) : undefined;
    if (bucket) bucket.push(row);
    else none.push(row);
  }
  const groups: RowGroup<T>[] = prop.options.map((opt) => ({
    option: opt,
    rows: byOption.get(opt.id) ?? [],
  }));
  groups.push({ option: null, rows: none });
  return groups;
}
