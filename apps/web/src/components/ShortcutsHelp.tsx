"use client";

import { useEffect, useState } from "react";
import { Keyboard, X } from "lucide-react";

// 앱 전역 키보드 단축키 목록. 기능이 늘며 단축키가 많아져 발견성을 위해 "?"로 여는 도움말을 둔다.
const SHORTCUTS: { group: string; items: { keys: string; desc: string }[] }[] = [
  {
    group: "전역",
    items: [
      { keys: "Ctrl/⌘ + K", desc: "검색 · 명령 팔레트" },
      { keys: "?", desc: "이 단축키 도움말" },
    ],
  },
  {
    group: "메모",
    items: [{ keys: "Ctrl/⌘ + Enter", desc: "메모 추가" }],
  },
  {
    group: "픽셀 오피스",
    items: [
      { keys: "방향키 / WASD", desc: "대장오리 이동" },
      { keys: "E / Enter", desc: "직원 오리에게 말 걸기" },
      { keys: "더블클릭", desc: "활동 로그 열기" },
    ],
  },
];

// "?"로 여는 단축키 도움말 오버레이. (app) 레이아웃에 상주(CommandPalette와 동일 패턴).
export function ShortcutsHelp() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        return;
      }
      // "?"(Shift+/)로 토글. 단, 입력 필드에서 타이핑 중이면 가로채지 않는다.
      if (e.key === "?" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const t = e.target as HTMLElement | null;
        const tag = t?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || t?.isContentEditable) return;
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 p-4 backdrop-blur-sm"
      role="presentation"
      onClick={() => setOpen(false)}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="키보드 단축키"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md overflow-hidden rounded-xl border border-border bg-card shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <span className="flex items-center gap-2 text-sm font-semibold">
            <Keyboard className="size-4 text-primary-accent" /> 키보드 단축키
          </span>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="닫기"
            className="rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="flex flex-col gap-4 p-4">
          {SHORTCUTS.map((g) => (
            <div key={g.group}>
              <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground/70">
                {g.group}
              </p>
              <ul className="flex flex-col gap-1.5">
                {g.items.map((it) => (
                  <li
                    key={it.keys}
                    className="flex items-center justify-between gap-3 text-sm"
                  >
                    <span className="text-muted-foreground">{it.desc}</span>
                    <kbd className="shrink-0 rounded border border-border bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
                      {it.keys}
                    </kbd>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
