"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronDown, GripVertical, Loader2 } from "lucide-react";
import { saveMyDashboardLayout } from "@ldd/api";
import {
  EMPTY_LAYOUT,
  reorderWidget,
  resolveOrder,
  visibleWidgets,
  type DashboardLayout,
} from "@ldd/core";
import { createClient } from "@/lib/supabase/client";
import { DASHBOARD_WIDGETS } from "@/lib/dashboardWidgets";
import { friendlyError } from "@/lib/friendlyError";
import { cn } from "@/lib/utils";

// 2026-07-31 : 대시보드 - 순서 - 카드에서 직접 끌기 (사용자 3회 요청, 승인됨)
// 설정 화면(`DashboardLayoutPanel`)에는 이미 끌어다 놓기가 있었지만, 사용자가 요청한 것은
// **대시보드에서 카드 자체를 잡아 옮기는 것**이었다 — 순서를 바꾸려고 매번 관리자 화면으로
// 들어가야 했다.
//
// 순서 계산은 core `reorderWidget` 한 벌을 그대로 쓴다(설정 화면과 같은 함수). 화면에서 배열을
// 주무르면 두 화면이 서로 다른 순서를 보여 준다 — 이 저장소가 이미 정해 둔 규칙이다.
//
// **손잡이만 draggable로 둔다.** 카드 전체를 draggable로 만들면 메모·할 일 안의 글자를 드래그로
// 선택하는 것이 카드 끌기로 가로채여 기존 동작이 깨진다.
//
// 키보드 경로: 손잡이에 포커스한 뒤 위/아래 화살표. 끌기만 있으면 마우스 없이는 순서를 바꿀 수
// 없다(WCAG 2.1.1). 저장 실패 시에는 화면을 되돌린다 — 안 되돌리면 저장된 줄 안다.

const WIDGET_IDS = DASHBOARD_WIDGETS.map((w) => w.id);

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
  // 순서 바꾸기. 손잡이가 이 넷을 쓴다.
  draggable: boolean;
  dragging: boolean;
  dropTarget: boolean;
  onDragStartId: (id: string) => void;
  onDragEndId: () => void;
  onDragOverId: (id: string) => void;
  onDropId: (id: string) => void;
  onMoveKey: (id: string, direction: "up" | "down") => void;
};

