"use client";

import { useState } from "react";
import { Plus, SquareArrowOutUpRight, Trash2 } from "lucide-react";
import type { Page, PropertyDef, RowPropValue } from "@ldd/core";
import { PropertyCell } from "./PropertyCell";
import { DbPropertyMenu } from "./DbPropertyMenu";

// 행 제목 인라인 편집(blur/Enter 커밋) + 열기·삭제 버튼. 표 첫 열 전용.
function RowTitleCell({
  row,
  onTitleChange,
  onOpen,
  onDelete,
}: {
  row: Page;
  onTitleChange: (title: string) => void;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const [draft, setDraft] = useState(row.title);
  const [focused, setFocused] = useState(false);
  const [lastTitle, setLastTitle] = useState(row.title);
  // 편집 중이 아닐 때 외부 제목 변경을 draft에 반영. 렌더 중 조정 = React 공식 패턴(effect 아님).
  if (!focused && row.title !== lastTitle) {
    setLastTitle(row.title);
    setDraft(row.title);
  }
  return (
    <div className="group/title flex items-center gap-1">
      <input
        value={draft}
        aria-label="행 제목"
        placeholder="제목 없음"
        onFocus={() => setFocused(true)}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          setFocused(false);
          if (draft !== row.title) onTitleChange(draft);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
        className="min-w-0 flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-muted-foreground/40 focus:ring-1 focus:ring-primary/40 rounded px-1 py-0.5"
      />
      <button
        type="button"
        onClick={onOpen}
        aria-label={`${row.title || "제목 없음"} 열기`}
        className="shrink-0 rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover/title:opacity-100"
      >
        <SquareArrowOutUpRight className="size-3.5" />
      </button>
      <button
        type="button"
        onClick={onDelete}
        aria-label={`${row.title || "제목 없음"} 행 삭제`}
        className="shrink-0 rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover/title:opacity-100"
      >
        <Trash2 className="size-3.5" />
      </button>
    </div>
  );
}

export function DbTableView({
  rows,
  properties,
  onOpenRow,
  onTitleChange,
  onRowPropChange,
  onAddRow,
  onDeleteRow,
  onEditProperty,
}: {
  rows: Page[];
  properties: PropertyDef[];
  onOpenRow: (id: string) => void;
  onTitleChange: (rowId: string, title: string) => void;
  onRowPropChange: (rowId: string, propId: string, value: RowPropValue) => void;
  onAddRow: () => void;
  onDeleteRow: (rowId: string) => void;
  onEditProperty: (propId: string, next: PropertyDef | null) => void;
}) {
  const [menuPropId, setMenuPropId] = useState<string | null>(null);
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/30 text-left">
            <th className="min-w-[12rem] px-3 py-2 font-medium text-muted-foreground">
              제목
            </th>
            {properties.map((p) => (
              <th
                key={p.id}
                className="relative min-w-[8rem] px-1 py-1 font-medium text-muted-foreground"
              >
                <button
                  type="button"
                  onClick={() =>
                    setMenuPropId((cur) => (cur === p.id ? null : p.id))
                  }
                  className="w-full rounded px-2 py-1 text-left transition-colors hover:bg-muted/60 hover:text-foreground"
                >
                  {p.name}
                </button>
                {menuPropId === p.id && (
                  <DbPropertyMenu
                    prop={p}
                    onEdit={(next) => onEditProperty(p.id, next)}
                    onClose={() => setMenuPropId(null)}
                  />
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              className="border-b border-border/60 last:border-0 hover:bg-muted/20"
            >
              <td className="px-2 py-1">
                <RowTitleCell
                  row={row}
                  onTitleChange={(t) => onTitleChange(row.id, t)}
                  onOpen={() => onOpenRow(row.id)}
                  onDelete={() => onDeleteRow(row.id)}
                />
              </td>
              {properties.map((p) => (
                <td key={p.id} className="px-2 py-1">
                  <PropertyCell
                    prop={p}
                    value={row.rowProps[p.id]}
                    onCommit={(v) => onRowPropChange(row.id, p.id, v)}
                  />
                </td>
              ))}
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td
                colSpan={properties.length + 1}
                className="px-3 py-6 text-center text-sm text-muted-foreground"
              >
                아직 행이 없습니다.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      <button
        type="button"
        onClick={onAddRow}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
      >
        <Plus className="size-3.5" /> 새 행
      </button>
    </div>
  );
}
