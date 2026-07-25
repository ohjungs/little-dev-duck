# 검증 기록 — 2026-07-26 · Phase 18 T5 (발견성/SEO 표면)

**스크린샷이 없는 이유**: 이번 Task가 만든 산출물은 `robots.txt`·`sitemap.xml` 두 텍스트 응답이고
건드린 화면이 없다. 텍스트 파일을 이미지로 찍는 건 증거 가치가 없어, 실제 HTTP 응답 본문을 그대로
`served-output.md`에 저장했다(4-1의 취지 = 산출물을 실물로 남기기).

| 파일 | 내용 |
|---|---|
| `served-output.md` | 프로덕션 서버(`next build && next start`)의 실제 `/robots.txt`·`/sitemap.xml` 응답 + 워크스페이스 경로 노출 대조 |

## 이번 검증이 잡아낸 실제 버그 (수정 완료)

**`/robots.txt`·`/sitemap.xml`이 303 리다이렉트되고 있었다.** 두 경로가 proxy.ts PUBLIC_PATHS에 없어
인증 게이트가 크롤러를 `/welcome`으로 돌려보냈다 — robots를 읽지 못하니 SEO 정책이 통째로 무의미해지는
상태. `/opengraph-image`와 같은 부류의 누락이라 함께 공개 경로에 추가했다. → 200 확인.

파일을 만들기만 하고 `next build`가 라우트로 잡는 것만 확인했다면 이 버그를 그대로 배포했을 것이다.

## 정책 결정 (테스트로 잠금 — `src/lib/__tests__/seoSurface.test.ts`)

- **사이트맵에 공개 페이지 slug를 싣지 않는다.** Phase 12 T1은 열거 방지를 위해 일부러
  security-definer RPC로 "요청한 slug 한 건만" 반환하게 설계했는데, 사이트맵에 전 slug를 나열하면
  그 방어를 우리 손으로 무력화한다. 사용자는 링크를 골라 공유한 것이지 자기 공개 페이지 **목록**
  공개에 동의한 게 아니다. → 개별 페이지는 공유된 링크로 도달·색인되고(robots에서 `/p/` 허용),
  목록은 배포하지 않는다.
- **robots는 deny-by-default.** 사적 경로를 하나씩 disallow에 적는 방식은 새 라우트가 생길 때마다
  추가를 잊으면 워크스페이스가 색인되는 쪽으로 샌다. `Disallow: /` + 공개 표면만 allow로 열어
  **새 라우트는 기본이 비공개**가 되게 했다(안전한 방향으로 틀리게).
- `/p/*` 색인 자체는 허용 — 사용자가 "웹에 공개"를 명시적으로 눌렀고, 이는 현재 상태(robots 없음 =
  전부 크롤 가능)에서 **노출을 줄이기만 하는** 변경이라 새 위험을 만들지 않는다.

## 절대 URL

정적 프리렌더라 빌드 시점 env를 쓴다. `VERCEL_PROJECT_PRODUCTION_URL`(Vercel이 빌드에 항상 주입)을
넣고 빌드하면 `https://little-dev-duck.vercel.app/...`로 구워지는 것을 확인했다.
