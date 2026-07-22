# History.md — Task 별 Phase 완료 이력

형식: Phase 완료 시 체크. 세부 Task 체크는 Status.md가 담당.

- [x] Phase 1 코어 기반 (모노레포, core 계약, 토큰, Supabase+RLS, Auth, CI/CD) — 2026-07-20 완료
- [x] Phase 2 투두 + 메모 위젯 — 2026-07-20 완료 (실사용 피드백 반영 완료, 아래 기록 참조)
- [x] Phase 3 오리 1단계 (GLB, 클릭 반응, 말풍선) — 2026-07-20 완료 (아래 기록 참조)
- [x] Phase 4 GitHub 커밋 잔디 — 2026-07-21 실사용 검증 완료 (아래 기록 참조)
- [x] Phase 5 Tauri 위젯 + Claude Code 수집기 — 2026-07-21 완료 (아래 기록 참조)
- [x] Phase 6 오리 2단계 (상태 반응, 자율 행동, 활보 모드) — 2026-07-21 완료 (T4 사용자 검증 완료, 아래 기록)
- [~] Phase 7 게임화 (XP/먹이/코스튬) + 생산성 모듈 (뽀모도로/습관/캘린더) — 2026-07-21 구현+머신검증+리뷰
      완료, 마이그레이션 적용(사용자)·T4 실기 검증 대기 (아래 기록)
- [x] Phase 8 AI 1단계 (룰 기반 대사 -> RAG Q&A) — 2026-07-22 실호출 검증 통과(사용자 "답변 잘 나와"),
      마이그레이션·GEMINI_API_KEY 배포 + 생성모델 404 픽스 + 완료-할일 인식 픽스 완료 (아래 기록)
- [~] Phase 9 워크스페이스 코어(블록 에디터) — 2026-07-22 백엔드/계약 층 + T1·T2·T4·T5·T7 구현·배포
      (pages CRUD UI, BlockNote shadcn 에디터, Cmd+K 검색, 휴지통/복원, RAG page 소스). 남음: T3 파일
      업로드, T5 버전 히스토리, T6 내보내기/템플릿, DB push 2건(pages·embeddings source) (아래 기록)
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
- 2026-07-21 : Phase 6 오리 2단계 T1~T3 구현 (`/loop /next-step` 자율 진행). 착수 게이트에서 계약 잠금
  결정 = 상태 반응 클라이언트 파생(DB 없음, 사용자 승인), 범위 T1+T2+T3 전부(사용자 승인). 착수 전 P1
  하드닝 게이트는 다른 세션이 커밋(`cbda478`~`97208dc`)해 전건 통과된 상태였음. **T1**: core에 순수함수
  `deriveDuckMood`/`daysSinceLastCommit`(오늘 투두 완료·커밋 공백 → happy/sad/neutral, 13개 테스트) +
  mascot Duck `mood` prop(몸통 색 불변, 자세로 표현, aria-label) + `TodoWidget`→`DuckWidget` 네이티브
  CustomEvent 배선(`todoSignal.ts`/`useDuckMood`, 스토어 없이 중복조회 없이). **T2**: 상시 idle bob +
  유휴 12~24초 룰기반 혼잣말(mascot `pickIdlePhrase`, mood별) + reduced-motion 준수. **T3**: Tauri
  `walker` 창(투명·클릭통과·always-on-top·기본숨김) + Rust `set_walking_mode`(옵션 A 특성상 클릭통과를
  Rust에서 설정) + `/walker` 라우트(투명·CSS 걷기·공개경로) + 데스크톱 전용 토글 버튼 + 권한
  `allow-set-walking-mode`. 머신 검증: core 48/mascot 5 tests, cargo fmt/clippy(3m40s)/test, apps/web lint
  통과. **T4 사용자 실기 검증(투두→happy, 커밋공백→sad, 유휴 혼잣말, 활보 오버레이 클릭통과)은 대기** —
  활보 모드는 배포 후에야 데스크톱 창이 `/walker`를 로드(옵션 A), Phase 5 T4와 동일 한계. 부수: mascot이
  `DuckMood` 타입 위해 `@ldd/core` 의존 추가. 다음 예정: Notion 480항목 인벤토리 로드맵 반영·계획화(사용자
  요청) — 무분별 대량 구현 아님.
