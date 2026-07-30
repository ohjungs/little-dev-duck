# 2026-07-30 — OAuth scope 단일 출처

Task: scope 문자열이 6곳에 복사돼 있던 것을 `lib/oauthScopes.ts` 한 벌로 모으고 정적 잠금.
값은 한 글자도 바꾸지 않은 순수 리팩터링(동작 불변) — 위험은 import 깨짐뿐이라 실제 빌드와
런타임으로 확인했다.

## 스크린샷

- `login__default__desktop.png` / `login__default__mobile.png` — `/login`.
  이 화면의 `LoginForm.tsx`가 Google 로그인 시 calendar scope를 요청하는 6곳 중 하나다.

## 실측 확인 (새로 빌드한 서버, BUILD_ID 34초 전)

| 항목 | 결과 |
|---|---|
| `next build` | 성공 (Compiled successfully) |
| 로그인 버튼 렌더 | Google·GitHub·로그인·가입·이메일 로그인·비밀번호 찾기 전부 정상(데스크톱·모바일) |
| JS 런타임 에러 | 없음 |
| 콘솔 404 1건 | `/_vercel/insights/script.js` — **이번 변경과 무관한 기존 문제**(Vercel Web Analytics 미활성화, [PENDING 5번](../../PENDING.md)). 직접 요청해 404를 재확인함 |

## 커버 못 한 것 (defer)

- **설정 화면의 연동 버튼 3종**(GoogleCalendarLink·GmailLink·GitHubIssuesLink)은 로그인 뒤
  화면이라 e2e 세션 만료로 렌더를 못 찍었다([mv 109번](../../manual-verification.md)).
- **실제 OAuth 동의 화면에 표시되는 권한 문구**는 외부(Google·GitHub) 화면이라 코드로 확인
  불가. 값을 바꾸지 않았으므로 회귀 위험은 없다고 판단했지만, 실기 확인은 사용자 몫.

## 절차 개선 적용 (직전 사이클 교훈)

- 서버 띄우기 전 `netstat`로 포트 점유를 먼저 확인(`5100 free`)하고, 띄운 뒤 **로그와
  BUILD_ID 시각으로 "내 서버 + 신선한 빌드"임을 확증**했다. 직전 사이클에 낡은 서버가
  낡은 빌드를 서빙해 잘못된 스크린샷을 남긴 일의 재발 방지.
