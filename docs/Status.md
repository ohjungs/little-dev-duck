# Status.md — 현재 Phase 진행 현황

현재 Phase: **Phase 10(AI 2단계=에이전트 액션) 진행 — T1~T3 코드 완료(2026-07-22 밤, `/loop` 자율).**
Phase 1~9 전부 완료(인프라·검증 게이트 없음). Google Calendar 어댑터 end-to-end 배선(계약→어댑터→토큰
캡처→라우트→UI 승인카드)까지 코드 완료, core/api/ai 전 테스트 + web build GREEN.
계획 문서: docs/plans/phase_01~10.md, 리뷰 스냅샷 docs/reviews/2026-07-21-phase5.md·2026-07-22-phase9.md,
Notion 델타 docs/plans/notion-inventory-delta-2026-07-21.md.
**다음 세션: 사용자 실기 검증 필요(Google 재로그인→Calendar scope 동의→"내일 회의 잡아줘" 시도) — 로컬은
진짜 Google OAuth consent/토큰 발급을 재현할 수 없어 이 부분만 사람이 확인해야 한다. 검증 후 T4(인젝션
방어 하드닝) 또는 T5(두 번째 어댑터)로 진행.**

## Phase 10 — AI 2단계 (에이전트 액션) — T1~T3 코드 완료 (2026-07-22, `/loop` 자율)

착수 승인: 사용자 "phase 10 착수하자"(phase_10.md T0 기본값 승인). 계약 API 형태는 공식 문서 실측으로
확정(26be814). T1(외부 호출 0) → T2(승인 실행) → T3(첫 어댑터 end-to-end) 순으로 STDD 구현·검증.

- [x] 계약 API 실측(26be814): Gemini generateContent function calling 유지(Interactions API 미채택),
  functionResponse role="user", parameters=OpenAPI 3.0 서브셋, functionCall.id 병렬 매칭, Supabase
  provider_token은 최초 로그인 시점 캡처·저장 필수. 상세 phase_10.md "공식 문서 조사 결과" 절.
- [x] T1 코어 계약 잠금(2f5d155): core `agent-tool.ts` — toolDeclaration(name/description/parameters/
  kind), toolCall/toolResult(Gemini shape), AGENT_MAX_ITERATIONS, requiresApproval, **partitionToolCalls
  (카탈로그 밖 도구는 unknown 격리=인젝션/할루시네이션 방어)**. 12 tests + tsc GREEN.
- [x] T1 api 에이전트 루프(9e737f1): api `agent.ts` `runAgentTurn` — 도구 카탈로그로 Gemini 호출→
  functionCall 파싱→분류→실행→되먹임 반복(상한). readonly 자동, mutating 승인 대기 즉시 반환, unknown
  에러 회신. Adapter 인터페이스 + 목 어댑터·스크립트 fetch 7 시나리오(외부 호출 0). 7 tests + tsc GREEN.
- [x] T2 승인 게이트: api `executeApprovedCalls`(승인된 mutating만 실행, readonly/unknown은 승인 경로
  자체를 거부 — 승인 UI 우회 차단 이중 방어) + `/api/ai/agent`(서버 키+auth+레이트리밋, Phase 8 /chat
  패턴 계승, 토큰 없으면 "연동 필요" 안내) + `/api/ai/agent/approve`(zod 재검증). +9 api tests.
- [x] T3 첫 어댑터 Google Calendar(end-to-end): `createGoogleCalendarAdapter`(listUpcomingEvents readonly
  + createCalendarEvent mutating, args zod 재검증=인젝션 방어) + core `google-oauth-token` 스키마 +
  마이그레이션 `20260722080000_user_google_tokens`(RLS 4정책+rollback) + api `saveGoogleTokens`/
  `getGoogleTokens`(user_id upsert) + `auth/callback`에서 Google 로그인 시 provider_token 캡처·저장
  (refresh_token 없는 재로그인이 기존 저장분을 지우지 않도록 조회 후 보존) + LoginForm Google 버튼에
  `calendar.events` scope + `access_type=offline`+`prompt=consent`(refresh_token 발급 필수 조건, 실측).
  **db push 필요.**
- [x] 승인 카드 UI: `packages/ai` `useAgentChat` 훅(대화 상태+승인대기+approve/cancel) + 신규
  `AgentChatPanel.tsx`(DuckChatPanel과 관심사 분리 — RAG 질답 vs 실제 액션, 홈 위젯 그리드 배치). +3 ai tests.
