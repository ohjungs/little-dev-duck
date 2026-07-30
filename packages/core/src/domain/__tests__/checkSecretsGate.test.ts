import { describe, expect, it } from "vitest";
import { scanText } from "../../../../../scripts/check-secrets.mjs";
import { detectSensitiveInfo } from "../sensitive-info";

// 2026-07-31 : 보안 - 시크릿 - 게이트회귀
// 저장소에 시크릿 패턴 목록이 **두 벌** 생겼다:
//   packages/core/sensitive-info.ts   사용자가 입력한 메시지에 경고를 띄운다(좁게, 막지 않음)
//   scripts/check-secrets.mjs          커밋을 막는다(넓게, 차단)
// 용도와 임계가 달라 합치지 않았지만, 두 벌이면 한쪽만 고쳐진다 — 이 저장소가 Phase 32에서
// 정리한 그 부류다. **커밋 게이트는 최소한 core가 잡는 것을 전부 잡아야 한다**는 관계를
// 테스트로 묶는다. core에 새 패턴이 추가되면 여기서 빨간불이 뜬다.
//
// 스크립트가 .mjs라 vitest가 그대로 import한다(빌드 단계 불필요).

const CORE_CATCHES = [
  "sk-" + "a".repeat(24),
  "ghp_" + "b".repeat(36),
  "eyJ" + "c".repeat(24) + "." + "d".repeat(24) + "." + "e".repeat(24),
];

describe("커밋 게이트와 core 감지기의 관계", () => {
  it("core가 잡는 API 키·토큰은 커밋 게이트도 잡는다", () => {
    for (const sample of CORE_CATCHES) {
      expect(detectSensitiveInfo(sample).length, `core가 못 잡음: ${sample.slice(0, 8)}…`).toBeGreaterThan(0);
      expect(scanText(sample).length, `게이트가 못 잡음: ${sample.slice(0, 8)}…`).toBeGreaterThan(0);
    }
  });

  it("게이트는 core가 다루지 않는 배포 시크릿도 잡는다", () => {
    // core는 사용자 메시지용이라 이런 건 안 본다. 저장소에 들어오면 안 되는 것들이다.
    const deployOnly = [
      "AIza" + "A".repeat(35),
      "sbp_" + "0".repeat(40),
      "SUPABASE_SERVICE_ROLE_KEY=abcdefghijklmnopqrstuvwxyz012345", // allow-secret: 가짜 픽스처
      "-----BEGIN RSA PRIVATE KEY-----", // allow-secret: 가짜 픽스처
      // AIza·sbp_는 문자열 결합으로 만들어 한 줄에 온전한 형태가 남지 않는다(주석 불필요).
    ];
    for (const sample of deployOnly) {
      expect(scanText(sample).length, `게이트가 못 잡음: ${sample.slice(0, 12)}…`).toBeGreaterThan(0);
    }
  });

  it("allow-secret 주석이 붙은 줄은 통과시킨다 — 자리표시자까지 막으면 검사를 꺼 버린다", () => {
    expect(scanText(`const k = "sk-${"a".repeat(24)}"; // allow-secret`)).toEqual([]);
  });

  it("GitHub Actions의 secrets 참조는 값이 아니므로 통과시킨다", () => {
    expect(scanText("E2E_AUTH_STATE_B64: ${{ secrets.E2E_AUTH_STATE_B64 }}")).toEqual([]);
  });

  it("커밋 SHA와 평범한 문자열은 잡지 않는다 — 오탐이 많으면 검사를 끄게 된다", () => {
    expect(scanText("bbc2215a1b2c3d4e5f60718293a4b5c6d7e8f900")).toEqual([]);
    expect(scanText("const TOKEN_REFRESH_INTERVAL = 3600;")).toEqual([]);
    expect(scanText("사용자 토큰을 재발급한다")).toEqual([]);
  });
});
