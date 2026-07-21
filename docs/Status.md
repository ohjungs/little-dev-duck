# Status.md — 현재 Phase 진행 현황

현재 Phase: **4 완료(사용자 검증만 대기) → 5 T0/T1/T2/T3 완료, T4 인프라 블로커 전부 해소
(로그인 CSP 버그 2건·GITHUB_TOKEN 미등록·잔디 색·activity_daily 테이블 부재 모두 수정/적용),
남은 건 위젯 로그인으로 activity_daily에 실제 행이 쌓이는지 E2E 확인 1건뿐**
계획 문서: docs/plans/phase_01~03.md(완료), docs/plans/phase_04.md(구현 완료, T5 사용자 검증만 대기),
docs/plans/phase_05.md(T0/T1/T2/T3 완료 + 리뷰 HIGH 4건 수정 완료, T4 3항목 중 1항목 완료 + 실사용
중 발견한 로그인 차단 CSP 버그 2건 수정)
재개 방법: 새 대화에서 /next-step — Phase 5 T4 잔여 2항목(로그인 필요). `pnpm --filter desktop
tauri:dev`로 실제 앱 실행 → Google/GitHub 로그인(이전에는 CSP가 스크립트를 전부 막아 로그인
자체가 불가능했으나 2026-07-21 중 두 차례 수정·배포로 해결됨 — 상세는 docs/plans/phase_05.md T4
"실사용 중 발견 및 수정" 절 참조) → Supabase `activity_daily`에 오늘 날짜 `source=claude_code` 행이
생기는지 확인 → 웹에서도 같은 데이터 보이는지 확인.

**노션 격차 분석 지시서 작성 (2026-07-21)**: docs/plans/notion-gap-analysis-2026-07-21.md —
노션 2025 대비 26축 격차 매트릭스, 차별화 전략, 기술 부채 상환표(P0/P1/P2), 로드맵 정합 결정
(Phase 순서 유지, Phase 9 = "워크스페이스 코어" 재정의, 하드닝 Phase 신설 안 함). **Phase 6 착수
조건은 이 지시서 7절의 "Phase 6 전" P1 항목 전건**(Toast/Spinner, activity.ts 3건, Rust symlink,
커버리지 측정, SEC-04, Supabase keepalive) — phase_06.md 작성 시 서두에 반영할 것. 함께 적용된
P0 문서 수정: CLAUDE.md 불일치 정정(static export/Tauri Release/8절), DECISIONS.md 5절 재검토
기록(미배정 5건 회수), ARCHITECTURE.md 5절 blocks 검토 표기.

## Phase 5 블로커 — 전부 해소 (2026-07-21)

1. ~~Rust 툴체인 미설치~~ → **해소(2026-07-21)** — 사용자 요청으로 이 세션이 rustup + VS Build
   Tools 2022(C++ 워크로드) 설치 진행. 중간에 네트워크 단절로 멈췄다가 재시작, 강제종료 여파로
   Windows Installer 뮤텍스 충돌(에러 1618)이 났으나 재시도로 자연 해소(재부팅 불필요).
   `cargo new` + `cargo build`로 실제 MSVC 컴파일 성공까지 확인 — 툴체인 완전 동작 검증됨.
   (`vswhere`의 `isComplete`는 여전히 false로 나오나 실제 컴파일이 되므로 무시 가능 [추정: 상태
   캐시 갱신 지연].)
2. ~~아키텍처 결정 필요~~ → **해소(2026-07-20)** — 옵션 A(배포된 웹 URL을 Tauri WebView가 그대로
   로드) 확정, ARCHITECTURE.md 1절 + DECISIONS.md #9-11 갱신 완료.

**T3 완료(2026-07-21, `/loop` 자동 진행)**: `supabase/migrations/20260721000000_activity_daily.sql`
+ down 스크립트 추가. 실제 `supabase db push` 적용은 사용자 확인 후(supabase/README.md 참조).

**T1 완료(2026-07-21, `/next-step`)**: `apps/desktop` Tauri 2 스캐폴딩 — WebView가 Vercel 배포
URL을 로드(옵션 A), always-on-top 위젯 창(360x640), `cargo build` 전체 컴파일 성공. 상세와 판단
근거(패키지 스크립트명을 `tauri:build`로 바꿔 CI `pnpm build`와의 충돌을 피한 이유 포함)는
docs/plans/phase_05.md T1 절 참조. **빌드된 앱을 실행해 프로세스 생존은 확인했으나, 위젯 창이
실제로 화면에 렌더링되는지는 이 세션 환경에서 시각적으로 확인하지 못함** — 사용자가 직접
`pnpm --filter desktop tauri:dev`로 확인 권장.

