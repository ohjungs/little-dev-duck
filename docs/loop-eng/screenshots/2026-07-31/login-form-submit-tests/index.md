# LoginForm 로그인/가입 제출 로직 테스트 — 화면 검증 (2026-07-31)

작업: `test: LoginForm 로그인/가입 제출 로직 컴포넌트·E2E 테스트 추가`
(신규 `apps/web/e2e/email-login.spec.ts`, `apps/web/src/app/login/__tests__/LoginForm.test.tsx`)

대상 URL: `http://localhost:5100/login` (단일 라우트 — 탭·상태는 전부 같은 URL 안에서 전환된다)

## 실행 환경 (이 촬영이 무엇을 본 것인지)

- **프로덕션 빌드**로 촬영했다: `next build` → `next start -p 5100`.
  1차로 `next dev`에서 찍었다가 **버렸다** — dev 전용 산출물 두 개가 화면·콘솔을 오염시켰기 때문이다.
  (1) React dev 모드가 요구하는 `eval()`을 이 저장소의 CSP가 막아 전 페이지에 콘솔 오류가 떴고,
  (2) Next dev 오버레이 배지가 모바일 뷰포트에서 **오류 문구 위를 덮었다**. 둘 다 프로덕션에 없다.
  프로덕션 재촬영 후 두 현상 모두 사라진 것을 확인했다.
- **빌드 확인**: `/login`이 `ƒ (Dynamic)`으로 나왔다 — 정적 프리렌더 + nonce CSP 함정(이 저장소가
  두 번 밟은 것)에 걸리지 않았다.
- **인증 요청은 전부 `page.route`로 로컬 fulfill/abort 했다. 프로덕션 Supabase 실계정 요청 0건.**
  포괄 가드(`**/auth/v1/**` → abort)를 먼저, 구체 핸들러를 나중에 등록하는 e2e 스펙의 순서 계약을
  그대로 따랐다. 가드에 걸린 예상 밖 인증 호출은 **0건**이었다(전부 구체 핸들러가 받았다).
- 촬영 스크립트는 저장소 밖(scratchpad)에 두었다 — 스코프 밖 파일을 저장소에 남기지 않기 위해서다.
  Playwright 러너(`playwright.config.ts`)는 쓰지 않았다: 그 설정의 `globalTeardown`(`e2e/cleanup.ts`)이
  프로덕션 Supabase를 건드리므로 단순 촬영에 끌어들일 이유가 없다.

## 파일 목록

| 파일 | 화면 | 상태 | 뷰포트 |
|---|---|---|---|
| `login-signin__default__desktop.png` | /login · 로그인 탭 | default | desktop 1440×900 |
| `login-signin__default__mobile.png` | /login · 로그인 탭 | default | mobile 390×844 |
| `login-signin__empty__desktop.png` | /login · 로그인 탭 빈 폼 제출 | empty | desktop 1440×900 |
| `login-signin__empty__mobile.png` | /login · 로그인 탭 빈 폼 제출 | empty | mobile 390×844 |
| `login-signin__error__desktop.png` | /login · 자격증명 실패(GoTrue 400 mock) | error | desktop 1440×900 |
| `login-signin__error__mobile.png` | /login · 자격증명 실패(GoTrue 400 mock) | error | mobile 390×844 |
| `login-signin__loading__desktop.png` | /login · 제출 진행 중(응답 6초 지연) | loading | desktop 1440×900 |
| `login-signup__default__desktop.png` | /login · 가입 탭 | default | desktop 1440×900 |
| `login-signup__default__mobile.png` | /login · 가입 탭 | default | mobile 390×844 |
| `login-signup-sent__default__desktop.png` | /login · 가입 후 확인메일 안내(role=status) | default | desktop 1440×900 |
| `login-reset-sent__default__desktop.png` | /login · 재설정 요청 안내(role=status) | default | desktop 1440×900 |
| `login-ratelimit__error__desktop.png` | /login · 6번째 시도 상한 차단(role=alert) | error | desktop 1440×900 |

png는 `.gitignore:38`(`docs/loop-eng/screenshots/**/*.png`)로 추적 제외 상태를 촬영 **전에** 확인했고,
촬영 후 `git status`에도 올라오지 않는 것을 재확인했다. 이 매니페스트에는 화면 문구를 옮겨 적지 않는다.

