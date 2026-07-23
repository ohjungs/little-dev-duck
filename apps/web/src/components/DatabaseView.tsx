"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2 } from "lucide-react";
import {
  createPage,
  listChildPages,
  softDeletePage,
  updatePage,
} from "@ldd/api";
import {
  filterRows,
  sortRows,
  MAX_VIEWS,
  type DbSchema,
  type FilterSpec,
  type Page,
  type PropertyDef,
  type PropertyType,
  type RowProps,
  type RowPropValue,
  type SortSpec,
  type ViewType,
} from "@ldd/core";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { DbTableView } from "@/components/db/DbTableView";
import { DbBoardView } from "@/components/db/DbBoardView";
import { DbViewToolbar } from "@/components/db/DbViewToolbar";

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
  const [loadError, setLoadError] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeViewId, setActiveViewId] = useState(dbSchema.views[0]?.id);
  const [addingProp, setAddingProp] = useState(false);
  const [addingView, setAddingView] = useState(false);

  // 저장 실패를 조용히 삼키지 않고 잠깐 표시(코드 리뷰 HIGH). 3초 후 자동 해제.
  const showError = (msg: string) => {
    setError(msg);
    setTimeout(() => setError(null), 3000);
  };

  useEffect(() => {
    listChildPages(supabase, dbId).then(
      (data) => setRows(data),
      // 조회 실패는 "행 0개"와 구분(코드 리뷰 HIGH) — 빈 목록으로 오인해 중복 생성하는 걸 막는다.
      () => {
        setRows([]);
        setLoadError(true);
      },
    );
  }, [supabase, dbId]);

  const view =
    dbSchema.views.find((v) => v.id === activeViewId) ?? dbSchema.views[0];

  const openRow = (id: string) => router.push(`/pages/${id}`);

  // 낙관적 반영 후 저장. 실패 시 이전 값으로 롤백 + 에러 표시(코드 리뷰 HIGH — 조용한 유실 방지).
  const persistRowProps = (row: Page, next: RowProps) => {
    const prev = row.rowProps;
    setRows((rs) =>
      (rs ?? []).map((r) => (r.id === row.id ? { ...r, rowProps: next } : r)),
    );
    updatePage(supabase, row.id, { rowProps: next }).catch(() => {
      setRows((rs) =>
        (rs ?? []).map((r) => (r.id === row.id ? { ...r, rowProps: prev } : r)),
      );
      showError("저장에 실패했습니다. 다시 시도해 주세요.");
    });
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
    const prevTitle = rows?.find((r) => r.id === rowId)?.title ?? "";
    setRows((rs) =>
      (rs ?? []).map((r) => (r.id === rowId ? { ...r, title } : r)),
    );
    updatePage(supabase, rowId, { title }).catch(() => {
      setRows((rs) =>
        (rs ?? []).map((r) => (r.id === rowId ? { ...r, title: prevTitle } : r)),
      );
      showError("저장에 실패했습니다. 다시 시도해 주세요.");
    });
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
      showError("행 추가에 실패했습니다. 다시 시도해 주세요.");
    }
  };

  // 행(자식 페이지) 삭제 = softDeletePage(휴지통, 복구 가능) — PageWorkspace 트리 삭제와 동일 패턴
  // (무확인 낙관적, 실패 시 함수형 롤백으로 그 항목만 되살림).
  const handleDeleteRow = (rowId: string) => {
    const removed = rows?.find((r) => r.id === rowId);
    if (!removed) return;
    setRows((rs) => (rs ?? []).filter((r) => r.id !== rowId));
    softDeletePage(supabase, rowId).catch(() => {
      setRows((rs) =>
        (rs ?? []).some((r) => r.id === rowId) ? (rs ?? []) : [...(rs ?? []), removed],
      );
      showError("행 삭제에 실패했습니다. 다시 시도해 주세요.");
    });
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

  // 속성 편집(이름/타입/옵션) 또는 삭제(next=null). 삭제 시, 또는 select가 아니게 타입 변경 시,
  // 그 속성으로 그룹하던 보드 뷰의 groupBy를 해제한다(코드 리뷰 HIGH — 기본 스키마에서 상태 속성을
  // 비-select로 바꾸면 보드가 "없음" 한 열로 붕괴하던 버그).
  const handleEditProperty = (propId: string, next: PropertyDef | null) => {
    const dropGroupBy = next === null || next.type !== "select";
    onSchemaChange({
      ...dbSchema,
      properties:
        next === null
          ? dbSchema.properties.filter((p) => p.id !== propId)
          : dbSchema.properties.map((p) => (p.id === propId ? next : p)),
      views: dropGroupBy
        ? dbSchema.views.map((v) =>
            v.groupByPropId === propId ? { ...v, groupByPropId: null } : v,
          )
        : dbSchema.views,
    });
  };

  // 활성 뷰의 정렬/필터만 갱신(다른 뷰는 그대로). Phase 11 후속.
  const setActiveViewSort = (sort: SortSpec | null) => {
    onSchemaChange({
      ...dbSchema,
      views: dbSchema.views.map((v) => (v.id === view.id ? { ...v, sort } : v)),
    });
  };
  const setActiveViewFilters = (filters: FilterSpec[]) => {
    onSchemaChange({
      ...dbSchema,
      views: dbSchema.views.map((v) =>
        v.id === view.id ? { ...v, filters } : v,
      ),
    });
  };

  const selectProps = dbSchema.properties.filter((p) => p.type === "select");

  // 뷰 추가. board는 첫 select 속성으로 그룹(없으면 groupBy=null → 표처럼 렌더). MAX_VIEWS 상한.
  const handleAddView = (name: string, type: ViewType) => {
    setAddingView(false);
    if (dbSchema.views.length >= MAX_VIEWS) return;
    const id = crypto.randomUUID();
    onSchemaChange({
      ...dbSchema,
      views: [
        ...dbSchema.views,
        {
          id,
          name: name.trim() || (type === "board" ? "보드" : "표"),
          type,
          groupByPropId: type === "board" ? (selectProps[0]?.id ?? null) : null,
          sort: null,
          filters: [],
        },
      ],
    });
    setActiveViewId(id);
  };

  // 뷰 삭제(최소 1개 유지 — dbSchemaSchema가 강제). 활성 뷰를 지우면 첫 뷰로 이동.
  const handleDeleteView = (viewId: string) => {
    if (dbSchema.views.length <= 1) return;
    const remaining = dbSchema.views.filter((v) => v.id !== viewId);
    onSchemaChange({ ...dbSchema, views: remaining });
    if (activeViewId === viewId) setActiveViewId(remaining[0]?.id);
  };

  // board 그룹 기준(select 속성) 변경. null=그룹 해제(표처럼 렌더).
  const handleChangeGroupBy = (propId: string | null) => {
    onSchemaChange({
      ...dbSchema,
      views: dbSchema.views.map((v) =>
        v.id === view.id ? { ...v, groupByPropId: propId } : v,
      ),
    });
  };

  const groupProp = view.groupByPropId
    ? dbSchema.properties.find((p) => p.id === view.groupByPropId)
    : undefined;

  // 필터 → 정렬 순으로 적용한 표시용 행(원본 rows는 불변). 저장된 스키마가 구버전이면
  // sort/filters가 없을 수 있어 방어적 기본값(?? null / ?? []).
  const visibleRows = useMemo(
    () =>
      sortRows(
        filterRows(rows ?? [], view.filters ?? [], dbSchema.properties),
        view.sort ?? null,
        dbSchema.properties,
      ),
    [rows, view.filters, view.sort, dbSchema.properties],
  );

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
        <div className="ml-auto flex items-center">
          <div className="relative">
            <button
              type="button"
              onClick={() => setAddingView((o) => !o)}
              disabled={dbSchema.views.length >= MAX_VIEWS}
              className="flex items-center gap-1 px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
            >
              <Plus className="size-3.5" /> 뷰
            </button>
            {addingView && (
              <AddViewForm
                canBoard={selectProps.length > 0}
                onCancel={() => setAddingView(false)}
                onAdd={handleAddView}
              />
            )}
          </div>
          <div className="relative">
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
      </div>

      {/* 활성 뷰 설정: board 그룹 기준 변경 + 뷰 삭제(2개 이상일 때). */}
      {(view.type === "board" || dbSchema.views.length > 1) && (
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          {view.type === "board" && (
            <label className="flex items-center gap-1.5">
              그룹 기준
              <select
                value={view.groupByPropId ?? ""}
                onChange={(e) =>
                  handleChangeGroupBy(e.target.value === "" ? null : e.target.value)
                }
                aria-label="보드 그룹 기준"
                className="rounded border border-border bg-transparent px-1.5 py-1 outline-none focus:ring-1 focus:ring-primary/40"
              >
                <option value="">없음</option>
                {selectProps.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          {dbSchema.views.length > 1 && (
            <button
              type="button"
              onClick={() => handleDeleteView(view.id)}
              className="flex items-center gap-1 transition-colors hover:text-destructive"
            >
              <Trash2 className="size-3.5" /> 이 뷰 삭제
            </button>
          )}
        </div>
      )}

      <DbViewToolbar
        properties={dbSchema.properties}
        sort={view.sort ?? null}
        filters={view.filters ?? []}
        onSortChange={setActiveViewSort}
        onFiltersChange={setActiveViewFilters}
      />

      {error && (
        <p
          className="rounded-md bg-destructive/10 px-3 py-1.5 text-sm text-destructive"
          role="alert"
        >
          {error}
        </p>
      )}

      {loadError ? (
        <p className="py-6 text-sm text-destructive" role="alert">
          행을 불러오지 못했습니다. 새로고침 후 다시 시도해 주세요.
        </p>
      ) : rows === null ? (
        <p className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" /> 행을 불러오는 중...
        </p>
      ) : view.type === "board" && groupProp ? (
        <DbBoardView
          rows={visibleRows}
          groupProp={groupProp}
          onOpenRow={openRow}
          onMoveRow={handleMoveRow}
          onDeleteRow={handleDeleteRow}
          onAddRow={(optionId) =>
            handleAddRow(optionId ? { [groupProp.id]: optionId } : {})
          }
        />
      ) : (
        <DbTableView
          rows={visibleRows}
          properties={dbSchema.properties}
          onOpenRow={openRow}
          onTitleChange={handleTitleChange}
          onRowPropChange={handleRowPropChange}
          onAddRow={() => handleAddRow()}
          onDeleteRow={handleDeleteRow}
          onEditProperty={handleEditProperty}
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

function AddViewForm({
  canBoard,
  onAdd,
  onCancel,
}: {
  canBoard: boolean;
  onAdd: (name: string, type: ViewType) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState<ViewType>("table");
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
          placeholder="뷰 이름"
          aria-label="뷰 이름"
          className="rounded border border-border bg-transparent px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-primary/40"
        />
        <select
          value={type}
          onChange={(e) => setType(e.target.value as ViewType)}
          aria-label="뷰 종류"
          className="rounded border border-border bg-transparent px-2 py-1 text-sm outline-none"
        >
          <option value="table">표</option>
          <option value="board" disabled={!canBoard}>
            보드{canBoard ? "" : " (선택 속성 필요)"}
          </option>
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
