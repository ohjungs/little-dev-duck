# Phase 13 — 상용 마감 (랜딩, 온보딩, i18n, Sentry/Analytics)

착수: Phase 12 완료 후 `/loop` 자율(사용자 "Phase 17까지 진행"). 로드맵 다음 순번.
phase-mapping-proposal 배정 4항목: 전 기능 키보드 조작 / 계정 삭제+데이터 파기(MUST) /
온보딩 튜토리얼(기결정, DECISIONS 7절) / Sentry PII 스크러빙.

## 슬라이스 순서 (인프라 선행 없는 것 우선 = ponytail)

### T1 온보딩 튜토리얼 (self-contained, 최우선)
첫 방문 시 오리가 앱을 안내하고 샘플 데이터 생성을 제안. localStorage 플래그로 최초 1회.
- 오리 인사 + 핵심(위젯/오리/페이지) 3~4스텝 소개 + "샘플 데이터 만들기"(투두/메모/페이지 1개씩,
  기존 api 재사용) + "건너뛰기". 완료 시 localStorage `ldd:onboarded`.
- 새 오버레이 컴포넌트 + 홈에서 마운트. 스키마 없음.

### T2 전 기능 키보드 조작 (접근성 마감)
주요 인터랙션(위젯 버튼, 대화창, DB 뷰, 모달)의 키보드 접근성 점검·보강 + focus-visible 링 통일.
모달 Esc 닫기/포커스 트랩, 스킵 링크 등. 대부분 기존 컴포넌트 보강.

**구현 완료(2026-07-24, 인계 세션)**:
- globals.css `@layer base`에 전역 `:focus-visible` outline(`--ring` 색) — shadcn 컴포넌트는 자체
  `outline-none`+ring(utility가 base보다 우선)이라 유지되고, 자체 링 없는 raw 요소만 이 링을 받아 색 통일.
- 공용 훅 `hooks/useModalA11y(open, onClose)` — Esc 닫기 + 열릴 때 포커스 진입 + 닫힐 때 직전 포커스
  복원 + Tab 포커스 트랩. `onClose`가 인라인이어도 setup effect 재실행 안 되게 ref로 최신값만 참조.
- VersionHistory(Esc 없던 것 추가)·OnboardingOverlay(포커스 관리 없던 것)에 연결. CommandPalette는
  이미 Esc+포커스 처리가 있어 건드리지 않음(ponytail — 되는 건 안 만짐).
- (app) 레이아웃에 스킵 링크(`본문으로 건너뛰기`, 포커스 시에만 노출) + `<main id="main">` 타겟.
- ponytail 주석: 네이티브 `<dialog>.showModal()`이 Esc+트랩을 공짜로 주지만 기존 div 모달 다수 일괄
  전환이 더 큰 변경이라 얇은 훅으로 통일 — 새 모달은 `<dialog>` 우선.
- 검증: web tsc GREEN. 실제 키보드 조작 육안 확인은 사용자 몫(브라우저 필요).

### T3 계정 삭제 + 전체 데이터 파기 (MUST — 단, 인프라 선행)
전체 데이터 파기는 RLS 허용 삭제로 가능하나, auth.users 계정 자체 삭제는 service_role/Edge Function이
필요(현재 미설정 = 사용자 몫). **1단계**: 로그인 사용자가 자기 데이터(전 테이블 행)를 삭제하는 흐름 +
확인 게이트 + 로그아웃. **2단계(이월)**: auth 계정 완전 삭제(Edge Function). 안전 규칙상 되돌리기 불가라
강한 확인(문구 타이핑) 필수.

**1단계 구현 완료(2026-07-24, 인계 세션)**:
- 마이그레이션 `20260724130000_delete_all_my_data`(+rollback): security-definer 함수
  `delete_all_my_data()` — 호출자(auth.uid())의 15개 데이터 테이블 행을 자식→부모 순으로 원자적 삭제
  (action_log/embeddings/page_versions/pages/habit_checks/habits/pomodoro/calendar/activity/duck_state/
  memos/todos/google·github·gmail 토큰). 파라미터 없음=주입면 없음, search_path 고정, authenticated만 실행.
  **profiles는 남긴다** — 계정(auth)은 유지돼 재사용 가능(완전 삭제는 2단계 Edge Function).
- api `deleteAllMyData(supabase, userId)`: 스토리지 첨부(본인 폴더)를 storage API로 best-effort 제거
  (DB 행만 지우면 백엔드 바이트가 고아로 남음) 후 RPC 호출. +4 tests.
- web `DangerZone.tsx`(설정 "위험 구역" 카드): 문구(`삭제합니다`) 타이핑 강한 확인 게이트 + 무엇이
  지워지는지 명시 + 삭제 후 signOut→/login.
- **db push 필요(delete_all_my_data)** + 사용자 실기 검증(실제 삭제→로그아웃).

### T4 랜딩 페이지 (마케팅)
비로그인 방문자용 공개 랜딩(`/` 또는 별도). 현재 비로그인은 /login으로 리다이렉트 — 랜딩을 공개 경로로
두고 CTA→로그인. 디자인 비중 큼. web/design-quality 규범 준수(템플릿 금지).

### T5 Sentry PII 스크러빙 (이월 — Sentry 계정 선행)
Sentry 도입 자체가 미완(계정 미생성). 도입 시 beforeSend로 PII 스크러빙. 이월.

### T6 i18n (이월 — 범위 큼)
현재 전면 한국어. 다국어는 별도 대형 작업이라 로드맵 후반/후속.

## 안전·계약 메모
- 계정/데이터 삭제는 되돌리기 불가 — 강한 확인 게이트(안전 규칙). 삭제 전 무엇이 지워지는지 명시.
- 온보딩 샘플 데이터는 사용자가 지울 수 있게(일반 투두/메모/페이지로 생성).
