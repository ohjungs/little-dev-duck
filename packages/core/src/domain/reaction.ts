// 2026-07-27 : 메신저 - 메시지 반응 (Phase 51)
//
// 반응은 **"누가 무엇을 달았는가"의 목록**이고, 화면은 **"무엇이 몇 개인가"**를 본다.
// 그 변환을 순수 함수로 둔다 — 화면에서 세면 방마다·목록마다 세는 방식이 갈라진다.

/** 고를 수 있는 반응. 자유 입력을 받지 않는다 — 종류가 무한히 늘면 세는 것도 보여 주는 것도 어렵다. */
export const REACTION_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🎉"] as const;

export type ReactionEmoji = (typeof REACTION_EMOJIS)[number];

export type Reaction = {
  messageId: string;
  userId: string;
  emoji: string;
};

export type ReactionSummary = {
  emoji: string;
  count: number;
  /** 내가 단 것인가. 다시 누르면 해제된다는 걸 화면이 알아야 한다. */
  mine: boolean;
};

/**
 * 한 메시지의 반응을 종류별로 센다. **등장 순서를 유지한다** —
 * 개수순으로 정렬하면 누를 때마다 버튼이 움직여서 옆 것을 잘못 누른다.
 */
export function summarizeReactions(
  reactions: readonly Reaction[],
  messageId: string,
  myUserId: string | null,
): ReactionSummary[] {
  const order: string[] = [];
  const counts = new Map<string, { count: number; mine: boolean }>();

  for (const r of reactions) {
    if (r.messageId !== messageId) continue;
    const cur = counts.get(r.emoji);
    if (!cur) {
      order.push(r.emoji);
      counts.set(r.emoji, { count: 1, mine: myUserId !== null && r.userId === myUserId });
    } else {
      cur.count += 1;
      if (myUserId !== null && r.userId === myUserId) cur.mine = true;
    }
  }

  return order.map((emoji) => ({ emoji, ...counts.get(emoji)! }));
}

/**
 * 다시 누르면 해제. **이미 단 것인지로 판정한다** — 화면 상태로 판정하면
 * 다른 기기에서 단 반응을 모르고 또 달게 되고, 그건 유니크 제약에 막힌다.
 */
export function shouldRemoveReaction(
  reactions: readonly Reaction[],
  messageId: string,
  myUserId: string,
  emoji: string,
): boolean {
  return reactions.some(
    (r) => r.messageId === messageId && r.userId === myUserId && r.emoji === emoji,
  );
}