function CollapsibleWidget({
  id,
  label,
  collapsed,
  onToggle,
  className,
  children,
  draggable,
  dragging,
  dropTarget,
  onDragStartId,
  onDragEndId,
  onDragOverId,
  onDropId,
  onMoveKey,
}: CollapsibleWidgetProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={cardRef}
      onDragOver={(e) => {
        if (!draggable) return;
        // 기본 동작을 막아야 드롭이 허용된다(HTML5 드래그의 규칙).
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        onDragOverId(id);
      }}
      onDrop={(e) => {
        e.preventDefault();
        onDropId(id);
      }}
      className={cn(
        "group/widget relative rounded-xl border bg-card shadow-sm transition-shadow hover:shadow-md",
        dragging && "opacity-50",
        // 놓일 자리를 알린다 — 안 보이면 어디에 떨어질지 모르고 놓는다.
        dropTarget && !dragging && "ring-2 ring-primary/60",
        className,
      )}
    >
      {/* 순서 손잡이. 접기 버튼과 같은 규칙으로 hover·포커스 때만 드러낸다 —
          상시 노출하면 위젯 자체의 헤더 컨트롤과 겹친다. */}
      <button
        type="button"
        draggable={draggable}
        onDragStart={(e) => {
          e.dataTransfer.effectAllowed = "move";
          // 일부 브라우저는 데이터가 없으면 드래그를 시작하지 않는다.
          e.dataTransfer.setData("text/plain", id);
          // 끌리는 그림을 손잡이가 아니라 카드로 바꾼다. 안 그러면 아이콘만 떠다녀
          // 무엇을 옮기는 중인지 알 수 없다.
          if (cardRef.current) e.dataTransfer.setDragImage(cardRef.current, 16, 16);
          onDragStartId(id);
        }}
        onDragEnd={onDragEndId}
        onKeyDown={(e) => {
          if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
          // 화살표가 페이지를 스크롤하지 않게 한다 — 카드가 움직이는데 화면도 같이 튀면
          // 어디로 갔는지 놓친다.
          e.preventDefault();
          onMoveKey(id, e.key === "ArrowUp" ? "up" : "down");
        }}
        aria-label={`${label} 카드 순서 이동`}
        aria-describedby="dashboard-reorder-hint"
        className={cn(
          "absolute left-2.5 top-2.5 z-10 rounded-md bg-card/80 p-0.5 text-muted-foreground opacity-0 shadow-sm backdrop-blur-sm transition-opacity hover:bg-muted hover:text-foreground focus-visible:opacity-100 group-hover/widget:opacity-100",
          draggable ? "cursor-grab active:cursor-grabbing" : "cursor-default",
        )}
      >
        <GripVertical className="size-4" />
      </button>

      {/* 접혔을 때만 보이는 제목 바 */}
      {collapsed && (
        <div className="flex items-center justify-between py-3 pl-10 pr-5">
          <span className="text-sm font-semibold tracking-tight">{label}</span>
          <button
            type="button"
            onClick={() => onToggle(id)}
            aria-label="펼치기"
            className="rounded p-0.5 transition-colors hover:bg-muted"
          >
            <ChevronDown className="size-4 -rotate-90 transition-transform" />
          </button>
        </div>
      )}

      {/* 위젯 본체 + 펼쳐진 상태의 토글 버튼(hover 시에만 노출 — 위젯 자체 헤더 컨트롤과 상시 겹침 방지) */}
      {!collapsed && (
        <div className="relative">
          <button
            type="button"
            onClick={() => onToggle(id)}
            aria-label="접기"
            className="absolute right-2.5 top-2.5 z-10 rounded-md bg-card/80 p-0.5 text-muted-foreground opacity-0 shadow-sm backdrop-blur-sm transition-opacity hover:bg-muted hover:text-foreground focus-visible:opacity-100 group-hover/widget:opacity-100"
          >
            <ChevronDown className="size-4" />
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
  // 기본 배치에서만 쓰는 자리 고정(xl에서 오리·채팅을 첫 줄에 붙인다).
  // 사용자가 순서를 정하면 떼어낸다 — 자리가 고정돼 있으면 끌어도 그 자리에 그대로 있다.
  pinnedClassName?: string;
  children: ReactNode;
};

type DashboardGridProps = {
  widgets: WidgetSlot[];
  // 서버가 읽어 온 저장된 배치. 여기서 순서를 바꾸고 같은 모양으로 저장한다.
  layout?: DashboardLayout;
};

export function DashboardGrid({ widgets, layout: initialLayout }: DashboardGridProps) {
  const [collapsed, setCollapsed] = useState<string[]>([]);
  const [layout, setLayout] = useState<DashboardLayout>(initialLayout ?? EMPTY_LAYOUT);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropId, setDropId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  // 키보드로 옮겼을 때 어디로 갔는지 소리로 알린다 — 끌기와 달리 화면을 안 보는 사용자가 쓴다.
  const [announce, setAnnounce] = useState("");

  // 마운트 후 localStorage에서 접힘 상태를 복원한다 (SSR hydration 안전).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- SSR/hydration 안전: 마운트 후 1회 localStorage 동기화
    setCollapsed(getCollapsed());
  }, []);

  const handleToggle = (id: string) => {
    setCollapsed(toggleCollapse(id));
  };

  // 2026-07-26 (피드백 1-5): 카드를 전부 숨기면 빈 화면만 남아 되돌릴 방법이 안 보인다.
  // 어디서 다시 켜는지 알려 준다.
  if (widgets.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        표시할 카드가 없어요.{" "}
        <a href="/admin" className="text-primary-accent hover:underline">
          관리자 → 대시보드 구성
        </a>
        에서 다시 켤 수 있어요.
      </p>
    );
  }

  const slotOf = new Map(widgets.map((s) => [s.id, s]));
  // 저장된 배치를 기준으로 그린다. 서버가 준 순서와 같지만, 여기서 바꾼 뒤에는 이쪽이 앞선다.
  const fullOrder = resolveOrder(WIDGET_IDS, layout);
  const shown = visibleWidgets(WIDGET_IDS, layout).filter((id) => slotOf.has(id));
  // 사용자가 순서를 한 번이라도 정했으면 기본 자리 고정을 뗀다.
  const pinned = layout.order.length === 0;

  // 낙관적으로 화면을 먼저 바꾸고 저장한다(설정 화면과 같은 규칙).
  const apply = async (next: DashboardLayout) => {
    const previous = layout;
    setLayout(next);
    setNote(null);
    setSaving(true);
    try {
      await saveMyDashboardLayout(createClient(), next);
    } catch (err) {
      setLayout(previous);
      setNote(friendlyError(err, "순서를 저장하지 못했어요."));
    } finally {
      setSaving(false);
    }
  };

  // 놓은 카드 자리로 끼워 넣는다. 목적지는 **전체 순서 기준 인덱스**여야 한다 —
  // 화면에 보이는 목록은 숨긴 카드가 빠져 있어 인덱스가 어긋난다.
  const dropOn = (targetId: string) => {
    const moving = dragId;
    setDragId(null);
    setDropId(null);
    if (!moving || moving === targetId) return;
    void apply(reorderWidget(WIDGET_IDS, layout, moving, fullOrder.indexOf(targetId)));
  };

  // 화살표 키. 한 칸 위/아래는 **보이는 목록 기준**으로 센다 — 숨긴 카드와 자리를 바꾸면
  // 저장은 되는데 화면은 그대로여서 키가 안 먹는 것처럼 보인다.
  const moveByKey = (id: string, direction: "up" | "down") => {
    const from = shown.indexOf(id);
    const to = direction === "up" ? from - 1 : from + 1;
    if (from === -1 || to < 0 || to >= shown.length) return;
    setAnnounce(`${slotOf.get(id)?.label ?? id} 카드를 ${to + 1}번째로 옮겼어요.`);
    void apply(reorderWidget(WIDGET_IDS, layout, id, fullOrder.indexOf(shown[to]!)));
  };

  return (
    <>
      {note && <p className="mb-2 text-xs text-destructive">{note}</p>}
      <p id="dashboard-reorder-hint" className="sr-only">
        카드를 끌어서 순서를 바꿀 수 있어요. 위아래 화살표 키로도 옮길 수 있습니다.
      </p>
      <p aria-live="polite" role="status" className="sr-only">
        {announce}
      </p>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {shown.map((id) => {
          const slot = slotOf.get(id)!;
          return (
            <CollapsibleWidget
              key={slot.id}
              id={slot.id}
              label={slot.label}
              collapsed={collapsed.includes(slot.id)}
              onToggle={handleToggle}
              className={cn(slot.className, pinned && slot.pinnedClassName)}
              // 저장이 도는 중에 순서를 또 바꾸면 어느 쪽이 남는지 예측할 수 없다.
              draggable={!saving}
              dragging={dragId === slot.id}
              dropTarget={dropId === slot.id}
              onDragStartId={setDragId}
              onDragEndId={() => {
                setDragId(null);
                setDropId(null);
              }}
              onDragOverId={setDropId}
              onDropId={dropOn}
              onMoveKey={moveByKey}
            >
              {slot.children}
            </CollapsibleWidget>
          );
        })}
      </div>

      {saving && (
        <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
          <Loader2 className="size-3 animate-spin" /> 순서 저장 중
        </p>
      )}
    </>
  );
}
