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

## 계약 잠금 결정 (2026-07-21, 사용자 승인)

착수 게이트에서 아래를 판정·잠금했다(CLAUDE.md 3-3).

- **상태 반응 저장 방식 = 클라이언트 파생 (DB 없음).** 사용자 승인. 근거: T1 입력(오늘 투두
  완료·커밋 잔디·미동기화)이 이미 전부 클라이언트에 로드돼 있고 mood는 재계산 가능한 파생값이라,
  DB에 저장하면 중복 상태가 된다(coding-style "파생하라, 중복 저장 말라"). duck_state 테이블은
  Phase 7(게임화 XP/feed/costume)용으로 그대로 보존.
- `packages/core`: `DuckMood`(`"happy" | "sad" | "neutral"`) + 순수함수 `deriveDuckMood` +
  `daysSinceLastCommit`로 확정(`domain/duck-mood.ts`). mood는 데이터 반응만 담고, 유휴(idle)는
  T2에서 별도 애니메이션 레이어로 분리(관심사 분리).
- `packages/mascot`: `Duck`에 `mood?: DuckMood` prop 추가(하위호환, 기본 neutral). 몸통 색은
  캐릭터 바이블 고정값이라 건드리지 않고(DECISIONS.md 4절) 자세(높이/기울기/흔들림)로만 기분 표현.
  model.glb 미확보 도형 플레이스홀더 상태는 유지(받는 대로 DuckModel만 교체).

## Task 구현 완료 (2026-07-21, `/loop /next-step` 자율 진행)

- [x] **T1. 오리 상태 반응** — 클라이언트 파생. `deriveDuckMood`(core, 순수함수)가 오늘 투두 완료·
  커밋 잔디에서 mood(happy/sad/neutral)를 도출. mascot `Duck`이 mood별 자세(높이/기울기/흔들림
  진폭·속도)로 반응, 접근성용 `aria-label`("오리 상태: …") 부여. 배선: `TodoWidget`이 오늘 투두
  집계를 네이티브 CustomEvent(`ldd:todos-changed`, `lib/todoSignal.ts`)로 발행 → `useDuckMood` 훅이
  구독(스토어 라이브러리 없이 platform-native pub/sub, 중복 조회 없음). 커밋 잔디는 기존 API를
  마운트+창 포커스 복귀 시 조회. `DuckWidget`이 mood를 `<Duck>`에 주입.
- [x] **T2. 자율 행동** — 지속 idle 모션은 `useFrame`의 mood별 bob으로 상시 동작. 유휴 12~24초마다
  스스로 혼잣말: mascot `phrases.ts`에 mood별 `IDLE_PHRASES` + `pickIdlePhrase` 추가, `Duck`이
  마지막 상호작용 이후 유휴 판정되면 말풍선을 띄운다(클릭 시 타이머 리셋). Phase 8 AI 이전이라
  전부 룰 기반. reduced-motion 시 흔들림은 끄되 mood 정적 자세와 텍스트 대사는 유지(접근성).
- [x] **T3. 활보 모드 (데스크톱 전용)** — Tauri 두 번째 창 `walker`(투명·데코 없음·always-on-top·
  maximized·skipTaskbar·기본 숨김)를 tauri.conf.json에 선언. Rust `walker::set_walking_mode` 커맨드가
  창 표시/숨김 + `set_ignore_cursor_events(true)`로 클릭 통과 설정(옵션 A에서 JS 권한 스코핑이 무효라
  신뢰 경계 안쪽 Rust에서 건다). 웹은 `/walker` 라우트(투명 배경 + CSS 걷기 애니메이션, reduced-motion
  시 정지, `proxy.ts` 공개 경로)를 walker 창이 로드. 대시보드에 데스크톱 전용 `WalkingModeToggle`
  버튼(Tauri 감지 시에만 렌더, `set_walking_mode` invoke). 권한: `permissions/default.toml` +
  `capabilities/remote.json`에 `allow-set-walking-mode` 추가(walker 창 자체는 커맨드를 안 부르므로
  무권한 유지).

## T4 검증 상태

- **머신 검증(이 세션 완료)**: core 48 tests, mascot 5 tests GREEN(신규 mood/idle 테스트 포함).
  mascot 타입체크·apps/web lint·apps/web next build(/walker 라우트 정상) 통과. Rust cargo
  fmt/clippy(경고 0)/test 6/6 + Tauri 설정 스키마 검증(빌드시).
- **리뷰(code-reviewer + security-reviewer 병렬, 2026-07-21)**: 배포 차단 0건. security = SEC-
  CRITICAL/HIGH/MEDIUM 0, SEC-LOW 2. code = CRITICAL 0/HIGH 1/MEDIUM 2/LOW 3. **커밋 전 반영**:
  (HIGH) useDuckMood fetch stale-response 경쟁 → requestId 가드. (MED) todoSignal 마운트 순서
  의존 → 모듈 스코프 last-value replay. (MED) "오늘" 날짜 3중 중복·UTC → 공용 로컬 `lib/today.ts`.
  (SEC-LOW) walker.rs 에러 노출 → `log::warn!` + 일반 메시지. (SEC-LOW) proxy PUBLIC_PATHS
  startsWith → 경계 검사. (LOW) WalkerScene 고정 mood 사유 주석·remote.json description 갱신.
  남긴 것: apps/web 컴포넌트 테스트 부재(선재 관례, 순수 로직은 core/mascot에서 테스트됨).
- **사용자 실기 검증 필요(이 세션 대행 불가, Phase 5 T4와 동일 한계)**:
  1. 상태 반응: 오늘 마감 투두를 만들고 전부 체크 → 오리가 기뻐하는(happy) 자세로 바뀌는지.
     며칠 커밋이 없는 계정에서 시무룩(sad) 자세인지. (mood는 파생값이라 데이터가 있어야 관찰됨)
  2. 자율 행동: 20초 내외 방치 시 오리가 스스로 말풍선을 띄우는지. reduced-motion을 켜면
     흔들림이 멎는지.
  3. 활보 모드: `/walker`는 **배포 후에야** 데스크톱 창이 로드할 수 있다(옵션 A). 배포 뒤
     위젯에서 "바탕화면 활보" 클릭 → 투명 오버레이 오리가 바탕화면을 걷고, 그 위/아래 클릭이
     통과되는지(뒤 창이 그대로 눌리는지) 확인. 다시 클릭해 "활보 멈추기"로 숨는지.
  - 참고: 이 세션 환경에서 투명 창 픽셀 렌더는 확인 불가(Phase 5 T4처럼 프로세스/설정 수준까지만).

## 하지 않는 것 (현재 판단, 착수 게이트에서 재확인)

- 오리와의 자연어 대화 — Phase 8(AI 1단계) 스코프.
- 게임화(XP/먹이/코스튬), duck_state 테이블 채우기 — Phase 7 스코프.
- 3D model.glb 자체 제작 — 별도 트랙(Meshy 다운로드 대기), 받는 대로 DuckModel 교체.
