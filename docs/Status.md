# Status.md — 현재 Phase 진행 현황

현재 Phase: **Phase 9(워크스페이스 코어) 진행 — 백엔드/계약 층 완료·병합(a7a363e), T1 페이지 UI는
브랜치 `phase9-t1-wip`(d3e7d38, 미검증)에 보존하고 사용자 요청으로 정지("다음 세션에서").** Phase 1~8 완료.
**다음 세션 재개점: 아래 Phase 9 절의 T1 bullet "다음 세션 재개 순서" 참조.** main CI 완전 green 상태.
Phase 9 백엔드(pages 마이그레이션 + core pageSchema/extractPlainText + api CRUD)는 다른 세션의 apps/web
UI 리디자인과 파일이 안 겹쳐 병렬 진행. **apps/web 에디터 UI(T2~)는 리디자인 세션 종료 후 착수.**
**다른 세션 현황: UI 전면 리디자인(shadcn/Tailwind) 배포 완료(e495bd8). 그 push가 깬 CI(lint·e2e)는 이
세션이 green 복구(7f92ca9 ThemeToggle lint, 4358776 e2e env 폴백).**
Phase 8 = AI 1단계(룰 대사→RAG Q&A). 사용자 "정지 말고 구현 가능한 것 전부 구현, 아침에 확인" 지시로
Phase 7 선례대로 T0 게이트 기본값 확정 후 빌드(상세·게이트값은 phase_08.md "구현 진행" 절).
계획 문서: docs/plans/phase_01~09.md, 리뷰 스냅샷 docs/reviews/2026-07-21-phase5.md, Notion 델타
docs/plans/notion-inventory-delta-2026-07-21.md.
**다음 Phase 9(워크스페이스 코어=블록 에디터) 초안 작성됨**(docs/plans/phase_09.md) — 착수 전 T0 게이트
7건(Phase 8 검증, pages jsonb 스키마, BlockNote 통합, extractPlainText, soft delete, 앱 셸, 파일 업로드)
사용자 결정 필요. Phase 9 = Phase 8 이월 "pages jsonb" 게이트의 해소 지점.

## Phase 9 — 워크스페이스 코어 (블록 에디터) — 백엔드/계약 층 구현 (2026-07-22 오후)

착수 승인: 사용자 "백엔드 가자"(게이트 기본값 확정). apps/web 에디터 UI는 다른 세션 리디자인과 충돌해
그 종료 후 착수. 백엔드는 core/api/migrations로 disjoint라 병렬 진행. 계획: docs/plans/phase_09.md.

- [x] DB 마이그레이션 `20260722030000_pages`: `pages`(id/user_id/parent_id 계층/title/content jsonb/
  plain_text/icon/is_trashed/trashed_at/타임스탬프) + RLS 4정책(본인 한정) + pg_trgm GIN(title/plain_text
  검색) + rollback. **`supabase db push` 필요(미적용).**
- [x] core `page.ts`: `pageSchema`(content=z.unknown, BlockNote 구조는 BlockNote 소유) + `extractPlainText`
  (블록 배열→텍스트, @blocknote 의존 없이 재귀 순회, RAG/검색 공용). 7 tests + tsc GREEN.
- [x] api `pages.ts`: list/listTrashed/get/create/update/softDelete/restore/purge. plain_text는 저장 시
  서버가 extractPlainText로 파생(클라 불신). 8 tests + tsc GREEN.
- [ ] `supabase db push`(pages) — 사용자/세션.
- [~] apps/web T1 페이지 워크스페이스 UI — **WIP, 브랜치 `phase9-t1-wip`(커밋 d3e7d38, 미검증)**.
  리디자인 세션 종료·전권 위임 후 착수. 구현: `/pages` + `/pages/[id]` 라우트(`(app)` 그룹 내),
  `PageWorkspace.tsx`(페이지 트리 사이드바 + 생성/soft삭제/네비, buildTree 재귀), `PageEditor.tsx`
  (제목+textarea, 디바운스 자동저장, `textToBlocks`로 **BlockNote 호환 content 저장** — T2에서 에디터
  내부만 교체), `AppNav.tsx`에 "페이지" nav 추가. **다음 세션 재개 순서: (1) 브랜치 checkout →
  `pnpm --filter web build` 검증·오류 수정 → main 병합, (2) `supabase db push`(pages 마이그레이션),
  (3) T2: `@blocknote/shadcn`(0.52.1, 존재 확인 — 리디자인 shadcn과 정합, Mantine 충돌 게이트 해소)로
  PageEditor 내부를 BlockNote로 교체.** BlockNote MPL-2.0/React19 OK. 스택 Next16+React19+Tailwind4라
  BlockNote 통합 시 SSR(next/dynamic ssr:false)·Tailwind4 호환 주의.
- [ ] T4 Cmd+K 검색(pages.plain_text ilike), T5 휴지통/복원 UI + 버전, T3 파일 업로드, T7 RAG page 소스.
- [ ] RAG "page" 소스(T7): `embeddingSourceSchema`에 "page" + DB source_type 제약 확장(계약 변경, 병렬 밖)
  + 페이지 저장 시 `reindexSource('page', id, extractPlainText(content))`.

