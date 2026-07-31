import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// 2026-07-31 : 인증 - 로그아웃 범위 - 구분 잠금 (사용자 결정)
//
// `signOut()`은 인자를 안 주면 **모든 기기 세션을 끊는다**(Supabase 기본값 global).
// 이 저장소에는 성격이 다른 호출이 셋 있고, **둘은 global이 맞고 하나는 아니다**:
//
//   · auth/logout 라우트   → local  (평상시 로그아웃. 웹에서 끊었다고 데스크톱·모바일까지
//                                     끊으면 안 된다 — 확정 스택이 여러 클라이언트다)
//   · DangerZone          → global (데이터를 전부 지운 뒤. 다른 기기에 세션이 남으면 더 위험)
//   · DeleteAccountButton → global (계정을 지운 뒤. 위와 같은 이유)
//
// **이 구분은 눈으로 리뷰해서는 안 지켜진다.** 셋 다 한 줄이고 똑같이 생겨서, 다음 사람이
// "일관성 있게 통일"하기 딱 좋다. 어느 쪽으로 통일해도 하나는 틀린다.
//
// 이 결함이 어떻게 드러났는지도 남긴다: e2e를 배포본에 세션을 붙여 처음 돌리자 43건이
// 죽었다. `auth-redirect.spec.ts`가 실제 세션으로 로그아웃 라우트를 POST하는데, 그게
// global이라 뒤따르는 모든 인증 스펙이 로그아웃된 채로 돌았다. 코드 회귀가 아니라
// **한 번도 같이 돌려본 적이 없어 안 보이던 동작**이었다.
//
// 파일 내용을 읽는 정적 검사다(safeHrefLock·oauthScopesSingleSource와 같은 결).
// 판정을 순수 함수로 갈라 가짜 입력으로 검증할 수 있게 한다(schemaGuard.ts 머리말 원칙).

const WEB_SRC = path.join(__dirname, "..", "..");

const LOCAL_SCOPE = path.join(WEB_SRC, "app", "auth", "logout", "route.ts");
const GLOBAL_SCOPE = [
  path.join(WEB_SRC, "components", "DangerZone.tsx"),
  path.join(WEB_SRC, "components", "DeleteAccountButton.tsx"),
];

/** signOut 호출에 붙은 scope를 읽는다. 인자가 없으면 Supabase 기본값인 "global". */
export function signOutScope(fileText: string): "local" | "global" | "없음" {
  const call = /\.signOut\(\s*(\{[^)]*\})?\s*\)/.exec(fileText);
  if (!call) return "없음";
  const args = call[1] ?? "";
  const scope = /scope\s*:\s*["']([a-z]+)["']/.exec(args);
  // 인자를 안 주면 전 기기 로그아웃이다 — 이 검사의 존재 이유가 정확히 그 기본값이다.
  return scope ? (scope[1] as "local" | "global") : "global";
}

const read = (p: string) => readFileSync(p, "utf8");
const rel = (p: string) => path.relative(WEB_SRC, p).replace(/\\/g, "/");

describe("로그아웃 범위", () => {
  it("평상시 로그아웃은 이 기기만 끊는다", () => {
    expect(
      signOutScope(read(LOCAL_SCOPE)),
      [
        "auth/logout 라우트가 전 기기 로그아웃으로 돌아갔습니다.",
        "웹에서 로그아웃하면 데스크톱 앱(Tauri)과 모바일 세션까지 함께 끊깁니다.",
        '평상시 로그아웃은 `signOut({ scope: "local" })`이어야 합니다.',
      ].join("\n"),
    ).toBe("local");
  });

  it("데이터·계정을 지운 뒤에는 모든 기기에서 끊는다", () => {
    for (const file of GLOBAL_SCOPE) {
      expect(
        signOutScope(read(file)),
        `${rel(file)}: 파괴적 작업 뒤에는 다른 기기에 세션을 남기면 안 됩니다(global 유지).`,
      ).toBe("global");
    }
  });

  // 위 두 검사는 실제 파일을 읽는다 — 통과했다는 것만으로는 검사가 살아 있는지 알 수 없다.
  describe("검사 자체가 작동한다 (가짜 입력)", () => {
    it("인자 없는 signOut()을 전 기기로 읽는다", () => {
      expect(signOutScope("await supabase.auth.signOut();")).toBe("global");
    });

    it("scope를 준 경우를 그대로 읽는다", () => {
      expect(signOutScope('await supabase.auth.signOut({ scope: "local" });')).toBe(
        "local",
      );
      expect(signOutScope("await x.signOut({ scope: 'global' })")).toBe("global");
    });

    it("호출이 아예 없으면 없음으로 구분한다", () => {
      // "없음"을 global과 뭉개면, 호출이 사라진 파일이 조용히 통과한다.
      expect(signOutScope("const a = 1;")).toBe("없음");
    });
  });
});
