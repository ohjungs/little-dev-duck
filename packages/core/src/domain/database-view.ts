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
// 옵션 100개 상한(저장소 남용 방어 — 보안 리뷰 MEDIUM).
export const propertyDefSchema = z.object({
  id: z.string().min(1).max(64),
  name: z.string().min(1).max(100),
  type: propertyTypeSchema,
  options: z.array(selectOptionSchema).max(100).default([]),
});
export type PropertyDef = z.infer<typeof propertyDefSchema>;

export const VIEW_TYPES = ["table", "board"] as const;
export const viewTypeSchema = z.enum(VIEW_TYPES);
export type ViewType = z.infer<typeof viewTypeSchema>;

// 셀 값 문자열 상한(저장소 남용 방어 — 보안 리뷰 MEDIUM). 셀은 짧은 속성값용 —
// 긴 글은 행 자체가 페이지이므로 본문에 쓴다. UI 입력에도 동일 maxLength.
// (필터 값이 rowPropValueSchema를 재사용하므로 정렬/필터 스키마보다 먼저 정의한다.)
export const ROW_VALUE_MAX = 2000;

// 행의 속성값. propId -> 값. select는 optionId(문자열), checkbox는 불리언, date는 'YYYY-MM-DD'.
export const rowPropValueSchema = z.union([
  z.string().max(ROW_VALUE_MAX),
  z.number(),
  z.boolean(),
  z.null(),
]);
export type RowPropValue = z.infer<typeof rowPropValueSchema>;

// 정렬/필터의 대상으로 행 "제목"을 가리키는 예약 propId(실제 속성 id와 충돌 없게 __ 접두).
// 제목은 row_props가 아니라 pages.title이므로 순수함수가 이 값을 만나면 title 필드를 본다.
export const TITLE_PROP_ID = "__title__";

// 정렬 스펙: 한 속성(또는 제목) 기준 오름/내림. 빈 값은 방향과 무관하게 항상 맨 뒤로.
export const sortSpecSchema = z.object({
  propId: z.string().min(1).max(64),
  direction: z.enum(["asc", "desc"]).default("asc"),
});
export type SortSpec = z.infer<typeof sortSpecSchema>;

// 필터 연산자. 타입별 UI가 의미 있는 것만 노출하지만(예: contains는 텍스트),
// 순수함수는 타입을 보고 해석하므로 잘못된 조합도 안전하게 false/무시된다.
export const FILTER_OPS = [
  "equals",
  "not_equals",
  "contains",
  "gt",
  "lt",
  "is_empty",
  "is_not_empty",
] as const;
export const filterOpSchema = z.enum(FILTER_OPS);
export type FilterOp = z.infer<typeof filterOpSchema>;

// 한 필터 조건. value는 op에 따라 무시될 수 있다(is_empty 등). 뷰당 상한으로 남용 방어.
export const MAX_FILTERS = 20;
export const filterSpecSchema = z.object({
  propId: z.string().min(1).max(64),
  op: filterOpSchema,
  value: rowPropValueSchema.default(null),
});
export type FilterSpec = z.infer<typeof filterSpecSchema>;

// 뷰 정의. board는 groupByPropId(select 속성)로 카드를 열로 나눈다. table은 groupBy 무시.
// sort/filters는 하위호환 기본값(기존 db_schema jsonb에는 없으므로 null/[]로 채움 — 마이그레이션 불필요).
export const viewDefSchema = z.object({
  id: z.string().min(1).max(64),
  name: z.string().min(1).max(100),
  type: viewTypeSchema,
  groupByPropId: z.string().max(64).nullable().default(null),
  sort: sortSpecSchema.nullable().default(null),
  filters: z.array(filterSpecSchema).max(MAX_FILTERS).default([]),
});
export type ViewDef = z.infer<typeof viewDefSchema>;

// 열/뷰/행속성 개수 상한(저장소 남용 방어).
export const MAX_PROPERTIES = 50;
export const MAX_VIEWS = 20;
export const MAX_ROW_PROPS = 200;

// 데이터베이스 스키마(페이지의 db_schema). properties=열, views=뷰 목록(최소 1개).
export const dbSchemaSchema = z.object({
  properties: z.array(propertyDefSchema).max(MAX_PROPERTIES),
  views: z.array(viewDefSchema).min(1).max(MAX_VIEWS),
});
export type DbSchema = z.infer<typeof dbSchemaSchema>;

// Zod v4는 z.record(valueSchema) 단일 인자를 키 스키마로 해석하므로(값=unknown) 반드시 (key, value) 두 인자.
// 키 개수 상한으로 저장소 남용 방어.
export const rowPropsSchema = z
  .record(z.string(), rowPropValueSchema)
  .refine((o) => Object.keys(o).length <= MAX_ROW_PROPS, {
    message: `행 속성은 최대 ${MAX_ROW_PROPS}개까지입니다.`,
  });
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
      {
        id: "table",
        name: "표",
        type: "table",
        groupByPropId: null,
        sort: null,
        filters: [],
      },
      {
        id: "board",
        name: "보드",
        type: "board",
        groupByPropId: "status",
        sort: null,
        filters: [],
      },
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
      // 공백만 있는 문자열도 빈 값으로 취급(Number("  ")는 0이라 트림 후 판정 — 코드 리뷰 LOW).
      const trimmed = typeof raw === "string" ? raw.trim() : raw;
      if (trimmed === "" || trimmed == null) return null;
      const n = typeof trimmed === "number" ? trimmed : Number(trimmed);
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

