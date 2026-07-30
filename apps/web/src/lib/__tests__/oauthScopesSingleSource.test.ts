import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { OAUTH_SCOPES } from "../oauthScopes";

// 2026-07-30 : 보안 - OAuth scope - 단일 출처 (감사 후속)
//
// scope 문자열이 **6곳에 복사돼** 있었다: 요청하는 쪽(LoginForm·GoogleCalendarLink·GmailLink·
// GitHubIssuesLink)과, 승인됐다고 가정해 토큰 테이블에 **기록하는 쪽**(auth/callback/route.ts).
//
// 이 중복이 위험한 이유: 콜백은 실제 승인 내역을 확인하지 않고 자기가 아는 문자열을 저장한다.
// 요청 쪽만 좁히면(예: gmail을 readonly로) 저장된 scope가 **실제 권한과 다른 거짓 기록**이 되고,
// 나중에 "이 토큰으로 무엇을 할 수 있나"를 그 값으로 판단하면 틀린 결론에 이른다.
// 이 저장소가 safeHref(L-21)에서 겪은 "복사된 순간 구멍" 패턴과 같은 부류다.

const SRC = join(process.cwd(), "src");

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) return walk(p);
    return /\.(ts|tsx)$/.test(entry) ? [p] : [];
  });
}

// 이 파일과 단일 출처 모듈 자신은 리터럴을 가져도 된다.
const ALLOWED = ["oauthScopes.ts", "oauthScopesSingleSource.test.ts"];

describe("OAuth scope 단일 출처", () => {
  it("검사가 실제로 소스를 훑었다", () => {
    // 0개를 훑고 아래 검사가 공짜로 통과하는 상황을 먼저 배제한다.
    const files = walk(SRC);
    expect(files.length).toBeGreaterThan(50);
  });

  it("Google scope 리터럴은 oauthScopes.ts에만 있다", () => {
    const offenders = walk(SRC)
      .filter((p) => !ALLOWED.some((a) => p.endsWith(a)))
      .filter((p) => readFileSync(p, "utf8").includes("googleapis.com/auth/"));
    expect(offenders.map((p) => p.replace(SRC, "src"))).toEqual([]);
  });

  it("scope를 요청·기록하는 화면·라우트가 공용 상수를 쓴다", () => {
    // 리터럴이 사라진 것만 확인하면, 아무도 안 쓰는 상수만 남고 기능이 빠질 수 있다.
    const users = [
      "src/app/login/LoginForm.tsx",
      "src/components/GoogleCalendarLink.tsx",
      "src/components/GmailLink.tsx",
      "src/components/GitHubIssuesLink.tsx",
      "src/app/auth/callback/route.ts",
    ];
    for (const f of users) {
      const src = readFileSync(join(process.cwd(), f), "utf8");
      expect(src, `${f}가 공용 OAUTH_SCOPES를 쓰지 않는다`).toContain("OAUTH_SCOPES");
    }
  });

  it("상수 값이 실제로 필요한 권한이다", () => {
    // gmail.modify는 messages.trash(휴지통 이동)의 최소 권한이다 — readonly로는 불가하고,
    // 그보다 넓은 https://mail.google.com/(영구삭제 포함)은 CLAUDE.md 5절이 금지한다.
    expect(OAUTH_SCOPES.gmail).toBe("https://www.googleapis.com/auth/gmail.modify");
    // 캘린더는 이벤트 읽기·쓰기만. 전체 calendar scope(설정·공유 변경 포함)를 요청하지 않는다.
    expect(OAUTH_SCOPES.calendar).toBe("https://www.googleapis.com/auth/calendar.events");
    expect(OAUTH_SCOPES.githubIssues).toBe("repo");
  });
});
