"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// localStorage helpers
// ---------------------------------------------------------------------------
const COLLAPSED_KEY = "ldd-collapsed-widgets";

function getCollapsed(): string[] {
  try {
    return JSON.parse(localStorage.getItem(COLLAPSED_KEY) ?? "[]") as string[];
  } catch {
    return [];
  }
}

function toggleCollapse(widgetId: string): string[] {
  const current = getCollapsed();
  const next = current.includes(widgetId)
    ? current.filter((w) => w !== widgetId)
    : [...current, widgetId];
  localStorage.setItem(COLLAPSED_KEY, JSON.stringify(next));
  return next;
}

// ---------------------------------------------------------------------------
// CollapsibleWidget — wrapper rendered per-widget
// ---------------------------------------------------------------------------
type CollapsibleWidgetProps = {
  id: string;
  label: string;
  collapsed: boolean;
  onToggle: (id: string) => void;
  className?: string;
  children: ReactNode;
};

function CollapsibleWidget({
  id,
  label,
  collapsed,
  onToggle,
  className,
  children,
}: CollapsibleWidgetProps) {
  return (
    <div className={cn("rounded-xl border bg-card shadow-sm hover:shadow-md transition-shadow", className)}>
      {/* 접혔을 때만 보이는 제목 바 */}
      {collapsed && (
        <div className="flex items-center justify-between px-5 py-3">
          <span className="text-sm font-semibold tracking-tight">{label}</span>
          <button
            type="button"
            onClick={() => onToggle(id)}
            aria-label="펼치기"
            className="rounded p-0.5 hover:bg-muted transition-colors"
          >
            <ChevronDown className="size-4 -rotate-90 transition-transform" />
          </button>
        </div>
      )}

      {/* 위젯 본체 + 펼쳐진 상태의 토글 버튼 */}
      {!collapsed && (
        <div className="relative">
          <button
            type="button"
            onClick={() => onToggle(id)}
            aria-label="접기"
            className="absolute right-3 top-3 z-10 rounded p-0.5 hover:bg-muted transition-colors"
          >
            <ChevronDown className="size-4 transition-transform" />
          </button>
          {children}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// DashboardGrid — grid container owning collapse state
// ---------------------------------------------------------------------------
type WidgetSlot = {
  id: string;
  label: string;
  className?: string;
  children: ReactNode;
};

type DashboardGridProps = {
  widgets: WidgetSlot[];
};

export function DashboardGrid({ widgets }: DashboardGridProps) {
  const [collapsed, setCollapsed] = useState<string[]>([]);

  // 마운트 후 localStorage에서 접힘 상태를 복원한다 (SSR hydration 안전).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- SSR/hydration 안전: 마운트 후 1회 localStorage 동기화
    setCollapsed(getCollapsed());
  }, []);

  const handleToggle = (id: string) => {
    setCollapsed(toggleCollapse(id));
  };

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {widgets.map((slot) => (
        <CollapsibleWidget
          key={slot.id}
          id={slot.id}
          label={slot.label}
          collapsed={collapsed.includes(slot.id)}
          onToggle={handleToggle}
          className={slot.className}
        >
          {slot.children}
        </CollapsibleWidget>
      ))}
    </div>
  );
}
