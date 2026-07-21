# Phase 6 — 오리 2단계 (상태 반응 · 자율 행동 · 활보 모드) — 초안

작성 2026-07-21, Phase 5 종료 직후 `/next-step`의 "다음 Phase 계획 초안" 단계로 생성.
**이 문서는 초안이다. T1 이하 구현 착수는 아래 "착수 조건"을 전부 통과한 뒤 별도 승인이 필요하다.**
로드맵 정의(docs/ARCHITECTURE.md 6절): Phase 6 = 오리가 데이터 상태에 반응하고, 자율적으로
행동하며, 바탕화면을 활보하는 단계.

## 착수 조건 — T0. Phase 6 전 P1 하드닝 (직렬, 구현 전 필수)

출처: docs/plans/notion-gap-analysis-2026-07-21.md 7절 기술 부채 상환표의 "Phase 6 전" P1 항목.
Phase 5 종료 시점 상태를 함께 표기한다.

- [~] **upsertActivityDaily 입력 zod 검증 · count 상한 · updated_at 미갱신** (한 커밋) —
  `updated_at`은 Phase 5 종료 리뷰(REF-M2)에서 **이미 수정됨**(rows에 `updated_at` 세팅).
  남은 것: 입력단 `activityDailyEntrySchema` 검증 + `count` 상한(core 스키마에 `.max()` 추가).
- [ ] **동기화 실패 무알림 → Toast/Spinner 도입** — `apps/web`에 Toast + Spinner/Skeleton 공용
  컴포넌트를 만들고(`packages/ui`), `DesktopCollectorSync`의 동기화 실패와 위젯 3개(투두/메모/잔디)의
  로딩·에러 상태를 이걸로 통일. notion-gap 6절 참조.
- [ ] **Rust symlink 미검증** (`find_session_files`) — `fs::symlink_metadata`로 심링크/정션
  디렉터리를 건너뛰거나 canonicalize 후 projects 루트 prefix 검증(리뷰 REF-LOW, 누출은 카운트뿐이라
  우선순위 낮음이나 P1 게이트 항목).
- [ ] **커버리지 측정 도입** — `@vitest/coverage-v8` + 루트 공용 `vitest.config` 1개. 현재 각 패키지가
  개별 vitest를 돌려 전체 커버리지 수치가 없다. notion-gap 6.1절.
- [ ] **SEC-04: auth callback `next` 파라미터 `/` 시작 검증** (1줄) —
  `apps/web/src/app/auth/callback/route.ts`. open redirect 방어. Phase 1 리뷰(docs/reviews/2026-07-20.md)
  에서 DEFER된 항목.
- [ ] **Supabase 7일 pause 방지 keepalive** (15분 작업) — 무료 티어는 7일 무활동 시 프로젝트가
  일시정지된다. 주기적 no-op 쿼리 워크플로. docs/CONSTRAINTS_FREE_TIER.md 1절. **주의**:
  `.github/workflows/*`는 과거 다른 세션이 다루던 파일 — 충돌 확인 후 진행.

**게이트 규칙**: 위 6항목(첫 항목의 잔여분 포함)을 완료하고 build/lint/test + cargo test/clippy가
통과해야 T1 착수. 잔여 REF-LOW(DST 경계, 언더카운트 로깅, serde_json 정리, LoginForm 에러 UI,
잔디 접근성 등, docs/reviews/2026-07-21-phase5.md "REF-LOW" 절)는 이 게이트의 필수는 아니며 여유 시
함께 정리.

## 계약 잠금 대상 (병렬 착수 전 확정 필요)

Phase 6 구현을 병렬로 나누기 전에 아래 계약을 먼저 잠근다(CLAUDE.md 3-3):

- `packages/core`: 오리 상태 도메인 모델(예: `DuckMood`/`DuckActivity` — 데이터 상태 → 오리 반응
  매핑). duck_state 테이블은 Phase 7(게임화)에서 채우기로 돼 있으니, Phase 6의 상태 반응이 DB를
  요구하는지 vs 클라이언트 파생으로 충분한지 착수 게이트에서 판정.
- `packages/mascot`: 오리 애니메이션 상태 인터페이스(현재 클릭 squish + 말풍선만 있음 —
  상태별 표정/모션 확장 지점). model.glb 미확보로 도형 플레이스홀더 상태(커밋 3b34286)라,
  실제 3D 모델 교체와 Phase 6 모션이 어떻게 맞물리는지 확인.

## Task 초안 (착수 조건 통과 + 승인 후 확정)

- **T1. 오리 상태 반응**: 투두 완료율/커밋 잔디/미동기화 등 데이터 상태를 오리 표정·모션에 반영.
  (예: 오늘 투두 다 끝내면 기뻐함, 며칠 커밋 없으면 시무룩)
- **T2. 자율 행동**: 유휴 시 오리가 주기적으로 스스로 움직이는 루프(idle 애니메이션, 말풍선 랜덤
  코멘트 — Phase 8 AI 이전이라 룰 기반 대사).
- **T3. 활보 모드 (데스크톱 전용)**: Tauri 투명 창 + 클릭 통과(click-through)로 바탕화면을 돌아다니는
  오리. Phase 5에서 YAGNI로 제외했던 항목(phase_05.md "하지 않는 것"). 창 투명/always-on-top/
  마우스 이벤트 통과 등 Tauri 윈도우 설정 조사 필요.
- **T4. 검증**: 상태 반응 시나리오별 확인, 활보 모드 실제 데스크톱 렌더링(Phase 5 T4처럼 사용자
  검증 병행).

## 하지 않는 것 (현재 판단, 착수 게이트에서 재확인)

- 오리와의 자연어 대화 — Phase 8(AI 1단계) 스코프.
- 게임화(XP/먹이/코스튬), duck_state 테이블 채우기 — Phase 7 스코프.
- 3D model.glb 자체 제작 — 별도 트랙(Meshy 다운로드 대기), 받는 대로 DuckModel 교체.
