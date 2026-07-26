"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Eye, EyeOff, Loader2, RotateCcw } from "lucide-react";
import { getMyAccess, saveMyDashboardLayout } from "@ldd/api";
import {
  EMPTY_LAYOUT,
  isHidden,
  moveWidget,
  resolveOrder,
  toggleHidden,
  type DashboardLayout,
} from "@ldd/core";
import { createClient } from "@/lib/supabase/client";
import { DASHBOARD_WIDGETS } from "@/lib/dashboardWidgets";
import { friendlyError } from "@/lib/friendlyError";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// 2026-07-26 : 대시보드 - 배치 편집 (피드백 1-2·1-5)
// "대쉬보드 구성을 바꿀수있으면 좋겠고 카드형식으로 움직일수있으면 좋겠어",
// "카드 형태의 … 기능들을 보이거나 안보이게하는 기능을 관리자 기능안에".
//
// 드래그 대신 위/아래 버튼을 쓴다. 드래그는 라이브러리(dnd-kit 등)를 들여와야 하고 키보드로는
// 쓸 수 없다. 카드가 12개뿐이라 버튼 한 번으로 충분하고, 탭 이동만으로도 전부 조작된다.
//
// 규칙 계산은 전부 core `dashboard-layout`에 있다. 여기서는 그리고 저장만 한다 —
// 순서 계산을 화면에서 또 하면 대시보드와 이 화면이 서로 다른 순서를 보여 준다.

const WIDGET_IDS = DASHBOARD_WIDGETS.map((w) => w.id);

export function DashboardLayoutPanel() {
  const [layout, setLayout] = useState<DashboardLayout>(EMPTY_LAYOUT);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const me = await getMyAccess(createClient());
      setLayout(me.dashboardLayout);
      setState("ready");
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 마운트 후 1회 서버 동기화
    void load();
  }, [load]);

  // 낙관적으로 화면을 먼저 바꾸고 저장한다. 실패하면 서버 값으로 되돌린다 —
  // 실패했는데 화면만 바뀌어 있으면 사용자는 저장된 줄 안다.
  const apply = async (next: DashboardLayout) => {
    const previous = layout;
    setLayout(next);
    setNote(null);
    setSaving(true);
    try {
      await saveMyDashboardLayout(createClient(), next);
    } catch (err) {
      setLayout(previous);
      // 2026-07-26 : 오류 - 미적용마이그레이션 - 사람말로 (Phase 37)
      // `dashboard_layout` 컬럼을 더하는 마이그레이션이 적용 대기라 지금은 실제로 저장이 안 된다.
      // 그대로 두면 사용자는 **영문 DB 오류**를 보고 자기가 뭘 잘못했는지 의심한다 —
      // 알려진 대기 상태이므로 그렇게 말해 준다. 모르는 오류는 원문을 그대로 보여준다.
      setNote(friendlyError(err, "저장하지 못했어요."));
    } finally {
      setSaving(false);
    }
  };

  if (state === "loading") {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> 불러오는 중...
      </p>
    );
  }
  if (state === "error") {
    return <p className="text-sm text-muted-foreground">배치를 불러오지 못했어요.</p>;
  }

  const order = resolveOrder(WIDGET_IDS, layout);
  const labelOf = (id: string) =>
    DASHBOARD_WIDGETS.find((w) => w.id === id)?.label ?? id;

  return (
    <div className="flex flex-col gap-2">
      {note && <p className="text-xs text-destructive">{note}</p>}

      <ol className="flex flex-col gap-1.5">
        {order.map((id, index) => {
          const hidden = isHidden(layout, id);
          return (
            <li
              key={id}
              className={cn(
                "flex items-center gap-2 rounded-lg border border-border px-2.5 py-2",
                hidden && "bg-muted/40",
              )}
            >
              <span className="w-5 shrink-0 text-center text-xs tabular-nums text-muted-foreground">
                {index + 1}
              </span>
              <span
                className={cn(
                  "min-w-0 flex-1 truncate text-sm",
                  hidden && "text-muted-foreground line-through",
                )}
              >
                {labelOf(id)}
              </span>
              <button
                type="button"
                disabled={saving || index === 0}
                onClick={() => apply(moveWidget(WIDGET_IDS, layout, id, "up"))}
                aria-label={`${labelOf(id)} 위로`}
                className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30"
              >
                <ChevronUp className="size-4" />
              </button>
              <button
                type="button"
                disabled={saving || index === order.length - 1}
                onClick={() => apply(moveWidget(WIDGET_IDS, layout, id, "down"))}
                aria-label={`${labelOf(id)} 아래로`}
                className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30"
              >
                <ChevronDown className="size-4" />
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => apply(toggleHidden(layout, id))}
                aria-pressed={!hidden}
                aria-label={`${labelOf(id)} ${hidden ? "보이기" : "숨기기"}`}
                className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30"
              >
                {hidden ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </li>
          );
        })}
      </ol>

      <div className="flex items-center gap-2 pt-1">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={saving}
          onClick={() => apply(EMPTY_LAYOUT)}
        >
          <RotateCcw className="size-3.5" />
          기본값으로
        </Button>
        {saving && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Loader2 className="size-3 animate-spin" /> 저장 중
          </span>
        )}
      </div>
    </div>
  );
}
