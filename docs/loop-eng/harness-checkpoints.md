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

## 2026-07-31 · LoginForm 컴포넌트 렌더 테스트(이메일 로그인·가입·비밀번호 재설정 제출 로직·에러 처리·재시도 상한) + E2E(이메일 로그인 플로우) 추가 · R3 3연속 실패

- 재계획 횟수: 0
- 실패한 계획 항목: 계약 확인: LoginForm.tsx의 handleEmailSubmit/handleResetRequest/allowRequest(5회·5분)/authErrorMessage 시그니처와 GithubContributionWidget.test.tsx의 기존 렌더 테스트 mock 패턴(vi.stubGlobal, fireEvent, screen)을 재확인한다.
- 실패 테스트: []

### R1/항목0 (원문)

진단을 완료했습니다. 근본 원인을 계층별로 정리합니다.

## 게이트 실패 근본 원인 진단

### 층위 1: 직접 원인 (코드)

**BLOCKING #1: `--destructive-foreground` 토큰 부재**
- `apps/web/src/app/globals.css` 31행(`:root`)과 108행(`.dark`)에 `--destructive`만 있고 `--destructive-foreground` 없음
- `@theme inline`(141-175행)에도 `--color-destructive-foreground` 매핑 누락
- 영향 범위: ConfirmDialog.tsx:28, OfflineIndicator.tsx:30의 `text-destructive-foreground` 클래스 무효화
- 결과: 텍스트가 부모 `--foreground`로 상속돼 대비 3.31:1(라이트), 2.43:1(다크) — WCAG AA 4.5:1 미달

**BLOCKING #2: 잔디 빈 칸 대비 미달**
- globals.css 51행 `--gh-0: #ebe7dd`(라이트), 118행 `--gh-0: #2a251c`(다크)
- 카드 배경 대비 1.23:1(라이트), 1.09:1(다크) — SC 1.4.11 3:1 기준 미달
- 잔디의 핵심 정보는 격자 패턴인데 빈 칸이 배경과 구분 안 되면 패턴 자체 소실

**BLOCKING #3: 잔디에 대비 검사 부재**
- `HabitHeatmap.contrast.test.ts`는 `--heat-*` 토큰의 인접 레벨 ΔE와 카드 대비를 검사하고 `--heat-edge` 테두리 토큰을 정의했으나
- `--gh-*` 토큰에는 동일 구조의 검사가 없고 셀 테두리(`--gh-edge`)도 없음
- globals.css:64-70 주석이 "눈으로 고르면 다음에 또 지적받는다"고 명시했는데 정확히 재현됨

**BLOCKING #4: 잔디 격자 키보드 스크롤 불가**
- GithubContributionWidget.tsx:132-136 스크롤 컨테이너에 `tabIndex` 없음
- Chrome·Safari는 스크롤 컨테이너를 자동 포커스 가능하게 하지 않음 (Firefox만)
- 53주 격자는 항상 카드 폭을 넘치므로 키보드 전용 사용자는 최근 몇 주 외에는 접근 불가
- SC 2.1.1(키보드) 위반

### 층위 2: 구조 원인 (검증 공백)

**근본 결함: globalsTextContrast.test.ts가 선택적 검사만 수행**
- 하드코딩 목록 4개(`--muted-foreground` + 비텍스트 토큰 3개)만 검사
- **실제 소스에서 쓰이는 색 토큰 클래스**와 **globals.css @theme inline에 정의된 토큰 집합**을 교차 대조하지 않음
- 결과: 존재하지 않는 토큰 참조(`text-destructive-foreground`)와 미정의 유틸리티(`pb-safe`)가 설계-개발-유닛-리뷰-QA 전 관문을 조용히 통과

**교훈 L-23 재발:** "목록이 둘이면 짝을 검사로 묶어라" 위반
- 습관 잔디(`--heat-*`)는 검사가 있는데 GitHub 잔디(`--gh-*`)에는 없음 = 두 패턴이 드리프트
- ConfirmDialog는 `--destructive`를 쓰는데 토큰 정의 검사가 선언부와 참조부를 묶지 않음

### 층위 3: 프로세스 원인 (문서-코드 불일치)

**harness-checkpoints.md의 진단이 코드에 적용되지 않음**
- `docs/loop-eng/harness-checkpoints.md:122-142`에 BLOCKING #1·#2가 이미 문서화돼 있음 (확인된 커밋: 9fe0f3d, bc2de85)
- 하지만 작업 트리(git diff 출력 빈 결과)에 수정이 전혀 반영되지 않음
- 진단과 수정 사이에 단절: 발견 → 문서화 경로는 작동, 문서 → 적용 경로는 미작동

