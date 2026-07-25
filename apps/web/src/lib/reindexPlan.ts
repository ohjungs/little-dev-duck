// 2026-07-26 : RAG - 백필 - 상한너머는영영안됨
// 백필은 소스별 라운드로빈으로 섞은 뒤 앞에서 200개를 잘라 처리했다. 문제는 **매번 같은 앞
// 200개**라는 것 — 항목이 200개를 넘으면 그 뒤는 자동 백필로도, /admin 버튼을 여러 번 눌러도
// 색인되지 않았다. 오리에게 영영 안 보이는 영역이 생긴다.
//
// 응답도 이 실패를 감췄다: total이 **잘린 개수**여서 indexed === total이 되어 늘 "다 됐다"처럼
// 보였고, 클라이언트는 그걸 성공으로 보고 완료 플래그를 남겨 다시 돌지 않았다.
//
// 그래서 offset을 받아 이어서 처리하고 **진짜 전체 개수**와 다음 위치를 함께 돌려준다.
// 상한 자체는 유지한다 — 무료 티어 RPM 보호가 원래 목적이고, 여러 번에 나눠 진행하면 된다.

import type { EmbeddingSource } from "@ldd/core";

export type ReindexItem = {
  sourceType: EmbeddingSource;
  sourceId: string;
  text: string;
};

/** 무료 티어 보호: 1회 실행으로 인덱싱할 최대 항목 수. */
export const REINDEX_MAX_ITEMS = 200;

export type ReindexPlan = {
  /** 이번 실행에서 처리할 항목 */
  items: ReindexItem[];
  /** 잘리기 전 **전체** 개수 */
  total: number;
  /** 다음 실행이 시작할 위치 */
  nextOffset: number;
  /** 더 남은 게 없으면 true */
  done: boolean;
};

export function planReindex(
  bySource: ReindexItem[][],
  offset: number,
  max: number = REINDEX_MAX_ITEMS,
): ReindexPlan {
  // 소스별로 라운드로빈 인터리브 — 한 소스(특히 텍스트가 풍부한 page)가 concat 순서상 뒤로
  // 밀려 통째로 잘려나가지 않게 한다. 이 순서는 실행마다 같아야 offset이 의미를 갖는다.
  const all: ReindexItem[] = [];
  const maxLen = bySource.reduce((n, s) => Math.max(n, s.length), 0);
  for (let i = 0; i < maxLen; i += 1) {
    for (const src of bySource) {
      if (i < src.length) all.push(src[i]);
    }
  }

  const start = Number.isFinite(offset) && offset > 0 ? Math.floor(offset) : 0;
  const items = all.slice(start, start + max);
  const nextOffset = start + items.length;
  return { items, total: all.length, nextOffset, done: nextOffset >= all.length };
}
