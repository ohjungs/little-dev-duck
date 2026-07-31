# E2E (Playwright)

**`pnpm e2e`로 실행한다** (= `next build && playwright test`). `playwright.config.ts`의
webServer는 `next start` — 즉 **미리 빌드된 결과물**을 서빙하는 프로덕션 서버다(dev 서버가
아니라서 hot reload가 없다). 그래서 `playwright test`만 단독으로 부르면 **소스를 고쳐도 직전
빌드가 그대로 서빙되어** 통과/실패가 실제 코드와 어긋난다(2026-07-26에 실제로 겪음 —
메타데이터를 고쳤는데 옛 값이 계속 나왔다). 앱 소스를 건드렸으면 반드시 빌드를 먼저 한다.
**이건 `e2e/buildFreshness.ts`(globalSetup)가 자동으로 막는다** — 빌드가 소스보다 낡았으면
어느 파일 때문인지 짚고 실행을 중단하므로, 잊어도 조용히 거짓 통과하지는 않는다.
포트는 5100 (로컬 개발 서버가 쓰는 5000과 겹치지 않게 분리 — 포트 충돌 방지).

`auth-redirect.spec.ts`, `email-login.spec.ts`, `responsive.spec.ts`(로그인 페이지 부분)는
로그인 없이 바로 돈다.
`widgets.spec.ts`(투두/메모), `todo-recurrence.spec.ts`(반복 할 일),
`undo-delete.spec.ts`(삭제 되돌리기), `duck-examples.spec.ts`(대화 예시 칩), `duck.spec.ts`,
`github-contributions.spec.ts`,
`admin-insights-settings-news-smoke.spec.ts`(관리자/통계/뉴스/설정 4페이지 스모크), 그리고 나머지
파일의 로그인 뒤 화면 테스트는 OAuth 뒤에 있어 저장된 로그인 세션이 있어야 실행되고, 없으면
자동으로 스킵된다(실패 아님).

## 이메일 로그인 스펙 (`email-login.spec.ts`) — 실계정 0건

이 스펙은 **세션 없이, CI에서도 실제로 돈다.** 모든 GoTrue 호출(`**/auth/v1/**`)을
`page.route`로 가로채므로 **실계정 가입·로그인이 한 건도 일어나지 않고**, 프로덕션
Supabase에 남는 데이터도 없다. 라우트는 반드시 `goto("/login")` **이전에** 건다 —
그 뒤에 걸면 첫 렌더가 만드는 호출을 놓친다.

등록 순서가 계약이다. Playwright는 **나중에 등록한 라우트를 먼저** 보므로
① 포괄 가드(`**/auth/v1/**` → 카운트 후 abort)를 먼저, ② 구체 핸들러(`token`·`signup`·
`recover`)를 나중에 건다. 이러면 예상 못 한 인증 호출이 프로덕션에 닿지 않고 카운터에 남는다.
glob에 호스트를 적지 않는 것도 규칙이다(Supabase URL은 환경변수라 CI와 로컬이 다르다).

이 파일을 만들며 실측한 환경 사실 둘 — 로그인 화면을 건드리는 다른 스펙에도 그대로 적용된다:

- **`getByRole("alert")`를 페이지 전역에 쓰면 안 된다.** Next가 항상 심어 두는
  `<div role="alert" id="__next-route-announcer__">`가 함께 잡혀 strict mode violation이 나거나
  "alert 없음" 단언이 영원히 실패한다. `page.locator("form").getByRole("alert")`처럼 좁힌다.
- **`getByLabel("이메일")`은 `{ exact: true }`가 필요하다.** 탭 묶음의 aria-label
  ("이메일 로그인 또는 가입 선택")이 "이메일"을 부분문자열로 품고 있다.

계층 경계: 오류 원문 → 한국어 문구 **매핑**과 상한 **인자·키 정규화**는 렌더 테스트
(`src/app/login/__tests__/LoginForm.test.tsx`)가 소유한다. 여기서 다시 단언하지 않는다.
여기서만 할 수 있는 것은 HTML5 `required` 차단, 성공 시 **실제 페이지 이동**, 그리고
브라우저가 진짜로 네트워크에 나갔는지(요청 횟수)다.

**한계(명시)**: 성공 경로의 최종 목적지가 `/`라는 것은 검증하지 않는다. 서명 없는 가짜
토큰이라 서버가 되물어 거부하고 미인증 경로로 보낸다 — 실계정 세션이 필요한 검증이고, 이
파일의 전제(실계정 0건)와 맞바꿀 수 없다. "`/`로 이동한다"는 렌더 테스트가 `location.assign`
호출로 잠근다.

