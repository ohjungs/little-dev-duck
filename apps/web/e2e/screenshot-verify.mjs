// 2026-07-30 : loop-eng - 화면검증 - 항목별 스크린샷 (커맨드 4-1)
// 스펙이 아니라 단독 스크립트다 — playwright test는 실패 시 조기 종료해 스크린샷이 남지 않는다.
// 산출물 우선(HD-010): 각 항목을 찍는 즉시 파일로 저장하고, 콘솔 에러도 함께 모아 리포트한다.
import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import path from "node:path";

const BASE = process.env.E2E_BASE ?? "http://localhost:5100";
const OUT = process.argv[2];
if (!OUT) {
  console.error("usage: node screenshot-verify.mjs <출력디렉터리>");
  process.exit(1);
}
mkdirSync(OUT, { recursive: true });

const storageState = JSON.parse(
  readFileSync(path.join(import.meta.dirname, ".auth/user.json"), "utf8"),
);

const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 390, height: 844 },
];

// 이번 사이클이 건드린 화면 = 대시보드(오리 위젯·AI 발화 경로) + 로그인(비인증 기준선).
const SCREENS = [
  { screen: "dashboard", state: "default", url: "/", auth: true },
  { screen: "login", state: "default", url: "/login", auth: false },
];

const findings = [];

for (const vp of VIEWPORTS) {
  for (const s of SCREENS) {
    const browser = await chromium.launch();
    const ctx = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      ...(s.auth ? { storageState } : {}),
    });
    const page = await ctx.newPage();
    const consoleErrors = [];
    const netFails = [];
    page.on("console", (m) => {
      if (m.type() === "error") consoleErrors.push(m.text());
    });
    page.on("requestfailed", (r) =>
      netFails.push(`${r.method()} ${r.url()} — ${r.failure()?.errorText}`),
    );

    const file = `${s.screen}__${s.state}__${vp.name}.png`;
    let note = "";
    try {
      await page.goto(`${BASE}${s.url}`, { waitUntil: "networkidle", timeout: 30_000 });
      // 위젯이 데이터를 받아 자리를 잡을 시간. networkidle만으로는 R3F 캔버스가 늦다.
      await page.waitForTimeout(2500);
      note = `url=${page.url()}`;
      // 오리 캔버스 존재 여부를 사실로 기록한다(스펙 실패의 원인 구분용).
      if (s.auth) {
        const hasWidget = await page.getByTestId("duck-widget").count();
        const hasCanvas = await page.getByTestId("duck-widget").locator("canvas").count();
        note += ` duckWidget=${hasWidget} duckCanvas=${hasCanvas}`;
      }
      await page.screenshot({ path: path.join(OUT, file), fullPage: true });
    } catch (e) {
      note = `실패: ${e.message.split("\n")[0]}`;
      await page.screenshot({ path: path.join(OUT, file) }).catch(() => {});
    }
    findings.push({ file, screen: s.screen, state: s.state, viewport: vp.name, note, consoleErrors, netFails });
    console.log(`[saved] ${file}  ${note}`);
    if (consoleErrors.length) console.log(`  콘솔 에러 ${consoleErrors.length}건`);
    await browser.close();
  }
}

const md = [
  `# 화면검증 스크린샷 — 2026-07-30`,
  ``,
  `대상: ${BASE} · 세션: e2e/.auth/user.json`,
  ``,
  `| 파일 | 화면 | 상태 | 뷰포트 | 관찰 | 콘솔에러 | 네트워크실패 |`,
  `|---|---|---|---|---|---|---|`,
  ...findings.map(
    (f) =>
      `| ${f.file} | ${f.screen} | ${f.state} | ${f.viewport} | ${f.note} | ${f.consoleErrors.length} | ${f.netFails.length} |`,
  ),
  ``,
  `## 상세`,
  ...findings.flatMap((f) => [
    ``,
    `### ${f.file}`,
    f.consoleErrors.length ? f.consoleErrors.map((e) => `- 콘솔: ${e}`).join("\n") : "- 콘솔 에러 없음",
    f.netFails.length ? f.netFails.map((e) => `- 네트워크: ${e}`).join("\n") : "- 네트워크 실패 없음",
  ]),
  ``,
].join("\n");
writeFileSync(path.join(OUT, "index.md"), md, "utf8");
console.log(`\n[manifest] ${path.join(OUT, "index.md")}`);