- [x] T4 인젝션 방어 하드닝 착수(로컬 완결 가능한 부분): `runAgentTurn`에 매 턴 고정 방어 지침(도구 실행
  결과 텍스트=데이터, 지시 아님 — 호출부 누락 방지로 한 곳에 고정) + 승인 카드가 제목뿐 아니라 시작/종료
  시각까지 전부 노출(사용자가 정확히 뭘 승인하는지 투명하게, args는 React 텍스트 렌더링이라 HTML 삽입 없음).
  **외부 텍스트(이메일 등) 구획화는 아직 해당 소스가 없어 대상 없음 — T6 Gmail 착수 시 재검토.**
- 검증: core 113 / api 138 / ai 9 tests + web build GREEN + core·api·web 로컬 full eslint 선검증.
- [ ] **T3 실기 검증(사용자, 로그인 필요)**: Google 재로그인(재동의 화면 필수)→provider_token 저장 확인→
  AgentChatPanel에서 "일정 만들어줘" 시도→승인 카드→승인 후 실제 Google Calendar에 반영되는지.
  `gemini-flash-latest`의 function calling 실동작도 이 시점에 실측(phase_10.md 미검증 절).
- [ ] T4 인젝션 방어 하드닝 / T5 두 번째 어댑터 / T6 Gmail(격리) / T7 감사 로그 — phase_10.md 참조.

## Phase 9 — 워크스페이스 코어 (블록 에디터) — T1·T2·T4·T5·T7 구현·배포 (2026-07-22 오후, `/loop` 자율)

착수 승인: 사용자 "백엔드 가자"(게이트 기본값 확정) + `/loop /next-step` "가능한 것 전부 구현". 계획:
docs/plans/phase_09.md. 각 슬라이스 빌드 GREEN 확인 후 main 커밋·push, CI 검증.

- [x] 백엔드/계약 층(a7a363e): DB 마이그레이션 `20260722030000_pages`(id/user_id/parent_id 계층/title/
  content jsonb/plain_text/icon/is_trashed/trashed_at + RLS 4정책 + pg_trgm GIN + rollback), core `page.ts`
  (pageSchema+extractPlainText, 7 tests), api `pages.ts`(CRUD 8 함수). **`supabase db push` 필요(미적용).**
- [x] T1 페이지 워크스페이스 UI(f6e7f36, CI success): `/pages`+`/pages/[id]` 라우트, PageWorkspace(트리
  사이드바+생성/soft삭제/네비, buildTree 재귀), PageEditor(제목+본문 디바운스 자동저장), AppNav 페이지 nav.
- [x] T2 BlockNote 에디터(f41985e, CI success): `@blocknote/core·react·shadcn` 0.52.1(React19+TW4 peer
  정합, Mantine 충돌 게이트 해소). BlockEditor.tsx(useCreateBlockNote+BlockNoteView(shadcn), html.dark
  관찰 테마 동기화, 빈 content→undefined). PageEditor textarea→next/dynamic ssr:false BlockEditor 교체.
  content 스키마 T1과 동일이라 마이그레이션 불필요.
- [x] T4 Cmd+K 검색(2206efe): api searchPages(title/plain_text ilike, pg_trgm 가속, or() 필터 인젝션 차단,
  3 tests) + CommandPalette(전역 Cmd/Ctrl+K+CustomEvent, 200ms 디바운스, ↑↓+Enter 내비) + 사이드바 트리거.
- [x] T5 휴지통/복원(a8983d0): `/pages/trash` 라우트+TrashView(listTrashed+복원+영구삭제 confirm) + 사이드바
  링크. 영구삭제는 되돌리기 불가+하위 cascade라 window.confirm(안전 규칙). **버전 히스토리는 미구현(아래).**
- [x] T7 RAG page 소스(fb6a49e, 계약 변경 병렬 밖): core embeddingSourceSchema에 'page' + 마이그레이션
  `20260722040000_embeddings_source_page`(source_type CHECK 확장+rollback). 저장→reindex(서버 plainText),
  soft delete→reindex(''), 복원→reindex(plainText), reindex-all 백필에 listPages. **`supabase db push` 필요.**
- [x] T3 파일/이미지 업로드(e2031b5): 마이그레이션 `20260722050000_page_attachments_bucket`(public 버킷
  +본인 폴더 RLS+rollback) + BlockEditor uploadFile 핸들러(본인 폴더 <uuid>.<ext>→public URL). **db push 필요.**
