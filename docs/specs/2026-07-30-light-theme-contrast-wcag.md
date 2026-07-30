---
id: SPEC-2026-07-30-light-theme-contrast-wcag
title: 라이트 테마 --muted-foreground 대비 WCAG AA 미달 수정
status: superseded
created: 2026-07-30
superseded_by: 커밋 12238c4 (2026-07-30 `/loop-eng`)
approved:
e2e_runner: playwright
e2e_command: "pnpm --filter web e2e"
runner_setup_needed: false
source_task: 라이트 테마 --muted-foreground 대비 WCAG AA 미달 수정
---

> **상태: superseded (2026-07-30).** 이 스펙의 §6 리스크 항목이 예견한 대로, 근본 수정은 이미
> 반영됐다 — 같은 날 `/loop-eng` 사이클이 커밋 `12238c4`로 `--muted-foreground`를
> `#8a8069`→`#6c6452`로 고치고 `apps/web/src/components/__tests__/globalsTextContrast.test.ts`로
> AC-1·AC-2를 잠갔다(배경 3종 × 라이트/다크 전부 4.5:1 이상, GREEN 확인).
> 남은 미이행분은 **AC-3(브라우저 실측 E2E)뿐**이며, 그건 인증 없는 `/welcome`에서 가능하지만
> 유닛 검사가 같은 토큰을 이미 잠그고 있어 가치가 중복된다(ponytail YAGNI) — 별도 착수하지
> 않고 이 스펙을 종결한다. 추후 `text-muted-foreground`가 색을 클래스로 하드코딩하는 경로가
> 생기면(유닛 검사가 못 보는 형태) 그때 AC-3을 되살릴 근거가 된다.

## 1. 목표·배경

`apps/web/src/app/globals.css`의 라이트 테마 `--muted-foreground`(보조 텍스트 색)가 배경(`--background`/
`--card`/`--muted`) 대비 WCAG AA 통상 텍스트 기준(4.5:1)에 못 미쳤다(감사 실측 3.74:1, 카드 배경
기준으로는 3.91:1). 보조 텍스트는 위젯 설명·부제·타임스탬프 등 앱 전반에서 `text-muted-foreground`
클래스로 광범위하게 쓰이므로, 토큰 값을 접근성 기준 이상으로 조정하고 그 값을 자동 검사로 잠근다.
색조(카키 계열)는 유지한 채 명도만 낮춰 기존 디자인 톤과의 일관성을 지킨다.

## 2. 수용 기준 (Acceptance Criteria)

- **AC-1**: 라이트 테마(`:root`)에서 `--muted-foreground`는 `--background`, `--card`, `--muted` 각각을
  배경으로 했을 때 WCAG 상대 휘도 공식 기준 명도 대비가 4.5:1 이상이다.
- **AC-2**: 다크 테마(`.dark`)의 `--muted-foreground` 대비는 이번 수정으로 퇴행하지 않고, `--background`,
  `--card`, `--muted` 각각 기준 4.5:1 이상을 유지한다.
- **AC-3**: 실제 브라우저에서 렌더링된 공개 페이지(`/welcome`)의 `text-muted-foreground` 요소는, 라이트
  테마 기본 상태에서 `getComputedStyle`로 읽은 전경색과 조상 배경색 사이의 실측 명도 대비가 4.5:1
  이상이다(토큰 값이 아니라 브라우저가 실제로 계산한 스타일 기준).

## 3. E2E 시나리오 (Given/When/Then)

### E2E-1 (covers: AC-1, AC-3)
- Given: 브라우저가 로그인 없이 `/welcome`을 라이트 테마(기본, `.dark` 클래스 없음)로 로드했다.
- When: 첫 번째 `text-muted-foreground` 단락 요소(히어로 섹션 소개 문구)의 `getComputedStyle().color`와,
  그 요소가 실제로 올라앉은 배경색(조상 요소 체인에서 첫 불투명 `background-color`)을 읽어 WCAG 명도
  대비 공식으로 비율을 계산한다.
