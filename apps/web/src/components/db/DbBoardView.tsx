"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  groupRowsByProperty,
  type Page,
  type PropertyDef,
  type SelectOption,
} from "@ldd/core";
import { cn } from "@/lib/utils";
import { selectChipClass } from "@/lib/selectColors";

// 보드(kanban): select 속성으로 그룹된 열 + 카드. 카드 드래그로 열 간 이동(HTML5 DnD, 라이브러리 없음).
export function DbBoardView({
  rows,
  groupProp,
  properties,
  onOpenRow,
  onMoveRow,
  onDeleteRow,
  onAddRow,
}: {
  rows: Page[];
  groupProp: PropertyDef;
  properties: PropertyDef[];
  onOpenRow: (id: string) => void;
  // optionId=null 은 "없음" 그룹(속성값 제거).
  onMoveRow: (rowId: string, optionId: string | null) => void;
  onDeleteRow: (rowId: string) => void;
  onAddRow: (optionId: string | null) => void;
}) {
  const [dragOver, setDragOver] = useState<string | null>(null);
  const groups = groupRowsByProperty(rows, groupProp);
  // 카드에 표시할 select 속성(그룹 기준 속성은 이미 열로 나뉘어 있으므로 제외).
  const chipProps = properties.filter(
    (p) => p.type === "select" && p.id !== groupProp.id,
  );

  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {groups.map((group) => {
        const colKey = group.option?.id ?? "__none__";
        return (
          <div
            key={colKey}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(colKey);
            }}
            onDragLeave={() => setDragOver((c) => (c === colKey ? null : c))}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(null);
              const rowId = e.dataTransfer.getData("text/row-id");
              if (rowId) onMoveRow(rowId, group.option?.id ?? null);
            }}
            className={cn(
              "flex w-64 shrink-0 flex-col gap-2 rounded-lg border border-border bg-card/30 p-2 transition-colors",
              dragOver === colKey && "border-primary/60 bg-primary/5",
            )}
          >
            <div className="flex items-center justify-between px-1 text-xs font-semibold text-muted-foreground">
              {group.option ? (
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5",
                    selectChipClass(group.option.color),
                  )}
                >
                  {group.option.name}
                </span>
              ) : (
                <span>없음</span>
              )}
              <span className="tabular-nums opacity-60">{group.rows.length}</span>
            </div>
            {group.rows.map((row) => (
              <div
                key={row.id}
                draggable
                onDragStart={(e) =>
                  e.dataTransfer.setData("text/row-id", row.id)
                }
                // 드롭 성공/취소와 무관하게 항상 발화 — 하이라이트 잔상 방지(코드 리뷰 MEDIUM).
                onDragEnd={() => setDragOver(null)}
                className="group/card flex cursor-grab flex-col gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-sm shadow-sm transition-colors hover:border-primary/40 active:cursor-grabbing"
              >
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onOpenRow(row.id)}
                    className="min-w-0 flex-1 truncate text-left"
                  >
                    {row.title || "제목 없음"}
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteRow(row.id)}
                    aria-label={`${row.title || "제목 없음"} 행 삭제`}
                    className="shrink-0 rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover/card:opacity-100"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
                {chipProps.length > 0 &&
                  (() => {
                    const chips = chipProps
                      .map((p) => {
                        const v = row.rowProps[p.id];
                        const opt =
                          typeof v === "string"
                            ? p.options.find((o) => o.id === v)
                            : undefined;
                        return opt ? { key: p.id, opt } : null;
                      })
                      .filter((c): c is { key: string; opt: SelectOption } => c !== null);
                    return chips.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {chips.map(({ key, opt }) => (
                          <span
                            key={key}
                            className={cn(
                              "rounded-full px-2 py-0.5 text-xs",
                              selectChipClass(opt.color),
                            )}
                          >
                            {opt.name}
                          </span>
                        ))}
                      </div>
                    ) : null;
                  })()}
              </div>
            ))}
            <button
              type="button"
              onClick={() => onAddRow(group.option?.id ?? null)}
              className="flex items-center gap-1 rounded-md px-2 py-1.5 text-left text-xs text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
            >
              <Plus className="size-3" /> 새 행
            </button>
          </div>
        );
      })}
    </div>
  );
}