## Phase 8 — AI 1단계 (룰 대사 → RAG Q&A) — 구현·리뷰·배포·검증 완료 (2026-07-22, `/loop` 자율+협업)

Gemini 키(`GEMINI_API_KEY`)는 배포 시 주입(Phase 4 GITHUB_TOKEN 패턴)이라 코드는 전부 빌드 가능.
커밋 48b27f9→99fda30(8건) main push 완료. 최종 검증 core 88 / api 79 / ai 6 / mascot 5 tests + next build GREEN.

- [x] 계약 잠금(직렬): core `ldd-error`(LddError)·`embedding`(768/chunkText)·`ai-chat`(routeUtterance/
  buildRagPrompt) + 마이그레이션 `20260721020000_ai_embeddings`(pgvector+embeddings RLS+match_embeddings)
  + rollback. 검증 core 88 tests·build·lint GREEN. **`supabase db push` 필요(배포 시, 사용자)**.
- [x] 슬라이스 A(a50eb2d) `packages/api`: gemini(embed/generate) + embeddings(upsert/search/indexSource/
  delete) + aiChat(answerQuestion). api 75 tests.
- [x] 슬라이스 B(2f3e4a2) `packages/ai` 신설: useChat 훅 + resolveDuckReply + reindexSource. ai 6 tests.
- [x] 슬라이스 C(769fa7f) `apps/web`: /api/ai/chat·/embed(서버 키+auth 가드+레이트리밋+zod) + DuckChatPanel +
  홈 배선. 쿼터 소진 시 route:rule 폴백.
- [x] 저장 시 임베딩 배선: Memo/Todo/Habit/Calendar 생성·수정·삭제 → reindexSource(빈 텍스트=삭제, 전 소스).
- [x] code+security 리뷰(병렬) + 수정(b6ebb00): (HIGH) indexSource 순서 반전으로 재인덱싱 실패 시 데이터
  유실 방지, embeddings DB 제약(enum/길이), searchEmbeddings safeParse, rateLimit→packages/api 이전+테스트,
  .env.example. 배포차단 0건. M2(systemInstruction)는 Phase 10 전 이월(문서화).
- [x] 기존 데이터 백필(800811b·99fda30): `/api/ai/reindex-all`(전 소스 일괄 인덱싱, 200개 상한) +
  DuckChatPanel "기존 메모·할일 인덱싱" 버튼.
- [x] 배포 인프라 반영(2026-07-22 오전, 세션이 사용자 협업으로 실행): (1) `supabase db push`로
  `20260721020000_ai_embeddings` 프로덕션 적용(dry-run 재확인 "up to date"), (2) Vercel env
  `GEMINI_API_KEY` 등록(REST API, Production+Preview) + 재배포. 키를 코드 호출 모델로 직접 실측:
  임베딩 `gemini-embedding-001` 200(outputDimensionality=768 정상), 생성 `gemini-2.5-flash` **404**.
