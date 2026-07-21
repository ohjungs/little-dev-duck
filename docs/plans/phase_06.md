# Phase 6 — 오리 2단계 (상태 반응 · 자율 행동 · 활보 모드) — 초안

작성 2026-07-21, Phase 5 종료 직후 `/next-step`의 "다음 Phase 계획 초안" 단계로 생성.
**이 문서는 초안이다. T1 이하 구현 착수는 아래 "착수 조건"을 전부 통과한 뒤 별도 승인이 필요하다.**
로드맵 정의(docs/ARCHITECTURE.md 6절): Phase 6 = 오리가 데이터 상태에 반응하고, 자율적으로
행동하며, 바탕화면을 활보하는 단계.

## 착수 조건 — T0. Phase 6 전 P1 하드닝 (직렬, 구현 전 필수)

출처: docs/plans/notion-gap-analysis-2026-07-21.md 7절 기술 부채 상환표의 "Phase 6 전" P1 항목.
Phase 5 종료 시점 상태를 함께 표기한다.

- [x] **upsertActivityDaily 입력 zod 검증 · count 상한 · updated_at 미갱신** (한 커밋) — **완료
  (2026-07-21)**. `updated_at`은 Phase 5 종료 리뷰(REF-M2)에서 수정, 입력단
  `activityDailyEntrySchema.parse` 검증 + core 스키마에 `count` 상한(`ACTIVITY_COUNT_MAX=100000`,
  `.max()`) 추가 + 상한 초과 거부 테스트.
- [x] **동기화 실패 무알림 → Toast/Spinner 도입** — **완료(2026-07-21)**. `packages/ui`에 `Toast`
  (자기소멸, 전역 프로바이더 없이 부모가 상태 소유)·`Spinner`(keyframes 자체 렌더) 추가,
  `DesktopCollectorSync`의 동기화 실패를 console.error 대신 Toast로 노출, 위젯 3개(투두/메모/잔디)의
  로딩 텍스트를 Spinner로 통일.
- [x] **Rust symlink 미검증** (`find_session_files`) — **완료(2026-07-21)**. `fs::symlink_metadata`로
  심링크/정션 디렉터리를 걸러 ~/.claude/projects 밖을 집계에 섞지 않도록 함. `cargo test` 통과.
- [x] **커버리지 측정 도입** — **완료(2026-07-21)**. `@vitest/coverage-v8` + 루트 `vitest.coverage.config.ts`
  (자동 탐색 안 되는 이름이라 패키지별 격리 유지) + `pnpm coverage` 스크립트. 전 패키지 통합
  74 tests, 91.56% stmts / 100% lines. `pnpm test` 8/8 격리 재확인.
- [x] **SEC-04: auth callback `next` 파라미터 `/` 시작 검증** — **완료(2026-07-21)**.
  `apps/web/src/app/auth/callback/route.ts`에서 `next`가 `/`로 시작하되 `//`/`/\`(프로토콜 상대 URL)는
  배제하도록 검증, 아니면 `/`로 폴백. open redirect 방어.
- [x] **Supabase 7일 pause 방지 keepalive** — **완료(2026-07-21)**. GitHub Actions 대신 **Vercel Cron**
  으로 구현(새 시크릿 불필요 — anon 키가 이미 Vercel env에 있음). `apps/web/vercel.json`에 일일 cron
  (`0 6 * * *`) → `/api/keepalive`가 anon 키로 가벼운 read 요청으로 DB를 깨움. `proxy.ts` PUBLIC_PATHS에
  추가. CRON_SECRET 설정 시 자동 하드닝. (참고: Vercel 프로젝트 root directory가 `apps/web`이라는 전제
  하에 vercel.json을 거기 뒀다 — 배포 후 Vercel 대시보드 Cron 탭에서 등록 여부 확인 권장.)

**게이트 규칙**: 위 6항목을 완료하고 build/lint/test + cargo test/clippy가
통과해야 T1 착수. **→ 2026-07-21 전부 완료, T1 착수 조건 충족.** 잔여 REF-LOW(DST 경계, 언더카운트 로깅, serde_json 정리, LoginForm 에러 UI,
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