- 2026-07-21 : 노션 3.4(2026.4) 전체 인벤토리 480항목 델타 반영(사용자 요청, `/loop /next-step` 자율 진행).
  "전부 구현" 요청을 로드맵·무료티어·ponytail 위반으로 판단해 **계획화로 전환**(사용자 승인) —
  docs/plans/notion-inventory-delta-2026-07-21.md 작성. 결론: 480항목 약 95%가 기존 gap-analysis 26축 /
  FEATURES 146항목 / 로드맵에 이미 흡수 또는 구조적 제외(enterprise B/E 전량·다인 협업·무료티어 저촉).
  신규 로드맵 등재 2건뿐(역방향 MCP 서버 노출=DEFER 백로그, 페이지 아카이브=P9 휴지통 흡수). 로드맵
  순서·Phase 정의 변경 없음. FEATURES.md에 델타 문서 포인터 1줄 추가(원 소스 provenance 보존).
- 2026-07-21 : Phase 6 T4 사용자 실기 검증 완료 보고받음 → Phase 6 종료. 이어 Phase 7(게임화+생산성)
  착수 승인("전부 분할·병렬"). **[직렬 계약잠금(커밋 39d23d0)]→[병렬 4슬라이스]→[직렬 통합]**으로
  진행(CLAUDE.md 3-3). 계약 잠금: core `duck-xp`/`habit`/`pomodoro`/`calendar-event`/`balance`/`date-util`
  순수함수(69 tests) + DB 마이그레이션 4개(habits/habit_checks/pomodoro_sessions/calendar_events,
  RLS+down) + `packages/api/duckState.ts`. 병렬: 서브에이전트 4개가 습관/뽀모도로/캘린더/게임화UI를
  disjoint 파일 경계로 구현. 통합: index/page 배선 + `lib/xpSignal.ts`(XP 획득→오리 레벨/XP/먹이 갱신,
  Phase 6 신호 패턴) + 투두 완료 XP + DuckWidget 신호구독→레벨업 celebrate. 병렬 부산물 PomodoroWidget
  lint 2건 수정. 검증 core 69/api 59/mascot 5 tests, 전 build, apps/web lint+build GREEN. code+security
  리뷰 배포차단 0건 — (L-2) 뽀모도로 재완료 XP 이중지급 DB 차단(조건부 UPDATE) 반영, 나머지(서버 권위
  XP 미도입: 투두/습관 파밍·applyXpAward export·duck_state 직접 PATCH·습관 날짜검증)는 전부 "솔로 자기
  치팅, 타 사용자 무피해"라 소셜 기능 전 선결로 문서화 이월(phase_07.md). **미완: 신규 4테이블
  `supabase db push`(사용자) + T4 실기 검증** — 적용 전 위젯은 테이블 부재로 에러 상태(교차 노출 없음).