## 인증 세션 — 이제 자동이다 (2026-07-31)

**아래의 "OAuth라 사람이 해야 한다"는 전제가 깨졌다.** 이 프로젝트는 **이메일 로그인이 이미
켜져 있다**(실측: `/auth/v1/settings`의 `external.email = true`). 그래서 전용 테스트 계정의
이메일·비밀번호만 있으면 `globalSetup`이 브라우저를 띄워 **실제 로그인 화면을 통과해** 세션을
만든다. 사람 손이 필요 없고, 만료도 문제가 되지 않는다(매 실행마다 새로 만든다).

`apps/web/.env.local`(커밋되지 않는다)에 두 줄:

```
E2E_EMAIL=...
E2E_PASSWORD=...
```

없으면 아무 일도 일어나지 않고 예전처럼 인증 스펙이 스킵된다(실패 아님).

### 배포된 사이트를 그대로 치기

```
E2E_BASE_URL=https://web-sepia-one-88.vercel.app \
E2E_AUTH_STATE=$PWD/e2e/.auth/prod.json \
  npx playwright test
```

`E2E_BASE_URL`을 주면 **우리가 서버를 띄우지 않는다**(webServer 없음). 빌드 신선도 검사도
건너뛴다 — 남의 서버가 서빙하는 것은 우리가 방금 만든 빌드가 아니라서 볼 이유가 없다.
세션 파일을 **따로 지정하는 것이 중요하다**: 쿠키는 도메인에 묶여 로컬용 `user.json`과
배포용은 섞이면 둘 다 안 먹는다.

이 경로가 답하는 질문: "코드는 통과했는데 **배포된 것**은 진짜 되나?"

### 알아 둘 함정 두 개 (실측으로 겪음)

- **`globalSetup`은 `authState.ts`를 부르면 안 된다.** 그 모듈은 불러오는 순간 판정을 상수에
  굳힌다. 세션을 만들기 **전에** 굳은 "쓸 수 없음"이 캐시에 남아, 세션을 새로 만들어 놓고도
  스펙이 전부 스킵됐다. 경로만 `authStatePath.ts`에서 가져온다.
- **파일 검사로는 살아 있는 세션인지 알 수 없다.** 쿠키 만료일이 2027년인데 안에 든 토큰은
  이미 죽어 `/welcome`으로 튕긴 사례가 있다. 그래서 "살아 있으면 건너뛴다"를 하지 않고
  **매번 새로 만든다** — 아끼는 건 3초뿐이고, 틀리면 원인을 다시 찾게 된다.

---

## (참고) 예전 방법 — OAuth로 손수 만들기

이메일 로그인이 꺼져 있던 시절의 절차다. 위 자동 경로가 안 될 때만 본다.
Google/GitHub OAuth라 Playwright가 자동으로 로그인할 수 없다. 아래처럼
브라우저를 직접 띄워 로그인한 뒤 세션을 저장한다. **포트는 반드시 5100**
(playwright.config.ts의 baseURL과 동일해야 쿠키가 세션 파일에 저장된다 — 5000으로
로그인해서 저장하면 도메인이 달라 인증이 안 먹는다).

```
pnpm exec playwright open http://localhost:5100/login \
  --save-storage=e2e/.auth/user.json
```

**2026-07-30 정정 — 위 명령만으로는 서버가 뜨지 않는다.** 전에는 "처음 실행하면
playwright.config.ts의 `webServer` 설정대로 5100 포트에 서버가 자동으로 뜬다"고 적어 뒀는데
**틀렸다**: `webServer`는 `playwright test`만 띄우고 `playwright open`은 아무것도 띄우지 않는다.
그대로 따라 하면 `ERR_CONNECTION_REFUSED`로 끝난다(2026-07-30에 실제로 그렇게 실패했다).
서버를 **먼저** 띄워야 한다:

```
pnpm build && pnpm --filter web exec next start -p 5100
```

**그리고 Supabase 리다이렉트 허용목록에 localhost가 있어야 한다.** `redirectTo`는
`window.location.origin`(`src/app/login/LoginForm.tsx`)인데 `http://localhost:5100`이 허용목록에
없으면 Supabase가 Site URL(프로덕션)로 되돌린다 — 로그인은 되지만 **쿠키가 프로덕션 도메인에
붙어 세션 파일이 빈 채로 저장된다**(실측: cookies 0). Supabase 대시보드 →
Authentication → URL Configuration → Redirect URLs에 `http://localhost:5100/**`를 추가한다.