## 화면으로 확인된 동작 (스크립트가 단언한 것)

- 빈 폼 제출: 이메일 입력의 `checkValidity()`가 `false`, **인증 요청 0건** — 브라우저 기본 검증이 막았다.
- 자격증명 실패: 폼 안 `role="alert"`가 보이고 문구에 **라틴 문자 0개**(영문 원문 미노출).
- 가입/재설정: 폼 안 `role="status"`가 보이고 라틴 문자 0개.
- 제출 중: 제출 버튼이 진행 문구로 바뀌며 **`disabled`**로 확인됨.
- 시도 상한: 1~5회는 요청이 1건씩 늘고, **6번째 클릭에서 요청 수가 5에 멈췄다**(네트워크에 안 나감).
- 가입 탭에서는 재설정 링크가 렌더되지 않는다(모바일 스크린샷에서 확인).

## issues

1. **[layout · 실제 결함] 오류·안내 문구가 한글 단어 중간에서 줄바꿈된다.**
   `LoginForm.tsx`의 `role="alert"` / `role="status"` 문단에 `break-keep`이 없다.
   눈짐작이 아니라 코드로 판정했다 — `Range.getClientRects()`로 줄 경계를 뽑아 비교한 결과:
   - `form p[role="alert"]` → `word-break: normal`, 2줄, **줄 경계 양쪽에 공백 없음 = 단어 중간 끊김**
   - 같은 화면의 하단 문단(`.break-keep`) → `word-break: keep-all`, 끊김 없음
   `login-ratelimit__error__desktop.png`와 `login-reset-sent__default__desktop.png` 두 장에서 육안으로도
   보인다. **이건 이 컴포넌트가 이미 한 번 고친 결함과 같은 종류다** — `LoginForm.tsx:331-333` 주석이
   "모바일에서 단어가 끊겨 `break-keep`을 붙였다"고 적고 있는데, 그 수정이 하단 문단 한 곳에만
   적용되고 오류·안내 문단에는 빠졌다. 당시엔 provider가 꺼져 있어 **오류 상태를 볼 수 없었던 것**이
   원인으로 보인다(2026-07-26 매니페스트의 "아직 못 본 것"에 그렇게 적혀 있다).
   **이번 작업 스코프(테스트 추가) 밖이라 고치지 않았다.** 수정 제안: 두 문단에 `break-keep` 추가.

2. **[dev 전용 · 프로덕션 무관] `eval()` CSP 콘솔 오류.**
   `next dev`에서만 전 페이지에 발생. React dev 모드가 `unsafe-eval`을 요구하는데 CSP가 막는다.
   프로덕션 빌드 재촬영에서 **0건**. 제품 결함 아님. 다만 dev 중 콘솔이 상시 빨간 상태라
   진짜 오류가 묻힐 수 있다는 점은 남겨 둔다.

3. **[로컬 전용 · 무해] `GET /_vercel/insights/script.js` → 404.**
   프로덕션 빌드를 로컬(`next start`)에서 띄웠기 때문이다. 이 스크립트는 Vercel 런타임이 주입한다.
   Vercel 배포본에는 존재하므로 결함 아님.

4. **[결함 아님 · 기록용] `.../auth/v1/token?grant_type=password` 400 응답 로그.**
   전부 **이 촬영 스크립트가 만든 mock**이다(`route.fulfill`은 네트워크로 나가지 않는다).
   자격증명 실패 1건 + 시도 상한 시나리오 5건 = 콘솔에 보이는 400의 전부이며, 실제 Supabase 호출은 없다.

## 못 본 것 (정직하게)

- **로그인 성공 후의 목적지 화면.** e2e E5와 같은 이유로 서버 세션을 위조하지 않았다 — 서명 없는
  가짜 토큰은 서버가 거부한다. 따라서 "성공 시 `/`가 실제로 어떻게 보이는지"는 이 촬영이 증명하지 않는다.
- **실제 메일 수신 흐름**(가입 확인·비밀번호 재설정 링크). 화면은 안내 문구까지만 봤다.
- **접근성 자동 감사(axe)·Lighthouse는 이번 촬영에서 돌리지 않았다.** 위 1번은 조판 결함이지
  axe가 잡는 항목이 아니다.
