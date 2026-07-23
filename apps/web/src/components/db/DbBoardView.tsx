"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import {
  groupRowsByProperty,
  type Page,
  type PropertyDef,
} from "@ldd/core";
import { cn } from "@/lib/utils";

// 보드(kanban): select 속성으로 그룹된 열 + 카드. 카드 드래그로 열 간 이동(HTML5 DnD, 라이브러리 없음).
export function DbBoardView({
  rows,
  groupProp,
  onOpenRow,
  onMoveRow,
  onAddRow,
}: {
  rows: Page[];
  groupProp: PropertyDef;
  onOpenRow: (id: string) => void;
  // optionId=null 은 "없음" 그룹(속성값 제거).
  onMoveRow: (rowId: string, optionId: string | null) => void;
  onAddRow: (optionId: string | null) => void;
}) {
  const [dragOver, setDragOver] = useState<string | null>(null);
  const groups = groupRowsByProperty(rows, groupProp);

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
              <span>{group.option?.name ?? "없음"}</span>
              <span className="tabular-nums opacity-60">{group.rows.length}</span>
            </div>
            {group.rows.map((row) => (
              <button
                key={row.id}
                type="button"
                draggable
                onDragStart={(e) =>
                  e.dataTransfer.setData("text/row-id", row.id)
                }
                // 드롭 성공/취소와 무관하게 항상 발화 — 하이라이트 잔상 방지(코드 리뷰 MEDIUM).
                onDragEnd={() => setDragOver(null)}
                onClick={() => onOpenRow(row.id)}
                className="cursor-grab rounded-md border border-border bg-card px-3 py-2 text-left text-sm shadow-sm transition-colors hover:border-primary/40 active:cursor-grabbing"
              >
                {row.title || "제목 없음"}
              </button>
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