브라우저 창이 열리면 Google 또는 GitHub로 실제 로그인을 완료한 뒤 창을 닫는다
(**닫을 때** 파일이 쓰인다 — 열어 둔 채로는 저장되지 않는다).

### 허용목록을 못 바꿀 때 — 프로덕션 세션에서 만들기

Supabase 인증 쿠키는 Supabase가 서명한 JWT라 **origin에 묶이지 않는다.** 프로덕션에서 세션을
받아 쿠키의 domain만 바꿔 주면 로컬에서도 인증된다.

```
pnpm --filter web exec playwright open <프로덕션 URL>/login --save-storage=e2e/.auth/prod.json
node e2e/makeLocalAuth.mjs        # prod.json → user.json (domain 치환 + 온보딩 플래그)
```

**온보딩 플래그를 함께 심어야 한다.** `ldd:onboarded`(localStorage)가 없으면 "시작 안내"
오버레이가 클릭을 가로채 위젯 스펙이 **전부 실패**한다. `authState.ts`는 인증 쿠키만 보고
usable을 판정하므로 이 경우를 걸러 주지 못한다 — 세션 파일을 새로 만든 누구에게나 일어난다. `e2e/.auth/user.json`에 세션이 저장된다. 이 파일은 `.gitignore`에 등록돼 있으니
커밋되지 않는다(OAuth 세션 토큰이 들어있어 저장소에 올리면 안 됨). 이후
`pnpm exec playwright test`를 실행하면 인증이 필요한 모든 스펙이 자동으로 이 세션을 쓴다.

OAuth 세션은 만료되므로, 인증 필요 스펙들이 다시 스킵되거나 리다이렉트로
실패하기 시작하면 위 명령을 다시 실행해 세션을 갱신한다.

## CI에서 실행

`.github/workflows/ci.yml`은 인증이 필요 없는 `auth-redirect.spec.ts`(+ `responsive.spec.ts`의
로그인 페이지 부분)만 모든 push/PR에서 자동 실행한다. 인증이 필요한 나머지 스펙은 CI에 세션
파일이 없어 전부 스킵된다 — 이건 의도된 동작이다.

**2026-07-26(Phase 40 T1): 받는 단계는 이미 만들어 뒀다.** 전에는 "단계를 추가해야 한다"고만
적혀 있어서 시크릿을 등록해도 아무 일도 일어나지 않았다 — 등록할 이유가 없는 상태였다.
지금은 순서가 뒤집혀 있다:

```
base64 -w0 apps/web/e2e/.auth/user.json     # 이 값을 복사
```

GitHub 저장소 → Settings → Secrets and variables → Actions → New repository secret →
이름 **`E2E_AUTH_STATE_B64`**, 값은 위 출력.

- **등록하지 않으면 지금과 똑같다**(미설정이 안전한 기본값): CI가 파일을 만들지 않고 인증 필요
  스펙은 전부 스킵된다. 실패가 아니다.
- 등록하면 CI가 디코드해 `apps/web/e2e/.auth/user.json`에 쓰고, 그 시점부터 44건이 함께 돈다.
  **내용은 로그에 남기지 않는다**(세션 토큰이다). base64가 잘못돼 빈 파일이 되면 조용히
  넘어가지 않고 오류로 중단한다.

**켜기 전에 결정해야 하는 것(그대로 남아 있다)**: 이건 실제 프로덕션 Supabase 프로젝트에 실제
계정 세션으로 **매 CI 실행마다** 투두·메모를 생성·삭제하게 된다는 뜻이다(테스트는 정리하지만
실패 시 잔여 데이터가 남을 수 있다). **전용 테스트 계정**을 따로 파는 것을 권한다 —
본인 계정으로 돌리면 본인 데이터에 섞인다.

## 세션이 만료되면 (Phase 40 T3)

전에는 만료된 세션 파일이 있으면 스펙이 **스킵되지 않고 리다이렉트로 실패**했다 — CI에서는
그게 "세션 만료"인지 "진짜 회귀"인지 구분되지 않았다.

지금은 `authState.ts`가 파일 내용만 보고 결정적으로 가른다: 인증 쿠키가 전부 만료됐거나
아예 없으면 **"만료됐으니 갱신하라"는 사유와 함께 스킵**한다(실패가 아니다).
만료 시각을 알 수 없는 경우(세션 쿠키)나 분할 토큰 일부만 만료된 경우는 **살아 있다고 본다** —
모르면서 막으면 멀쩡한 세션으로도 스펙이 계속 죽는다.