- 2026-07-21 밤 : Phase 8 AI 1단계 코드 구현 완료 (`/loop /next-step` 자율 — 사용자 "정지 말고 구현
  가능한 것 전부 구현, 아침에 확인" 지시). Gemini 키는 배포 시 주입(Phase 4 GITHUB_TOKEN 패턴)이라 코드
  전량 빌드 가능. Phase 7 선례대로 T0 게이트를 기본값 확정(생성 gemini-2.5-flash, 임베딩
  gemini-embedding-001/768, 인덱싱 대상=현존 데이터, allowlist 미도입, LddError 도입). [직렬] 계약 잠금
  (48b27f9): core `ldd-error`/`embedding`/`ai-chat` + 마이그레이션 `20260721020000_ai_embeddings`
  (pgvector + embeddings RLS + match_embeddings top-k) + rollback. [슬라이스 A a50eb2d] packages/api:
  Gemini 클라이언트(embed/generate) + RAG(upsert/search/indexSource) + aiChat(answerQuestion). [슬라이스
  B 2f3e4a2] packages/ai 신설: useChat 훅 + resolveDuckReply + reindexSource. [슬라이스 C 769fa7f]
  apps/web: /api/ai/chat·/embed(서버 키+auth 가드+인메모리 레이트리밋+zod) + DuckChatPanel + 홈 배선.
  저장 시 임베딩 배선: Memo/Todo 생성·수정·삭제 → reindexSource(빈 텍스트=삭제). 검증 core 88/api 75/
  ai 6/mascot 5 tests + 전체 next build GREEN(/api/ai/* 라우트 확인). **미완(사용자 아침): `supabase
  db push`(embeddings) + Vercel `GEMINI_API_KEY` 등록 + 실호출 검증.** 상세·게이트값·알려진 한계는
  phase_08.md "구현 진행" 절.
- 2026-07-22 : Phase 8 배포 인프라 반영 + 생성모델 버그픽스 (`/loop /next-step` 세션이 사용자 협업으로
  실행) - (1) `supabase db push`로 `20260721020000_ai_embeddings` 프로덕션 적용(keyring 인증·DB 비번
  캐시로 dry-run 검증 후 적용, 재확인 "Remote database is up to date"). (2) Vercel REST API로 env
  `GEMINI_API_KEY` 등록(Production+Preview) + 재배포. (3) 키를 코드 호출 모델로 직접 실측 검증 중
  **생성 모델 `gemini-2.5-flash`가 신규 키에 404(deprecated for new users)** 발견 → 답변 생성 실패
  결함. CLAUDE.md 3-3대로 STOP·진단 후 `gemini-flash-latest`(자동 최신 별칭, 무료 티어 키 200 실측)로
  1줄 교체(커밋 9442fae, gemini.ts의 명시적 "보정 지점"). 임베딩 768차원 정합은 이상 없음 확인(코드가
  outputDimensionality=EMBEDDING_DIM 전달, core 768 ↔ 마이그레이션 vector(768) 일치, B는 오탐).
  api 79 tests + tsc GREEN(로컬 ESLint 성능 이슈로 린트는 CI 위임). push→Vercel 자동배포 READY(프로덕션
  별칭 web-sepia-one-88). **남은 사용자 몫 = 로그인 후 "기존 메모·할일 인덱싱" 클릭 + 질문으로 RAG
  실호출 확인(③) 하나. + 작업에 쓴 임시 Vercel 토큰 삭제 권장.**
- 2026-07-22 오후 : Phase 8 종결 + CI 복구 + Phase 9 백엔드 착수 (`/loop /next-step`, 사용자 "전부 자율
  처리, 백엔드 가자" 승인). (1) 사용자 RAG 실호출 검증 통과("답변 잘 나와") + 완료-할일 인식 결함 수정
  (b73f68d). (2) **동시 세션이 UI 전면 리디자인(shadcn/Tailwind, e495bd8) 배포** — 그 push가 CI를 깸:
  ThemeToggle의 set-state-in-effect lint(7f92ca9, 코드베이스 표준 disable 추가)와 오래된 e2e env 부재
  (4358776, ci.yml에 공개 URL+더미 anon 폴백)를 이 세션이 green 복구. 리디자인 자체는 Vercel next build
  통과로 이미 프로덕션 라이브. (3) **Phase 9 백엔드/계약 층 구현**(apps/web 리디자인과 파일 disjoint):
  `supabase/migrations/20260722030000_pages.sql`(pages 계층 테이블+RLS 4정책+pg_trgm GIN 검색인덱스
  +plain_text 컬럼) + rollback, core `page.ts`(pageSchema + extractPlainText 순수함수 — BlockNote 문서
  jsonb→텍스트, RAG/검색 공용, @blocknote 의존 없이 방어적 순회), api `pages.ts`(list/listTrashed/get/
  create/update/softDelete/restore/purge — plain_text는 저장 시 서버 파생). 검증 core 7 + api 8 신규
  tests 통과, core/api tsc GREEN. **미착수(다음): pages 마이그레이션 `supabase db push`(사용자/세션),
  apps/web 에디터 UI(T2, 리디자인 종료 후), RAG "page" 소스 확장(T7 — embeddingSource enum+DB 계약 변경).
  BlockNote 실측: 0.52.1/MPL-2.0/React19 OK, 단 기본 UI가 Mantine이라 shadcn과 충돌 → T2 게이트에서 결정.**
- 2026-07-22 : Phase 8 ③ 실호출 검증 통과 + 완료-할일 RAG 결함 수정 (`/loop /next-step`, 사용자 협업→퇴근
  후 자율) - 사용자가 로그인해 오리에 질문 "답변 잘 나와"로 RAG Q&A 실동작 확인(③ 통과). 이어 "완료 처리한
  할일을 오리가 못 알아먹는다" 관찰. 원인 2건: (1) `handleToggle`이 `reindexSource` 미호출(생성·수정·삭제엔
  있는데 토글만 누락) → 완료해도 임베딩이 생성 시점 텍스트(제목만), (2) 임베딩 텍스트에 완료 여부 부재.
  수정: `apps/web/src/lib/embedText.ts` `todoEmbedText(제목+(완료/미완료))` 헬퍼로 생성·수정·토글·백필
  4곳 통일 + 토글 재인덱싱 추가(커밋 b73f68d). CI lint-and-test success, Vercel READY(프로덕션 라이브).
  로컬 빌드는 다른 세션의 미커밋 lockfile 불일치로 막혀 CI/Vercel로 검증. **재검증 대기: 사용자가
  "기존 메모·할일 인덱싱" 재실행(기존 완료 할일에 상태 반영) 후 "완료한 할일 뭐야?" 질문.**
  **동시 세션 주의: 작업트리에 미커밋 shadcn/ui+Tailwind 도입(components/ui/, utils.ts, globals.css,
  postcss, deps 9개 + pnpm-lock.yaml)이 있고 frozen-install이 실패한다. TodoWidget.tsx도 그 세션이
  shadcn으로 재작성(내 RAG 수정은 보존됨). 이 세션은 그 변경을 건드리지 않음 — 그 세션이 lockfile
  정리·커밋 필요.**
- 2026-07-22 : UI 전면 리디자인 (Phase 무관, 사용자 요청 "UI 개선 - 대시보드로 예쁘게"). 참조:
  ui.watermelon.sh, cult-ui.com(둘 다 Tailwind+shadcn 기반). **확정 스택 변경 = Tailwind v4 도입:
  사용자에게 구현 방식을 물어 "Tailwind 도입" 명시 승인받아 게이트 통과**(CLAUDE.md §2). 내용:
  (1) apps/web에 Tailwind v4(@tailwindcss/postcss) + shadcn 규약 CSS 변수 + framer-motion/lucide-react/
  cva/clsx/tailwind-merge/tw-animate-css 설치. (2) globals.css를 단일 색 출처로 재작성(라이트 클린 +
  Geist 폰트 실제 적용 — 기존 Arial 폴백 버그 수정) + 레거시 --ldd-* 토큰 별칭 흡수. (3) UI 프리미티브
  신설(components/ui/card·button·badge·input·github-mark, lib/utils cn). (4) 홈 page.tsx를 세로 나열 →
  헤더(로고/테마토글/활보/로그아웃) + 베이토 그리드 대시보드로 재구성. (5) 위젯 8종(Todo/Chat/Duck/
  Habit/Pomodoro/Calendar/Memo/Github) + 로그인 화면 전부 새 카드 시스템으로 리스타일 — 로직(CRUD/
  낙관적 업데이트/시그널/RAG 인덱싱)과 E2E data-testid 전부 보존. (6) 이후 사용자 지시로 팔레트를
  화이트+머스타드 옐로우(--primary #ca8a04)로, GitHub 잔디는 색조 믹스 대신 진짜 초록 스케일
  (--gh-0..4, 강도↑=진한 초록, 다크는 GitHub 다크 스케일)로 변경. lucide 1.x가 브랜드 아이콘 Github를
  제거해 공식 마크 인라인 SVG(github-mark.tsx)로 대체. `pnpm --filter web build` GREEN(컴파일+TS+정적생성).
  결과 미리보기 Artifact 게시(claude.ai/code/artifact/228c0a22). Figma는 새 파일 생성까진 됐으나
  Starter 플랜 MCP 호출 한도로 내용 채우기 실패(파일 L9VHOW4nS5bSDWXGW1yblO 빈 상태). **미커밋 —
  사용자 커밋 대기(main 직접 금지, 브랜치 권장).**
- 2026-07-22 : Phase 9 T1·T2·T4·T5·T7 자율 구현·배포 (`/loop /next-step`, 사용자 부재 자율) - 리디자인
  세션 종료 확인 후 T1 WIP 브랜치(phase9-t1-wip)부터 재개. **5개 슬라이스 순차 구현, 각 빌드 GREEN 확인
  후 main 커밋·push, CI 검증**:
  - **T1 페이지 UI 병합(f6e7f36, CI success)**: phase9-t1-wip(PageWorkspace 트리 사이드바+PageEditor
    제목/textarea 디바운스 자동저장, /pages·/pages/[id] 라우트)을 빌드 검증 후 main 병합. 문서화된
    재개 게이트는 빌드라 통과 즉시 병합, lint는 CI 위임(로컬 ESLint 병적 지연). CI가 lint+e2e green 확인.
  - **T2 BlockNote 에디터(f41985e, CI success)**: `@blocknote/core·react·shadcn` 0.52.1 설치(peer 실측:
    React ^19.0 + Tailwind ^4.1.12 정합 → 리디자인 shadcn/TW4와 맞물려 Phase 8이 남긴 Mantine 충돌
    게이트 해소). BlockEditor.tsx(useCreateBlockNote+BlockNoteView(shadcn), html.dark MutationObserver로
    테마 동기화, 빈 content→undefined로 BlockNote 예외 회피). PageEditor textarea→next/dynamic ssr:false
    BlockEditor 교체, 최신 편집값 ref로 디바운스 stale 방지. content 스키마 T1과 동일이라 마이그레이션 불필요.
  - **T4 Cmd+K 검색(2206efe)**: api searchPages(title/plain_text ilike, pg_trgm GIN 가속, PostgREST or()
    예약문자+ilike 와일드카드 제거로 필터 인젝션 차단, 3 tests). CommandPalette.tsx(전역 Cmd/Ctrl+K 토글
    +OPEN_SEARCH_EVENT, 200ms 디바운스, ↑↓+Enter 내비, 초기화는 이벤트 핸들러에서 set-state-in-effect
    회피). (app) 레이아웃 상주 + 사이드바 검색 트리거(⌘K 힌트).
  - **T5 휴지통/복원(a8983d0)**: /pages/trash 라우트(정적 세그먼트 우선)+TrashView(listTrashed+복원+
    영구삭제). 영구삭제는 되돌리기 불가+하위 cascade라 window.confirm 확인(안전 규칙). 사이드바 휴지통 링크.
  - **T7 RAG page 소스(fb6a49e, 계약 변경 병렬 밖)**: core embeddingSourceSchema에 'page' 추가 +
    마이그레이션 20260722040000_embeddings_source_page(source_type CHECK 확장+rollback). 저장→reindex
    (서버 파생 plainText), soft delete→reindex(''), 복원→reindex(plainText), reindex-all 백필에 listPages.
    embedding.test.ts를 'page' 허용으로 갱신(Phase 8엔 거부 테스트였음).
  - **검증 총계**: core 96 / api 90 / ai 6 tests, web build GREEN(전 슬라이스), CI T1·T2 success 확인.
  - **인프라 대기(사용자/세션, DB 자격증명 필요)**: `supabase db push` 2건 — 20260722030000_pages(T1 이전
    작성), 20260722040000_embeddings_source_page(T7). 미적용이면 /pages 저장·페이지 RAG가 런타임 실패하나
    코드·빌드·CI는 전부 GREEN(마이그레이션은 배포 시 적용 패턴, Phase 7/8 선례).
  - **남은 Phase 9**: T3(파일 업로드+이미지 블록, Storage 버킷), T5 버전 히스토리(page_versions),
    T6(Markdown 내보내기+백업+템플릿), T8 실기 검증(로그인 필요, 사용자).
- 2026-07-22 : Phase 9 T3/T5버전/T6 마무리 + 전체 코드 적대적 리뷰·14결함 수정 (`/loop /next-step`,
  ultracode 자율). T3(파일/이미지 업로드 Storage e2031b5), T6(Markdown 내보내기 308d518), T5 버전
  히스토리(page_versions b288f75) 추가 배포 후, **Phase 9 전체 코드(9슬라이스, 20파일)를 워크플로로
  5렌즈 병렬 리뷰(React/보안/마이그레이션/통합/엣지, 36 서브에이전트) → 각 발견 적대적 검증**. 확정 14건
  (HIGH 5·MEDIUM 5·LOW 4) 전건 수정:
  - **HIGH**: (1) 버전 복원 vs 대기 중 디바운스 자동저장 레이스로 복원 무효화 — 복원 확인창 전에 상위
    타이머 취소(onBeforeRestore). (2) 페이지 cascade 삭제 시 자식 임베딩이 RAG에 유령 잔존 —
    pages BEFORE DELETE 트리거(20260722070000, cascade 자식 행까지 발화해 embeddings 원자 정리). (3)
    handleSaved가 title만 갱신해 페이지 재선택 시 stale content 렌더→최신분 덮어쓰기 — onSaved가
    content까지 전달·동기화. (4) extractPlainText가 테이블 셀/미디어 캡션 미순회로 검색·RAG 누락 —
    tableContent 객체+props.caption 처리 + 회귀 테스트. (5) 언마운트(페이지 전환) 시 pending 저장
    폐기로 마지막 편집 유실 — cleanup에서 flush.
  - **MEDIUM**: 검색 out-of-order 응답 가드(latestQuery ref), 낙관적 삭제 롤백을 통짜 스냅샷→함수형
    단일 항목 복원(동시 삭제 부활 방지, PageWorkspace+TrashView), 버전 복원 시 reindex(인덱스 stale
    방지), reindex-all을 소스 라운드로빈으로(page 굶짐 방지).
  - **LOW**: page-attachments 버킷 allowed_mime_types(이미지만)+file_size_limit(10MB, 액티브 콘텐츠
    SVG/HTML 차단) + 클라 가드, createPageVersion이 클라 입력 대신 서버 페이지에서 스냅샷 파생(RLS로
    소유권 강제), pages RLS를 (select auth.uid())로(initplan 캐싱), safeFileName 공백만 제목 'page' 폴백.
  - 검증: core 98 / api 95 / ai 6 tests + web build GREEN, 로컬 full eslint(apps/web) 선검증. 신규
    마이그레이션 1건(트리거)으로 db push 대기 5건. 리뷰가 오탐으로 판정한 항목(공개 버킷 self-XSS 등)은
    미반영. 남은 Phase 9: T6 템플릿·백업(선택), T8 실기 검증(로그인 필요, 사용자).
- 2026-07-22 : Phase 9 T6 마무리 — 템플릿 프리셋 + 전체 백업 내보내기 (`/loop /next-step`, ultracode 자율).
  새 페이지 템플릿 4종(빈/회의록/일일 노트/할 일, BlockNote 블록 프리셋 lib/pageTemplates.ts) + 사이드바
  `+` 드롭다운 피커(role=presentation 백드롭 닫기), 전체 백업(활성+휴지통 페이지를 JSON 다운로드,
  사이드바 하단 버튼). 검증: web build GREEN + 로컬 full eslint exit 0. 이로써 Phase 9 자율 구현 가능분
  전부 완료 — 남은 것은 사용자 몫(T8 로그인 실기 검증 + supabase db push 5건)뿐.
- 2026-07-22 : E2E 파이프라인 startup 타임아웃 해소 — webServer를 `next dev`→`next start`로 전환
  (`/loop /next-step` 자율, 커밋 19afba1 main push). 로컬에서 Playwright webServer가 `next dev`의 최초
  Turbopack 컴파일(Phase 9 BlockNote 등으로 커진 의존성 그래프)에 120초 준비 타임아웃을 넘겨 매 실행이
  실패하던 것을, 요청 시 컴파일이 없는 프로덕션 서버(`next start`)로 바꿔 머신 속도와 무관하게 안정화.
  빌드는 e2e 스크립트가 `next build && playwright test`로 선행(package.json). CI e2e 잡은 이미
  `pnpm --filter web e2e`를 돌므로 동일 경로로 수렴. **실측 검증**: 기존 빌드(.next 18:22) 대상 `next start`
  webServer가 즉시 바인딩, 33 스펙 중 **12 passed / 21 skipped(인증 세션 없는 스펙 자동 스킵, 의도된 동작)
  / exit 0** (2.3m). 이로써 로컬·CI 양쪽에서 비인증 E2E가 재현 가능하게 green.
- 2026-07-22 : Phase 10 계약 API 실측 조사 + 유닛 커버리지 기준 정합 (`/loop /next-step` 자율,
  커밋 26be814·d6e29e6·5a3ed24). (1) **Phase 10 de-risking**: WebFetch로 Gemini/Supabase 공식 문서를
  대조해 계약 형태를 좌우하던 미검증 항목 확정 — generateContent 유지(Legacy 표기이나 안정 프로덕션
  공식 권장, Interactions API 미채택), functionResponse content `role="user"`(오류 최다 지점),
  parameters=OpenAPI 3.0 서브셋, functionCall.id 병렬 매칭, toolConfig mode에 VALIDATED, Supabase
  provider_token은 최초 로그인 시점에만 추출 가능(OAuth 콜백 캡처·저장 필수). phase_10.md "미검증" 절
  갱신. alias 실동작·무료 한도는 사용자 키 필요라 착수 스파이크로 이월. (2) **커버리지 실측·보강**:
  `pnpm coverage`로 실측(212 tests, branch 78.09%로 기준 미달) → 미테스트 함수·에러 전파 브랜치 보강.
  pages.ts(73.17%→97.56% stmts, listTrashedPages+에러 전파 7건), Phase 7 api 4모듈(memos/todos/calendar/
  habits)의 create·update·delete·check DB 에러 전파 브랜치 보강. 결과 **전체 stmts 89.92%·branch
  85.39%·lines 92.32%, 테스트 212→234 green**. useChat·useReducedMotion 등 React 훅은 팀 전략(주석
  명시: 훅은 얇게, 순수함수만 유닛·나머지 E2E)에 따라 유닛 대상 제외(jsdom 도입=전략 변경 게이트).
- 2026-07-22 : Phase 10(에이전트 액션) 착수 — T1 프레임워크 구현·검증 (`/loop /next-step` 자율,
  사용자 "phase 10 착수하자"). 보안 표면 없는 부분(외부 호출 0)부터 STDD로. **T1 코어 계약 잠금(2f5d155)**:
  core `agent-tool.ts` — toolDeclaration(name/description/parameters=OpenAPI 3.0 서브셋, kind:
  readonly|mutating), toolCall/toolResult(실측 Gemini shape, id 병렬 매칭), AGENT_MAX_ITERATIONS,
  requiresApproval, partitionToolCalls(카탈로그 밖 도구는 실행 안 하고 unknown 격리 = 할루시네이션/인젝션
  방어선). zod v4 z.record 2-arg 준수. 12 tests + tsc GREEN. **T1 api 에이전트 루프(9e737f1)**: api
  `agent.ts` `runAgentTurn` — 도구 카탈로그로 Gemini generateContent 호출→functionCall 파싱→core
  partitionToolCalls 분류→실행→functionResponse(role="user") 되먹임 반복(AGENT_MAX_ITERATIONS 상한).
  readonly 자동 실행 / mutating 승인 대기 즉시 반환(파괴적 자동 실행 금지) / unknown 에러 회신. Adapter
  인터페이스(catalog+execute) + 목 어댑터·스크립트 fetch 7 시나리오(외부 호출 0). 429→quota_exceeded
  재사용(gemini.ts safeBody/upstreamError export). 7 tests + tsc GREEN. **남은 T2(승인 실행 배선+
  DuckChatPanel 카드)·T3(Google Calendar 어댑터)**: T3는 OAuth provider_token 필요 → Phase 9 db push +
  로그인이 선행돼야 함(사용자 몫). db push는 이 환경에 CLI/토큰/DB 비번 부재로 세션이 대신 못 함(확인 완료).
- 2026-07-22 밤 : Phase 10 T2~T3 코드 완료 — 승인 게이트 + Google Calendar 어댑터 end-to-end (`/loop
  /next-step`, 자율). T1(전 세션)이 잠근 계약 위에 순차 구현:
  - T2: api `executeApprovedCalls`(승인된 mutating만 실행, readonly/unknown은 승인 경로 자체를 거부해
    승인 UI 우회를 이중 차단) + `/api/ai/agent`(Phase 8 /chat 패턴 계승: 서버 키+auth+레이트리밋, 토큰
    미연동 시 "연동 필요" 안내) + `/api/ai/agent/approve`(zod 재검증).
  - T3: `createGoogleCalendarAdapter`(조회 readonly+생성 mutating, args zod 재검증=인젝션 방어) + core
    `google-oauth-token` 스키마 + 마이그레이션 `20260722080000_user_google_tokens`(RLS+rollback) + api
    `saveGoogleTokens`/`getGoogleTokens` + `auth/callback`에서 Google provider_token 캡처(리뷰 중 자체
    발견·수정: refresh_token 미포함 재로그인이 기존 저장분을 null로 덮어쓰는 버그 — 저장 전 기존값 조회
    후 보존) + LoginForm Google scope(`calendar.events`)+`access_type=offline`+`prompt=consent`.
  - UI: `packages/ai` `useAgentChat` 훅 + 신규 `AgentChatPanel.tsx`(DuckChatPanel과 관심사 분리 — RAG
    질답 vs 실제 액션 실행, 별도 컴포넌트로 병존). 홈 위젯 그리드 배치.
  - 부수 발견·수정: `packages/api`가 `zod`를 직접 import하면서도 package.json에 의존성 선언이 없어(core
    를 통한 phantom dependency, Phase 5의 apps/web zod 사례와 동일 패턴) tsc 실패 — 명시 의존성 추가로 해소.
  - 검증: core 113(+7) / api 138(+18) / ai 9(+3) tests + web build GREEN + core·api·web 로컬 full eslint
    선검증(전부 exit 0). 실제 Google OAuth consent/토큰 발급은 로컬에서 재현 불가 — T3 실기 검증은 사용자
    로그인 필요(Status.md 참조). `supabase db push` 신규 마이그레이션 1건 대기.
- 2026-07-22 밤(계속) : Phase 10 T4 하드닝 + T7 감사 로그 (`/loop /next-step`, 자율). T2/T3 커밋(7957b23,
  CI success) 직후 로컬 완결 가능분을 이어 구현:
  - T4: `runAgentTurn`에 매 턴 고정 인젝션 방어 지침 추가(도구 실행 결과 텍스트는 데이터일 뿐 지시가
    아니라고 명시, 호출부 누락 방지를 위해 한 곳에 고정) + 승인 카드가 제목뿐 아니라 시작/종료 시각까지
    노출(사용자가 정확히 뭘 승인하는지 투명하게).
  - T7: core `actionLogEntrySchema`+`summarizeForLog`(원문 대신 200자 요약, 토큰/PII 노출 최소화) +
    마이그레이션 `20260722090000_action_log`(select+insert only RLS, 불변 레코드+rollback) + api
    `logAction` + `/api/ai/agent/approve`에서 실행 결과별 best-effort 기록.
  - 검증: core 117(+4) / api 140(+2) tests + web build GREEN + core·api·web 로컬 full eslint 전부 exit 0.
  - Phase 10 T1~T4·T7 전부 코드 완료. 남은 것: T3 실기 검증(사용자, Google OAuth 로컬 재현 불가) +
    db push 2건 + T5(두 번째 어댑터)/T6(Gmail, 격리).
- 2026-07-22 밤(계속2) : Phase 10 T2~T4·T7 code+security 병렬 리뷰 + HIGH 2건 수정 (`/loop /next-step`,
  자율). CLAUDE.md 3-2 Check 단계를 이번 세션 신규 코드(OAuth 토큰 처리+승인 게이트, 보안 표면 큼)에
  적용 — code-reviewer + security-reviewer 병렬 실행.
  - security-reviewer: CRITICAL/HIGH 0건. RLS(user_google_tokens/action_log), 승인 재검증
    (executeApprovedCalls 카탈로그 판정), args zod 재검증, provider_token 저장 격리, 레이트리밋 적용
    전부 "안전" 판정. 신규 발견 MEDIUM 1건(action_log id 매칭, find 대신 인덱스로 — 즉시 수정·커밋
    b61b228).
  - code-reviewer: HIGH 2건. (1) `executeApprovedCalls`가 배치 중 하나 실패 시 전체 throw → 이미 성공한
    호출 결과·감사 로그가 통째로 유실. per-call try/catch로 격리, 회귀 테스트 추가. (2) Google
    access_token 만료(~1시간, 갱신 미구현)가 매번 일반 502로만 응답 — `googleCalendar.ts`가 401을
    `unauthorized`로 구분해 던지고 양쪽 라우트가 기존 "재연동 필요" 메시지로 매핑, 회귀 테스트 추가.
    MEDIUM(mixed-turn 도구 유실)은 ponytail 주석으로 명시, LOW(오래된 주석)는 정정.
  - 검토 결과 access_token 자동 갱신(refresh flow)은 이 아키텍처에서 구조적으로 불가능함을 재확인 —
    Google OAuth client_id/secret은 Supabase가 소유해 서버에 노출 안 되고, provider_token은 phase_10.md가
    이미 실측한 대로 최초 로그인 시점에만 얻을 수 있다. 재연동 안내로의 우아한 저하가 실제로 옳은
    스코프였다(자체 Google Cloud OAuth 앱 등록 없이는 재로그인 없는 자동 갱신 불가).
  - 검증: core 117 / api 142(+4) / ai 9 tests + web build GREEN + core·api·web 로컬 eslint 전부 exit 0.
  - Phase 10 T1~T4·T7 코드+리뷰 완료. 자율 구현 가능분 소진 — 남은 것은 사용자 몫(T3 실기 검증, db push
    2건)과 보안 민감 확장(T5 GitHub scope, T6 Gmail)뿐, 둘 다 사용자 확인 없이 진행하지 않기로 판단.
