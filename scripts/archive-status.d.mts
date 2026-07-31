// 2026-07-31 : 문서 - Status 자동 이관 - 타입 선언
// `archive-status.mjs`는 의존성 없이 `node`로 바로 도는 스크립트다(pre-commit 훅이 부른다).
// 그런데 그 순수 함수들을 core의 vitest가 검사하므로, 타입 없는 .mjs를 그대로 import하면
// core 빌드가 TS7016으로 막힌다.
//
// 스크립트를 TypeScript로 옮기지 않는 이유: 그러면 훅이 부르기 전에 빌드가 필요해지고,
// 빌드가 깨진 상태에서는 커밋조차 못 하게 된다. 선언 파일 하나가 더 싸다(ponytail).
// 이 선언과 실제 구현이 갈리면 테스트가 먼저 깨진다 — 그게 이 파일의 안전장치다.

export interface StatusBlock {
  /** 블록 첫 줄의 0-기반 줄 번호. */
  start: number;
  /** 블록 마지막 줄의 0-기반 줄 번호(포함). */
  end: number;
  /** `> ## ...` 제목 줄 원문. */
  heading: string;
  /** 제목이 ✅로 시작하는가 = 완료분인가. */
  done: boolean;
  /** 블록 원문(줄바꿈 포함). */
  text: string;
}

export const DEFAULT_KEEP: number;

export function splitStatusBlocks(statusText: string): StatusBlock[];

export function pickBlocksToArchive(
  blocks: StatusBlock[],
  keep?: number,
): StatusBlock[];

export function removeBlocks(
  statusText: string,
  blocksToRemove: StatusBlock[],
): string;

export function insertIntoHistory(
  historyText: string,
  blockTexts: string[],
): string;
