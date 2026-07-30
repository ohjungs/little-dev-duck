"use client";

import { useState } from "react";
import { Plus, SquareArrowOutUpRight, Trash2 } from "lucide-react";
import {
  AGGREGATIONS,
  computeAggregation,
  formatAggregation,
  type AggregationKind,
  type Page,
  type PropertyDef,
  type RowPropValue,
} from "@ldd/core";
import { dbEmptyMessage } from "@/lib/dbEmptyState";
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
        // 2026-07-31 : 접근성 - 포커스링 - 알파 금지 (SC 1.4.11)
        // 전에는 --primary에 40% 알파를 씌운 링이었다. --primary는 희석 전에도 흰 카드 위 1.92:1이라 링 색으로
        // 부적격이다. 저장소 전체가 --ring 하나를 쓰도록 통일한다.
        className="min-w-0 flex-1 rounded bg-transparent px-1 py-0.5 text-sm font-medium placeholder:text-muted-foreground/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      <button
        type="button"
        onClick={onOpen}
        aria-label={`${row.title || "제목 없음"} 열기`}
        // 2026-07-31 : 접근성 - 호버 전용 컨트롤 - 키보드 (SC 2.4.7 / 2.5.8)
        // p-1(22px)은 타깃 최소 24px 미달, opacity-0은 키보드 사용자에게 영영 안 보인다.
        className="shrink-0 rounded p-1.5 text-muted-foreground opacity-0 transition-opacity hover:text-foreground focus-visible:opacity-100 group-hover/title:opacity-100"
      >
        <SquareArrowOutUpRight className="size-3.5" />
      </button>
      <button
        type="button"
        onClick={onDelete}
        aria-label={`${row.title || "제목 없음"} 행 삭제`}
        className="shrink-0 rounded p-1.5 text-muted-foreground opacity-0 transition-opacity hover:text-destructive focus-visible:opacity-100 group-hover/title:opacity-100"
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
  totalRows,
  hasFilters,
  aggregations,
  onAggregationChange,
}: {
  // rows는 필터·정렬을 거친 표시 행이다. 빈 상태 문구를 정확히 쓰려면 원본 개수도 필요하다.
  rows: Page[];
  totalRows: number;
  hasFilters: boolean;
  properties: PropertyDef[];
  onOpenRow: (id: string) => void;
  onTitleChange: (rowId: string, title: string) => void;
  onRowPropChange: (rowId: string, propId: string, value: RowPropValue) => void;
  onAddRow: () => void;
  onDeleteRow: (rowId: string) => void;
  onEditProperty: (propId: string, next: PropertyDef | null) => void;
  // 열 id -> 집계 종류. 저장된 스키마가 구버전이면 키 자체가 없다(하위호환 기본값 {}).
  aggregations: Record<string, string>;
  onAggregationChange: (propId: string, kind: AggregationKind) => void;
}) {
  const [menuPropId, setMenuPropId] = useState<string | null>(null);

  // 저장된 값이 우리가 아는 집계인지 확인한다. 모르는 값(미래 버전이 만든 종류)은 none으로 떨어뜨린다 —
  // 표 전체가 안 열리는 것보다 낫다(스키마가 값을 문자열로 받는 이유).
  const kindOf = (propId: string): AggregationKind => {
    const raw = aggregations?.[propId];
    return (AGGREGATIONS as readonly string[]).includes(raw ?? "")
      ? (raw as AggregationKind)
      : "none";
  };

  // 집계 대상은 **지금 화면에 보이는 행**이다(필터를 걸었으면 걸린 것만). 필터를 걸어 놓고
  // 전체 합을 보여주면 화면과 숫자가 어긋나 사용자가 어느 쪽을 믿을지 알 수 없다.
  const aggRows = rows.map((r) => ({ title: r.title, props: r.rowProps ?? {} }));
  const hasAnyAggregation = properties.some((p) => kindOf(p.id) !== "none");
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
                    aggregation={kindOf(p.id)}
                    onAggregationChange={(kind) => onAggregationChange(p.id, kind)}
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
                {dbEmptyMessage({ total: totalRows, hasFilters })}
              </td>
            </tr>
          )}
        </tbody>
        {/* 2026-07-26 : 데이터베이스 - 집계 - 결과 줄 (Phase 33 T2)
            아무 열도 계산하지 않으면 줄 자체를 그리지 않는다 — 모든 표에 갑자기 빈 줄이 생기면 안 된다.
            tfoot에 두는 이유: 인쇄할 때 표와 함께 나가고, 스크린리더가 요약 행으로 읽는다. */}
        {hasAnyAggregation && rows.length > 0 && (
          <tfoot>
            <tr className="border-t border-border bg-muted/20 text-xs text-muted-foreground">
              <td className="px-3 py-1.5">계산</td>
              {properties.map((p) => {
                const kind = kindOf(p.id);
                return (
                  <td key={p.id} className="px-2 py-1.5 tabular-nums">
                    {formatAggregation(kind, computeAggregation(aggRows, p.id, kind))}
                  </td>
                );
              })}
            </tr>
          </tfoot>
        )}
      </table>
      <div className="flex items-center justify-between border-t border-border/60">
        <button
          type="button"
          onClick={onAddRow}
          className="flex items-center gap-2 px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
        >
          <Plus className="size-3.5" /> 새 행
        </button>
        {rows.length > 0 && (
          <span className="px-3 text-xs tabular-nums text-muted-foreground/60">
            {rows.length}개 행
          </span>
        )}
      </div>
    </div>
  );
}