// ── 정렬/필터(뷰별) ────────────────────────────────────────────────────────
// 행은 자식 페이지이므로 정렬/필터는 title(제목)과 rowProps 둘 다를 대상으로 한다.
// propId === TITLE_PROP_ID면 title을, 아니면 rowProps[propId]를 본다.
export interface DbRowLike {
  title: string;
  rowProps: RowProps;
}

function fieldValue(row: DbRowLike, propId: string): RowPropValue {
  if (propId === TITLE_PROP_ID) return row.title;
  const v = row.rowProps[propId];
  return v === undefined ? null : v;
}

// 빈 값 판정: null/undefined/빈 문자열. 정렬에서 맨 뒤로, 필터 is_empty의 기준.
function isEmptyValue(v: RowPropValue): boolean {
  return v === null || v === undefined || v === "";
}

function typeOfProp(
  propId: string,
  properties: readonly PropertyDef[],
): PropertyType | "title" {
  if (propId === TITLE_PROP_ID) return "title";
  return properties.find((p) => p.id === propId)?.type ?? "text";
}

function toNumber(v: RowPropValue): number {
  return typeof v === "number" ? v : Number(v);
}

// 비어있지 않은 두 값의 순서. number는 수치, checkbox는 false<true, 그 외는 로케일 비교.
function compareNonEmpty(
  a: RowPropValue,
  b: RowPropValue,
  type: PropertyType | "title",
): number {
  if (type === "number") return toNumber(a) - toNumber(b);
  if (type === "checkbox") return (a ? 1 : 0) - (b ? 1 : 0);
  // date('YYYY-MM-DD')는 사전식=시간순이라 문자열 비교로 충분. numeric:true로 텍스트 내 숫자도 자연 정렬.
  return String(a).localeCompare(String(b), undefined, { numeric: true });
}

// 한 속성(또는 제목) 기준 정렬한 새 배열을 반환(입력 불변). 빈 값은 방향과 무관하게 항상 맨 뒤.
// sort가 null이면 원본 순서를 유지한 얕은 복사본을 준다. Array.sort는 ES2019+에서 안정 정렬.
export function sortRows<T extends DbRowLike>(
  rows: readonly T[],
  sort: SortSpec | null,
  properties: readonly PropertyDef[],
): T[] {
  if (!sort) return [...rows];
  const type = typeOfProp(sort.propId, properties);
  const dir = sort.direction === "desc" ? -1 : 1;
  return [...rows].sort((ra, rb) => {
    const a = fieldValue(ra, sort.propId);
    const b = fieldValue(rb, sort.propId);
    const ae = isEmptyValue(a);
    const be = isEmptyValue(b);
    if (ae && be) return 0;
    if (ae) return 1; // 빈 값은 항상 뒤
    if (be) return -1;
    return dir * compareNonEmpty(a, b, type);
  });
}

// 한 행이 한 필터 조건을 통과하는지. op가 타입과 안 맞으면 안전하게 false로 취급.
function rowMatchesFilter(
  row: DbRowLike,
  filter: FilterSpec,
  properties: readonly PropertyDef[],
): boolean {
  const v = fieldValue(row, filter.propId);
  const type = typeOfProp(filter.propId, properties);
  switch (filter.op) {
    case "is_empty":
      return isEmptyValue(v);
    case "is_not_empty":
      return !isEmptyValue(v);
    case "equals":
      // checkbox는 미설정(null)을 false로 취급해 "체크 안 됨" 필터가 미설정 행도 잡게 한다.
      if (type === "checkbox") return Boolean(v) === Boolean(filter.value);
      return v === filter.value;
    case "not_equals":
      if (type === "checkbox") return Boolean(v) !== Boolean(filter.value);
      return v !== filter.value;
    case "contains":
      return String(v ?? "")
        .toLowerCase()
        .includes(String(filter.value ?? "").toLowerCase());
    case "gt":
      if (isEmptyValue(v)) return false;
      if (type === "number") return toNumber(v) > toNumber(filter.value);
      return String(v) > String(filter.value);
    case "lt":
      if (isEmptyValue(v)) return false;
      if (type === "number") return toNumber(v) < toNumber(filter.value);
      return String(v) < String(filter.value);
    default:
      return true;
  }
}

// 모든 필터를 AND로 적용한 새 배열을 반환(입력 불변). 빈 배열이면 전부 통과.
export function filterRows<T extends DbRowLike>(
  rows: readonly T[],
  filters: readonly FilterSpec[],
  properties: readonly PropertyDef[],
): T[] {
  if (filters.length === 0) return [...rows];
  return rows.filter((row) =>
    filters.every((f) => rowMatchesFilter(row, f, properties)),
  );
}