- [x] T6 Markdown 내보내기(308d518): BlockEditor onExportReady(blocksToMarkdownLossy, 0.52.1 동기 string)
  + PageEditor 툴바 '.md 내보내기'(제목 H1+Blob 다운로드). **백업/템플릿은 미구현(선택).**
- [x] T5 버전 히스토리(b288f75): 마이그레이션 `20260722060000_page_versions`(스냅샷+RLS 3정책+rollback) +
  core pageVersionSchema + api createPageVersion/listPageVersions(4 tests) + VersionHistory 모달(복원=updatePage
  +reload) + PageEditor '버전 저장'/'버전 기록'. **db push 필요.**
- [x] lint 복구(49c4426, CI success): CommandPalette 렌더 중 ref 변경 제거 + unused eslint-disable 3건 정리.
  T4~T5 CI red였던 것 복구, 로컬 full eslint 선검증. **main 전체 green 확인.**
- [x] Phase 9 전체 코드 리뷰(워크플로 5렌즈 병렬 36에이전트 + 적대적 검증) → 확정 14결함 전건 수정:
  - HIGH 5: 버전복원 vs 자동저장 레이스(복원 전 타이머 취소), page 임베딩 삭제 정리 트리거 신설
    (20260722070000, cascade 자식까지 행별 발화), handleSaved가 content까지 동기화(stale 덮어쓰기),
    extractPlainText 테이블셀/미디어캡션 순회, 언마운트 시 pending 저장 flush(페이지 전환 유실 방지).
  - MEDIUM 5: 검색 out-of-order 응답 가드, 낙관적 삭제 롤백 함수형(부활 방지), 버전복원 시 reindex,
    reindex-all 소스 라운드로빈(page 굶짐 방지), purge 임베딩=위 트리거로 해소.
  - LOW 4: 버킷 mime 화이트리스트(이미지만)+파일크기 상한, createPageVersion 서버 스냅샷(소유권 강제),
    pages RLS (select auth.uid()) initplan, safeFileName 공백만 폴백.
- 검증 총계: core 98 / api 95 / ai 6 tests + web build GREEN, 로컬 full eslint 선검증.
- [x] T6 템플릿·백업: 새 페이지 템플릿 프리셋 4종(빈/회의록/일일 노트/할 일, `+` 드롭다운 피커,
  lib/pageTemplates.ts) + 전체 백업 내보내기(활성+휴지통 페이지를 JSON 다운로드, 사이드바 하단).
- [x] **인프라**: `supabase db push` 5건 프로덕션 적용 완료(2026-07-22, 사용자 `npx supabase db push`).
- [x] **T8 실기 검증**(사용자): 로그인 후 에디터/검색/휴지통/페이지 RAG 동작 확인 완료(2026-07-22).

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

## 그 외 진행 (Phase 무관 UI 전면 리디자인, 2026-07-22, 사용자 요청) — 커밋·배포 완료

- 사용자 "UI 개선 - 대시보드로 예쁘게"(참조: ui.watermelon.sh, cult-ui.com). **Tailwind v4 도입은
  확정 스택 변경이라 사용자에게 물어 명시 승인 후 진행**(게이트 통과). apps/web에 Tailwind v4 +
  shadcn 규약 + framer-motion/lucide 설치, globals.css를 단일 색 출처로 재작성(Geist 폰트 실적용,
  기존 Arial 폴백 버그 수정), UI 프리미티브 신설(components/ui/*), 홈을 헤더+베이토 그리드 대시보드로
  재구성, 위젯 8종 + 로그인 리스타일(로직·E2E data-testid 보존).
- 팔레트: 화이트 + **머스타드 옐로우**(--primary #ca8a04, 다크 #eab308). GitHub 잔디는 진짜 초록
  스케일(--gh-0..4, 강도↑=진한 초록). lucide 1.x Github 아이콘 제거 → 인라인 SVG 대체.
- 검증: `pnpm --filter web build` GREEN. 미리보기 Artifact(claude.ai/code/artifact/228c0a22).
  Figma는 Starter 플랜 MCP 한도로 빈 파일만 생성.
- **상태 정정(2026-07-22, `/loop` 자율 확인)**: 위 "미커밋/커밋 대기"는 이후 사실과 다름 — 리디자인은
  main에 **커밋·배포 완료**(e495bd8)됐고, 후속으로 사이드바 네비 + 설정/관리자 페이지(abd3814)까지
  확장됨. 현재 작업 트리 clean(미커밋 리디자인 없음).
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
