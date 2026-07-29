"use client";

// 2026-07-29 : 설정 - 초기화 (Phase 56 T2 T-031)
// 이 기기의 브라우저 저장값(설정·즐겨찾기·순서·최근 기록 등 ldd 접두어 전부)을 초기화한다.
// **DB는 건드리지 않는다** — 계정·대화·문서·할 일은 그대로다. 되돌릴 수 없으므로
// Phase 35의 계약(문구 타이핑, 각 위험 동작마다 다른 문구)을 그대로 쓴다.

import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { SETTINGS_RESET_PHRASE } from "@ldd/core";
import { resetLocalSettings } from "@/lib/resetLocalSettings";
import { Button } from "@/components/ui/button";

export function SettingsResetCard() {
  const [armed, setArmed] = useState(false);
  const [phrase, setPhrase] = useState("");

  const canReset = phrase.trim() === SETTINGS_RESET_PHRASE;

  function handleReset() {
    if (!canReset) return;
    resetLocalSettings();
    // 화면 곳곳이 마운트 시점의 localStorage를 들고 있다 — 새로고침이 가장 정직한 반영이다.
    window.location.reload();
  }

  if (!armed) {
    return (
      <div className="flex flex-col gap-2">
        <Button variant="outline" onClick={() => setArmed(true)}>
          <RotateCcw />
          이 기기 설정 초기화
        </Button>
        <p className="text-xs text-muted-foreground break-keep">
          테마·전송 키·알림 방식·즐겨찾기 같은 이 브라우저의 저장값을 지웁니다.
          계정·대화·문서는 그대로예요. 지우기 전에 내보내기로 백업할 수 있어요.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm break-keep">
        {`되돌릴 수 없어요. 계속하려면 "${SETTINGS_RESET_PHRASE}"를 입력하세요.`}
      </p>
      <input
        value={phrase}
        onChange={(e) => setPhrase(e.target.value)}
        aria-label={`확인 문구 "${SETTINGS_RESET_PHRASE}" 입력`}
        placeholder={SETTINGS_RESET_PHRASE}
        className="rounded-md border border-border bg-background px-3 py-1.5 text-sm"
      />
      <div className="flex gap-2">
        <Button variant="destructive" disabled={!canReset} onClick={handleReset}>
          초기화 실행
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            setArmed(false);
            setPhrase("");
          }}
        >
          취소
        </Button>
      </div>
    </div>
  );
}