**R3/항목0 문서의 '필요한 검사' 처방이 실행되지 않음**
- 122행이 필요한 검사로 "소스 전체에서 커스텀 토큰 클래스를 추출해 globals.css @theme inline 선언 집합과 교차 대조" 제시
- 순수 문자열 대조라 결정적 처리 가능(HD-003 ★ 준수)
- 하지만 검사 스크립트 미작성, 테스트 파일 미확장

### 층위 4: 하네스 제어 흐름 원인

**진단 완료 후 적용 단계 누락**
- 게이트 실패 → 진단 → 문서화까지는 실행됨 (harness-checkpoints.md 존재)
- 진단 → 수정 → 검증 루프가 닫히지 않음
- 이는 dev-harness 구조 원칙 HD-010(산출물 우선) 위반: 진단 결과가 파일로 남았으나 **실행 가능한 수정 계획**으로 변환되지 않음

**테스트 인프라 도입 커밋(9fe0f3d)과 타입 수정 커밋(d8a59c2)이 WIP 상태**
- 커밋 메시지에 "(WIP)" 명시 = 불완전 인정
- WCAG 위반 수정이 커밋 제목에 있으나 실제 코드에는 미적용 (git diff 빈 결과)
- 스테이징된 변경과 문서화된 진단이 따로 놀고 있음

### 실패 테스트 빈 배열의 의미

요청에서 `실패 테스트: []`는 **유닛·통합 테스트가 하나도 실패하지 않았다**는 뜻입니다.
이는 문제를 악화시키는 증거입니다:

1. BLOCKING 결함 4건이 존재
2. 하지만 기존 테스트 스위트는 전부 통과 (green)
3. 즉, **검사가 결함을 탐지하지 못함** = 검증 공백 확증

globalsTextContrast.test.ts가 선택적 토큰 4개만 재는 것이 이 현상의 직접 원인입니다.

---

## 권고 조치 (우선순위순)

