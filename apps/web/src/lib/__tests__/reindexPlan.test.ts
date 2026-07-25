import { describe, expect, it } from "vitest";
import { planReindex, REINDEX_MAX_ITEMS } from "../reindexPlan";

// 2026-07-26 : RAG - 백필 - 상한너머는영영안됨
// 백필은 소스별 라운드로빈으로 섞은 뒤 앞에서 200개를 잘라 처리했다. 그런데 **매번 같은 앞
// 200개**라, 항목이 200개를 넘으면 그 뒤는 어떤 방법으로도 색인되지 않았다 — 자동 백필도,
// /admin의 버튼을 여러 번 눌러도 마찬가지. 오리에게 영영 안 보이는 영역이 생긴다.
//
// 게다가 응답의 total이 **잘린 개수**여서 indexed === total이 되어 항상 "다 됐다"처럼 보였고,
// 클라이언트는 그걸 성공으로 보고 완료 플래그를 남겨 다시 돌지 않았다. 조용한 영구 실패다.
//
// 그래서 offset을 받아 이어서 처리하고, **진짜 전체 개수**와 다음 위치를 돌려준다.

const src = (n: number, prefix: string) =>
  Array.from({ length: n }, (_, i) => ({
    sourceType: "memo" as const,
    sourceId: `${prefix}${i}`,
    text: `${prefix}${i}`,
  }));

describe("planReindex", () => {
  it("소스를 라운드로빈으로 섞는다 — 한 소스가 통째로 밀려나지 않게", () => {
    const plan = planReindex([src(2, "a"), src(2, "b")], 0);
    expect(plan.items.map((i) => i.sourceId)).toEqual(["a0", "b0", "a1", "b1"]);
  });

  it("길이가 다른 소스도 남김없이 담는다", () => {
    const plan = planReindex([src(1, "a"), src(3, "b")], 0);
    expect(plan.items.map((i) => i.sourceId)).toEqual(["a0", "b0", "b1", "b2"]);
    expect(plan.total).toBe(4);
  });

  // 이게 이번 수정의 핵심이다.
  it("total은 잘린 개수가 아니라 진짜 전체 개수다", () => {
    const plan = planReindex([src(REINDEX_MAX_ITEMS + 50, "a")], 0);
    expect(plan.total).toBe(REINDEX_MAX_ITEMS + 50);
    expect(plan.items).toHaveLength(REINDEX_MAX_ITEMS);
    expect(plan.done).toBe(false);
  });

  it("offset부터 이어서 처리한다 — 재실행이 진전을 만든다", () => {
    const all = src(REINDEX_MAX_ITEMS + 50, "a");
    const first = planReindex([all], 0);
    const second = planReindex([all], first.nextOffset);
    expect(second.items[0].sourceId).toBe(`a${REINDEX_MAX_ITEMS}`);
    expect(second.items).toHaveLength(50);
    expect(second.done).toBe(true);
  });

  it("한 번에 끝나면 done이다", () => {
    const plan = planReindex([src(3, "a")], 0);
    expect(plan.done).toBe(true);
    expect(plan.nextOffset).toBe(3);
  });

  it("끝을 넘긴 offset은 빈 계획 + done", () => {
    const plan = planReindex([src(3, "a")], 10);
    expect(plan.items).toEqual([]);
    expect(plan.done).toBe(true);
  });

  it("음수·비정상 offset은 0으로 본다", () => {
    const plan = planReindex([src(2, "a")], -5);
    expect(plan.items).toHaveLength(2);
    expect(plan.nextOffset).toBe(2);
  });

  it("빈 입력에서 죽지 않는다", () => {
    const plan = planReindex([], 0);
    expect(plan).toMatchObject({ items: [], total: 0, done: true, nextOffset: 0 });
  });

  it("전부 빈 소스여도 done이다", () => {
    expect(planReindex([[], []], 0).done).toBe(true);
  });
});
