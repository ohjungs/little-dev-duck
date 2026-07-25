"use client";

import { useEffect, useRef, useState } from "react";
import { Undo2 } from "lucide-react";

// 2026-07-26 : 삭제 - 되돌리기 - 안내
// 되돌릴 수 있는 동작 직후에 잠깐 뜨는 안내. 위젯 안(에러 문구와 같은 자리)에 인라인으로
// 붙인다 — 화면 전역 토스트 체계를 새로 들이는 건 이 한 기능에 과하다.
//
// 호출부는 항목마다 다른 key를 주어 렌더한다. 다른 항목을 연달아 지우면 key가 바뀌며
// 이 컴포넌트가 다시 마운트돼 타이머가 처음부터 돈다(최신 것으로 교체).

type UndoNoticeProps = {
  message: string;
  onUndo: () => void;
  onDismiss: () => void;
  /** 자동으로 사라지기까지의 시간. 기본 8초. */
  timeoutMs?: number;
};

export function UndoNotice({
  message,
  onUndo,
  onDismiss,
  timeoutMs = 8000,
}: UndoNoticeProps) {
  // 마우스를 올리고 있거나 되돌리기 버튼에 포커스가 있는 동안은 타이머를 멈춘다.
  // 키보드로 탭 이동하는 중에 버튼이 사라지면 되돌릴 방법 자체가 없어진다.
  const [held, setHeld] = useState(false);
  // onDismiss는 호출부에서 인라인 화살표로 넘어와 매 렌더 새 함수다. 타이머 effect의
  // 의존성에 그대로 넣으면 부모가 렌더될 때마다 타이머가 처음부터 다시 돈다 — ref로 끊는다.
  const dismissRef = useRef(onDismiss);
  useEffect(() => {
    dismissRef.current = onDismiss;
  }, [onDismiss]);

  useEffect(() => {
    if (held) return;
    const timer = setTimeout(() => dismissRef.current(), timeoutMs);
    return () => clearTimeout(timer);
  }, [held, timeoutMs]);

  return (
    <div
      role="status"
      data-testid="undo-notice"
      onMouseEnter={() => setHeld(true)}
      onMouseLeave={() => setHeld(false)}
      onFocusCapture={() => setHeld(true)}
      onBlurCapture={() => setHeld(false)}
      className="flex items-center justify-between gap-2 rounded-md border bg-muted/50 px-2.5 py-1.5 text-xs"
    >
      <span className="min-w-0 truncate text-muted-foreground">{message}</span>
      <button
        type="button"
        onClick={onUndo}
        className="inline-flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 font-medium text-primary-accent transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Undo2 className="size-3" aria-hidden />
        되돌리기
      </button>
    </div>
  );
}
