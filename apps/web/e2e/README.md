# E2E (Playwright)

**`pnpm e2e`로 실행한다** (= `next build && playwright test`). `playwright.config.ts`의
webServer는 `next start` — 즉 **미리 빌드된 결과물**을 서빙하는 프로덕션 서버다(dev 서버가
아니라서 hot reload가 없다). 그래서 `playwright test`만 단독으로 부르면 **소스를 고쳐도 직전
빌드가 그대로 서빙되어** 통과/실패가 실제 코드와 어긋난다(2026-07-26에 실제로 겪음 —
메타데이터를 고쳤는데 옛 값이 계속 나왔다). 앱 소스를 건드렸으면 반드시 빌드를 먼저 한다.
**이건 `e2e/buildFreshness.ts`(globalSetup)가 자동으로 막는다** — 빌드가 소스보다 낡았으면
어느 파일 때문인지 짚고 실행을 중단하므로, 잊어도 조용히 거짓 통과하지는 않는다.
포트는 5100 (로컬 개발 서버가 쓰는 5000과 겹치지 않게 분리 — 포트 충돌 방지).

`auth-redirect.spec.ts`, `responsive.spec.ts`(로그인 페이지 부분)는 로그인 없이 바로 돈다.
`widgets.spec.ts`(투두/메모), `todo-recurrence.spec.ts`(반복 할 일),
`undo-delete.spec.ts`(삭제 되돌리기), `duck-examples.spec.ts`(대화 예시 칩), `duck.spec.ts`,
`github-contributions.spec.ts`, 그리고 나머지
파일의 로그인 뒤 화면 테스트는 OAuth 뒤에 있어 저장된 로그인 세션이 있어야 실행되고, 없으면
자동으로 스킵된다(실패 아님).

## 인증 세션 만들기 (최초 1회, 로컬에서 수동)

Google/GitHub OAuth라 Playwright가 자동으로 로그인할 수 없다. 아래처럼
브라우저를 직접 띄워 로그인한 뒤 세션을 저장한다. **포트는 반드시 5100**
(playwright.config.ts의 baseURL과 동일해야 쿠키가 세션 파일에 저장된다 — 5000으로
로그인해서 저장하면 도메인이 달라 인증이 안 먹는다).

```
pnpm exec playwright open http://localhost:5100/login \
  --save-storage=e2e/.auth/user.json
```

처음 실행하면 playwright.config.ts의 `webServer` 설정대로 5100 포트에 dev 서버가 자동으로
뜬다(잠시 대기). 브라우저 창이 열리면 Google 또는 GitHub로 실제 로그인을 완료한 뒤 창을
닫는다. `e2e/.auth/user.json`에 세션이 저장된다. 이 파일은 `.gitignore`에 등록돼 있으니
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
