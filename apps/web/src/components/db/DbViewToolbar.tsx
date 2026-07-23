"use client";

import { useState } from "react";
import { ArrowDownUp, Filter, Plus, X } from "lucide-react";
import {
  TITLE_PROP_ID,
  type FilterOp,
  type FilterSpec,
  type PropertyDef,
  type PropertyType,
  type RowPropValue,
  type SortSpec,
} from "@ldd/core";

// 정렬/필터의 대상 필드 목록: 제목 + 모든 속성. 제목은 예약 propId로 다룬다.
type FieldType = PropertyType | "title";
interface Field {
  id: string;
  name: string;
  type: FieldType;
}

function fieldsOf(properties: PropertyDef[]): Field[] {
  return [
    { id: TITLE_PROP_ID, name: "제목", type: "title" },
    ...properties.map((p) => ({ id: p.id, name: p.name, type: p.type })),
  ];
}

function fieldById(fields: Field[], id: string): Field | undefined {
  return fields.find((f) => f.id === id);
}

// 타입별로 의미 있는 연산자만 노출(순수함수는 잘못된 조합도 안전하지만 UI는 깔끔하게).
function opsForType(type: FieldType): FilterOp[] {
  switch (type) {
    case "checkbox":
      return ["equals"];
    case "number":
      return ["equals", "not_equals", "gt", "lt", "is_empty", "is_not_empty"];
    case "select":
      return ["equals", "not_equals", "is_empty", "is_not_empty"];
    case "date":
      return ["equals", "gt", "lt", "is_empty", "is_not_empty"];
    default:
      return ["contains", "equals", "not_equals", "is_empty", "is_not_empty"];
  }
}

function opLabel(op: FilterOp, type: FieldType): string {
  if (type === "date") {
    if (op === "gt") return "이후";
    if (op === "lt") return "이전";
  }
  if (type === "number") {
    if (op === "gt") return "초과";
    if (op === "lt") return "미만";
  }
  switch (op) {
    case "equals":
      return type === "checkbox" ? "상태" : "같음";
    case "not_equals":
      return "같지 않음";
    case "contains":
      return "포함";
    case "gt":
      return "초과";
    case "lt":
      return "미만";
    case "is_empty":
      return "비어 있음";
    case "is_not_empty":
      return "값 있음";
  }
}

// value 입력이 필요 없는 연산자(존재 여부만 판단).
function opNeedsValue(op: FilterOp): boolean {
  return op !== "is_empty" && op !== "is_not_empty";
}

// 새 필터/타입 변경 시 기본값. checkbox는 false, select는 첫 옵션, 그 외는 빈 문자열.
function defaultValue(field: Field, prop?: PropertyDef): RowPropValue {
  if (field.type === "checkbox") return false;
  if (field.type === "select") return prop?.options[0]?.id ?? "";
  return "";
}

const selectClass =
  "rounded border border-border bg-transparent px-1.5 py-1 text-xs outline-none focus:ring-1 focus:ring-primary/40";

// 한 필터 조건 행. 텍스트/숫자 값은 blur/Enter에서 커밋(키 입력마다 DB 저장 방지 — 기존 셀 패턴),
// select/date/연산자/속성은 즉시 커밋. key에 propId·op를 넣어 구조 변경 시 draft가 초기화되게 한다.
function FilterRow({
  filter,
  fields,
  properties,
  onChange,
  onRemove,
}: {
  filter: FilterSpec;
  fields: Field[];
  properties: PropertyDef[];
  onChange: (next: FilterSpec) => void;
  onRemove: () => void;
}) {
  const field = fieldById(fields, filter.propId) ?? fields[0];
  const prop = properties.find((p) => p.id === filter.propId);
  const [draft, setDraft] = useState(
    typeof filter.value === "string" || typeof filter.value === "number"
      ? String(filter.value)
      : "",
  );

  const changeField = (id: string) => {
    const nextField = fieldById(fields, id) ?? fields[0];
    const nextProp = properties.find((p) => p.id === id);
    const ops = opsForType(nextField.type);
    const nextValue = defaultValue(nextField, nextProp);
    setDraft(typeof nextValue === "string" ? nextValue : "");
    onChange({ propId: id, op: ops[0], value: nextValue });
  };

  const changeOp = (op: FilterOp) =>
    onChange({ ...filter, op, value: opNeedsValue(op) ? filter.value : null });

  const commitText = () => {
    const value = field.type === "number" ? (draft === "" ? null : Number(draft)) : draft;
    onChange({ ...filter, value });
  };

  return (
    <div className="flex items-center gap-1.5">
      <select
        aria-label="필터 속성"
        value={filter.propId}
        onChange={(e) => changeField(e.target.value)}
        className={selectClass}
      >
        {fields.map((f) => (
          <option key={f.id} value={f.id}>
            {f.name}
          </option>
        ))}
      </select>

      <select
        aria-label="필터 조건"
        value={filter.op}
        onChange={(e) => changeOp(e.target.value as FilterOp)}
        className={selectClass}
      >
        {opsForType(field.type).map((op) => (
          <option key={op} value={op}>
            {opLabel(op, field.type)}
          </option>
        ))}
      </select>

      {opNeedsValue(filter.op) &&
        (field.type === "checkbox" ? (
          <select
            aria-label="필터 값"
            value={filter.value ? "true" : "false"}
            onChange={(e) =>
              onChange({ ...filter, value: e.target.value === "true" })
            }
            className={selectClass}
          >
            <option value="true">체크됨</option>
            <option value="false">체크 안 됨</option>
          </select>
        ) : field.type === "select" ? (
          <select
            aria-label="필터 값"
            value={typeof filter.value === "string" ? filter.value : ""}
            onChange={(e) => onChange({ ...filter, value: e.target.value })}
            className={selectClass}
          >
            {(prop?.options ?? []).map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        ) : field.type === "date" ? (
          <input
            type="date"
            aria-label="필터 값"
            value={typeof filter.value === "string" ? filter.value : ""}
            onChange={(e) => onChange({ ...filter, value: e.target.value })}
            className={selectClass}
          />
        ) : (
          <input
            type={field.type === "number" ? "number" : "text"}
            aria-label="필터 값"
            value={draft}
            placeholder="값"
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitText}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            }}
            className={`${selectClass} w-24`}
          />
        ))}

      <button
        type="button"
        onClick={onRemove}
        aria-label="필터 제거"
        className="rounded p-1 text-muted-foreground transition-colors hover:text-destructive"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}

