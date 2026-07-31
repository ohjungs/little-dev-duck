#!/usr/bin/env node
// 2026-07-31 : 문서 - Status - 완료분 자동 이관 (사용자 결정 B-10)
//
// Status.md는 "지금 상태"만 담기로 정해 놓고(CLAUDE.md 8절) 실제로는 1,345줄까지 자랐다.
// 2026-07-29에 한 번 손으로 정리했지만 **그 뒤로 다시 쌓였다** — 손으로 하는 정리는 반드시
// 다시 밀린다. 사용자가 "앞으로도 자동으로 옮기도록"이라고 정한 이유다.
//
// 규칙은 하나뿐이라 판단이 개입하지 않는다:
//   Status.md의 `> ## ✅ ...` 블록 중 **최신 KEEP개만 남기고** 나머지를 History.md의
//   "Status 이관 기록" 섹션 맨 앞으로 원문 그대로 옮긴다.
//
// **✅가 붙은 것만 옮긴다.** 🛑(막힘)이나 표시 없는 블록은 아직 끝나지 않은 일이라
// 옮기면 "지금 상태"에서 사라진다 — 그게 이 문서의 존재 이유를 깨뜨린다.
//
// `## Phase NN` 같은 옛 섹션은 **건드리지 않는다.** 형태가 제각각이고 계획인지 완료 기록인지
// 기계로 가릴 수 없다. 모르는 것을 옮기지 않는다(ponytail — 규칙이 하나일 때만 자동화한다).
//
// 이관은 삭제가 아니라 이동이다. 원문을 한 글자도 바꾸지 않는다.

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const STATUS = path.join(REPO_ROOT, "docs", "Status.md");
const HISTORY = path.join(REPO_ROOT, "docs", "History.md");
const HISTORY_ANCHOR = "## Status 이관 기록";

/** Status.md에 남겨 둘 최신 완료 블록 수. 0이면 전부 옮긴다. */
export const DEFAULT_KEEP = 5;

/**
 * 블록 하나 = `> ## `로 시작해 **진짜 빈 줄** 직전까지 이어지는 인용 덩어리.
 *
 * **빈 줄이 경계라는 게 규칙의 핵심이다.** 이 문서는 블록 *안*의 빈 줄을 `>` 한 글자로 쓰고,
 * 블록 *사이*만 진짜 빈 줄로 띄운다. "인용이면 계속 같은 블록"으로 보면, 블록 뒤에 따로 떨어져
 * 있는 인용 한 줄(예: Status의 정책 각주)까지 앞 블록에 딸려 들어가 함께 옮겨진다 —
 * 실제로 그렇게 각주 하나가 History로 새어 나갔고, 그래서 규칙을 좁혔다.
 *
 * 문자열만 받고 파일을 읽지 않는다 — 가짜 입력으로 규칙을 검증할 수 있어야 한다
 * (schemaGuard.ts 머리말 원칙).
 */
export function splitStatusBlocks(statusText) {
  const lines = statusText.split(/\r?\n/);
  const blocks = [];
  let current = null;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (line.startsWith("> ## ")) {
      if (current) blocks.push(current);
      current = { start: i, end: i, heading: line };
      continue;
    }
    if (current) {
      // 인용이 이어지는 동안만 같은 블록. 빈 줄이나 인용 아닌 줄에서 끝난다.
      if (line.startsWith(">")) {
        current.end = i;
        continue;
      }
      blocks.push(current);
      current = null;
    }
  }
  if (current) blocks.push(current);

  return blocks.map((b) => ({
    ...b,
    done: b.heading.startsWith("> ## ✅"),
    text: lines.slice(b.start, b.end + 1).join("\n"),
  }));
}

/** 어느 블록을 옮길지 고른다. 완료(✅)만, 최신 keep개는 남긴다. */
export function pickBlocksToArchive(blocks, keep = DEFAULT_KEEP) {
  const done = blocks.filter((b) => b.done);
  // Status는 최신순이므로 앞에서부터 keep개가 "최신"이다.
  return done.slice(keep);
}

/** Status 본문에서 고른 블록을 들어낸다. 남는 빈 줄이 겹치지 않게 정리한다. */
export function removeBlocks(statusText, blocksToRemove) {
  if (blocksToRemove.length === 0) return statusText;
  const lines = statusText.split(/\r?\n/);
  const drop = new Set();
  for (const b of blocksToRemove) {
    for (let i = b.start; i <= b.end; i += 1) drop.add(i);
  }
  const kept = lines.filter((_, i) => !drop.has(i));
  // 블록을 들어낸 자리에 빈 줄이 3개 이상 이어지면 2개로 줄인다(문단 구분은 남긴다).
  return kept.join("\n").replace(/\n{3,}/g, "\n\n");
}

/** History의 이관 섹션 **맨 앞**에 넣는다 — 그 섹션은 최신순 계약이다. */
export function insertIntoHistory(historyText, blockTexts) {
  if (blockTexts.length === 0) return historyText;
  const lines = historyText.split(/\r?\n/);
  const anchor = lines.findIndex((l) => l.startsWith(HISTORY_ANCHOR));
  if (anchor === -1) {
    throw new Error(
      `History.md에서 "${HISTORY_ANCHOR}" 섹션을 찾지 못했습니다. ` +
        "이관 위치가 불분명해 중단합니다(임의의 자리에 붙이지 않습니다).",
    );
  }
  // 제목 바로 다음 줄부터. 제목과 내용 사이 빈 줄 하나는 유지한다.
  let at = anchor + 1;
  while (at < lines.length && lines[at].trim() === "") at += 1;
  const before = lines.slice(0, at);
  const after = lines.slice(at);
  return [...before, ...blockTexts.flatMap((t) => [t, ""]), ...after].join("\n");
}

function main() {
  const keepArg = process.argv.find((a) => a.startsWith("--keep="));
  const keep = keepArg ? Number(keepArg.slice("--keep=".length)) : DEFAULT_KEEP;
  const check = process.argv.includes("--check");

  const statusText = readFileSync(STATUS, "utf8");
  const blocks = splitStatusBlocks(statusText);
  const moving = pickBlocksToArchive(blocks, keep);

  if (moving.length === 0) {
    console.log(
      `Status.md 정리할 것 없음 (완료 블록 ${blocks.filter((b) => b.done).length}개, 남기는 기준 ${keep}개).`,
    );
    return;
  }

  if (check) {
    console.error(
      `Status.md에 옮길 완료 블록이 ${moving.length}개 남아 있습니다. \`pnpm docs:archive\`를 실행하세요.`,
    );
    process.exit(1);
  }

  const nextStatus = removeBlocks(statusText, moving);
  const nextHistory = insertIntoHistory(
    readFileSync(HISTORY, "utf8"),
    moving.map((b) => b.text),
  );

  writeFileSync(STATUS, nextStatus);
  writeFileSync(HISTORY, nextHistory);

  const beforeLines = statusText.split(/\r?\n/).length;
  const afterLines = nextStatus.split(/\r?\n/).length;
  console.log(
    `완료 블록 ${moving.length}개를 History.md로 옮겼습니다 (Status.md ${beforeLines} → ${afterLines}줄).`,
  );
  for (const b of moving) console.log(`  - ${b.heading.replace("> ## ", "")}`);
}

// 테스트가 import할 때는 실행하지 않는다.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
