import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// 2026-07-26 : 보안 - 의존성감사 - 허용목록계약 (Phase 39)
// 2026-07-26에 Next.js 취약점 9건을 고쳤다. 그 9건은 **하루 전 세션이 이미 세어 놓고** 결정 없이
// 남겨 둔 것이었다 — 문제는 발견이 아니라 **아무 장치도 그것을 다시 들어 올리지 않았다**는 데
// 있었다. `pnpm audit`은 아무도 부르지 않으면 아무 말도 하지 않는다.
//
// 그래서 CI가 `pnpm audit --prod --audit-level high`로 게이트를 잡고, 노출 경로가 없다고
// 판단한 것만 `pnpm-workspace.yaml`의 `auditConfig.ignoreGhsas`에 등재한다.
//
// **이 파일이 지키는 것은 그 허용 목록이 썩지 않는 것이다.** 두 가지가 위험하다:
//  (1) 사유 없이 한 줄 늘어나는 것 — 무시는 판단이고, 판단은 근거가 있어야 한다.
//      YAML 주석은 아무도 강제하지 않으므로 **여기서 강제한다**(apiAuth·schemaGuard와 같은 방식).
//  (2) 사유가 **코드 상태에 달려 있는데 그 상태가 바뀌는 것.** sharp 면제의 근거는
//      "남이 만든 이미지가 최적화 경로에 닿지 않는다"이고, 그건 `next.config.ts`에
//      `remotePatterns`가 없다는 사실에 의존한다. 추가하는 순간 근거가 거짓이 되는데
//      목록은 조용히 남는다 — 그 조합을 실패로 만든다.
//
// 그리고 게이트가 CI에 실제로 있는지도 본다. 허용 목록만 있고 감사가 안 돌면 장식이다.

const REPO_ROOT = path.join(__dirname, "..", "..", "..", "..", "..");
const WORKSPACE_YAML = path.join(REPO_ROOT, "pnpm-workspace.yaml");
const CI_YAML = path.join(REPO_ROOT, ".github", "workflows", "ci.yml");
const NEXT_CONFIG = path.join(__dirname, "..", "..", "..", "next.config.ts");

/**
 * 사유가 **코드 상태에 달려 있는** 면제. 그 상태가 사라지면 면제도 함께 사라져야 한다.
 * (근거가 코드로 확인되지 않는 면제 — 예: "빌드 시점에만 돈다" — 는 여기 넣지 않는다.
 * 기계로 확인할 방법이 없으므로 주석 사유로만 남기고, 그 한계를 이 주석에 적어 둔다.)
 */
// 판정은 **파일 내용을 인자로 받는다** — 파일을 직접 읽으면 가짜 입력을 넣어 "규칙을 어기면
// 정말 실패하는지"를 확인할 수 없다(schemaGuard.ts 머리말의 원칙).
const PRECONDITIONS: Record<
  string,
  {
    pkg: string;
    reads: () => string;
    stillTrue: (fileText: string) => boolean;
    onBroken: string;
  }
> = {
  "GHSA-f88m-g3jw-g9cj": {
    pkg: "sharp",
    reads: () => readFileSync(NEXT_CONFIG, "utf8"),
    stillTrue: (configText) => !/remotePatterns/.test(configText),
    onBroken:
      "remotePatterns가 생겼습니다 — 남이 호스팅하는 이미지가 Next 이미지 최적화(sharp/libvips)로 " +
      "들어올 수 있게 됐다는 뜻입니다. sharp 면제의 근거가 더 이상 사실이 아니므로 " +
      "pnpm-workspace.yaml의 ignoreGhsas에서 이 GHSA를 지우고 sharp를 올리세요.",
  },
};

/** `auditConfig.ignoreGhsas:` 블록에서 (GHSA, 바로 위 주석 줄들) 짝을 뽑는다. */
export function parseIgnoredGhsas(
  yamlText: string,
): { ghsa: string; reasonLines: string[] }[] {
  const lines = yamlText.split(/\r?\n/);
  const start = lines.findIndex((l) => /^\s*ignoreGhsas\s*:/.test(l));
  if (start === -1) return [];

  const out: { ghsa: string; reasonLines: string[] }[] = [];
  let pending: string[] = [];

  for (let i = start + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (line.trim() === "") continue;
    const comment = /^\s*#\s?(.*)$/.exec(line);
    if (comment) {
      pending.push(comment[1].trim());
      continue;
    }
    const item = /^\s*-\s*(GHSA-[\w-]+)\s*$/.exec(line);
    if (item) {
      out.push({ ghsa: item[1], reasonLines: pending });
      pending = [];
      continue;
    }
    // 목록이 아닌 줄이 나오면 블록이 끝난 것이다.
    break;
  }
  return out;
}

