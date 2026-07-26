# 공개 화면 스크린샷 — 2026-07-26

/ 로그인 없이 볼 수 있는 화면만. 로그인 뒤 화면은 세션 파일이 없어 찍을 수 없다(PENDING 2번).

| 파일 | 화면 | 상태 | 뷰포트 |
|---|---|---|---|
| `welcome__default__desktop.png` | 랜딩(/welcome) | default | desktop |
| `welcome__default__mobile.png` | 랜딩(/welcome) | default | mobile |
| `login__default__desktop.png` | 로그인(/login) | default | desktop |
| `login__default__mobile.png` | 로그인(/login) | default | mobile |

## 2026-07-26 마지막 실행 (Phase 30~34 배포 뒤 회귀 확인)

`npx next build && npx playwright test public-visual.spec.ts` → **6/6 통과**.
콘솔 오류 0건 · 공개 페이지가 참조하는 정적 자원 전부 인증 없이 수신됨.

**왜 돌렸나**: 이 세션에서 core 인덱스·`PageEditor`·`globals.css`처럼 여러 화면이 공유하는
파일을 다섯 번 고쳤다. 로그인 뒤 화면은 못 보지만 **공개 화면 회귀는 실제로 확인할 수 있다** —
"검증 못 했다"로 넘기지 않고 볼 수 있는 만큼은 실행으로 확인한다.

## 이번 회차에 바뀐 것

Phase 30~34는 **로그인 뒤 화면만** 건드렸다(설정·페이지·표·발표). 공개 화면은 코드 변경이
없고, 위 이미지의 픽셀 차이는 재렌더링에서 오는 것이지 의도된 디자인 변경이 아니다.

## 발견한 것 (REFINE로 넘김)

- **[a11y] 같은 이름의 버튼 둘** — 사이드바 아이콘 버튼과 빈 화면 버튼이 **둘 다 접근성 이름이
  "새 페이지"**인데 동작이 다르다(하나는 메뉴 열기, 하나는 즉시 생성). 스크린리더에는 구분되지
  않는다. e2e를 쓰다 발견했고 `presentation.spec.ts`에 주석으로 남겼다.
  → 고치려면 이름을 나눠야 한다(예: 사이드바 쪽을 "새 페이지 메뉴"). **UI 문구 변경이라
  임의로 하지 않았다.**
- Vercel Web Analytics는 여전히 꺼져 있다(PENDING 5번) — 코드 쪽은 손댈 게 없다.