**부수 발견 및 수정(Phase 5와 무관, T1 작업 중 발견)**: `apps/web`이 `zod`를 소스에서 직접 import
(`api/github/contributions/route.ts`, Phase 4)하면서도 `package.json`에 의존성으로 선언한 적이
없었다 — 그동안 `packages/core`를 통해 우연히 node_modules에서 해석되던 phantom dependency였다.
이번 세션의 `pnpm install`(desktop용 `@tauri-apps/cli` 추가)이 워크스페이스를 다시 링크하면서
그 우연한 해석이 깨져 루트 `pnpm build`가 실패하는 것을 발견 — `apps/web/package.json`에 `zod`를
명시적 의존성으로 추가해 해소, 재빌드로 확인. main에 이미 잠재해 있던 버그라 CI가 같은 이유로
아무 때나 깨질 수 있었던 상태였음.

**T2 완료(2026-07-21, `/next-step`)**: Rust `collect_claude_logs`(파일 내용은 안 읽고 mtime만으로
날짜 판정 — DECISIONS.md #9-2보다 보수적) + `collector://progress` 이벤트. Rust는 Supabase에 직접
접속하지 않고 로컬 집계만 반환 — 실제 업로드는 이미 로그인된 WebView 쪽에서 새로 만든
`packages/api`의 `upsertActivityDaily`가 수행(Rust 바이너리에 Supabase 자격 증명 불필요). 배포된
Vercel origin에는 `capabilities/remote.json` + `permissions/default.toml`로 `collect_claude_logs`
커맨드와 이벤트 리스닝만 최소 권한 부여. `apps/web`은 `window.__TAURI__`(withGlobalTauri) 존재
여부로 데스크톱 실행을 감지해 자동 동기화(`DesktopCollectorSync`, 브라우저에서는 no-op). 상세는
docs/plans/phase_05.md T2 절 참조. `cargo build` + 전체 `pnpm build`/`lint`/`test`(5/5, 9/9, 8/8)
통과 — **단, 실제 로그인 상태로 실행해 activity_daily에 데이터가 실제로 쌓이는지는 end-to-end로
확인 못함**(GUI 시각 확인 불가, T1과 동일 한계) — T4에서 사용자 확인 필요.

**T1/T2 code-reviewer + security-reviewer 병렬 리뷰 및 후속 수정(2026-07-21)**: T4 진행 전 방어적으로
실행. HIGH 4건 발견, 전부 이 세션에서 수정:
- (보안) `capabilities/remote.json`의 origin 스코핑이 옵션 A 구조(frontendDist=배포 URL)에서는
  Tauri가 이 origin을 "Local"로 판정해 사실상 무효라는 걸 설치된 tauri 크레이트 소스로 확인
  — 구조적 한계라 되돌리지 않고 DECISIONS.md #9-11 + phase_05.md에 정확히 기록
- (보안) `security.csp: null`도 원격 https 콘텐츠엔 무효, `apps/web`에 보안 헤더가 전혀 없던 것도
  함께 확인 — `apps/web/src/proxy.ts`에 CSP+5개 보안 헤더 추가(실제 응답에 반영되는지 curl로
  실측 확인, Next.js가 요청 헤더에도 CSP를 같이 실어야 최종 응답까지 전달한다는 함정도 실측으로 발견)
- (코드) Rust `collector/mod.rs`가 UTC 기준으로 날짜를 매겨 KST 자정 근처 작업이 하루 밀려
  집계되던 버그 — `time::UtcOffset::current_local_offset()`(실패 시 UTC 대체)로 수정
- (코드) Rust 쪽 단위 테스트 0건이던 것 — `session_date`/`find_session_files` 등 5개 테스트 추가,
  `cargo test` 통과
- MEDIUM/LOW(심볼릭 링크 미검증, `updated_at` 미갱신, 동기화 실패 무알림 등)는 이번 라운드에서
  고치지 않고 phase_05.md에 후속 과제로 남김(사용자에게 HIGH만 우선 처리하기로 확인받음)
- 수정 후 전체 `pnpm build`/`lint`/`test` 재실행 — 5/5, 9/9, 8/8 재확인

**T4 부분 검증(2026-07-21, `/next-step`)**: T1/T2가 이미 커밋(`d2f8f4c`)돼 있어 build/lint/test
전체 재확인(5/5, 9/9, 8/8) 후 `cargo test`(5/5)까지 통과 확인. 이어서 `pnpm --filter desktop
tauri:dev`로 위젯을 실제로 기동 — 이전 세션들이 "이 에이전트 세션엔 상호작용 가능한 desktop/window
station이 없을 가능성"이라 추정했던 것과 달리, 이 세션은 `SessionId=1`(Console,
`UserInteractive=True`)의 실제 인터랙티브 데스크톱에서 동작 중이었다. `Get-Process`로 창 핸들이
0이 아님(`4067222`), 타이틀 정상(`Little Dev Duck`), `Responding=True`, WebView2 자식 프로세스가
배포 URL을 DNS로 실제 조회한 기록까지 확인 — 위젯 창 렌더링 자체는 실측 검증됨. 픽셀 스크린샷은
백신이 PowerShell의 화면 캡처 패턴을 악성으로 오탐해 차단, 우회하지 않고 프로세스 레벨 증거로
갈음. 검증 후 프로세스 정리(`Stop-Process`)함. 나머지 T4 2항목(activity_daily 반영, 웹-위젯 데이터
일치)은 실제 Google/GitHub 로그인이 있어야 하는 영역이라 이 세션이 대신할 수 없음 — 사용자 검증
절차는 docs/plans/phase_05.md T4 절에 기록.

