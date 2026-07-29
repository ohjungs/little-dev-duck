// 2026-07-29 : 메신저 - 링크 모아보기 (Phase 55 T3 K-016)
//
// 방에서 오간 URL을 한 곳에 모은다. 감지는 linkifyParts를 **그대로 재사용**한다 —
// 말풍선에서 링크가 되는 것과 모아보기에 잡히는 것이 다르면 사용자는 어느 쪽이
// 고장인지 모른다(같은 판정 한 벌).

import { linkifyParts } from "./linkify";

export type CollectedLink = { url: string; seq: number };

/**
 * 메시지들에서 링크를 **최근 것부터** 모은다. 같은 URL은 최근 하나만 남긴다
 * (같은 링크를 여러 번 보내면 목록이 도배된다). 지운 메시지는 건너뛴다 —
 * 지운 것이 보관함에 살아 있으면 삭제가 삭제가 아니다.
 */
export function extractLinks(
  messages: readonly { seq: number; body: string; deletedAt: string | null }[],
): CollectedLink[] {
  const seen = new Set<string>();
  const out: CollectedLink[] = [];

  for (const m of [...messages].sort((a, b) => b.seq - a.seq)) {
    if (m.deletedAt !== null) continue;
    for (const part of linkifyParts(m.body)) {
      if (part.href === null || seen.has(part.href)) continue;
      seen.add(part.href);
      out.push({ url: part.href, seq: m.seq });
    }
  }

  return out;
}
