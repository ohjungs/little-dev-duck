"use client";

// 2026-07-24 : VirtualDpad - 가상 D-pad 오버레이 컴포넌트.
// 터치 디바이스 전용으로 렌더링되며, D-pad 버튼 터치 시 InputManager에 press/release를 전달한다.
// 제스처 라이브러리 없이 순수 DOM touch 이벤트 사용. touch-action:none으로 스크롤 방지.

import { useEffect, useRef, useState } from "react";
import type { InputManager, InputAction } from "@/lib/office-input";

const REPEAT_MS = 150; // 방향키 홀드-투-리피트 간격

type DpadButtonProps = {
  action: InputAction;
  label: string;
  input: InputManager;
  className?: string;
};

function DpadButton({ action, label, input, className = "" }: DpadButtonProps) {
  const repeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startPress = (e: React.TouchEvent) => {
    e.preventDefault();
    input.press(action);
    // 홀드-투-리피트: REPEAT_MS마다 press를 재발사
    repeatRef.current = setInterval(() => {
      input.press(action);
    }, REPEAT_MS);
  };

  const endPress = (e: React.TouchEvent) => {
    e.preventDefault();
    if (repeatRef.current !== null) {
      clearInterval(repeatRef.current);
      repeatRef.current = null;
    }
    input.release(action);
  };

  return (
    <button
      type="button"
      aria-label={label}
      onTouchStart={startPress}
      onTouchEnd={endPress}
      onTouchCancel={endPress}
      className={[
        "flex items-center justify-center",
        "w-12 h-12 rounded-full",
        "bg-black/20 border border-white/30",
        "active:bg-black/40",
        "select-none touch-none",
        "text-white/80 text-lg font-bold",
        className,
      ].join(" ")}
      style={{ touchAction: "none", WebkitTapHighlightColor: "transparent" }}
    >
      {label}
    </button>
  );
}

export function VirtualDpad({ input }: { input: InputManager }) {
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    setIsTouch("ontouchstart" in window || navigator.maxTouchPoints > 0);
  }, []);

  if (!isTouch) return null;

  return (
    <div
      className="pointer-events-none absolute inset-x-0 bottom-3 flex items-end justify-between px-4"
      style={{ zIndex: 10 }}
    >
      {/* 좌측: 십자 방향 패드 */}
      <div
        className="pointer-events-auto relative grid"
        style={{
          gridTemplateColumns: "3rem 3rem 3rem",
          gridTemplateRows: "3rem 3rem 3rem",
          gap: "2px",
          touchAction: "none",
        }}
      >
        {/* Up */}
        <div />
        <DpadButton action="up" label="▲" input={input} />
        <div />
        {/* Middle row */}
        <DpadButton action="left" label="◀" input={input} />
        <div className="w-12 h-12 rounded-full bg-black/10 border border-white/10" />
        <DpadButton action="right" label="▶" input={input} />
        {/* Down */}
        <div />
        <DpadButton action="down" label="▼" input={input} />
        <div />
      </div>

      {/* 우측: A 버튼 (상호작용) */}
      <div className="pointer-events-auto" style={{ touchAction: "none" }}>
        <DpadButton
          action="interact"
          label="A"
          input={input}
          className="w-14 h-14 text-base"
        />
      </div>
    </div>
  );
}
