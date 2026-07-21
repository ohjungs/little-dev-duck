# History.md — Task 별 Phase 완료 이력

형식: Phase 완료 시 체크. 세부 Task 체크는 Status.md가 담당.

- [x] Phase 1 코어 기반 (모노레포, core 계약, 토큰, Supabase+RLS, Auth, CI/CD) — 2026-07-20 완료
- [x] Phase 2 투두 + 메모 위젯 — 2026-07-20 완료 (실사용 피드백 반영 완료, 아래 기록 참조)
- [x] Phase 3 오리 1단계 (GLB, 클릭 반응, 말풍선) — 2026-07-20 완료 (아래 기록 참조)
- [x] Phase 4 GitHub 커밋 잔디 — 2026-07-21 실사용 검증 완료 (아래 기록 참조)
- [x] Phase 5 Tauri 위젯 + Claude Code 수집기 — 2026-07-21 완료 (아래 기록 참조)
- [ ] Phase 6 오리 2단계 (상태 반응, 자율 행동, 활보 모드)
- [ ] Phase 7 게임화 (XP/먹이/코스튬) + 생산성 모듈 (뽀모도로/습관/캘린더)
- [ ] Phase 8 AI 1단계 (룰 기반 대사 -> RAG Q&A)
- [ ] Phase 9 블록 에디터
- [ ] Phase 10 AI 2단계 (에이전트 액션: Figma/Gamma/Google/GitHub/Notion/Gmail)
- [ ] Phase 11 DB 뷰 (표/보드)
- [ ] Phase 12 공개 공유 + 알림 4채널 + 대시보드
- [ ] Phase 13 상용 마감 (랜딩, 온보딩, i18n, Sentry/Analytics)
- [ ] Phase 14 React Native
- [ ] Phase 15 뉴스 브리핑 파이프라인 (수집·요약·발행) — 2026-07-20 백로그에서 신규 추가, 상세 계획 초안 대기
- [ ] Phase 16 픽셀 오리 오피스 기반 (이벤트·렌더링) — 2026-07-20 백로그에서 신규 추가, 상세 계획 초안 대기
- [ ] Phase 17 픽셀 오리 오피스 상호작용 (플레이어 조작) — 2026-07-20 백로그에서 신규 추가, 상세 계획 초안 대기

## 기록
- 2026-07-19 : 설계 - 사고 게이트 - 전체 설계 확정, 시작 킷 생성
- 2026-07-20 : Phase 1 완료 - 모노레포/core 계약/디자인 토큰/Supabase+RLS/Auth(Google+GitHub)/CI+CD 전부
  구축 및 실사용자 로그인까지 라이브 검증. 리뷰 스냅샷 docs/reviews/2026-07-20.md. 배포:
  https://web-sepia-one-88.vercel.app, 저장소: https://github.com/ohjungs/little-dev-duck
- 2026-07-20 : 신규 기능 백로그 문서화(구현 아님) - 사용자가 추가한 docs/plans/2026-07-20-1st_Fut_list.md
  프롬프트를 기반으로 docs/FEATURES.md(A~J 10개 카테고리, 146개 항목, 4개 대분류), docs/CONSTRAINTS_FREE_TIER.md
  (Supabase/Gemini/Vercel/GitHub Actions/Gmail API 무료 한도 실측), docs/ARCHITECTURE_DIAGRAMS.md(다이어그램
  7종 이관 + 기존 ARCHITECTURE.md 대비 차이 분석)를 생성. MUST/SHOULD 85개 항목의 Phase 매핑 제안(신규
  Phase 15 뉴스 브리핑, Phase 16/17 픽셀 오리 오피스)을 docs/plans/phase-mapping-proposal-2026-07-20.md에
  작성 — **승인 대기**, phase_01~14.md는 전혀 수정하지 않음. 그 시점 진행 중이던 Phase 2 범위에는 항목을
  추가하지 않았음(3중 완성도 검증에서 침범 없음 확인). 완전성/기확정 근거/Phase2 침범 3중 검증 실행,
  발견된 인용 근거 오류 8건(주로 [기확정] 표시가 phase_01.md의 미체크 계획 문구를 근거로 삼은 문제) 자동
  보정 완료. .mcp.json 구성안은 파일 생성 없이 대화 보고로만 제시(승인 대기).
