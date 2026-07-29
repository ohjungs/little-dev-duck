"use client";

// 2026-07-29 : 설정 - 메시지 전송 키 (F-003)
// IME 문제를 겪은 한국어 사용자는 Ctrl+Enter를 원한다(계획). 조합 중 오전송 가드(X-017)는
// 어느 모드든 항상 켜져 있고, 이 설정은 "Enter를 줄바꿈으로 쓸지"를 정한다.

import { useEffect, useState } from "react";
import type { SendKeyMode } from "@/lib/composition";
import { getSendKeyMode, setSendKeyMode } from "@/lib/sendKeyPref";

const OPTIONS: { value: SendKeyMode; label: string; desc: string }[] = [
  { value: "enter", label: "Enter로 전송", desc: "줄바꿈은 Shift+Enter" },
  { value: "ctrl-enter", label: "Ctrl+Enter로 전송", desc: "Enter는 줄바꿈 — 한글 입력이 잘리는 일이 잦다면 이쪽" },
];

export function SendKeySetting() {
  const [mode, setMode] = useState<SendKeyMode | null>(null);

  // localStorage는 클라이언트 전용이라 마운트 후 1회 읽는다(NotifySetting과 같은 방식).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- SSR/hydration 안전: 마운트 후 1회 동기화
    setMode(getSendKeyMode());
  }, []);

  if (mode === null) return <p className="text-sm text-muted-foreground">확인 중...</p>;

  return (
    <div role="radiogroup" aria-label="메시지 전송 키" className="flex flex-col gap-2">
      {OPTIONS.map((o) => (
        <label key={o.value} className="flex cursor-pointer items-start gap-2 text-sm">
          <input
            type="radio"
            name="send-key"
            checked={mode === o.value}
            onChange={() => {
              setMode(o.value);
              setSendKeyMode(o.value);
            }}
            className="mt-1"
          />
          <span>
            {o.label}
            <span className="block text-xs text-muted-foreground">{o.desc}</span>
          </span>
        </label>
      ))}
      <p className="text-xs text-muted-foreground break-keep">
        이 기기에만 적용됩니다. 이미 열려 있는 대화 화면은 새로 열어야 반영돼요.
      </p>
    </div>
  );
}
