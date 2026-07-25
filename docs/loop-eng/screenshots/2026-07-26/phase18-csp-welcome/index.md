# 화면 검증 — 2026-07-26 · 랜딩 CSP·Analytics 차단 수정

manual-verification.md 7번(정적 프리렌더 CSP nonce 차단)을 수정하고 재측정한 결과.

| 파일 | 화면 | 상태 | 뷰포트 |
|---|---|---|---|
| `welcome__default__desktop.png` | 공개 랜딩 | default(수정 후) | desktop |
| `welcome__default__mobile.png` | 공개 랜딩 | default(수정 후) | mobile |

## 측정 (Playwright chromium, 프로덕션 서버)

| 항목 | 수정 전 | 수정 후 |
|---|---|---|
| CSP 콘솔 오류 | 23건 (외부 스크립트 12 + 인라인 11) | **0건** |
| HTML의 nonce 속성 | 0개 | 1개 |
| 하이드레이션 | 죽음 | **정상**(desktop·mobile) |
| `/_vercel/insights/script.js` | 303 → HTML(MIME 거부) | 404(로컬엔 플랫폼 파일 없음 = 정상) |

수정 후 남는 콘솔 오류 1건은 위 404다 — 이 파일은 Vercel 플랫폼이 서빙하므로 로컬에만 없다.
수정 전의 303→HTML은 **배포 환경에서도 그대로 재현되는 문제**였고(미들웨어가 가로챔), 지금은 matcher에서
제외돼 크롤러·방문자 모두 실제 스크립트를 받는다.

## 수정 내용

1. `apps/web/src/app/welcome/page.tsx` — `export const dynamic = "force-dynamic"`.
   정적 프리렌더 HTML에는 요청별 nonce를 심을 수 없어 `'strict-dynamic'` 하에서 모든 스크립트가 차단됐다.
2. `apps/web/src/proxy.ts` — matcher에 `_vercel` 제외 추가. Analytics 스크립트가 인증 게이트에 걸려
   랜딩 유입 지표가 통째로 누락되던 문제.