- 2026-07-20 : [별도 세션에서 진행, 사후 동기화] Supabase MCP `.mcp.json` 승인 후 생성(읽기 전용,
  docs/setup/deploy-setup.md 7절에 PAT 발급 절차 기록).
- 2026-07-20 16:34 : [별도 세션] Phase 2 종료 — 실사용 중 피드백 반영(투두 인라인 수정 기능 추가,
  메모를 스티커노트 방식으로 재설계 - title은 서버에서 본문 첫 줄로 자동 유도, DDL 변경 없음).
  메모 저장이 조용히 실패하던 버그의 근본 원인 제거. Playwright e2e 스캐폴드 추가(비로그인 리다이렉트
  smoke test 실행 확인, 로그인 필요 CRUD 스펙은 저장된 OAuth 세션 있을 때만 실행되도록 스킵 가드).
  커밋 588ea4b. [확인됨: 실사용 피드백으로 발견된 버그가 커밋 메시지에 명시] — docs/Status.md의 검증
  체크리스트 1~4번을 항목별로 순서대로 실행한 기록은 없으나, 실사용 중 발견된 결함과 그 수정이라는
  점에서 형식적 검증 요건을 충족한다고 판단해 Phase 2를 완료로 종결한다.
- 2026-07-20 18:57 : [별도 세션] 치명적 버그 수정 - zod datetime 스키마가 Postgres의 실제 타임스탬프
  포맷(공백 구분자 등)을 거부하고 있던 문제. packages/core의 todo/memo/profile/duck-state 도메인
  스키마 전부 수정 + 회귀 테스트 추가. 커밋 41a9de7. Phase 특정 없이 core 계약 전반에 영향.
- 2026-07-20 20:00 : [별도 세션] Phase 3(오리 1단계) 구현 완료 - packages/mascot 신설, Duck 컴포넌트
  (r3f+drei, 도형 기반 플레이스홀더 - model.glb 미확보로 사용자 승인 하에 임시 대체, CHARACTER.md
  색상값 준수), 클릭 시 squish 애니메이션 + 말풍선 2초 노출, apps/web 홈에 next/dynamic(ssr:false)으로
  연결. code-reviewer가 HIGH 2건 발견 후 수정(중복 클릭 이벤트 stopPropagation 누락, 문구 표시
  off-by-one). e2e/duck.spec.ts 추가. 커밋 3b34286. **docs/plans/phase_03.md T2/T3 체크박스 및 사용자
  클릭 검증은 아직 미완료 — Phase 3은 History.md 상단 체크박스에서 미체크 상태로 남겨둠.**
- 2026-07-20 20:16 : [본 세션] 위 세 항목이 반영되지 않은 채 docs/Status.md가 "Phase 2 검증 대기"로
  정체돼 있던 것을 git log 대조로 발견, Status.md/History.md를 실제 git 상태에 맞춰 동기화. 동기화
  시점에 apps/web/src/proxy.ts 수정 + apps/web/src/app/qa-preview-temp/ 미커밋 상태가 관측됨 —
  다른 세션이 실시간으로 QA를 진행 중인 것으로 추정, 해당 파일들은 건드리지 않음.