1. **즉시:** `--destructive-foreground` 토큰 정의 + `@theme inline` 매핑 추가 (라이트 #ffffff, 다크 #1a1712)
2. **즉시:** `--gh-0` 값 조정 (카드 대비 3:1 이상) + `--gh-edge` 테두리 토큰 신설
3. **즉시:** GithubContributionWidget.tsx 스크롤 컨테이너에 `tabIndex={0}` 추가
4. **필수:** globalsTextContrast.test.ts를 **전수 검사**로 전환 — 소스에서 색 토큰 클래스 추출 → globals.css 정의 집합과 교차 대조 → 미정의 참조 0건 단언 (Bash/Node 스크립트로 처리, HD-003 ★)
5. **필수:** GithubContributionWidget.contrast.test.ts 신설 (HabitHeatmap.contrast.test.ts 구조 재사용)
6. **구조:** harness-checkpoints.md의 처방을 실행 가능한 태스크로 변환하는 단계를 하네스 루프에 추가 (SPEC_BLOCKED → 수정 → 검증 사이클 완결)

이 6건 완료 전까지 게이트는 BLOCKED 상태를 유지해야 합니다.

### R2/항목0 (원문)

근본 원인 진단이 완료되었습니다. 최종 요약:

## 게이트 실패 근본 원인 진단 완료

### 직접 원인
1. **BLOCKING #1:** `--destructive-foreground` 토큰이 정의되지 않았지만 2곳(ConfirmDialog.tsx:28, OfflineIndicator.tsx:30)에서 참조됨 → Tailwind v4는 미정의 토큰 클래스를 생성하지 않아 글자색이 `--foreground`로 상속되고 WCAG AA 4.5:1 미달(라이트 3.31:1, 다크 2.32:1).

2. **BLOCKING #2(구조):** 미정의 토큰 참조를 탐지하는 교차 검사 부재 — globalsTextContrast.test.ts는 하드코딩 목록 4개만 검사하고, @theme inline 정의와 소스 참조를 대조하지 않음.

3. **BLOCKING #2(신규 회귀):** --gh-0..4 토큰에 대비 검사 누락 — 실측 다크 --gh-0 vs --card ΔE=4.0(기준 6 미달), 명도 대비 1.09:1. 같은 성격의 --heat-*는 HabitHeatmap.contrast.test.ts가 검사하는데 --gh-*는 우회.

### 근본 원인(5 Whys → 1문장)
**목록 짝(정의/참조, 토큰/검사)을 결정적 검사로 묶지 않고 수동 체크리스트에 의존했기 때문**이다.

- 교훈 L-23("목록이 둘이면 짝을 검사로 묶어라")은 문서에 있었으나 적용되지 않음.
- HD-003(결정적 작업은 코드로)을 위반 — 토큰 교차 검증은 문자열 대조라 LLM 불필요, Python/JS 파싱으로 강제돼야 함.

### 검증
Python 결정적 검사로 재현:
- `check_missing_tokens.py` → 미정의 참조 2건 탐지(destructive-foreground, pb-safe).
- `check_gh_contrast.py` → 다크 --gh-0 vs --card ΔE=4.0 확인.

### 처방(구현 에이전트 몫)
1. globals.css에 --destructive-foreground 토큰 정의(라이트 #ffffff, 다크 #1a1712) + @theme inline 매핑.
2. globalsTextContrast.test.ts에 미정의 토큰 참조 교차 검사 추가(check_missing_tokens.py 로직 이식).
3. --gh-* 대비 검사 추가 또는 다크 --gh-0 값 조정(#3a3428 또는 테두리 추가).

### 산출물
C:\Users\User\AppData\Local\Temp\claude\c--Users-User-Desktop-code-little-dev-duck\f186fc67-7ca5-4463-9782-e42962efe1eb\scratchpad\diagnosis.md
C:\Users\User\AppData\Local\Temp\claude\c--Users-User-Desktop-code-little-dev-duck\f186fc67-7ca5-4463-9782-e42962efe1eb\scratchpad\check_missing_tokens.py
C:\Users\User\AppData\Local\Temp\claude\c--Users-User-Desktop-code-little-dev-duck\f186fc67-7ca5-4463-9782-e42962efe1eb\scratchpad\check_gh_contrast.py

### R3/항목0 (원문)

## 진단 결론

**게이트 실패 6건은 이번 diff의 결함이 아니다. e2e 로그인 세션이 죽어 인증 게이트가 6건 전부를 `/welcome` 랜딩으로 돌려보낸 것이다.** BLOCK 지적 11건 중 어느 것도 이 실패의 원인이 아니며, 그 지적들을 전부 고쳐도 이 6건은 그대로 실패한다.

---

### 1. 직접 증거 (실행 산출물)

Playwright 실패 컨텍스트가 저장소에 남아 있었다 — 추론이 아니라 실측이다.

- `C:\Users\User\Desktop\code\little-dev-duck\apps\web\test-results\.last-run.json` — failed 6건, 2개 파일(`31af787…` = not-found 2건, `e0223b0…` = responsive 4건). **다른 인증 필요 스펙은 이 실행에 포함되지 않았다**(전체 직렬 11.3분인데 산출물 mtime이 06:54~06:55Z 1분 폭 → 두 파일만 지정 실행).
- `…\test-results\not-found-csp-…-스크립트가-CSP에-막히지-않는다\error-context.md`
  `Expected: 404 / Received: 200`, 페이지 스냅샷이 **`/welcome` 랜딩 전문**(banner "Little Dev Duck", link "로그인", heading "일은 당신이 정하고, 번거로운 건 오리가.").
- `…\test-results\responsive-홈-화면-반응형-…\error-context.md` (4개 전부 동일)
  `getByTestId('todo-widget')` element(s) not found, 스냅샷 역시 **같은 `/welcome` 랜딩**.

즉 두 스펙 모두 목표 화면(404 페이지 / 홈 대시보드)에 **도달조차 못 했다**. `apps/web/src/proxy.ts:126-131`의 `if (!user && !isPublicPath)` → 303 `/welcome`을 Playwright가 따라가 200을 받은 것이다.

### 2. 근본 원인 — 세션 파일의 액세스 토큰이 18시간 전 만료, 리프레시 실패

`apps/web/e2e/.auth/user.json` (mtime 2026-07-30 21:14 KST) 복호화 결과:

| 항목 | 값 | 판정 |
|---|---|---|
| 쿠키 속성 `expires` | 2027-09-03T11:58:23Z | 살아 있음 |
| 쿠키 **값 안**의 `expires_at` | **2026-07-30T12:58:23Z** | **만료 (실행 시각 2026-07-31T06:54Z 기준 −17시간 56분)** |
| 프로젝트 ref | `iupprzfmlyfrdcctdupn` | `.env.local`의 `NEXT_PUBLIC_SUPABASE_URL`과 일치 |
| domain / secure / path | `localhost` / false / `/` | 전송 조건 정상 |

쿠키는 정상 전송됐고 프로젝트도 맞는데 `supabase.auth.getUser()`가 null을 반환했다 → **리프레시 토큰이 서버에서 이미 폐기됐다**는 뜻이다.

### 3. 이건 신규 현상이 아니라 미해결 항목의 재발이다

`docs\loop-eng\findings-2026-07-30-session-unblock.md` **§4-2**가 메커니즘을 이미 특정해 뒀다: Supabase의 refresh token **회전(rotation)** — 저장된 세션 파일로 갱신이 일어나면 원본 토큰이 폐기되고, 프로덕션 세션까지 함께 죽는다. 그 문서가 남긴 3가지 선택지(이메일 로그인 켜기 / Reuse Interval 상향 / 전용 계정+workers 1)는 **사용자 결정 대기 상태로 아직 열려 있다.**

다만 이번 실행에는 새 사실이 하나 있다 — `apps/web/playwright.config.ts:19-20`이 이미 `fullyParallel: false, workers: 1`이다. 즉 **병렬 워커 경합은 이번 실패의 메커니즘이 아니다.** 세션은 2026-07-30 전체 스위트 실행 때 이미 죽었고, 그 뒤 한 번도 재생성되지 않은 채 오늘까지 쓰였다.

### 4. 가드가 왜 못 막았나 (구조적 사각지대)

`apps/web/e2e\authState.ts:78-83`:

```ts
const alive = authCookies.some((c) => {
  const expires = c.expires;
  if (typeof expires !== "number" || expires <= 0) return true;
  return expires > nowSeconds;
});
```

**쿠키의 `expires` 속성만 본다.** 그런데 `sb-*-auth-token` 쿠키는 항상 리프레시 토큰 수명(약 1년)을 달고 있으므로 이 값은 사실상 언제나 미래다. 결과적으로 이 가드는 파일 삭제·JSON 깨짐·인증 쿠키 부재만 잡을 수 있고, **"서버에서 폐기된 세션"은 원리적으로 못 잡는다.** `apps\web\e2e\README.md:128-136`("지금은 authState.ts가 파일 내용만 보고 결정적으로 가른다")과 `PENDING.md:109-110`("세션 만료와 진짜 버그가 이제 구분됩니다")의 서술은 **현실과 어긋나 있다.**

주의할 점: 쿠키 값 안의 `expires_at`(액세스 토큰 exp)을 대신 보는 것도 **오답**이다. 리프레시 토큰이 살아 있으면 액세스 토큰 만료는 정상 상태라 멀쩡한 세션까지 스킵시킨다. 파일만으로는 결정 불가다.

### 5. 더 나쁜 것 — 같은 원인이 2건을 조용히 "스킵"시켰다

`responsive.spec.ts:96-127`의 "페이지 편집기 도구 모음" 2건은 **실패 목록에 없다.** 실패한 게 아니라 `firstPage.count() === 0`(113행) 조건에 걸려 "페이지가 없어 편집기를 열 수 없다"로 **스킵**됐다 — `/welcome`에는 `a[href^="/pages/"]`가 없기 때문이다. 즉 같은 근본 원인이 한쪽에서는 빨간 실패로, 다른 쪽에서는 **초록 스킵으로 위장**된다. 이 스킵 조건은 "인증 실패"와 "페이지 0건"을 구분하지 못한다.

### 6. 이번 diff의 결백 근거

`bc2de85..HEAD` + 작업 트리 변경 파일 34개 전수 확인 결과, **인증 경로 파일이 하나도 없다**: `apps/web/src/proxy.ts`, `apps/web/src/lib/supabase/*`, 로그인 라우트 모두 무변경. 변경은 `globals.css`, `button.tsx`, `input.tsx`, 위젯 컴포넌트, `packages/ui/Toast`, `packages/core/github-contribution`, 테스트 파일뿐이다. 빌드 신선도도 정상(`BUILD_ID` 06:53:51Z > 모든 감시 소스 mtime → `buildFreshness.ts` 통과, `pnpm e2e` 경로로 실행됨).

부수 확인: `duck-widget` testid는 `packages\mascot\src\Duck.tsx:131`에, 나머지 3개는 `TodoWidget.tsx:352`·`MemoWidget.tsx:229`·`GithubContributionWidget.tsx:80`에 **모두 존재한다.** 셀렉터 낡음이 아니다.

---

## 처방

**A. 즉시 (게이트 해제)** — 세션 재생성. `apps\web\e2e\README.md:81-98` 절차 그대로:
```
pnpm --filter web exec playwright open <프로덕션 URL>/login --save-storage=e2e/.auth/prod.json
node apps/web/e2e/makeLocalAuth.mjs
```
사용자 조작(OAuth 로그인)이 필요하다. 그 전까지 이 6건의 결과는 **제품 품질에 대해 아무 정보도 주지 않는다.**

**B. 재발 방지 (결정 가능한 유일한 검사)** — 파일 파싱으로는 판정 불가하므로 **HTTP 프로브 1회**로 바꾼다. 저장된 쿠키로 `baseURL/`을 `redirect: manual`로 GET해 303 + `Location: /welcome`이면 "세션이 죽었다, 갱신하라"로 **중단**시킨다(또는 인증 스펙 일괄 스킵). 결정적 변환이라 LLM 판단이 필요 없고, "세션 사망"과 "진짜 회귀"를 처음으로 실제 구분한다. 넣을 자리는 `apps\web\e2e\buildFreshness.ts`의 globalSetup 또는 별도 setup project.
[추정] globalSetup과 webServer의 기동 순서는 Playwright 버전에 따라 다르다 — 프로브가 서버보다 먼저 돌면 무의미하므로 **적용 전 순서 확인 필요**. 순서가 반대면 `setup` 의존 프로젝트로 옮긴다.

**C. 위장된 스킵 제거** — `responsive.spec.ts:113`의 스킵 조건 앞에 `expect(page.url()).not.toContain("/welcome")` 같은 단언을 두어 인증 실패가 초록으로 통과하지 못하게 한다.

**D. 미해결 결정 재상신** — findings §4-2의 3가지 선택지 중 하나를 사용자가 정하지 않으면 A는 매 사이클 반복된다. 가장 근본적인 것은 **이메일 로그인 활성화**(PENDING 11번, Supabase 대시보드 스위치 1개)로 워커가 스스로 로그인하게 만드는 것이다.

---

## BLOCK 지적과의 관계 (상관 분석)

- **인과 없음.** 지적 11건 중 e2e 실패를 유발할 수 있는 것은 0건이다. `button.tsx`의 `text-white`, 격자 `tabIndex`, `HabitHeatmap` role, Toast 타이머, `useDuckMood` 캐스트 — 전부 인증된 화면 **내부** 문제이고, 이번 실행은 그 화면에 도달하지 못했다.
- **역방향 파급 1건 (중요).** 지적 10번(`@axe-core/playwright`를 e2e에 붙여 위젯/설정/모달 3화면 스캔)은 **지금 붙이면 그대로 죽는다.** 위젯·설정 화면이 전부 인증 뒤에 있어 세션이 살아나기 전까지는 스캔 대상 DOM이 `/welcome`이다. 처방 A/B가 선행 조건이다.
- **검증 공백 고지.** 지적 2·3·4(스크롤 영역 포커스, gridcell 부모, 라이브리전 삽입 타이밍)는 DOM 층이라 현재 저장소의 CSS 토큰 층 게이트로는 잡히지 않고, e2e로도 **세션이 죽어 있는 한 검증 불가**다. 즉 이 항목들은 "고쳤다"를 자동 검증할 수단이 현재 0개다.

## 검증 상태

- [확인됨] 실패 6건의 도달 화면이 `/welcome`인 것 — Playwright error-context 스냅샷 실측
- [확인됨] 세션 payload `expires_at` 만료 — 쿠키 값 base64 복호화
- [확인됨] 인증 경로 파일 무변경 — `git diff --name-only bc2de85..HEAD` + `git status` 전수
- [확인됨] 빌드 신선도 정상 — mtime 대조
- [추정] 리프레시 토큰 폐기 원인이 2026-07-30 전체 스위트 실행의 회전이라는 점 — findings §4-2의 기록과 정황 일치. **토큰 갱신을 직접 시도하지 않았다**(성공 시 회전으로 세션 파일이 무효화되는 부작용이 있어 사용자 승인 없이 실행하지 않음).
- **실행하지 않은 것**: e2e 재실행, 브라우저 실화면 검증, Supabase 대시보드 조회.

주요 파일:
`C:\Users\User\Desktop\code\little-dev-duck\apps\web\e2e\authState.ts` (78-83행, 가드 사각지대)
`C:\Users\User\Desktop\code\little-dev-duck\apps\web\e2e\.auth\user.json` (죽은 세션)
`C:\Users\User\Desktop\code\little-dev-duck\apps\web\test-results\.last-run.json`
`C:\Users\User\Desktop\code\little-dev-duck\apps\web\src\proxy.ts` (126-131행, 303 리다이렉트 지점)
`C:\Users\User\Desktop\code\little-dev-duck\apps\web\e2e\responsive.spec.ts` (113행, 위장 스킵)
`C:\Users\User\Desktop\code\little-dev-duck\docs\loop-eng\findings-2026-07-30-session-unblock.md` (§4-2)
`C:\Users\User\Desktop\code\little-dev-duck\apps\web\e2e\README.md` (128-136행, 현실과 어긋난 서술)
