#!/usr/bin/env node
// 시크릿이 저장소에 커밋되는 것을 막는 게이트.
//
// 2026-07-31 : 보안 - 시크릿 - 커밋게이트
// 이 저장소에는 시크릿 검사가 하나도 없었다 — CI에 `pnpm audit`만 있고 pre-commit 훅도 없다.
// 자율 루프가 상태 파일(plan-ledger.jsonl · cycles.jsonl · harness-checkpoints.md)을 쓰기
// 시작하면서 커밋되는 파일이 늘었고, 그 내용은 에이전트가 읽은 코드와 **테스트 실패 출력**에서
// 온다. 테스트가 죽으면서 환경변수를 찍으면 그게 그대로 저장소에 박힌다.
// 저장소가 PUBLIC이므로 한 번 들어가면 히스토리에서 지우기 어렵다.
//
//   node scripts/check-secrets.mjs            추적 중인 파일 전체 (CI용)
//   node scripts/check-secrets.mjs --staged   스테이지된 변경만 (pre-commit 훅용)
//
// 종료코드 1 = 의심 발견. 값 자체는 출력하지 않는다 — 로그가 또 하나의 유출 경로가 되지 않도록.
import { execFileSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";

// 특정 접두사와 구조만 본다. "40자 이상 base64" 같은 범용 규칙은 쓰지 않는다 —
// 커밋 SHA·해시·정상 토큰 문자열을 전부 잡아 사람이 검사를 꺼 버리게 만든다.
const PATTERNS = [
  { name: "OpenAI 계열 키", re: /\bsk-[A-Za-z0-9_-]{16,}/ },
  { name: "GitHub 토큰", re: /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{20,}/ },
  { name: "GitHub PAT", re: /\bgithub_pat_[A-Za-z0-9_]{20,}/ },
  { name: "Google/Gemini API 키", re: /\bAIza[A-Za-z0-9_-]{30,}/ },
  { name: "Supabase 개인 토큰", re: /\bsbp_[a-f0-9]{40,}/ },
  { name: "JWT", re: /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/ },
  { name: "PEM 개인키", re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  {
    name: "시크릿 형태의 환경변수 대입",
    re: /\b[A-Z][A-Z0-9_]*(?:SECRET|TOKEN|PASSWORD|PASSWD|API_?KEY|ANON_KEY|SERVICE_ROLE|CREDENTIAL)[A-Z0-9_]*\s*=\s*["']?[A-Za-z0-9_\-./+]{16,}/,
  },
];

// 값이 아니라 **자리표시자**가 들어가는 파일. 여기까지 막으면 예제와 CI 설정을 못 쓴다.
const ALLOW_FILES = [
  /(^|\/)\.env\.example$/,
  /(^|\/)pnpm-lock\.yaml$/,
  /(^|\/)scripts\/check-secrets\.mjs$/, // 이 파일 자신(패턴 문자열이 들어 있다)
  /(^|\/)docs\/CONSTRAINTS_FREE_TIER\.md$/, // 한도 문서 — 키 형식을 설명한다
];
// 한 줄 단위 예외. `${{ secrets.X }}`(GitHub Actions 참조)나 명시적 무시 주석.
const ALLOW_LINE = [/\$\{\{\s*secrets\./, /allow-secret/i];

const BINARY = /\.(png|jpe?g|gif|webp|ico|pdf|zip|woff2?|ttf|glb|mp3|wav|mp4)$/i;
const MAX_BYTES = 2 * 1024 * 1024;

function trackedFiles(stagedOnly) {
  const args = stagedOnly
    ? ["diff", "--cached", "--name-only", "--diff-filter=ACM"]
    : ["ls-files"];
  return execFileSync("git", args, { encoding: "utf8" })
    .split(/\r?\n/)
    .filter(Boolean);
}

export function scanText(text, patterns = PATTERNS) {
  const hits = [];
  text.split(/\r?\n/).forEach((line, i) => {
    if (ALLOW_LINE.some((re) => re.test(line))) return;
    for (const p of patterns) {
      if (p.re.test(line)) hits.push({ line: i + 1, name: p.name });
    }
  });
  return hits;
}

function main() {
  const stagedOnly = process.argv.includes("--staged");
  const findings = [];

  for (const file of trackedFiles(stagedOnly)) {
    if (ALLOW_FILES.some((re) => re.test(file))) continue;
    if (BINARY.test(file)) continue;
    let text;
    try {
      if (statSync(file).size > MAX_BYTES) continue;
      text = readFileSync(file, "utf8");
    } catch {
      continue; // 삭제됐거나 읽을 수 없는 파일
    }
    for (const h of scanText(text)) findings.push({ file, ...h });
  }

  if (findings.length === 0) {
    console.log(`시크릿 검사 통과 (${stagedOnly ? "스테이지된 변경" : "추적 파일 전체"})`);
    return 0;
  }

  // 값은 절대 출력하지 않는다 — 위치와 종류만.
  console.error(`시크릿 의심 ${findings.length}건 발견 — 커밋을 막습니다.`);
  for (const f of findings) console.error(`  ${f.file}:${f.line}  ${f.name}`);
  console.error(
    "\n값이 진짜 시크릿이면 즉시 폐기·재발급하세요. 자리표시자나 오탐이면 그 줄에 " +
      "`allow-secret` 주석을 붙이거나 scripts/check-secrets.mjs의 ALLOW_FILES에 추가하세요.",
  );
  return 1;
}

// 테스트에서 import할 때는 실행하지 않는다.
if (process.argv[1] && process.argv[1].endsWith("check-secrets.mjs")) {
  process.exit(main());
}
