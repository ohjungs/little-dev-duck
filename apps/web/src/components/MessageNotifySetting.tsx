"use client";

// 2026-07-29 : 설정 - 메시지 알림 방식 (Phase 56 T1 M-007·M-008)
// 방이 늘면 "전부 알림"은 곧 "전부 끔"이 된다 — 키워드만 골라 받는 길.
// 권한·방해금지·하루 상한은 notifyDuck이 보고, 여기서는 "무엇을"만 정한다.

import { useEffect, useState } from "react";
import type { MessageNotifyMode } from "@ldd/core";
import {
  getMsgNotifyMode,
  getNotifyKeywords,
  setMsgNotifyMode,
  setNotifyKeywords,
} from "@/lib/msgNotifyPref";

const OPTIONS: { value: MessageNotifyMode; label: string; desc: string }[] = [
  { value: "all", label: "전부 알림", desc: "새 메시지가 오면 항상" },
  { value: "keywords", label: "키워드만", desc: "아래 낱말이 든 메시지만" },
  { value: "off", label: "끔", desc: "메시지 알림을 받지 않아요" },
];

export function MessageNotifySetting() {
  const [mode, setMode] = useState<MessageNotifyMode | null>(null);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [draft, setDraft] = useState("");

  // localStorage는 클라이언트 전용이라 마운트 후 1회 읽는다(SendKeySetting과 같은 방식).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- SSR/hydration 안전: 마운트 후 1회 동기화
    setMode(getMsgNotifyMode());
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 같은 이유
    setKeywords(getNotifyKeywords());
  }, []);

  if (mode === null) return <p className="text-sm text-muted-foreground">확인 중...</p>;

  function addKeyword() {
    const word = draft.trim();
    if (word === "") return;
    // 중복은 하나만 — 같은 낱말이 두 번 있어도 판정은 같다.
    const next = keywords.includes(word) ? keywords : [...keywords, word];
    setKeywords(next);
    setNotifyKeywords(next);
    setDraft("");
  }

  function removeKeyword(word: string) {
    const next = keywords.filter((k) => k !== word);
    setKeywords(next);
    setNotifyKeywords(next);
  }

  return (
    <div className="flex flex-col gap-2">
      <div role="radiogroup" aria-label="메시지 알림 방식" className="flex flex-col gap-2">
        {OPTIONS.map((o) => (
          <label key={o.value} className="flex cursor-pointer items-start gap-2 text-sm">
            <input
              type="radio"
              name="msg-notify-mode"
              checked={mode === o.value}
              onChange={() => {
                setMode(o.value);
                setMsgNotifyMode(o.value);
              }}
              className="mt-1"
            />
            <span>
              {o.label}
              <span className="block text-xs text-muted-foreground">{o.desc}</span>
            </span>
          </label>
        ))}
      </div>

      {mode === "keywords" && (
        <div className="mt-1 flex flex-col gap-1.5">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              addKeyword();
            }}
            className="flex gap-1"
          >
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              aria-label="알림 키워드 추가"
              placeholder="예: 배포, 긴급"
              className="flex-1 rounded-md border border-border bg-background px-2 py-1 text-sm"
            />
            <button
              type="submit"
              disabled={draft.trim() === ""}
              className="rounded-md border border-border px-2 py-1 text-sm disabled:opacity-50"
            >
              추가
            </button>
          </form>
          {keywords.length === 0 ? (
            // 키워드 모드 + 빈 목록 = 아무 알림도 안 온다. 말하지 않으면 고장으로 안다.
            <p className="text-xs text-amber-600 dark:text-amber-500 break-keep">
              키워드가 없으면 아무 알림도 오지 않아요. 위에서 낱말을 추가해 주세요.
            </p>
          ) : (
            <ul className="flex flex-wrap gap-1">
              {keywords.map((word) => (
                <li
                  key={word}
                  className="flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-xs"
                >
                  {word}
                  <button
                    type="button"
                    onClick={() => removeKeyword(word)}
                    aria-label={`${word} 키워드 지우기`}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <p className="text-xs text-muted-foreground break-keep">
        이 기기에만 적용됩니다. 방해금지 시간·하루 상한·방별 알림 끄기는 그대로 함께 동작해요.
      </p>
    </div>
  );
}