**참고**: 이 저장소에는 git worktree가 없어 다른 세션과 같은 폴더를 공유한다. 2026-07-20 21시경
gstack browse 데몬이 다른 프로세스와 락 경합을 일으켰고(무한 대기, 강제 해제하지 않음), 로컬 3000
포트도 "unknown process"가 점유 중이었음 — 다른 세션이 동시에 활성 상태였을 가능성이 높다
[추정, 실측 안 됨]. 이 세션은 Phase 3/4 관련 파일만 건드렸고 다른 세션의 산출물은 건드리지 않았다.

## Phase 2 — 투두 + 메모 위젯 — 완료 (2026-07-20)

- [x] T1 packages/api CRUD 계약 (listTodos/createTodo/updateTodo/deleteTodo, 메모 동일) — 13개 테스트 통과
- [x] T2 투두 위젯 (오늘 필터, 낙관적 업데이트, 빈/에러/로딩 상태) + 인라인 수정 기능(피드백 반영, 커밋 588ea4b)
- [x] T3 메모 위젯 — 스티커노트 방식으로 재설계(피드백 반영, 커밋 588ea4b), title 자동 유도로 저장 실패
      버그 해결
- [x] T4 홈 화면을 위젯 대시보드로 교체

배포: https://web-sepia-one-88.vercel.app. 실사용 중 발견된 버그(메모 저장 실패)와 그에 대한 수정
(커밋 588ea4b)으로 형식적 클릭 검증을 갈음, Phase 2 종결. 상세는 History.md 2026-07-20 16:34 기록.
추가로 zod datetime 스키마가 Postgres 타임스탬프 포맷을 거부하던 core 전역 버그도 이후 발견·수정됨
(커밋 41a9de7, Phase 특정 아님).

## Phase 3 — 오리 1단계 (GLB, 클릭 반응, 말풍선) — 완료 (2026-07-20)

- [x] T1 packages/mascot 패키지 신설(Duck 컴포넌트, 클릭 squish + 말풍선, code-reviewer HIGH 2건 수정)
- [x] T2 홈 화면 연결(next/dynamic ssr:false)
- [x] T3 검증 — build/lint/test 통과. 사용자 클릭 검증은 다른 세션에서 완료된 것으로 간주하고 종료
      처리(사용자 지시, 2026-07-20 21:56). 이 세션은 DETECT 리뷰만 별도 실행 —
      docs/reviews/2026-07-20-phase3.md(신규 이슈 없음).

model.glb 미확보로 도형 플레이스홀더로 구현(사용자 승인됨, DuckModel 부분만 교체하면 되도록 분리,
아직 미교체). 커밋 3b34286. 상세는 History.md 2026-07-20 20:00, 21:56 기록.

