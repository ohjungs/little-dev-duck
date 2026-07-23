"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import {
  createPage,
  listChildPages,
  updatePage,
} from "@ldd/api";
import type {
  DbSchema,
  Page,
  PropertyType,
  RowProps,
  RowPropValue,
} from "@ldd/core";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { DbTableView } from "@/components/db/DbTableView";
import { DbBoardView } from "@/components/db/DbBoardView";

const NEW_PROP_TYPES: { type: PropertyType; label: string }[] = [
  { type: "text", label: "텍스트" },
  { type: "number", label: "숫자" },
  { type: "select", label: "선택" },
  { type: "checkbox", label: "체크박스" },
  { type: "date", label: "날짜" },
];

// 한 속성값을 병합. null이면 키를 제거해 row_props를 sparse하게 유지.
function mergeRowProps(
  rowProps: RowProps,
  propId: string,
  value: RowPropValue,
): RowProps {
  const next = { ...rowProps };
  if (value === null) delete next[propId];
  else next[propId] = value;
  return next;
}

// 데이터베이스 뷰(표/보드). dbId=이 데이터베이스 페이지, 행=그 자식 페이지(listChildPages).
export function DatabaseView({
  dbId,
  dbSchema,
  onSchemaChange,
}: {
  dbId: string;
  dbSchema: DbSchema;
  onSchemaChange: (schema: DbSchema) => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [rows, setRows] = useState<Page[] | null>(null);
  const [activeViewId, setActiveViewId] = useState(dbSchema.views[0]?.id);
  const [addingProp, setAddingProp] = useState(false);

  useEffect(() => {
    listChildPages(supabase, dbId).then(
      (data) => setRows(data),
      () => setRows([]),
    );
  }, [supabase, dbId]);

  const view =
    dbSchema.views.find((v) => v.id === activeViewId) ?? dbSchema.views[0];

  const openRow = (id: string) => router.push(`/pages/${id}`);

  const persistRowProps = (row: Page, next: RowProps) => {
    setRows((prev) =>
      (prev ?? []).map((r) => (r.id === row.id ? { ...r, rowProps: next } : r)),
    );
    void updatePage(supabase, row.id, { rowProps: next });
  };

  const handleRowPropChange = (
    rowId: string,
    propId: string,
    value: RowPropValue,
  ) => {
    const row = rows?.find((r) => r.id === rowId);
    if (!row) return;
    persistRowProps(row, mergeRowProps(row.rowProps, propId, value));
  };

  const handleTitleChange = (rowId: string, title: string) => {
    setRows((prev) =>
      (prev ?? []).map((r) => (r.id === rowId ? { ...r, title } : r)),
    );
    void updatePage(supabase, rowId, { title });
  };

  const handleAddRow = async (preset: RowProps = {}) => {
    try {
      const created = await createPage(supabase, {
        parentId: dbId,
        title: "",
        rowProps: preset,
      });
      setRows((prev) => [...(prev ?? []), created]);
    } catch {
      // 재시도 가능 — 조용히 무시
    }
  };

  const handleMoveRow = (rowId: string, optionId: string | null) => {
    if (!view.groupByPropId) return;
    const row = rows?.find((r) => r.id === rowId);
    if (!row) return;
    persistRowProps(row, mergeRowProps(row.rowProps, view.groupByPropId, optionId));
  };

  const handleAddProperty = (name: string, type: PropertyType) => {
    setAddingProp(false);
    const trimmed = name.trim();
    if (!trimmed) return;
    onSchemaChange({
      ...dbSchema,
      properties: [
        ...dbSchema.properties,
        { id: crypto.randomUUID(), name: trimmed, type, options: [] },
      ],
    });
  };

  const groupProp = view.groupByPropId
    ? dbSchema.properties.find((p) => p.id === view.groupByPropId)
    : undefined;

  return (
    <div className="mt-6 flex flex-col gap-3 px-4">
      <div className="flex items-center gap-1 border-b border-border">
        {dbSchema.views.map((v) => (
          <button
            key={v.id}
            type="button"
            onClick={() => setActiveViewId(v.id)}
            className={cn(
              "-mb-px border-b-2 px-3 py-1.5 text-sm transition-colors",
              v.id === view.id
                ? "border-primary font-medium text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {v.name}
          </button>
        ))}
        <div className="relative ml-auto">
          <button
            type="button"
            onClick={() => setAddingProp((o) => !o)}
            className="flex items-center gap-1 px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <Plus className="size-3.5" /> 속성
          </button>
          {addingProp && (
            <AddPropertyForm
              onCancel={() => setAddingProp(false)}
              onAdd={handleAddProperty}
            />
          )}
        </div>
      </div>

      {rows === null ? (
        <p className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" /> 행을 불러오는 중...
        </p>
      ) : view.type === "board" && groupProp ? (
        <DbBoardView
          rows={rows}
          groupProp={groupProp}
          onOpenRow={openRow}
          onMoveRow={handleMoveRow}
          onAddRow={(optionId) =>
            handleAddRow(optionId ? { [groupProp.id]: optionId } : {})
          }
        />
      ) : (
        <DbTableView
          rows={rows}
          properties={dbSchema.properties}
          onOpenRow={openRow}
          onTitleChange={handleTitleChange}
          onRowPropChange={handleRowPropChange}
          onAddRow={() => handleAddRow()}
        />
      )}
    </div>
  );
}

function AddPropertyForm({
  onAdd,
  onCancel,
}: {
  onAdd: (name: string, type: PropertyType) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState<PropertyType>("text");
  return (
    <>
      <div
        role="presentation"
        className="fixed inset-0 z-10"
        onClick={onCancel}
      />
      <div className="absolute right-0 top-9 z-20 flex w-52 flex-col gap-2 rounded-lg border border-border bg-card p-3 shadow-lg">
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onAdd(name, type);
          }}
          placeholder="속성 이름"
          aria-label="속성 이름"
          className="rounded border border-border bg-transparent px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-primary/40"
        />
        <select
          value={type}
          onChange={(e) => setType(e.target.value as PropertyType)}
          aria-label="속성 타입"
          className="rounded border border-border bg-transparent px-2 py-1 text-sm outline-none"
        >
          {NEW_PROP_TYPES.map((t) => (
            <option key={t.type} value={t.type}>
              {t.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => onAdd(name, type)}
          className="rounded bg-primary px-2 py-1 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          추가
        </button>
      </div>
    </>
  );
}
