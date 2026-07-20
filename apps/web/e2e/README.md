# E2E (Playwright)

`pnpm exec playwright test` — apps/web에서 실행. `playwright.config.ts`가 포트 3100에서
자체 dev 서버를 띄운다(로컬 개발 서버가 보통 쓰는 3000과 겹치지 않게 분리 — 다른 프로세스와의
포트 충돌 방지).

`auth-redirect.spec.ts`, `responsive.spec.ts`(로그인 페이지 부분)는 로그인 없이 바로 돈다.
`widgets.spec.ts`(투두/메모), `duck.spec.ts`, `github-contributions.spec.ts`, 그리고 나머지
파일의 로그인 뒤 화면 테스트는 OAuth 뒤에 있어 저장된 로그인 세션이 있어야 실행되고, 없으면
자동으로 스킵된다(실패 아님).

## 인증 세션 만들기 (최초 1회, 로컬에서 수동)

Google/GitHub OAuth라 Playwright가 자동으로 로그인할 수 없다. 아래처럼
브라우저를 직접 띄워 로그인한 뒤 세션을 저장한다. **포트는 반드시 3100**
(playwright.config.ts의 baseURL과 동일해야 쿠키가 세션 파일에 저장된다 — 3000으로
로그인해서 저장하면 도메인이 달라 인증이 안 먹는다).

```
pnpm exec playwright open http://localhost:3100/login \
  --save-storage=e2e/.auth/user.json
```

처음 실행하면 playwright.config.ts의 `webServer` 설정대로 3100 포트에 dev 서버가 자동으로
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

인증 필요 스펙까지 CI에서 돌리려면 `e2e/.auth/user.json`을 base64 인코딩해 GitHub Actions
저장소 secret(`E2E_AUTH_STATE_B64`)으로 등록하고, CI가 이를 디코드해 같은 경로에 써주는 단계를
추가해야 한다. 이건 실제 프로덕션 Supabase 프로젝트에 실제 계정 세션으로 매 CI 실행마다
투두/메모를 생성·삭제하게 된다는 뜻이라(테스트는 정리하지만 실패 시 잔여 데이터가 남을 수 있음),
전용 테스트 계정을 따로 파거나 이 리스크를 감수할지 먼저 결정한 뒤 진행할 것을 권장한다.
