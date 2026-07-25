# 2026-07-26 — 공개 화면 스크린샷 (로그인 불필요 표면)

생성: `apps/web/e2e/public-visual.spec.ts` (Playwright, 로컬 dev 서버 :3100)

## 커버한 항목

| 파일 | 화면 | 상태 | 뷰포트 |
| --- | --- | --- | --- |
| `welcome__default__desktop.png` | /welcome (랜딩) | default | 1440x900 |
| `welcome__default__mobile.png` | /welcome (랜딩) | default | 390x844 |
| `login__default__desktop.png` | /login | default | 1440x900 |
| `login__default__mobile.png` | /login | default | 390x844 |

## 커버하지 못한 것 (정직하게)

- **로그인 뒤 화면 전부** — 대시보드 위젯, 오리 대화창, 캘린더, 인사이트, 뉴스.
  OAuth 세션 파일(`apps/web/e2e/.auth/user.json`)이 있어야 접근 가능하다.
  만드는 방법은 `apps/web/e2e/README.md`. 이게 없어 이번에도 못 찍었다.
- **loading / empty / error 상태** — 공개 화면 두 곳은 상태 분기가 없다(정적 랜딩·로그인 버튼).
  상태별 촬영은 로그인 뒤 화면에서만 의미가 있어 위 블로커에 함께 걸려 있다.

## 발견한 이슈

### 1. 프로덕션 Web Analytics가 꺼져 있다 — 방문자 데이터 수집 0건 [확인됨]

이번 촬영에서 네 화면 모두 `404 /_vercel/insights/script.js`가 찍혀 추적한 결과다.

- `apps/web/src/app/layout.tsx:69`에 `<Analytics />`가 모든 페이지에 붙어 있다.
- 프로덕션(`https://web-sepia-one-88.vercel.app`)에서 그 스크립트가 **404**.
- Vercel API 응답: `web_analytics_not_enabled` — "Web Analytics is not enabled for this project".
- 같은 프로젝트에서 `/_vercel/speed-insights/script.js`는 **200** — 인프라 문제가 아니라
  Web Analytics만 꺼져 있다는 뜻이다.

영향: 랜딩 유입·페이지뷰가 **한 건도 쌓이지 않았다.** 덤으로 모든 방문자의 브라우저 콘솔에
404가 하나씩 남는다. `apps/web/src/app/welcome/page.tsx:12`의 주석은 이전 사이클이
"Analytics 사망 = 랜딩 유입 지표 측정 불가"를 이미 문제로 인식했음을 보여주는데,
그때 고친 원인(미들웨어 차단)과 별개로 **설정이 애초에 꺼져 있었다.**

조치: Vercel 대시보드 토글이라 코드로 못 고친다 → `docs/loop-eng/PENDING.md`.

### 2. 레이아웃 — 이상 없음

데스크톱·모바일 네 조합 모두 가로 overflow 없음. `/_vercel/*` 외 실패 요청 없음,
콘솔 오류 없음.