- Then: 계산된 대비 비율이 4.5:1 이상이다.

### E2E-2 (covers: AC-2)
- Given: 브라우저가 `/welcome`을 로드한 뒤 `document.documentElement.classList.add("dark")`로 다크
  테마를 강제 적용했다.
- When: 같은 `text-muted-foreground` 요소의 계산된 전경색·배경색을 다시 읽어 대비 비율을 계산한다.
- Then: 계산된 대비 비율이 4.5:1 이상이다(라이트 테마 수정 전후로 다크 쪽 수치가 낮아지지 않는다).

## 4. 테스트 매트릭스

| AC | unit | integration | e2e |
|---|---|---|---|
| AC-1 | `globalsTextContrast.test.ts` — `:root` 블록 파싱 후 배경 3종 대비 검사 | — | E2E-1 |
| AC-2 | `globalsTextContrast.test.ts` — `.dark` 블록 파싱 후 배경 3종 대비 검사 | — | E2E-2 |
| AC-3 | — | — | E2E-1 |

## 5. 비범위 (Out of Scope)

- `--muted-foreground` 외 다른 색 토큰(예: `--secondary-foreground`, `--accent-foreground`)의 대비 재검토.
- 인쇄(`@media print`) 전용 `--muted-foreground`(`#525252`) 오버라이드 조정 — 별도 색상이며 이번 대상
  선정 항목(라이트 테마 기본)에 포함되지 않는다.
- 라이트/다크 외 추가 테마(고대비 모드 등) 신설.
- `text-muted-foreground`를 사용하는 개별 컴포넌트의 레이아웃·문구 변경.

## 6. 리스크·가정

- **가정**: `/welcome`은 인증 없이 접근 가능한 공개 페이지이며 `text-muted-foreground` 단락을 포함한다
  (2026-07-30 코드 확인: `apps/web/src/app/welcome/page.tsx` 83번째 줄).
- **가정**: 다크 테마는 `document.documentElement`의 `.dark` 클래스로 토글되며(`ThemeToggle.tsx`,
  `AppearanceSetting.tsx`와 동일한 규약), E2E는 컴포넌트 내부 로직(localStorage 동기화)에 의존하지 않고
  클래스를 직접 강제해 다크 대비만 독립적으로 검증한다.
- **리스크 — 스펙 작성 시점 상태**: 2026-07-30 코드베이스를 직접 확인한 결과 `apps/web/src/app/globals.css`
  28번째 줄의 라이트 `--muted-foreground`가 이미 `#8a8069`(구 값, 3.74:1)에서 `#6c6452`로 바뀌어 있고,
  같은 목적의 유닛 테스트 `apps/web/src/components/__tests__/globalsTextContrast.test.ts`도 이미 존재해
  `pnpm --filter web test`에서 GREEN이다(AC-1·AC-2 해당 부분은 유닛 레벨에서 이미 만족). 즉 이 스펙이
  다루는 근본 수정은 **이미 배포 코드에 반영되어 있을 가능성이 높다** — 별도 세션·에이전트가 같은
  이슈를 먼저 고쳤을 수 있다. 승인 시 Phase B는 코드 변경 없이 **AC-3(브라우저 실측 E2E) 신규 작성 +
  기존 AC-1/AC-2 회귀 방지 확인**만 수행하면 될 것으로 보이며, 착수 직전 `globals.css`와 유닛 테스트
  결과를 재확인해 실제로도 그런지 다시 검증해야 한다(합의 없이 "이미 끝남"으로 단정하지 않는다).
- **리스크**: `getComputedStyle`은 `color-mix`·투명도가 섞인 배경에서 최종 렌더 색을 정확히 읽지 못할 수
  있다 — E2E는 불투명 배경(카드/페이지 배경)에 실제로 올라앉은 요소만 검사 대상으로 삼는다.
