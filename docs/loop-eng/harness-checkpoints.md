# 하네스 디버그 체크포인트

## 2026-07-31 · packages/ui와 apps/web에 jsdom 환경과 @testing-library/react를 도입해 컴포넌트 렌더 테스트를 실행 가능하게 만들기 · R3 3연속 실패

- 재계획 횟수: 0
- 실패한 계획 항목: packages/ui/package.json, apps/web/package.json에 devDependencies로 jsdom, @testing-library/react, @testing-library/jest-dom 추가(vitest 4 / React 19.2 / Next 16 호환 버전 확인) 후 pnpm install

### R1/항목0

게이트 실패의 근본 원인을 진단했습니다.

## 핵심 진단 결과

### 직접 원인
WCAG AA 위반 2건: 색 대비 미달 (SC 1.4.11), 포커스 가시성 누락 (SC 2.4.7)

### 근본 원인
**검사 공백 (Test Gap)** — 저장소는 이미 globals.css 실물 파싱 관례를 확립했으나 (HabitHeatmap.contrast.test.ts, MemoWidget.colors.test.ts, globalsTextContrast.test.ts), 해당 관례를 --ring/--border/--input에 확장하지 않아 5인 감사(설계-개발-유닛-리뷰-QA)를 모두 통과했으나 차단 게이트에서 발견되었습니다.

### 색 대비 미달 상세 (Python 검증 완료)

1. **--ring 대비:**
   - 현재 #ca8a04 vs --background: 2.81:1 (요구 3:1, -6.3%)
   - Button의 `/60` 알파 희석: 1.84:1 (-38.7%)
   - Input의 `/40` 알파 희석: 1.48:1 (-50.7%)
   - 처방: #a16207로 변경 (→ 4.72:1), 알파 제거

2. **--border/--input 대비:**
   - 현재 #ebe7dd vs --background: 1.18:1 (요구 3:1, -60.7%)
   - 처방: #9b8f7a로 변경 (→ 3.05:1)

### 왜 5인 감사를 통과했는가?

1. **유닛 테스트:** globalsTextContrast.test.ts는 --muted-foreground만 검사, 비텍스트 3:1 검사 전무
2. **리뷰어:** 자동화된 색 대비 도구 미보유, 육안으로는 "2.81이 3 미만"을 판정 불가
3. **QA:** 실제로 포커스링이 "보이기는 함" → 규격 미달은 측정 도구 없이 알 수 없음
4. **패턴 존재:** TodoWidget 등이 올바른 focus-visible 패턴 보유 → "일부는 맞다"가 전체 통과를 암시하나 실제론 드리프트
5. **WCAG 체크리스트 부재:** SC 1.4.11 3:1 비텍스트 대비 요구사항이 백로그에 명시 체크리스트로 없었음

### 구조적 근본 원인

1. **검사 관례 단절:** 
   - globals.css 파싱 관례는 확립됐으나 "어떤 토큰을 검사할지" 체크리스트 부재
   - 같은 방식을 --ring/--border에 확장만 했다면 막혔을 것

2. **복사-드리프트 (L-19, L-21 재발):**
   - opacity-0 패턴: 올바른 구현 5곳 vs 누락 3곳
   - 시간 차를 두고 작성되어 최신 관례가 전파되지 않음

3. **주석은 검사가 아니다 (L-19):**
   - globals.css:342 "호출부가 motion-safe:를 쓴다"는 38건 중 5건만 지킴

### 최소 비용 처방

1. **검사 확장:** globalsTextContrast.test.ts에 비텍스트 3:1 검사 추가 (같은 파일, 같은 파싱 로직)
2. **팔레트 수정:** --ring → #a16207, --border/--input → #9b8f7a
3. **알파 제거:** button.tsx, input.tsx의 `/60`, `/40` 제거
4. **focus-visible 복원:** PageWorkspace, DbTableView, PageEditor 3개 파일에 패턴 추가
5. **타깃 크기:** `p-1` → `p-1.5` (22px → 26px)

상세 분석은 C:\Users\User\AppData\Local\Temp\claude\c--Users-User-Desktop-code-little-dev-duck\f186fc67-7ca5-4463-9782-e42962efe1eb\scratchpad\gate_failure_root_cause.md에 저장했습니다.

### R2/항목0

## 진단 결과: 게이트 실패는 이번 사이클 코드 변경 때문이 아니다 — e2e 로그인 세션이 죽었다

### 재현 [확인됨]
실패 6건을 그대로 재현했다(`npx playwright test e2e/not-found-csp.spec.ts e2e/responsive.spec.ts` → 6 failed / 8 passed / 2 skipped). 같은 실행의 서버 로그에 원인이 찍힌다.

```
[WebServer] Error [AuthApiError]: Invalid Refresh Token: Refresh Token Not Found
  status: 400, code: 'refresh_token_not_found'
[e2e cleanup] todos 정리 실패: JWT expired — 데이터가 남습니다.
```