// 뷰 툴바: 정렬 1개 + 필터 N개(AND). 값은 상위 dbSchema의 뷰에 저장된다(controlled).
export function DbViewToolbar({
  properties,
  sort,
  filters,
  onSortChange,
  onFiltersChange,
}: {
  properties: PropertyDef[];
  sort: SortSpec | null;
  filters: FilterSpec[];
  onSortChange: (sort: SortSpec | null) => void;
  onFiltersChange: (filters: FilterSpec[]) => void;
}) {
  const [open, setOpen] = useState<"sort" | "filter" | null>(null);
  const fields = fieldsOf(properties);
  const toggle = (which: "sort" | "filter") =>
    setOpen((cur) => (cur === which ? null : which));

  const addFilter = () => {
    const field = fields[0];
    onFiltersChange([
      ...filters,
      { propId: field.id, op: opsForType(field.type)[0], value: defaultValue(field) },
    ]);
  };
  const updateFilter = (index: number, next: FilterSpec) =>
    onFiltersChange(filters.map((f, i) => (i === index ? next : f)));
  const removeFilter = (index: number) =>
    onFiltersChange(filters.filter((_, i) => i !== index));

  const sortField = sort ? fieldById(fields, sort.propId) : undefined;
  const sortLabel = sort
    ? `${sortField?.name ?? "?"} ${sort.direction === "asc" ? "↑" : "↓"}`
    : null;

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      {/* 정렬 */}
      <div className="relative">
        <button
          type="button"
          onClick={() => toggle("sort")}
          className={`flex items-center gap-1 rounded px-2 py-1 transition-colors hover:bg-muted/60 ${
            sort ? "text-foreground" : "text-muted-foreground"
          }`}
        >
          <ArrowDownUp className="size-3.5" />
          {sortLabel ?? "정렬"}
        </button>
        {open === "sort" && (
          <>
            <div
              role="presentation"
              className="fixed inset-0 z-10"
              onClick={() => setOpen(null)}
            />
            <div className="absolute left-0 top-8 z-20 flex w-56 flex-col gap-2 rounded-lg border border-border bg-card p-3 shadow-lg">
              <select
                aria-label="정렬 기준"
                value={sort?.propId ?? ""}
                onChange={(e) =>
                  e.target.value === ""
                    ? onSortChange(null)
                    : onSortChange({
                        propId: e.target.value,
                        direction: sort?.direction ?? "asc",
                      })
                }
                className={selectClass}
              >
                <option value="">정렬 없음</option>
                {fields.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
              {sort && (
                <div className="flex gap-1">
                  {(["asc", "desc"] as const).map((dir) => (
                    <button
                      key={dir}
                      type="button"
                      onClick={() => onSortChange({ ...sort, direction: dir })}
                      className={`flex-1 rounded px-2 py-1 transition-colors ${
                        sort.direction === dir
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted/50 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {dir === "asc" ? "오름차순 ↑" : "내림차순 ↓"}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* 필터 */}
      <div className="relative">
        <button
          type="button"
          onClick={() => toggle("filter")}
          className={`flex items-center gap-1 rounded px-2 py-1 transition-colors hover:bg-muted/60 ${
            filters.length > 0 ? "text-foreground" : "text-muted-foreground"
          }`}
        >
          <Filter className="size-3.5" />
          필터{filters.length > 0 ? ` ${filters.length}` : ""}
        </button>
        {open === "filter" && (
          <>
            <div
              role="presentation"
              className="fixed inset-0 z-10"
              onClick={() => setOpen(null)}
            />
            <div className="absolute left-0 top-8 z-20 flex w-[22rem] max-w-[calc(100vw-2rem)] flex-col gap-2 rounded-lg border border-border bg-card p-3 shadow-lg">
              {filters.length === 0 && (
                <p className="text-muted-foreground">필터가 없습니다.</p>
              )}
              {filters.map((f, i) => (
                <FilterRow
                  key={`${i}-${f.propId}-${f.op}`}
                  filter={f}
                  fields={fields}
                  properties={properties}
                  onChange={(next) => updateFilter(i, next)}
                  onRemove={() => removeFilter(i)}
                />
              ))}
              <button
                type="button"
                onClick={addFilter}
                className="mt-1 flex items-center gap-1 self-start rounded px-2 py-1 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
              >
                <Plus className="size-3.5" /> 필터 추가
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
