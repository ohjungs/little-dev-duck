// 2026-07-30 : 보안 - OAuth scope - 단일 출처 (감사 후속)
//
// 여기가 "이 앱이 요청하는 외부 권한"의 단일 출처다. 전에는 같은 문자열이 6곳에 복사돼
// 있었고, 그중 하나는 **요청이 아니라 기록**이었다 — `auth/callback/route.ts`는 실제 승인
// 내역을 확인하지 않고 자기가 아는 문자열을 토큰 테이블의 `scope` 컬럼에 저장한다.
// 요청 쪽만 좁히면 저장된 값이 실제 권한과 다른 거짓 기록이 되고, "이 토큰으로 무엇을 할 수
// 있나"를 그 값으로 판단하는 순간 틀린 결론에 이른다(safeHref L-21과 같은 복사-드리프트).
//
// 값을 좁히거나 넓힐 때 지켜야 하는 근거:
//  · gmail: `messages.trash`(휴지통 이동)의 최소 권한이 modify다. readonly로는 휴지통 이동이
//    불가하고, 더 넓은 `https://mail.google.com/`은 영구삭제를 포함해 CLAUDE.md 5절이 금지한다.
//    (2026-07-30 감사가 "과다 권한"으로 지적했으나 실제로는 구현된 기능의 최소값이다.)
//  · calendar: 이벤트 읽기·쓰기만. 전체 `calendar` scope는 설정·공유 변경까지 포함해 과다다.
//  · githubIssues: 이슈 쓰기에 repo가 필요하다. 기본 로그인 버튼은 이 scope를 요청하지 않고,
//    원하는 사용자만 설정에서 별도 동의한다(GitHubIssuesLink 주석 참조).
//
// `oauthScopesSingleSource.test.ts`가 다른 파일에 scope 리터럴이 다시 생기는 것을 막는다.
export const OAUTH_SCOPES = {
  calendar: "https://www.googleapis.com/auth/calendar.events",
  gmail: "https://www.googleapis.com/auth/gmail.modify",
  githubIssues: "repo",
} as const;