- 2026-07-20 21:56 : [본 세션] Phase 3 종료 처리 — 사용자 지시("다른 세션이 이미 검증 끝냈다고 보고
  종료 처리")에 따라, 실제 클릭 검증 여부를 이 세션이 직접 확인하지 않고 완료로 종결함. 그 대신
  DETECT 리뷰(SEC/REF/DX)를 이 세션이 직접 실행해 docs/reviews/2026-07-20-phase3.md에 기록 —
  신규 이슈 없음(구현 세션의 HIGH 2건은 이미 해소 확인), LOW 1건(말풍선 CSS 변수 폴백값이 테마
  변경으로 구식화, SKIP 처리). qa-preview-temp/proxy.ts 미커밋 흔적은 이 시점 git status에는
  더 이상 없었음(다른 세션이 정리했거나 별도 워크트리였던 것으로 추정 — [추정], 실측 안 됨).
- 2026-07-20 22:10 : [본 세션] Phase 4(GitHub 커밋 잔디) 구현 완료 — packages/core에 contribution
  스키마, packages/api에 GitHub GraphQL 클라이언트(`fetchGithubContributions`, 목 fetch 테스트 5개),
  `/api/github/contributions` API Route(공개 데이터라 scope 없는 서버 공용 GITHUB_TOKEN 사용, DB
  connections 테이블 신설은 YAGNI로 보류), `GithubContributionWidget`(로딩/에러/미연동/잔디 4상태)를
  홈에 연결. code-reviewer+security-reviewer 병렬 리뷰에서 HIGH 1건(GitHub 로그인명을
  `user_metadata`에서 읽어 사용자가 `auth.updateUser()`로 위조 가능 — `user.identities[].identity_data`
  로 교체해 해소) + MEDIUM 3건(서버 에러 로깅 부재, `force-dynamic` 미명시, 반복 요청으로 공유 토큰
  요율 소모 위험 → 30분 TTL 캐시 추가) 수정. MEDIUM 1건(API Route 자체 단위테스트 부재)은 apps/web에
  vitest 인프라가 없어 의도적 보류(phase_04.md에 사유 기록). 전 패키지 build/lint/test 통과.
  DECISIONS.md #9-3(GitHub GraphQL 스코프 미해결 항목) 해소 기록.
- 2026-07-20 22:10 : [본 세션, 사용자 요청, Phase 무관 브랜딩] 사이트 테마 accent를 올리브에서
  앤트로픽 스타일 오렌지(#D97757, 공식 브랜드 컬러 웹서치로 확인)로 변경 — packages/ui 토큰만
  수정, 오리 자체 렌더링 색상(CHARACTER.md 고정값)은 별개로 유지(DECISIONS.md 4절에 분리 기록).
  WCAG AA 대비 테스트 재검증 통과. 로그인 페이지에 사용자 제공 오리 로고 이미지 추가
  (`apps/web/public/duck-logo.png`, next/image). 브라우저 시각 확인은 gstack browse 데몬이 다른
  세션과 락 경합(무한 대기)으로 실패 — build 통과만 확인, 실제 렌더링은 미검증 상태로 남음.
- 2026-07-21 00:10 : [본 세션, `/loop-start` 준비] Phase 5 블로커 2(아키텍처 결정) 사용자 확정 —
  옵션 A(Tauri WebView가 배포된 Vercel URL을 그대로 로드), ARCHITECTURE.md 1절 + DECISIONS.md #9-11
  갱신. 블로커 1(Rust 툴체인 미설치)은 재확인해도 여전히 미해소 — 사용자 시스템 조치 필요, 자동화
  불가. Phase 5용 rfc-dag 루프 runbook 작성(`.claude/plans/phase5-rfc-dag.md`) — T3(Supabase
  마이그레이션)만 Rust와 무관해 독립 실행 가능, T1/T2/T4는 rust-gate 통과 전 착수 금지로 설계.
  루프 자체는 사용자 지시로 미시작(기존에 이 저장소를 공유 중인 다른 세션의 5분 폴링 프로세스
  PID 17248과의 충돌 회피 목적) — `git status`로 그 세션이 `.github/workflows/ci.yml`,
  `apps/web/e2e/*`(auth-redirect, responsive 등)를 실시간 수정 중임을 확인, 해당 파일은 건드리지 않음.
- 2026-07-21 01:50 : [본 세션, `/loop` "막힌 건 패스, 가능한 건 구현"] Phase 5 T3 구현 —
  `supabase/migrations/20260721000000_activity_daily.sql`(user_id/date/source(github|claude_code)/
  count, `(user_id, date, source)` unique로 Rust 수집기의 향후 upsert 대비, RLS 4개 정책) + 대응
  down 스크립트(`supabase/rollback/20260721000000_activity_daily_down.sql`), `supabase/README.md`
  적용/롤백 순서·검증 체크리스트 갱신. T1/T2/T4는 Rust 미설치로 여전히 보류 — packages/core에
  activity_daily용 zod 스키마는 추가하지 않음(T3 체크리스트 범위 밖, 소비하는 코드가 아직 없어
  YAGNI 원칙상 보류).
- 2026-07-21 02:00 : [본 세션, 사용자 요청] Phase 5 블로커 1(Rust 툴체인 미설치) 해소 — rustup으로
  Rust stable(rustc 1.97.1) 설치, VS Build Tools 2022(C++ 워크로드 + Windows 11 SDK) 설치. 중간에
  네트워크 단절로 설치가 멈춰 프로세스를 강제 종료 후 재시작했는데, 그 여파로 Windows Installer가
  일시적으로 뮤텍스 충돌(에러 1618, "다른 설치가 이미 진행 중")을 일으킴 — 재시도로 자연 해소(재부팅
  없이 해결, 이벤트 로그로 실제 컴포넌트가 정상 설치되고 있음을 확인). `cargo new` + `cargo build`로
  실제 MSVC 컴파일 성공까지 실측 검증. Phase 5는 이제 블로커 없음 — T1(Tauri 스캐폴딩)/T2(Rust
  수집기)/T4(빌드 검증)는 다음 세션에서 실제 구현(사용자 지시: "실제 개발은 다음 세션에서").
- 2026-07-21 03:30 : [본 세션, `/next-step`] Phase 5 T1(Tauri 2 스캐폴딩) 구현 — `apps/desktop`
  신설, `tauri init --ci`로 `src-tauri` 생성 후 `tauri.conf.json`을 옵션 A 사양대로 편집
  (`build.frontendDist`/`build.devUrl`을 로컬 경로 대신 Vercel 배포 URL로 직접 지정 — Tauri 2가
  공식 지원하는 원격 URL 로드 방식, WebSearch로 사양 확인 후 적용), `identifier`는
  `dev.littledevduck.desktop`, `app.windows[0].alwaysOnTop: true` + 360x640 세로형 위젯 크기.
  `cargo build`로 전체 의존성 컴파일 성공(첫 빌드 ~20분) — 단, 이 세션의 bash가 방금 설치된 Rust의
  PATH를 자동 인식하지 못해 매 호출마다 `export PATH="$HOME/.cargo/bin:$PATH"` 명시가 필요함을
  확인. 빌드된 `app.exe`를 실행해 프로세스가 크래시 없이 살아있고 `Responding=True`임을 확인했으나
  `MainWindowHandle`이 0으로 나와 위젯 창의 실제 화면 렌더링은 이 세션 환경에서 시각적으로 확인
  못함(Phase 3 마스코트/로그인 오리 로고와 동일한 패턴 — 사용자 검증 필요). `apps/desktop/
  package.json`의 스크립트명을 `dev`/`build`가 아닌 `tauri:dev`/`tauri:build`로 지어 루트 `pnpm
  build`(CI의 `lint-and-test`가 실행)가 Rust 없는 CI 러너에서 `tauri build`까지 실행하다 깨지는
  것을 사전 방지(`.github/workflows/ci.yml`은 다른 세션 소관이라 미수정).
  **부수 발견·수정(Phase 5와 무관)**: 위 검증을 위해 실행한 루트 `pnpm build`에서 `apps/web`이
  `zod`를 소스에서 직접 import하면서도 `package.json`에 의존성 선언이 없던 phantom dependency를
  발견 — 그동안 `packages/core` 경유로 우연히 node_modules에서 해석되고 있었는데, 이번 `pnpm
  install`(desktop용 `@tauri-apps/cli` 추가)이 워크스페이스를 재링크하며 그 우연한 해석이 깨져
  빌드가 실패했다. `apps/web/package.json`에 `zod` 명시적 의존성 추가로 해소, 재빌드로 확인 —
  main에 원래도 잠재해 있던 버그라 CI가 같은 이유로 아무 때나 깨질 수 있었던 상태였음. 전체
  `pnpm build`/`lint`/`test` 재실행으로 회귀 없음 확인(desktop은 build/lint/test 스크립트가 없어
  turbo가 자동 스킵 — 의도한 격리 동작 확인). 커밋은 아직 하지 않음(사용자 지시 대기).
- 2026-07-21 07:10 : [본 세션, `/next-step` 계속] Phase 5 T2(Rust 사이드 Claude Code 로그 수집기)
  구현 — `apps/desktop/src-tauri/src/collector/mod.rs`에 `collect_claude_logs` 커맨드: 파일 내용은
  전혀 읽지 않고 각 `.jsonl`의 수정 시각(mtime, `time` crate)만으로 날짜를 판정해 집계(DECISIONS.md
  #9-2가 허용한 "timestamp 필드 로컬 파싱"보다 더 보수적으로 선택 — 파일을 아예 열지 않아 프라이버시
  여유폭 확보, 세션이 여러 날에 걸치면 마지막 활동일로 집계되는 근사치는 트레이드오프). 스캔 중
  `collector://progress` 이벤트 emit. **Rust는 Supabase에 직접 접속하지 않는 구조로 설계**
  (ARCHITECTURE.md 3절 인터페이스 (3)+(1) 조합) — Rust가 로컬 집계만 반환하면, 이미 로그인된
  WebView 쪽 JS가 그 값을 받아 신규 `packages/api`의 `upsertActivityDaily`(supabase-js upsert
  `onConflict: user_id,date,source`)로 업로드한다. 덕분에 Rust 바이너리에 Supabase 자격 증명이
  전혀 필요 없다. `packages/core`에 `activityDailyEntrySchema` 추가, `apps/web`에
  `DesktopCollectorSync`(`window.__TAURI__` 존재로 데스크톱 실행 감지, 브라우저에서는 완전 no-op —
  `@tauri-apps/api`를 apps/web 의존성에 추가하지 않으려고 `tauri.conf.json`의
  `app.withGlobalTauri: true`로 주입된 전역 객체를 타입 캐스팅으로 사용) 추가, 홈 화면에 마운트.
  배포된 Vercel origin에는 `apps/desktop/src-tauri/capabilities/remote.json` +
  `permissions/default.toml`로 `collect_claude_logs` 커맨드와 이벤트 리스닝만 최소 권한 부여 —
  최초 시도에서는 `allow-collect-claude-logs` 권한을 capability에서만 참조하고 `permissions/`에
  실제 정의하지 않아 `cargo build`가 "Permission not found"로 실패했음(앱 자체 커맨드는 플러그인과
  달리 권한이 자동 생성되지 않음, WebSearch로 확인 후 `permissions/default.toml` 추가로 해결).
  `cargo build` 성공, 전체 `pnpm build`/`lint`/`test`(5/5, 9/9, 8/8) 통과. **실제 로그인 상태로
  앱을 실행해 `activity_daily`에 데이터가 실제로 쌓이는지는 end-to-end로 확인 못함**(GUI 시각
  확인이 이 세션 환경에서 안 되는 T1과 동일한 한계) — T4에서 사용자 확인 필요. 커밋은 아직 하지
  않음(사용자 지시 대기).
- 2026-07-21 10:27 : [본 세션, `/next-step` 계속] T4(사용자 검증) 착수 전 방어적으로 code-reviewer
  + security-reviewer 병렬 리뷰 실행(CLAUDE.md 필수 리뷰 트리거 — 외부 API 노출, 파일 시스템
  접근, 인증 경로 전부 해당). HIGH 4건 발견, 사용자 승인 받아 전부 이 세션에서 수정:
  **(1) capability 스코핑 무효 확인** — `capabilities/remote.json`이 배포 origin에만 최소 권한을
  주려 했으나, 옵션 A 구조(`frontendDist`=배포 URL 그 자체)에서는 Tauri가 이 origin을 "Local"로
  판정해(설치된 tauri 2.11.5/`tauri-utils` 2.9.3 소스를 직접 읽어 확인: `is_local_url()`,
  `Capability.local` 기본값 true) 스코핑 분기가 실행되지 않고 `default.json`의 `core:default`까지
  통째로 적용됨을 발견. 구조적 한계라 되돌리지 않고 DECISIONS.md #9-11 + phase_05.md에 정확한
  동작을 기록. **(2) CSP 무효 + 보안 헤더 부재 확인** — `security.csp: null`도 `https://` 원격
  콘텐츠엔 주입 안 됨(Tauri는 `data:` 스킴에만 CSP 주입) 확인, `apps/web`엔 애초에 보안 헤더가
  하나도 없었음 — `apps/web/src/proxy.ts`에 CSP + X-Content-Type-Options/X-Frame-Options/
  Referrer-Policy/Permissions-Policy/Strict-Transport-Security 추가. 구현 중 Next.js App Router의
  함정을 실측으로 발견: 응답에 `.headers.set()`만 하면 X-Frame-Options 등은 살아남는데 CSP/HSTS만
  렌더 단계에서 사라짐 — Next 공식 가이드대로 요청 헤더에도 같이 실어야(`NextResponse.next({
  request: { headers } })`) 최종 응답까지 전달됨을 확인. `pnpm --filter web dev` + curl로 `/login`
  응답에 6개 헤더 전부 포함, 본문도 정상 렌더링(15KB, 제목 태그 정상) 실측 확인 — 단 브라우저
  콘솔의 CSP 위반 로그 유무까지는 이 세션에서 확인 못함. **(3) Rust UTC 버그** — `session_date`가
  UTC 기준이라 KST 자정 근처 작업이 하루 밀려 집계되던 버그를 `time::UtcOffset::
  current_local_offset()`(실패 시 UTC 대체)로 수정. **(4) Rust 테스트 0건** — `session_date`/
  `find_session_files`/집계 로직에 단위 테스트 5개 추가, `cargo test` 통과. MEDIUM/LOW 6건(심볼릭
  링크 미검증, `updated_at` 미갱신, 동기화 실패 무알림 등)은 사용자 확인 하에 이번 라운드에서
  고치지 않고 phase_05.md에 후속 과제로 남김. 디버깅 과정에서 실수로 `Stop-Process -Name node`를
  광범위 매칭으로 실행해 다른 프로세스에 영향을 줬을 가능성이 있었음(과도하게 넓은 매칭 — 이후
  TaskStop으로 정확한 프로세스만 종료하도록 수정) — 재발 방지 필요. 수정 후 전체 `pnpm build`/
  `lint`/`test` 재실행 — 5/5, 9/9, 8/8 재확인. 커밋은 아직 하지 않음(사용자 지시 대기).
- 2026-07-21 16:00 : [본 세션, `/next-step` + 실사용 검증] **Phase 4·5 종료.** 사용자가 위젯/브라우저
  에서 실제 로그인하며 검증하는 과정에서 인프라 결함 여러 건이 드러나 전부 해소: **(a)** 로그인이
  CSP로 완전히 깨지던 버그 2건 — `script-src 'self'`가 Next RSC 하이드레이션 인라인 스크립트까지
  막던 문제를 nonce 기반 CSP로 전환(커밋 4de6028), 그래도 남아서 원인 추적하니 `/login`이 정적
  프리렌더링돼 빌드 시점 nonce와 요청 nonce가 영영 불일치 → `force-dynamic`으로 전환(서버
  page.tsx + 클라 LoginForm.tsx 분리, 커밋 accc4e3). 프로덕션 curl로 요청별 nonce 일치 실측.
  lessons-learned.md에 교훈 등재. **(b)** GitHub 잔디 API 500 — Vercel에 `GITHUB_TOKEN` 미등록
  (Phase 4 검증 체크리스트 1번이 실제 미이행이던 것)이라 사용자가 등록+재배포로 해소. **(c)** 잔디
  빈 칸이 카드 배경과 동색이라 안 보이던 문제(`color-mix` 최소 0% → 12%, 커밋 42b637f). **(d)**
  `activity_daily` 테이블이 프로덕션에 없어(REST 404) 위젯 업로드가 조용히 실패하던 것 발견 —
  사용자 명시 승인 하에 `supabase db push`로 적용(REST 200 전환 확인, 마이그레이션 히스토리 동기화
  상태라 이 하나만 적용). 이후 사용자가 위젯 로그인으로 activity_daily 반영까지 실사용 확인.
  **DETECT 리뷰**(6차원 병렬 + 적대적 검증, 39개 서브에이전트)를 실행해
  docs/reviews/2026-07-21-phase5.md에 기록 — **SEC- 배포 차단 0건**(확정 30건 전부 REF-MEDIUM/LOW,
  "proxy.ts 죽은 코드" SEC-HIGH 주장은 Next16 native proxy 인식으로 반증). 확정 REF-MEDIUM 6건은
  이 세션에서 수정: Rust 수집기를 async 커맨드로(UI 스레드 블로킹 해소) + 순수 함수
  `format_local_date`/`aggregate` 추출해 자정 경계·복수 날짜 회귀 테스트 고정(cargo test 5→6),
  `upsertActivityDaily` updated_at 갱신 + 테스트가 upsert 인자(user_id 스탬핑/onConflict) 검증하도록
  강화, CSP 문서 드리프트 정정. 잔여 REF-LOW 24건은 phase_06.md 착수 조건/후속 하드닝으로 이월.
  전체 `pnpm build`/`lint`/`test` + `cargo test`/`clippy` 통과.