- [x] 생성모델 버그픽스(커밋 9442fae): `gemini-2.5-flash`가 신규 키에 404("no longer available to new
  users")라 자동 최신 별칭 `gemini-flash-latest`로 교체(무료 티어 키 200 실측). api 79 tests + tsc GREEN,
  린트는 로컬 성능 이슈로 CI 위임. push→Vercel 자동배포 READY(프로덕션 별칭 web-sepia-one-88).
- **남은 사용자 몫 = ③ 하나**: 배포 사이트 로그인 → 오리 대화 패널 "기존 메모·할일 인덱싱" 1회 클릭 →
  질문 → RAG 답변 확인. (로그인 OAuth라 세션이 대신 못 함.) **+ 보안: 이 작업에 쓴 임시 Vercel 토큰은
  삭제 권장.**

**Phase 7 남은 것(사용자, 선택)**: T4 실기 검증(로그인 후 투두 완료→XP·레벨업, 습관 체크→스트릭, 뽀모도로
완료→XP, 캘린더 D-day). 기능은 이미 라이브.
재개 방법: 새 대화에서 /next-step.

## Phase 7 — 게임화 + 생산성 모듈 — 구현 완료, 마이그레이션 적용·검증 대기 (2026-07-21)

`/loop /next-step` 자율 진행. 사용자 "전부 분할·병렬" 승인. 상세·리뷰·알려진 한계는 phase_07.md.

- [x] 계약 잠금(직렬, 커밋 39d23d0): core 게임화/생산성 도메인+순수함수(69 tests) + DB 마이그레이션 4개 + duckState XP api
- [x] 병렬 4슬라이스(서브에이전트): 습관 / 뽀모도로 / 캘린더 / 게임화 UI(각 api+위젯, disjoint 파일 경계)
- [x] 통합(직렬): index/page 배선 + xpSignal(XP→오리 갱신) + 투두 XP + DuckWidget 구독·레벨업 celebrate
- [x] 검증: core 69 / api 59 / mascot 5 tests, 전 build, apps/web lint+build. code+security 리뷰 배포차단 0건
- [x] 마이그레이션 적용: 신규 4테이블 `supabase db push` 프로덕션 적용 완료(2026-07-21, 사용자 승인)
- [ ] T4 실기 검증(사용자, 선택 — 기능은 라이브)
- 반영: (L-2) 뽀모도로 재완료 XP 이중지급 DB 차단. 이월(알려진 한계): 서버 권위 XP(M-1/M-2/M-3/L-1,
  솔로 자기치팅·타 사용자 무피해)는 소셜 기능 전 선결로 문서화.

## Phase 6 — 오리 2단계 (상태 반응·자율 행동·활보 모드) — 완료 (T4 사용자 검증 완료, 2026-07-21)

`/loop /next-step` 자율 진행. 계약 잠금: 상태 반응 = **클라이언트 파생**(DB 없음, 사용자 승인),
범위 = T1+T2+T3 전부(사용자 승인). 상세·판단근거는 docs/plans/phase_06.md.

- [x] T1 상태 반응 — core `deriveDuckMood`/`daysSinceLastCommit`(순수함수, 13개 테스트) + mascot Duck
      `mood` prop(자세로 표현, aria-label) + `TodoWidget`→`DuckWidget` CustomEvent 배선(`todoSignal.ts`,
      `useDuckMood`). 몸통 색은 캐릭터 바이블 고정값이라 불변.
- [x] T2 자율 행동 — 상시 idle bob(useFrame) + 유휴 12~24초 혼잣말(mascot `pickIdlePhrase`, mood별
      문구) + reduced-motion 준수(흔들림만 끄고 자세·텍스트 유지).
- [x] T3 활보 모드 — Tauri `walker` 창(투명·클릭통과·always-on-top·기본 숨김) + Rust
      `set_walking_mode` 커맨드(`set_ignore_cursor_events`는 옵션 A 특성상 Rust에서 설정) + `/walker`
      라우트(투명 배경·CSS 걷기) + 데스크톱 전용 `WalkingModeToggle`. 권한 `allow-set-walking-mode`.
- [ ] T4 검증 — 머신 검증(core 48/mascot 5 tests, cargo fmt/clippy/test, lint) 완료. **사용자 실기
      검증 대기**: 투두 완료→happy, 커밋 공백→sad, 유휴 혼잣말, 활보 오버레이(배포 후) 클릭통과.
      절차는 phase_06.md "T4 검증 상태".

**부수(Phase 6 무관, T1 작업 중 필요)**: `@ldd/mascot`이 `DuckMood` 타입을 쓰려고 `@ldd/core`를
의존에 추가(`workspace:*`) — pnpm install로 재링크.

## Phase 5 종료 (2026-07-21)

- T0~T4 전부 완료. T4 실사용 검증 중 인프라 결함 다수 발견·해소(로그인 CSP 2건, GITHUB_TOKEN
  미등록, 잔디 색, activity_daily 테이블 프로덕션 미적용) — 사용자가 위젯 로그인으로 activity_daily
  반영까지 확인. 상세는 docs/plans/phase_05.md T4 절, docs/History.md 2026-07-21 16:00 기록.
- DETECT 리뷰: 6차원 병렬 + 적대적 검증(39개 서브에이전트). **SEC- 배포차단 0건.** 확정 30건 전부
  REF-MEDIUM(6)/REF-LOW(24). REF-MEDIUM 6건 수정(Rust async 커맨드·순수함수 회귀테스트,
  activity updated_at·테스트 인자검증 강화, CSP 문서정정). 잔여 REF-LOW는 phase_06.md 착수조건/
  후속 하드닝으로 이월. 전문은 docs/reviews/2026-07-21-phase5.md(immutable).

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

## 그 외 진행 (Phase 무관 UI 전면 리디자인, 2026-07-22, 사용자 요청) — 미커밋

- 사용자 "UI 개선 - 대시보드로 예쁘게"(참조: ui.watermelon.sh, cult-ui.com). **Tailwind v4 도입은
  확정 스택 변경이라 사용자에게 물어 명시 승인 후 진행**(게이트 통과). apps/web에 Tailwind v4 +
  shadcn 규약 + framer-motion/lucide 설치, globals.css를 단일 색 출처로 재작성(Geist 폰트 실적용,
  기존 Arial 폴백 버그 수정), UI 프리미티브 신설(components/ui/*), 홈을 헤더+베이토 그리드 대시보드로
  재구성, 위젯 8종 + 로그인 리스타일(로직·E2E data-testid 보존).
- 팔레트: 화이트 + **머스타드 옐로우**(--primary #ca8a04, 다크 #eab308). GitHub 잔디는 진짜 초록
  스케일(--gh-0..4, 강도↑=진한 초록). lucide 1.x Github 아이콘 제거 → 인라인 SVG 대체.
- 검증: `pnpm --filter web build` GREEN. 미리보기 Artifact(claude.ai/code/artifact/228c0a22).
  Figma는 Starter 플랜 MCP 한도로 빈 파일만 생성. **커밋은 사용자 결정 대기(main 직접 금지, 브랜치 권장).**
- 상세: docs/History.md 2026-07-22 항목.

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
