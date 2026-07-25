# 화면 검증 — 2026-07-26 · Phase 18 T1 (공개 페이지 바이럴 루프: 배지 + OG 이미지)

검증 방법: `next build` → `next start -p 3100`(프로덕션 서버) → Playwright chromium.
로컬에 `.env.local`이 없어 미들웨어가 500을 내므로, 스크린샷 한정 더미 Supabase env를 주입해 기동했다
(커밋하지 않음). 데스크톱 1440x900 / 모바일 390x844.

| 파일 | 화면 | 상태 | 뷰포트 | 판정 |
|---|---|---|---|---|
| `og-card__default__1200x630.png` | OG 공유 카드 | default | 1200x630 고정 | **통과** — 절차적 오리 + 워드마크 정상, 두부(□) 없음 |
| `welcome__default__desktop.png` | 공개 랜딩 | default | desktop | 렌더 통과 / **콘솔 이슈 있음**(아래 이슈 1) |
| `welcome__default__mobile.png` | 공개 랜딩 | default | mobile | 렌더 통과 / 동일 콘솔 이슈 |
| `public-page__notfound__desktop.png` | 공개 페이지 | notfound | desktop | **검증 불가**(아래 이슈 2) |
| `public-page__notfound__mobile.png` | 공개 페이지 | notfound | mobile | **검증 불가**(아래 이슈 2) |
| `console-issues.txt` | — | — | — | 원본 콘솔 로그 |

## 이번 사이클에 이 검증이 잡아낸 실제 버그 (수정 완료)

1. **`/opengraph-image`가 303 리다이렉트** — proxy.ts PUBLIC_PATHS에 없어 인증 게이트가 소셜 크롤러를
   `/welcome`으로 돌려보냈다. 카드 이미지가 통째로 안 뜨는 상태. → 공개 경로 추가로 200 확인.
2. **og:image가 `localhost`로 나감** — `metadataBase` 미설정 시 Next가 빌드 시점 localhost를 정적
   페이지에 박는다(`/welcome`에서 실측). → core `resolveSiteUrl` + layout `metadataBase`로 수정,
   `VERCEL_PROJECT_PRODUCTION_URL` 주입 빌드에서 절대 URL 생성 확인.
3. **문서 제목에 브랜드 중복** — `/p/[slug]`가 title에 브랜드를 직접 붙이는데 root layout에
   `title.template`이 또 붙여 "제목 — Little Dev Duck — Little Dev Duck"이 됐다. → core 문구 함수로 정리.

## 남은 이슈 (미수정 — 사용자 판단 필요, manual-verification.md 7·8번)

1. **`/welcome`의 모든 스크립트가 CSP nonce로 차단됨**(기존 버그, 이번 작업과 무관).
   정적 프리렌더 HTML에는 요청마다 바뀌는 nonce를 넣을 수 없다. 내용·스타일은 정상이지만 하이드레이션과
   Vercel `<Analytics/>`가 죽어 **랜딩 유입 지표를 측정할 수 없다**. 수정안 3가지 모두 보안 태세 변경이라
   자율 미결정.
2. **`/p/<slug>` 실제 상태 미검증** — 로컬에 Supabase 자격증명이 없어 공개 페이지 조회 자체가 불가.
   위 두 `public-page__notfound__*` 스크린샷은 의도한 404 UI가 아니라 env 부재 에러 경계다.
