"use client";

// 2026-07-29 : 공용 - 이모지 피커 (Phase 54 T1 F-011~F-013)
//
// PageEditor 안에 있던 IconPicker를 **그대로 꺼내 공용으로** 만들었다(계획: 재구현 금지).
// 페이지 아이콘과 메시지 입력이 같은 피커·같은 "자주 쓰는" 목록을 쓴다 —
// 최근 이모지 키는 여기 한 곳에만 있다(단일 출처, 정적 검사로 잠근다).

import { useState } from "react";

import { pushRecentList, readRecentList } from "@/lib/recentList";

// 카테고리별 큐레이션 이모지. 라이브러리 없이 정적 배열(ponytail).
const RECENT_EMOJIS_KEY = "ldd:recent-emojis";
const RECENT_MAX = 20;

type EmojiCategoryKey = "recent" | "objects" | "animals" | "food" | "activities" | "symbols";

const EMOJI_CATEGORY_DEFS: Record<
  Exclude<EmojiCategoryKey, "recent">,
  { label: string; emojis: string[] }
> = {
  objects: {
    label: "사물",
    emojis: ["📝", "📌", "📎", "📁", "📂", "📊", "📈", "💻", "⚙️", "🔧", "🔑", "💡", "📞", "✉️", "📦", "🏷️", "🗂️", "📋", "✏️", "🖊️"],
  },
  animals: {
    label: "동물",
    emojis: ["🦆", "🐤", "🐣", "🐥", "🐔", "🦅", "🐧", "🐱", "🐶", "🐰", "🦊", "🐻", "🐼", "🐸", "🐢", "🐝", "🦋", "🐟", "🐙", "🌸"],
  },
  food: {
    label: "음식",
    emojis: ["☕", "🍵", "🍰", "🍪", "🍩", "🍕", "🍔", "🍟", "🍜", "🍱", "🍣", "🍎", "🍊", "🍋", "🍇", "🍓", "🥑", "🥕", "🌽", "🍞"],
  },
  activities: {
    label: "활동",
    emojis: ["🎯", "🎮", "🎨", "🎵", "🎬", "📸", "🏃", "⚽", "🏀", "🎾", "🎲", "🧩", "🎪", "🎭", "🏆", "🎖️", "🌟", "⭐", "🔥", "💪"],
  },
  symbols: {
    label: "기호",
    emojis: ["❤️", "💚", "💙", "💜", "🧡", "💛", "🤍", "🖤", "✅", "❌", "⚠️", "💬", "🔔", "🔒", "🔓", "♻️", "🚀", "💎", "🎁", "🌈"],
  },
};

const EMOJI_CATEGORY_ORDER: EmojiCategoryKey[] = [
  "recent",
  "objects",
  "animals",
  "food",
  "activities",
  "symbols",
];

const EMOJI_CATEGORY_LABELS: Record<EmojiCategoryKey, string> = {
  recent: "자주 쓰는",
  objects: "사물",
  animals: "동물",
  food: "음식",
  activities: "활동",
  symbols: "기호",
};

export function EmojiPicker({
  onSelect,
  onClose,
  onClear,
  clearLabel = "아이콘 제거",
  ariaPrefix = "이모지",
  className = "absolute left-4 top-full z-20 mt-1",
}: {
  onSelect: (emoji: string) => void;
  onClose: () => void;
  /** 있으면 "제거" 버튼을 보여 준다(페이지 아이콘용). 메시지 입력에는 지울 대상이 없다. */
  onClear?: () => void;
  clearLabel?: string;
  ariaPrefix?: string;
  /** 띄울 자리는 호출부가 정한다 — 페이지는 제목 아래, 메시지는 입력창 위. */
  className?: string;
}) {
  const [activeCategory, setActiveCategory] = useState<EmojiCategoryKey>("objects");
  // 지연 초기화: typeof window 가드로 SSR에서도 안전. 마운트 시점에만 1회 실행된다.
  const [recentEmojis, setRecentEmojis] = useState<string[]>(() =>
    typeof window !== "undefined" ? readRecentList(RECENT_EMOJIS_KEY) : [],
  );

  const handleSelect = (emoji: string) => {
    // 저장과 화면 갱신을 한 결과로 — 검색의 최근 검색어와 같은 recentList 한 벌이다.
    setRecentEmojis(pushRecentList(RECENT_EMOJIS_KEY, emoji, RECENT_MAX));
    onSelect(emoji);
  };

  const currentEmojis: string[] =
    activeCategory === "recent"
      ? recentEmojis
      : EMOJI_CATEGORY_DEFS[activeCategory].emojis;

  const visibleCategories = EMOJI_CATEGORY_ORDER.filter(
    (key) => key !== "recent" || recentEmojis.length > 0,
  );

  return (
    <>
      <div
        role="presentation"
        className="fixed inset-0 z-10"
        onClick={onClose}
      />
      <div className={`${className} flex w-72 flex-col gap-2 rounded-lg border border-border bg-card p-3 shadow-lg`}>
        {/* 카테고리 탭 */}
        <div className="flex flex-wrap gap-1" role="tablist" aria-label="이모지 카테고리">
          {visibleCategories.map((key) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={activeCategory === key}
              onClick={() => setActiveCategory(key)}
              className={`rounded px-2 py-0.5 text-xs transition-colors ${
                activeCategory === key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {EMOJI_CATEGORY_LABELS[key]}
            </button>
          ))}
        </div>
        {/* 이모지 그리드 */}
        <div
          role="tabpanel"
          aria-label={EMOJI_CATEGORY_LABELS[activeCategory]}
          className="grid grid-cols-8 gap-1"
        >
          {currentEmojis.length === 0 ? (
            <p className="col-span-8 py-2 text-center text-xs text-muted-foreground">
              아직 없습니다
            </p>
          ) : (
            currentEmojis.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => handleSelect(e)}
                aria-label={`${ariaPrefix} ${e}`}
                className="rounded p-1 text-xl leading-none transition-colors hover:bg-muted"
              >
                {e}
              </button>
            ))
          )}
        </div>
        {onClear && (
          <button
            type="button"
            onClick={onClear}
            className="self-start text-xs text-muted-foreground transition-colors hover:text-destructive"
          >
            {clearLabel}
          </button>
        )}
      </div>
    </>
  );
}
