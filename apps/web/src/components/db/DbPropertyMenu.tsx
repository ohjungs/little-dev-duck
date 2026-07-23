"use client";

import { useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import {
  SELECT_COLORS,
  type PropertyDef,
  type PropertyType,
  type SelectOption,
} from "@ldd/core";
import { cn } from "@/lib/utils";
import { selectDotClass } from "@/lib/selectColors";

const TYPE_LABELS: { type: PropertyType; label: string }[] = [
  { type: "text", label: "텍스트" },
  { type: "number", label: "숫자" },
  { type: "select", label: "선택" },
  { type: "checkbox", label: "체크박스" },
  { type: "date", label: "날짜" },
];

// 속성(열) 편집 팝오버: 이름변경/타입변경/삭제 + select 옵션 추가·제거.
// next=null 은 속성 삭제. 완성된 PropertyDef를 onEdit로 넘긴다(스키마 병합은 상위 DatabaseView가).
export function DbPropertyMenu({
  prop,
  onEdit,
  onClose,
}: {
  prop: PropertyDef;
  onEdit: (next: PropertyDef | null) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(prop.name);
  const [type, setType] = useState<PropertyType>(prop.type);
  const [options, setOptions] = useState<SelectOption[]>(prop.options);
  const [newOption, setNewOption] = useState("");
  const [colorPickerFor, setColorPickerFor] = useState<string | null>(null);

  const addOption = () => {
    const n = newOption.trim();
    if (!n) return;
    setOptions((o) => [...o, { id: crypto.randomUUID(), name: n, color: "gray" }]);
    setNewOption("");
  };

  const setOptionColor = (id: string, color: string) => {
    setOptions((prev) =>
      prev.map((o) => (o.id === id ? { ...o, color } : o)),
    );
    setColorPickerFor(null);
  };

  const apply = () => {
    onEdit({
      ...prop,
      name: name.trim() || prop.name,
      type,
      options: type === "select" ? options : [],
    });
    onClose();
  };

  return (
    <>
      <div
        role="presentation"
        className="fixed inset-0 z-10"
        onClick={onClose}
      />
      <div className="absolute left-0 top-8 z-20 flex w-56 flex-col gap-2 rounded-lg border border-border bg-card p-3 text-left shadow-lg">
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-label="속성 이름"
          placeholder="속성 이름"
          className="rounded border border-border bg-transparent px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-primary/40"
        />
        <select
          value={type}
          onChange={(e) => setType(e.target.value as PropertyType)}
          aria-label="속성 타입"
          className="rounded border border-border bg-transparent px-2 py-1 text-sm outline-none"
        >
          {TYPE_LABELS.map((t) => (
            <option key={t.type} value={t.type}>
              {t.label}
            </option>
          ))}
        </select>

        {type === "select" && (
          <div className="flex flex-col gap-1 rounded border border-border/60 p-2">
            <span className="text-xs font-medium text-muted-foreground">선택지</span>
            {options.map((o) => (
              <div key={o.id} className="flex flex-col gap-1">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() =>
                      setColorPickerFor((c) => (c === o.id ? null : o.id))
                    }
                    aria-label={`${o.name} 색상 선택`}
                    className={cn(
                      "size-3.5 shrink-0 rounded-full ring-1 ring-border transition-transform hover:scale-110",
                      selectDotClass(o.color),
                    )}
                  />
                  <span className="min-w-0 flex-1 truncate text-sm">
                    {o.name}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setOptions((prev) => prev.filter((x) => x.id !== o.id))
                    }
                    aria-label={`${o.name} 선택지 제거`}
                    className="rounded p-0.5 text-muted-foreground hover:text-destructive"
                  >
                    <X className="size-3" />
                  </button>
                </div>
                {colorPickerFor === o.id && (
                  <div className="flex flex-wrap gap-1 pl-4">
                    {SELECT_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setOptionColor(o.id, c)}
                        aria-label={`색상 ${c}`}
                        aria-pressed={o.color === c}
                        className={cn(
                          "size-4 rounded-full ring-1 ring-border transition-transform hover:scale-110",
                          selectDotClass(c),
                          o.color === c && "ring-2 ring-primary",
                        )}
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
            <div className="flex items-center gap-1">
              <input
                value={newOption}
                onChange={(e) => setNewOption(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addOption();
                  }
                }}
                placeholder="선택지 추가"
                aria-label="선택지 추가"
                className="min-w-0 flex-1 rounded border border-border bg-transparent px-1.5 py-0.5 text-sm outline-none focus:ring-1 focus:ring-primary/40"
              />
              <button
                type="button"
                onClick={addOption}
                aria-label="선택지 추가 확정"
                className="rounded p-1 text-muted-foreground hover:text-foreground"
              >
                <Plus className="size-3.5" />
              </button>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={apply}
          className="rounded bg-primary px-2 py-1 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          적용
        </button>
        <button
          type="button"
          onClick={() => {
            onEdit(null);
            onClose();
          }}
          className="flex items-center justify-center gap-1 rounded px-2 py-1 text-sm text-muted-foreground transition-colors hover:text-destructive"
        >
          <Trash2 className="size-3.5" /> 속성 삭제
        </button>
      </div>
    </>
  );
}
