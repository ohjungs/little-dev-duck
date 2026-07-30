# 2026-07-30 — 라이트 테마 --muted-foreground 대비 수정

> ## 정정 (2026-07-30 다음 사이클에서 발견)
> **이 폴더의 스크린샷은 수정 전 색을 담고 있다 — 잘못된 기록이다.**
> 회귀 격리를 위해 `globals.css`를 stash하고 재빌드한 뒤, 복원(`stash pop`) 후에
> **재빌드하지 않은 채** 스크린샷을 찍었다. `next start`는 직전 빌드 산출물을 서빙하므로
> 이미지에 찍힌 것은 구 값(`#8a8069`)이다. 코드 수정 자체는 정상이었다(유닛 테스트 GREEN).
>
> **다음 사이클에서 실제 브라우저로 재확인해 통과를 확정했다**: 새로 빌드한 서버에서
> `getComputedStyle` 실측 결과 `rgb(108,100,82)`(`#6c6452`) on `rgb(251,250,247)`(`#fbfaf7`)
> = **5.62:1** (WCAG AA 통상 텍스트 4.5:1 통과), 데스크톱·모바일 동일.
> 올바른 스크린샷은 [lang-ko-and-grass-aria](../lang-ko-and-grass-aria/index.md)에 있다
> (같은 `/welcome` 화면이고 그 빌드에는 이 수정이 포함돼 있다).
>
> 교훈: `next start`는 요청 시 컴파일하지 않는다 — **소스를 고친 뒤 재빌드 없이 찍은
> 스크린샷은 증거가 아니다.** e2e는 `buildFreshness.ts`가 이걸 막아주지만, 직접 띄운
> 서버에 node 스크립트로 붙는 경로에는 그 가드가 없다.

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
