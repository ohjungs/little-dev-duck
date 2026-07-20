# E2E (Playwright)

`pnpm exec playwright test` — apps/web에서 실행. `auth-redirect.spec.ts`는
로그인 없이 바로 돈다. `widgets.spec.ts`(투두/메모 CRUD)는 OAuth 뒤에 있는
화면이라 저장된 로그인 세션이 있어야 실행된다.

## 인증 세션 만들기 (최초 1회, 로컬에서 수동)

Google/GitHub OAuth라 Playwright가 자동으로 로그인할 수 없다. 아래처럼
브라우저를 직접 띄워 로그인한 뒤 세션을 저장한다.

```
pnpm exec playwright open http://localhost:3000/login \
  --save-storage=e2e/.auth/user.json
```

로그인 완료 후 창을 닫으면 `e2e/.auth/user.json`에 세션이 저장된다.
이 파일은 `.gitignore`에 등록돼 있으니 커밋되지 않는다. 이후
`pnpm exec playwright test`를 실행하면 `widgets.spec.ts`가 자동으로 이
세션을 사용한다.

OAuth 세션은 만료되므로, 위젯 스펙이 다시 스킵되거나 리다이렉트로
실패하기 시작하면 위 명령을 다시 실행해 세션을 갱신한다.
