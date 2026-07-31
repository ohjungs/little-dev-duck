import { describe, expect, it } from "vitest";
import {
  insertIntoHistory,
  pickBlocksToArchive,
  removeBlocks,
  splitStatusBlocks,
} from "../../../../scripts/archive-status.mjs";

// 2026-07-31 : 문서 - Status 자동 이관 - 규칙 잠금 (사용자 결정 B-10)
// 이 스크립트는 **문서를 지우고 옮긴다.** 되돌리기 어려운 편집이라 규칙이 틀리면 기록이 샌다.
// 그래서 파일을 읽지 않는 순수 함수로 갈라 두고 가짜 입력으로 잠근다.
//
// 지키는 계약 넷:
//  (1) 완료(✅)만 옮긴다 — 🛑·표시 없는 블록은 아직 끝나지 않은 일이다.
//  (2) 최신 keep개는 Status에 남는다 — 최근 맥락까지 History로 보내면 Status가 쓸모없어진다.
//  (3) 원문을 바꾸지 않는다 — 이관은 삭제가 아니라 이동이다.
//  (4) History의 이관 섹션 **맨 앞**에 넣는다 — 그 섹션은 최신순 계약이다.
//
// core 패키지에 두는 이유: scripts/는 어느 패키지의 vitest 대상도 아니라 검사가 돌지 않는다.
// 여기 두면 `turbo run test`가 매번 집어 간다.

const STATUS = [
  "# Status.md — 현재 Phase 진행 현황",
  "",
  "> ## ✅ 2026-07-31 최신 완료",
  "> 본문 A",
  "",
  "> ## 🛑 2026-07-30 아직 막힘",
  "> 본문 B",
  "",
  "> ## ✅ 2026-07-29 옛 완료",
  "> 본문 C",
  "> 이어지는 줄",
  "",
  "> ## 2026-07-28 표시 없음",
  "> 본문 D",
  "",
  // 블록에 딸리지 않은 각주. 인용이지만 빈 줄로 떨어져 있으므로 어느 블록에도 속하지 않는다.
  "> (정책 각주 — Status는 현재 상태만 담는다.)",
  "",
  "현재 상태: 인용이 아닌 줄이 나오면 블록이 끝난다.",
  "",
  "## 발굴된 개선점",
  "이 섹션은 건드리지 않는다.",
].join("\n");

const HISTORY = [
  "# History.md",
  "",
  "## Phase 완료 이력",
  "옛 내용",
  "",
  "## Status 이관 기록 (2026-07-29 정리 — 원문 그대로, 최신순)",
  "",
  "> ## ✅ 2026-07-20 아주 옛날 것",
  "> 본문 Z",
].join("\n");

describe("Status 완료분 자동 이관", () => {
  const blocks = splitStatusBlocks(STATUS);

  it("인용 블록을 제목 단위로 가른다", () => {
    expect(blocks.map((b) => b.heading)).toEqual([
      "> ## ✅ 2026-07-31 최신 완료",
      "> ## 🛑 2026-07-30 아직 막힘",
      "> ## ✅ 2026-07-29 옛 완료",
      "> ## 2026-07-28 표시 없음",
    ]);
    // 인용이 아닌 줄에서 멈춘다 — 안 멈추면 "현재 상태" 문단까지 History로 딸려간다.
    expect(blocks[3].text).toBe("> ## 2026-07-28 표시 없음\n> 본문 D");
  });

  it("블록과 떨어져 있는 인용 각주는 어느 블록에도 딸리지 않는다", () => {
    // 실제로 겪은 결함: "인용이면 계속 같은 블록"으로 봤더니 Status의 정책 각주가
    // 마지막 블록에 딸려 History로 새어 나갔다. 빈 줄이 경계다.
    const all = blocks.map((b) => b.text).join("\n");
    expect(all).not.toContain("정책 각주");
    const next = removeBlocks(STATUS, pickBlocksToArchive(blocks, 0));
    expect(next).toContain("> (정책 각주 — Status는 현재 상태만 담는다.)");
  });

  it("완료(✅)가 아닌 블록은 절대 옮기지 않는다", () => {
    const moving = pickBlocksToArchive(blocks, 0);
    expect(moving.map((b) => b.heading)).toEqual([
      "> ## ✅ 2026-07-31 최신 완료",
      "> ## ✅ 2026-07-29 옛 완료",
    ]);
  });

  it("최신 keep개는 Status에 남긴다", () => {
    expect(pickBlocksToArchive(blocks, 1).map((b) => b.heading)).toEqual([
      "> ## ✅ 2026-07-29 옛 완료",
    ]);
    expect(pickBlocksToArchive(blocks, 5)).toEqual([]);
  });

  it("들어낸 뒤에도 미해결 블록과 아래 섹션이 그대로 남는다", () => {
    const next = removeBlocks(STATUS, pickBlocksToArchive(blocks, 1));
    expect(next).toContain("> ## 🛑 2026-07-30 아직 막힘");
    expect(next).toContain("> ## 2026-07-28 표시 없음");
    expect(next).toContain("## 발굴된 개선점");
    expect(next).not.toContain("본문 C");
    // 빈 줄이 3개 이상 이어지면 옮길 때마다 문서에 구멍이 쌓인다.
    expect(next).not.toMatch(/\n{3,}/);
  });

  it("History의 이관 섹션 맨 앞에, 원문 그대로 넣는다", () => {
    const moved = pickBlocksToArchive(blocks, 1);
    const next = insertIntoHistory(HISTORY, moved.map((b) => b.text));
    const anchorAt = next.indexOf("## Status 이관 기록");
    const insertedAt = next.indexOf("> ## ✅ 2026-07-29 옛 완료");
    const oldestAt = next.indexOf("> ## ✅ 2026-07-20 아주 옛날 것");
    expect(anchorAt).toBeLessThan(insertedAt);
    expect(insertedAt).toBeLessThan(oldestAt);
    // 원문 보존: 이어지는 줄까지 그대로.
    expect(next).toContain("> 본문 C\n> 이어지는 줄");
    // 기존 내용은 남는다.
    expect(next).toContain("## Phase 완료 이력");
  });

  it("이관 섹션이 없으면 아무 데나 붙이지 않고 멈춘다", () => {
    expect(() => insertIntoHistory("# History\n\n## 다른 섹션", ["> ## ✅ x"])).toThrow(
      /Status 이관 기록/,
    );
  });

  it("옮길 것이 없으면 원문을 그대로 돌려준다", () => {
    expect(removeBlocks(STATUS, [])).toBe(STATUS);
    expect(insertIntoHistory(HISTORY, [])).toBe(HISTORY);
  });
});