미들웨어가 세션 복구에 실패해 로그인 사용자를 익명으로 보고 `/welcome`으로 돌려보낸다. 그래서:
- `not-found-csp.spec.ts:47` — `expect(res?.status()).toBe(404)` 가 **200**을 받는다(404 화면 대신 `/welcome`).
- `not-found-csp.spec.ts:67` — 제목 "이 페이지를 찾을 수 없어요"가 없다.
- `responsive.spec.ts:79` — `getByTestId('todo-widget')` element(s) not found (4개 뷰포트 전부 같은 지점, overflow 단언은 통과).

### 세션 파일 실측
`C:\Users\User\Desktop\code\little-dev-duck\apps\web\e2e\.auth\user.json` (mtime 2026-07-30 21:14)
- 쿠키 `expires` = **1819972703 (2027-09-03)** ← 브라우저 쿠키 수명
- 쿠키 안 세션의 `expires_at` = **1785416303 (2026-07-30T12:58Z)** ← 액세스 토큰, 약 7.6시간 전 만료
- refresh_token은 파일에 있으나 서버가 `refresh_token_not_found`로 거부 → 세션이 서버 쪽에서 끝났다

### 잠금의 구멍 (이게 진짜 지적 사항)
`C:\Users\User\Desktop\code\little-dev-duck\apps\web\e2e\authState.ts:78-83`

```ts
const alive = authCookies.some((c) => {
  const expires = c.expires;
  if (typeof expires !== "number" || expires <= 0) return true;
  return expires > nowSeconds;      // ← 쿠키 수명(2027)만 본다
});
```

`judgeAuthState`는 **쿠키 만료**만 본다. Supabase 세션의 실제 유효성(액세스 토큰 `expires_at`, 리프레시 토큰 유효 여부)은 보지 않는다. 그래서 죽은 세션에 `usable: true`를 주고, Phase 40 T3가 선언한 목적("만료된 세션과 진짜 회귀를 구분한다", 같은 파일 34-37행 주석 · `e2e/README.md:97-105`)이 **정확히 이 상황에서 작동하지 않는다**. 스킵돼야 할 것이 BLOCK 게이트 실패로 올라왔다.

부수적으로 `not-found-csp.spec.ts:46` 주석 "여기서 303이면 세션이 만료된 것이다"도 틀렸다 — `page.goto`는 리다이렉트를 따라가므로 실제로는 **200**이 온다. 실패 메시지만 보면 세션 문제로 읽히지 않는다.

### 실패 범위는 보고된 6건보다 넓다 [확인됨]
게이트가 두 스펙만 돌린 것으로 보인다. 같은 세션으로 나머지 인증 스펙도 전부 죽는다 — `widgets.spec.ts` 7건 · `duck.spec.ts` 3건 · `github-contributions.spec.ts` 5건 등 **추가 16건 실패**를 확인했다. 반대로 인증 불필요 스펙은 전부 통과한다(로그인 페이지 반응형 8건, 신규 `e2e/a11y-focus-visibility.spec.ts` 포함).

### 이번 사이클 변경과의 관계
무관하다. 변경분(`globals.css` 토큰 3종, `ui/button.tsx`·`ui/input.tsx` 알파 링 제거, `PageWorkspace`·`PageEditor`·`NewsTopWidget`·`DbTableView`·`DbBoardView` 포커스 변형·타깃 크기)은 홈 대시보드 위젯 렌더링이나 404 라우팅에 닿지 않는다. overflow 단언이 4개 뷰포트에서 전부 통과한 것도 CSS 회귀가 아님을 뒷받침한다. 리뷰의 BLOCK 지적들(미정의 `--destructive-foreground`, `text-primary` 7곳, metadata 15곳, 18px 타깃, 잔여 알파 링 19곳, `pb-safe`)은 별개 축이며 이 게이트 실패의 원인이 아니다.

### 조치 (우선순위)
1. **즉시 해제** — 세션 재발급. `apps/web/e2e/README.md:50-58` 절차(프로덕션 로그인 → `prod.json` → `node e2e/makeLocalAuth.mjs`)가 필요하다. OAuth 실로그인이라 사람 개입이 필수다. 재발급 후 6건은 그대로 통과할 것으로 본다 [추정 — 세션 없이는 검증 불가].
2. **구멍 메우기(결정적·코드로)** — `judgeAuthState`에 세션 본문 판정을 추가한다: 쿠키 값을 base64 디코드해 `expires_at`을 읽고, 만료됐으면 리프레시 1회를 실제로 시도(`POST /auth/v1/token?grant_type=refresh_token`)해 성공 여부로 `usable`을 정한다. `cleanup.ts:36`의 `extractAccessToken`이 디코드 로직을 이미 갖고 있어 재사용 가능하다. 모듈 로드 시 동기 판정이라 네트워크 확인은 `globalSetup`(`buildFreshness.ts`)에서 수행해 판정 결과를 파일/env로 넘기는 형태가 맞다.
3. **재발 차단** — Supabase 리프레시 토큰 회전 때문에 `user.json`은 **e2e를 한 번 돌 때마다 낡는다** [추정 — 회전 설정 미확인]. 갱신된 쿠키를 실행 후 `user.json`에 되쓰거나, 전용 테스트 계정 + 비밀번호 로그인으로 매 실행 세션을 새로 발급하는 쪽이 근본 해법이다(README:92-95가 이미 권고한 전용 계정과 같은 방향, CI 활성화 조건도 함께 풀린다).
4. **부작용 확인 필요** — 이번 실패 실행에서 `globalTeardown`도 `JWT expired`로 정리에 실패했다. 프로덕션 계정에 `e2e-` 접두사 행이 남아 있을 수 있다(`apps/web/e2e/cleanup.ts:99-113`).

