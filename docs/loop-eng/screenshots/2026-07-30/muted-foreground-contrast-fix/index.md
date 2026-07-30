# 2026-07-30 — 라이트 테마 --muted-foreground 대비 수정

Task: 감사 발견(라이트 테마 `--muted-foreground` 3.74:1, WCAG AA 4.5:1 미달)을 코드로
재확인(직접 계산 일치) → `apps/web/src/components/__tests__/globalsTextContrast.test.ts`로
RED 고정 → globals.css `#8a8069` → `#6c6452`로 수정 → GREEN.

## 스크린샷

- `welcome__default__desktop.png` / `welcome__default__mobile.png` — 공개 랜딩(라이트 테마
  보조 텍스트 다수 사용). 레이아웃 정상, 텍스트 가독성 개선(더 진한 회갈색).
- `login__default__desktop.png` / `login__default__mobile.png` — 로그인 화면.

## 커버 못 한 것 (defer, manual-verification 109번)

- 인증 필요 화면(대시보드 위젯·설정 등)은 `apps/web/e2e/.auth/user.json` 세션이 만료돼
  이번 사이클엔 실제 로그인 화면을 못 찍었다. 자동 대비 테스트(3개 배경 × 2개 테마 전부
  green)가 1차 증거이고, 시각 확인은 세션 재생성 후 다음 사이클로 이월.

## 발견한 이슈 (본 작업과 별개, 확대하지 않고 기록만)

- e2e 인증 세션 만료가 "스킵"이 아니라 위젯 타임아웃(30초)으로 나타남 —
  `authState.ts`의 만료 판정 갭 의심. 상세: manual-verification.md 109번.
