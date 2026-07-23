"use client";

import { useState } from "react";
import {
  coerceRowPropValue,
  type PropertyDef,
  type RowPropValue,
} from "@ldd/core";
import { cn } from "@/lib/utils";

const INPUT_CLASS =
  "w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground/40 focus:ring-1 focus:ring-primary/40 rounded px-1 py-0.5";

// text/number: 매 키 입력마다 저장하면 DB 쓰기 폭주 — 로컬 상태로 편집하고 blur/Enter에 커밋한다.
// 외부(낙관적 업데이트)로 값이 바뀌면 편집 중이 아닐 때만 동기화.
function TextishInput({
  initial,
  type,
  label,
  onCommit,
}: {
  initial: string;
  type: "text" | "number";
  label: string;
  onCommit: (raw: string) => void;
}) {
  const [draft, setDraft] = useState(initial);
  const [focused, setFocused] = useState(false);
  const [lastInitial, setLastInitial] = useState(initial);
  // 편집 중이 아닐 때 외부 값(낙관적 업데이트) 변경을 draft에 반영. 렌더 중 조정 = React 공식 패턴(effect 아님).
  if (!focused && initial !== lastInitial) {
    setLastInitial(initial);
    setDraft(initial);
  }
  return (
    <input
      type={type}
      value={draft}
      aria-label={label}
      onFocus={() => setFocused(true)}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        setFocused(false);
        if (draft !== initial) onCommit(draft);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
      }}
      className={INPUT_CLASS}
    />
  );
}

// 속성 타입별 셀 편집기. 커밋 값은 coerceRowPropValue로 타입 정규화(빈 값=null).
export function PropertyCell({
  prop,
  value,
  onCommit,
}: {
  prop: PropertyDef;
  value: RowPropValue | undefined;
  onCommit: (value: RowPropValue) => void;
}) {
  const commit = (raw: unknown) => onCommit(coerceRowPropValue(prop.type, raw));

  switch (prop.type) {
    case "checkbox":
      return (
        <input
          type="checkbox"
          checked={value === true}
          aria-label={prop.name}
          onChange={(e) => commit(e.target.checked)}
          className="size-4 accent-primary"
        />
      );
    case "select":
      return (
        <select
          value={typeof value === "string" ? value : ""}
          aria-label={prop.name}
          onChange={(e) => commit(e.target.value)}
          className={cn(INPUT_CLASS, "cursor-pointer")}
        >
          <option value="">—</option>
          {prop.options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
      );
    case "date":
      return (
        <input
          type="date"
          value={typeof value === "string" ? value : ""}
          aria-label={prop.name}
          onChange={(e) => commit(e.target.value)}
          className={cn(INPUT_CLASS, "cursor-pointer")}
        />
      );
    case "number":
      return (
        <TextishInput
          type="number"
          label={prop.name}
          initial={value == null ? "" : String(value)}
          onCommit={commit}
        />
      );
    default:
      return (
        <TextishInput
          type="text"
          label={prop.name}
          initial={typeof value === "string" ? value : ""}
          onCommit={commit}
        />
      );
  }
}