## Phase 4 — GitHub 커밋 잔디 — 구현 완료, 배포 후 사용자 검증 대기 (2026-07-20)

- [x] T1 packages/core `contributionDaySchema`/`contributionSummarySchema`
- [x] T2 packages/api `fetchGithubContributions` (GraphQL 클라이언트, 목 fetch로 5개 테스트)
- [x] T3 `GET /api/github/contributions` — 세션의 GitHub 로그인명은 `user.identities[].identity_data`
      에서만 읽음(코드리뷰에서 `user_metadata` 위조 가능성 HIGH 지적 받아 교체), 30분 TTL 캐시,
      서버 로깅, `force-dynamic` 명시
- [x] T4 `GithubContributionWidget` — 로딩/에러/미연동/잔디그리드 4상태, 홈 대시보드 연결
- [x] T5 검증 — code-reviewer + security-reviewer 병렬 리뷰(HIGH 1건·MEDIUM 3건 수정, MEDIUM 1건은
      의도적 보류 — apps/web에 vitest 인프라 없음), 전 패키지 build/lint/test 통과

상세는 docs/plans/phase_04.md, DECISIONS.md #9-3(스코프 조사 결과) 참조.

## Phase 4 검증 체크리스트 (배포 후 사용자 실행, docs/plans/phase_04.md T5)

1. Vercel 환경변수에 `GITHUB_TOKEN`(scope 없는 PAT) 등록되어 있는지 확인
2. GitHub 계정으로 로그인 → 홈 화면에 GitHub 잔디(컨트리뷰션 캘린더)가 표시되는지
3. Google 계정으로 로그인한 경우 "GitHub 계정으로 로그인하면..." 안내가 뜨는지(에러 아님)

## 그 외 진행 (Phase와 무관한 브랜딩 변경, 2026-07-20, 사용자 요청)

- 사이트 테마 accent 토큰을 올리브(#A99C65)에서 앤트로픽 스타일 오렌지(#D97757)로 변경
  (`packages/ui/src/tokens.ts`+`tokens.css`). WCAG AA 대비 재검증 통과(`tokens.test.ts` 8개 전부 통과,
  스냅샷 갱신). **오리 자체 렌더링 색상(CHARACTER.md 고정값)은 변경하지 않음** — DECISIONS.md 4절에
  분리 기록.
- 로그인 페이지(`/login`)에 사용자가 제공한 오리 로고 이미지 추가(`apps/web/public/duck-logo.png`,
  `next/image`로 렌더링). 브라우저 시각 확인은 gstack browse 데몬이 다른 세션과 락 경합으로 실패해
  못 함 — build만 통과 확인, **실제 렌더링 미검증**.

## 그 외 대기
- 별도 트랙: Meshy에서 model.glb 다운로드 — Phase 3은 이미 도형 플레이스홀더로 구현됐으므로, 받는 대로
  packages/mascot/src/Duck.tsx의 DuckModel 부분만 useGLTF 로드로 교체(재작업 없음, 커밋 3b34286에서
  분리해둔 지점)
- Sentry 연동 [미해결, 이월]
- **신규 기능 백로그 처리 완료 (2026-07-20)**: `docs/plans/2026-07-20-1st_Fut_list.md`(사용자 작성) 기반으로
  `docs/FEATURES.md`(146개 항목), `docs/CONSTRAINTS_FREE_TIER.md`, `docs/ARCHITECTURE_DIAGRAMS.md`,
  `docs/plans/phase-mapping-proposal-2026-07-20.md`(85개 항목 → Phase 매핑, **사용자 승인 완료**)를 생성.
  로드맵에 Phase 15(뉴스 브리핑)/16·17(픽셀 오리 오피스) 신규 추가(docs/ARCHITECTURE.md 6절 갱신).
  상세 Task 분해 초안 `docs/plans/phase_15.md`, `phase_16.md`, `phase_17.md`도 작성 완료 — 단, 각 Task
  분해 자체의 착수는 **별도 승인 필요**(각 문서 "착수 조건" 참조), 그리고 로드맵상 Phase 3~14가
  먼저 진행돼야 순서가 온다. Phase 2 진행분에는 아무 항목도 추가하지 않음(검증 완료).