describe("의존성 감사 허용 목록", () => {
  const yamlText = readFileSync(WORKSPACE_YAML, "utf8");
  const entries = parseIgnoredGhsas(yamlText);

  it("무시하는 GHSA마다 사유 주석이 있다", () => {
    const noReason = entries
      .filter((e) => e.reasonLines.join(" ").length < 10)
      .map((e) => e.ghsa);

    expect(
      noReason,
      [
        "사유 없이 무시된 취약점이 있습니다:",
        ...noReason.map((g) => `  - ${g}`),
        "",
        "무시는 판단입니다. pnpm-workspace.yaml의 해당 줄 바로 위에 주석으로",
        "**왜 지금 노출이 아닌지**를 적으세요(예: 어느 패키지가 끌어오고, 어떤 경로가 없는지).",
        "고칠 수 있으면 무시하지 말고 버전을 올리는 쪽이 먼저입니다.",
      ].join("\n"),
    ).toEqual([]);
  });

  it("사유가 코드 상태에 의존하는 면제는 그 상태가 아직 사실이다", () => {
    for (const [ghsa, rule] of Object.entries(PRECONDITIONS)) {
      const ignored = entries.some((e) => e.ghsa === ghsa);
      if (!ignored) continue; // 이미 지웠다면 지킬 게 없다.
      expect(
        rule.stillTrue(rule.reads()),
        `${rule.pkg} (${ghsa}): ${rule.onBroken}`,
      ).toBe(true);
    }
  });

  // 위 세 검사는 실제 파일을 읽는다 — 통과했다는 것만으로는 **검사가 살아 있는지** 알 수 없다.
  // 규칙을 어긴 가짜 입력을 넣어 정말 실패하는지 여기서 확인한다.
  describe("검사 자체가 작동한다 (가짜 입력)", () => {
    it("사유 주석이 없는 항목을 잡아낸다", () => {
      const parsed = parseIgnoredGhsas(
        [
          "auditConfig:",
          "  ignoreGhsas:",
          "    # 사유가 충분히 적힌 항목이다",
          "    - GHSA-aaaa-bbbb-cccc",
          "    - GHSA-dddd-eeee-ffff",
        ].join("\n"),
      );
      expect(parsed.map((e) => e.ghsa)).toEqual([
        "GHSA-aaaa-bbbb-cccc",
        "GHSA-dddd-eeee-ffff",
      ]);
      // 사유 없는 쪽만 걸러진다.
      expect(
        parsed.filter((e) => e.reasonLines.join(" ").length < 10).map((e) => e.ghsa),
      ).toEqual(["GHSA-dddd-eeee-ffff"]);
    });

    it("목록이 끝나면 그 뒤 다른 설정을 항목으로 오인하지 않는다", () => {
      const parsed = parseIgnoredGhsas(
        [
          "auditConfig:",
          "  ignoreGhsas:",
          "    # 사유를 적어 둔 항목",
          "    - GHSA-aaaa-bbbb-cccc",
          "packages:",
          '  - "apps/*"',
        ].join("\n"),
      );
      expect(parsed.map((e) => e.ghsa)).toEqual(["GHSA-aaaa-bbbb-cccc"]);
    });

    it("ignoreGhsas 블록이 없으면 빈 목록이다", () => {
      expect(parseIgnoredGhsas('packages:\n  - "apps/*"')).toEqual([]);
    });

    it("remotePatterns가 생기면 sharp 면제의 전제조건이 깨진다", () => {
      const rule = PRECONDITIONS["GHSA-f88m-g3jw-g9cj"];
      expect(rule.stillTrue("const nextConfig = { transpilePackages: [] };")).toBe(
        true,
      );
      expect(
        rule.stillTrue(
          "const nextConfig = { images: { remotePatterns: [{ hostname: 'x' }] } };",
        ),
      ).toBe(false);
    });
  });

  it("감사 게이트가 CI에 실제로 있다", () => {
    const ci = readFileSync(CI_YAML, "utf8");
    const auditLine = ci
      .split(/\r?\n/)
      .find((l) => /pnpm\s+audit/.test(l) && !/^\s*#/.test(l));

    expect(
      auditLine,
      [
        "CI에 `pnpm audit` 단계가 없습니다.",
        "허용 목록만 있고 감사가 돌지 않으면 이 파일의 검사도, 목록도 장식입니다.",
      ].join("\n"),
    ).toBeDefined();

    // 게이트 기준을 못박는다 — 조용히 넓어지면(예: --audit-level critical) 고위험이 통과한다.
    expect(auditLine).toContain("--audit-level high");
    // 런타임 의존만 본다. devDependencies(린트·빌드 도구)까지 막으면 사람이 검사를 끈다.
    expect(auditLine).toContain("--prod");
    // 레지스트리 장애로 우리 배포가 서지 않게. 한계: 그때는 감사가 조용히 통과한다(로그로만 남는다).
    expect(auditLine).toContain("--ignore-registry-errors");
  });
});