### 검증 한계
- 리프레시 토큰이 무효화된 **이유**(회전 후 재사용 / 다른 곳 로그아웃 / 프로젝트 설정)는 확인하지 못했다.
- 세션 재발급 후 6건이 통과하는지는 직접 확인하지 못했다(자격증명 입력이 필요).

### R3/항목0

근본 원인이 확인됐다. BLOCKING 지적 2건의 진단 결과:

## BLOCKING #1: `--destructive-foreground` 토큰 부재

**발견:** `apps/web/src/app/globals.css`가 `:root`(라이트 31행)과 `.dark`(다크 108행) 블록에 `--destructive`는 정의하지만 `--destructive-foreground`는 정의하지 않는다. `@theme inline`(141~175행) 블록에도 `--color-destructive-foreground` 매핑이 없다.

**참조:** ConfirmDialog.tsx:28과 OfflineIndicator.tsx:30이 `text-destructive-foreground`를 쓴다.

**결과:** Tailwind v4 CSS-first 아키텍처는 정의되지 않은 토큰의 유틸리티를 생성하지 않으므로 `text-destructive-foreground` 클래스가 무효가 되고, 글자색이 부모의 `--foreground`로 상속된다. 리뷰 지적의 실측값(라이트 #262117 on #dc2626 = 3.31:1, 다크 #f4f0e6 on #f87171 = 2.32:1)은 WCAG AA 4.5:1 기준에 미달하며, CLAUDE.md 5절이 명시한 사용자 확인 필수 작업(삭제·DDL)의 확인 버튼과 저장 실패 알림이 그 영향을 받는다.

**이 토큰이 쓰이는 곳 전체 목록:** ConfirmDialog.tsx:28, OfflineIndicator.tsx:30만이 `text-destructive-foreground`를 직접 쓴다(grep 확인). 나머지 10개 파일은 `bg-destructive`만 쓴다.

## BLOCKING #2: 대비 검사가 미정의 토큰 참조를 탐지하지 못함

**발견:** `apps/web/src/components/__tests__/globalsTextContrast.test.ts`는 하드코딩 목록 4개(`--muted-foreground` + 비텍스트 토큰 3개)만 검사한다. 소스에서 **실제로 쓰이는 색 토큰 클래스**와 `globals.css @theme inline`에 **정의된 토큰 집합**을 교차 대조하지 않는다.

**결과:** 존재하지 않는 토큰을 참조하는 클래스(`text-destructive-foreground`)와 미정의 유틸리티(`pb-safe`)는 검사 대상 자체가 되지 않아, 설계-개발-유닛-리뷰-QA 전 관문을 조용히 통과했다. 교훈 L-23("목록이 둘이면 짝을 검사로 묶어라")의 재발이다.

**필요한 검사:** 소스 전체에서 커스텀 토큰 클래스(`text-*`, `bg-*`, `border-*`, 기타 커스텀 유틸리티)를 추출해 `globals.css @theme inline` 선언 집합과 교차 대조, 미정의 참조 0건을 단언한다. 순수 문자열 대조라 결정적 처리 가능하며 LLM 판단이 불필요하다.

## 추가 확인 사항

**`pb-safe` 유틸리티 부재:** AppNav.tsx:250이 `pb-safe`를 쓰는데 `globals.css`에 `@utility pb-safe` 선언이 없다. Tailwind v4 미정의 유틸은 CSS를 생성하지 않으므로 iOS 안전영역 처리가 무효다. 이 항목은 MEDIUM으로 분류돼 있으나 토큰 부재 감지 구조 결함의 동일한 증상이다.

## 게이트 차단 판정 근거

리뷰 지적이 2건을 BLOCKING으로 표시했으며, 둘 다 CLAUDE.md 5절 안전 규칙("되돌리기 어려운 작업은 실행 전 사용자 확인") + WCAG AA 준수 의무 위반이다. 게이트 통과 조건은 BLOCKING 0건이다.

**검증됨:** 소스 정적 분석 + 토큰 정의 파싱 + grep 교차 검증으로 확인. 브라우저 런타임 검증은 수행하지 않았다(리뷰 역할 범위상 코드 수정·실행 금지).

C:\Users\User\Desktop\code\little-dev-duck\apps\web\src\app\globals.css
C:\Users\User\Desktop\code\little-dev-duck\apps\web\src\components\__tests__\globalsTextContrast.test.ts
C:\Users\User\Desktop\code\little-dev-duck\apps\web\src\components\ConfirmDialog.tsx
C:\Users\User\Desktop\code\little-dev-duck\apps\web\src\components\OfflineIndicator.tsx
C:\Users\User\Desktop\code\little-dev-duck\apps\web\src\components\AppNav.tsx
