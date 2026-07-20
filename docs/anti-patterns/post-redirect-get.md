# post-redirect-get — 리다이렉트가 POST를 유지해 405 발생

관련 lessons-learned: [[post-redirect-get 기본 상태코드]]

## Bad

```ts
export async function POST(request: Request) {
  await doSomething();
  return NextResponse.redirect(new URL("/login", request.url));
}
```

`NextResponse.redirect()`의 기본 상태코드는 307(Temporary Redirect)이며, 이는 원 요청의
HTTP 메서드를 그대로 유지한다. POST 요청에 대해 307로 리다이렉트하면 브라우저는 대상 URL에도
**POST로** 재요청한다. 대상이 GET만 처리하는 Next.js 페이지 라우트라면 405가 발생한다.

## Good

```ts
export async function POST(request: Request) {
  await doSomething();
  return NextResponse.redirect(new URL("/login", request.url), 303);
}
```

303(See Other)은 브라우저가 리다이렉트 대상을 항상 GET으로 요청하도록 강제한다.
Post/Redirect/Get(PRG) 패턴의 표준 방식이며, 폼 제출 후 리다이렉트에는 항상 303을 명시한다.

## 탐지 패턴

```
NextResponse\.redirect\([^,)]+\)(?!.*,\s*30[137])
```

`NextResponse.redirect(...)` 호출에 두 번째 인자(상태코드)가 없는 곳을 찾아, 해당 핸들러가
POST/PUT/DELETE 등 상태 변경 메서드인지 확인한다. 상태 변경 메서드라면 303을 명시해야 한다.
(GET 핸들러의 리다이렉트는 원래도 GET이 유지되므로 영향 없음 — 예: OAuth 콜백)

## 발견 경위

Phase 1 T5, 실사용자 로그아웃 클릭 테스트에서 발견. `apps/web/src/app/auth/logout/route.ts`와
`apps/web/src/proxy.ts`(미인증 리다이렉트) 2곳에서 동일 패턴 발견, 둘 다 303으로 수정.
