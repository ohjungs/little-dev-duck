# Phase 8 — AI 1단계 (룰 기반 대사 → RAG Q&A) — 초안

작성 2026-07-21, Phase 7 종료(코드) 직후 `/loop /next-step`의 "다음 Phase 계획 초안" 단계로 생성.
**이 문서는 초안이다. T1 이하 구현 착수는 아래 "착수 조건"을 전부 통과한 뒤 별도 승인이 필요하다.**
로드맵 정의(ARCHITECTURE.md 6절): Phase 8 = AI 1단계(룰 대사 → RAG Q&A). 근거: DECISIONS.md 3절
(LLM/RAG 결정), phase-mapping-proposal 2절 Phase 8 배정 2건, CLAUDE.md 1절(RAG 기반 오리 비서).

## 이 Phase의 실질 범위 (오해 방지)

"룰 기반 대사"는 이미 존재한다 — Phase 3 말풍선 + Phase 6 `pickIdlePhrase`(mood별 문구)가 룰 대사
계층이다. Phase 8의 **신규 작업은 그 위에 RAG Q&A를 얹는 것**이다: Gemini 최초 연동 + pgvector RAG
인덱싱 + 사용자 데이터 기반 질의응답 UI. 즉 "룰 대사 → RAG Q&A"는 기존 룰 대사에서 LLM 응답으로
넘어가는 라우팅 설계까지 포함한다(언제 룰 문구, 언제 LLM 호출).

## 착수 조건 — T0 (직렬, 구현 전 필수)

1. **Phase 7 T4 사용자 실기 검증 통과** — 마이그레이션 적용(`supabase db push`) + 게임화/생산성
   위젯 실동작 확인(Status.md Phase 7 절). RAG 인덱싱 대상에 할일/습관/캘린더 데이터가 포함되므로
   해당 테이블이 실제로 배포·동작하는 상태가 선행돼야 한다.
2. **Gemini 무료 티어 한도 실측·정책 확정** (CLAUDE.md 무료 원칙, DECISIONS 3절) — 생성 모델과 임베딩
   모델의 RPM/RPD/TPM 한도를 실측하고, 쿼터 소진 시 폴백(룰 대사로 degrade)·레이트리밋·디바운스
   방침을 확정. 키는 서버 env 전용, Next.js API Route 프록시 경유(클라이언트 노출 금지).
3. **임베딩 모델·차원·인덱스 확정** — 벡터 차원은 **768로 결정됨**(Status.md 2026-07-21 게이트 노트).
   768을 산출하는 Gemini 임베딩 모델명(예: text-embedding-004 [추정, 게이트에서 확인])과 pgvector
   인덱스 방식(ivfflat vs hnsw)만 게이트에서 확정. 차원은 DB 컬럼 타입(`vector(768)`)에 박히므로 확정
   후 마이그레이션 작성.
4. **인덱싱 대상·순서 확정** — DECISIONS 3절은 "페이지/메모/할일/커밋"을 대상으로 하나, **"페이지"는
   Phase 9 블록 에디터 이후에나 존재**한다. Phase 8은 현존 데이터(메모·할일·습관·캘린더·활동/커밋)만
   인덱싱하고, 페이지 임베딩은 Phase 9로 이월함을 명문화. 저장 시 임베딩 큐잉 방식(동기 vs 비동기 큐,
   디바운스) 결정(phase-mapping Phase 8 "검색 인덱스 자동 갱신" 항목).
5. **접근 통제(allowlist) 판정** — DECISIONS 9절: "허용된 사람만 통과" authorization 문제를 **Phase 8
   근처에서 처리**하기로 사용자가 명시적으로 유예해 둠. AI 활성화는 Gemini 무료 쿼터를 실제로 소모
   하므로, (a) "AI는 로그인 본인 계정에서만"(DECISIONS 3절 사용 가드)로 충분한지, (b) 앱 자체 접근을
   allowlist로 좁힐지를 이 게이트에서 확정. 이번 Phase에서 안 한다면 그 결정도 명시.
6. **프롬프트 인젝션/데이터 유출 방어 방침** — RAG가 사용자 데이터를 컨텍스트로 주입하므로, 검색된
   청크는 사용자 본인 소유(RLS `user_id`)만 포함되도록 강제하고, 시스템 프롬프트/사용자 데이터 경계를
   설계 단계에서 못박는다.
7. **페이지 저장 스키마(`pages jsonb`) 선결** (Status.md 2026-07-21 게이트 노트) — **[사용자 세션이
   설정한 게이트 · 정확한 범위는 사용자 정의 필요]**. [추정 해석] Phase 9 블록 에디터의 페이지를
   `blocks jsonb` 형태로 저장하는 스키마를 Phase 8 착수 전에 확정해, RAG 인덱싱 대상(T0-4)이 페이지를
   나중에 흡수할 때 `embeddings.source_type` 확장만으로 되도록 embeddings 설계와 정합을 맞춘다. 실제
   의도·범위·시점은 게이트에서 사용자 확인(이 해석이 맞는지 포함).
8. **통일 에러 타입 `LddError` 도입** (Status.md 2026-07-21 게이트 노트) — **[사용자 세션이 설정한
   게이트 · 정확한 범위는 사용자 정의 필요]**. [추정 해석] Gemini 호출·네트워크·무료 티어 쿼터 소진 등
   실패 경로가 급증하는 Phase이므로, `apps/web` API Route·`packages/api`·`packages/ai`가 공유하는 단일
   에러 타입을 계약 잠금에 포함해 에러 처리·폴백(T0-2)을 일관화한다. 실제 형태·적용 범위(core에 둘지,
   기존 에러 처리와의 관계)는 게이트에서 사용자 확인.

**게이트 규칙**: 위 8항 확정 + Phase 7 T4 통과 후 계약 잠금 → T1 착수.

## 계약 잠금 대상 (병렬 착수 전 확정, CLAUDE.md 3-3)

- **`packages/core` 도메인·순수함수**:
  - `embeddingChunk` 스키마(`{sourceType, sourceId, content, userId}` — 임베딩 대상 조각), 청킹 규칙
    (텍스트 분할 길이·오버랩) 순수함수.
  - `chatMessage` 스키마(`{role: 'user'|'duck', content, createdAt}`), RAG `queryResult` 타입.
  - **라우팅 규칙 순수함수** `routeUtterance(input)` → `'rule' | 'llm'`(예: 인사/짧은 상호작용은 룰,
    질문형·데이터 조회는 LLM). 룰 대사(Phase 6)와 RAG의 경계를 core에서 결정론적으로.
- **DB 마이그레이션(각 down 동반, CLAUDE.md 5절)**:
  - pgvector 확장 활성화(`create extension vector`).
  - `embeddings` 테이블: `source_type`, `source_id`, `content`, `embedding vector(768)`, `user_id`(RLS
    `= auth.uid()`), 유니크(`source_type, source_id`)로 재임베딩 시 upsert. 인덱스(ivfflat/hnsw).
  - (선택) `chat_messages` 대화 히스토리 테이블 — v1에서 히스토리 영속화가 필요한지 게이트 판정.
- **`packages/api` — Gemini 클라이언트(순수, 키 주입식)**: `geminiEmbed(texts, apiKey, fetch?)`,
  `geminiGenerate(prompt, apiKey, fetch?)` — Phase 4 `fetchGithubContributions`와 동일한 "키/‌fetch
  주입 + 목 fetch 테스트" 패턴 재사용. 실제 키 주입·본인 계정 가드는 API Route에서. RAG 검색
  `searchEmbeddings(queryVec, userId, topK)`(Supabase RPC/`<->` 연산) 헬퍼.
- **`apps/web` API Route 인터페이스(서버 전용 키 경계)**: `POST /api/ai/embed`(저장 훅용),
  `POST /api/ai/chat`(질의응답). 둘 다 `GEMINI_API_KEY` 서버 env + 세션 본인 계정 가드 +
  레이트리밋. `force-dynamic`.
- **`packages/ai`(신규 패키지)**: import 방향 `apps/* → ai → api → core`(CLAUDE.md 3-5). `useChat`
  훅(오리 대화 상태), 저장 시 임베딩 트리거(메모/할일 저장 이벤트 구독 — Phase 6 `todoSignal`/Phase 7
  `xpSignal` 반응 패턴 재사용 검토), RAG 프롬프트 조립.
- **`packages/ui`**: 오리 대화 패널(입력창 + 메시지 리스트 + 로딩/폴백 상태). 위젯 모드에 얹는 형태
  vs 별도 패널 여부는 게이트 판정.

## Task 초안 (착수 조건 통과 + 승인 후 확정)

- **T1 Gemini 연동 기반**: `/api/ai/*` 프록시(서버 env 키, 본인 계정 가드, 레이트리밋) + `packages/api`
  Gemini 클라이언트(목 fetch 테스트) + 무료 티어 쿼터 폴백(소진 시 룰 대사 degrade). phase-mapping
  "자연어 입력 파싱(Gemini)"의 최초 진입점.
- **T2 RAG 인덱싱**: pgvector + `embeddings` 테이블 + 저장 시 임베딩 큐잉(메모·할일·습관·캘린더·
  활동/커밋, **페이지 제외**) + 청킹·디바운스. 재저장 시 upsert로 재임베딩. RLS로 본인 데이터만.
- **T3 RAG Q&A**: 질의 임베딩 → top-k 검색(본인 청크만) → 프롬프트 조립 → Gemini 생성 → 오리 대화
  UI. `routeUtterance`로 룰 대사↔LLM 분기. 프롬프트 인젝션 방어(컨텍스트=본인 데이터 한정, 경계 명시).
- **T4 검증**: 임베딩·검색 관련성(질의→기대 청크 회수), Q&A 정확도, 쿼터 소진 폴백 동작, 본인 계정
  가드(타 사용자 데이터 미노출), 데이터 유출 방어. 실사용 사용자 검증 병행(Phase 5/6/7 T4 패턴).

## 하지 않는 것 (현재 판단, 착수 게이트에서 재확인)

- **에이전트 액션**(Gmail/Calendar/Drive/GitHub/Notion 등 외부 실제 작업) — Phase 10 AI 2단계 스코프.
  Phase 8은 읽기 기반 Q&A까지.
- **블록 에디터 페이지 임베딩** — 페이지가 Phase 9에서 생기므로 그 이후. Phase 8은 현존 데이터만.
- **파인튜닝** — DECISIONS 3절에서 제외(메모리 축적 + RAG 품질 향상으로 대체).
- **BYOK(사용자 키 반입)** — DECISIONS 3절 "차기 옵션". Phase 8은 서버 무료 티어 키만.
- **뉴스 요약/브리핑 파이프라인** — Phase 15 스코프.

## 규모/순서 주의

- 최대 제약은 **Gemini 무료 티어 쿼터**다. 임베딩(인덱싱 시 대량)과 생성(질의마다) 둘 다 호출하므로
  한도 관리·폴백이 기능보다 먼저다. T0-2를 게이트에서 실측으로 닫지 않으면 실사용에서 바로 막힌다.
- **순서 리스크**: DECISIONS의 인덱싱 대상 "페이지"는 Phase 9 이후다. Phase 8을 페이지 없이 여는 것이
  로드맵상 맞으나(8→9 순서), RAG 가치의 상당 부분이 페이지에 있으므로 Phase 9 후 재인덱싱을 예정으로
  둔다(embeddings 테이블 설계는 source_type 확장만으로 흡수 가능하게).
- 착수 게이트에서 (a) T1(Gemini 연동)만 먼저 닫고 T2/T3를 순차로 갈지, (b) core 계약 잠금 후 T1~T3를
  병렬(패키지 경계: api/ai/ui 분리)로 갈지 결정. 병렬은 core 라우팅·스키마 잠금이 선행 조건.

## 미검증·확인 필요 (보고 말미)

- [추정] Gemini 임베딩 모델명·무료 티어 한도 수치는 지식 컷오프 기준 추정이며, T0-2/T0-3 게이트에서
  실제 API 문서·응답으로 확인해야 한다. 벡터 차원은 768로 결정됨(Status.md 게이트 노트).
- **[추정 해석 — 확인 필요]** T0-7(`pages jsonb`)·T0-8(`LddError`)은 다른(사용자) 세션이 Status.md
  2026-07-21 게이트 노트에 설정한 라벨이며, 본문의 범위·의도 서술은 내 추정 해석이다. 착수 게이트에서
  해당 세션/사용자의 정의로 정정·확정해야 한다(해석이 틀렸을 수 있음).
- [가정] `packages/ai` 신설이 import 규칙(3-5)에 이미 명시돼 있으나 실제 패키지는 없음 — 착수 시
  `packages/mascot` 신설(Phase 3) 절차대로 스캐폴딩(+`workspace:*` 재링크) 필요.

## 구현 진행 (2026-07-21 밤, `/loop /next-step` 자율 — 사용자 "정지 말고 전부 구현" 지시)

사용자 퇴근 전 "구현 가능한 것 전부 구현하고 아침에 확인" 지시. Phase 7 선례대로 **T0 게이트를 기본값으로
확정하고 빌드 진행**(사용자 override 가능). 실기 검증(Phase 7 T4, Gemini 키 실호출)만 사용자 몫으로 남김.

**T0 기본값(빌드 전제, 사용자 override 가능)**:
- T0-2/T0-3: 생성 `gemini-2.5-flash`, 임베딩 `gemini-embedding-001`(출력 768). 엔드포인트
  `generativelanguage.googleapis.com/v1beta`. 쿼터 소진 → `LddError('quota_exceeded')` → 룰 대사 폴백.
  인덱스 ivfflat cosine. 키는 서버 env(`GEMINI_API_KEY`), API Route 프록시.
- T0-4/T0-7: 인덱싱 대상 = memo/todo/habit/calendar_event/activity(현존). `page`는 Phase 9 이후
  `embeddingSourceSchema` enum + DB `source_type` 확장으로 흡수(계약 변경이라 병렬 밖에서). 저장 시
  임베딩은 명시 트리거(디바운스) — 슬라이스 B/C에서 실장.
- T0-5(allowlist): **이번 Phase 미도입**. "AI는 로그인 본인 계정만"(라우트 auth 가드 + `match_embeddings`
  RLS)로 솔로 v1 충분. 앱 접근 allowlist는 소셜/공개 배포 시 재검토(기본값 — 사용자 override 가능).
- T0-6: `buildRagPrompt`가 컨텍스트를 데이터로만 취급하도록 지시 명시 + `match_embeddings`가 본인
  데이터만(RLS) → 교차 사용자 노출 불가.
- T0-8(LddError): core 도입 완료.

**[직렬] 계약 잠금 완료(이 커밋)**: `packages/core` 신규 3모듈 — `ldd-error`(LddError/toLddError/
userMessage), `embedding`(EMBEDDING_DIM=768, embeddingChunk/retrievedChunk 스키마, chunkText 순수함수),
`ai-chat`(chatMessage 스키마, routeUtterance 룰/LLM 분기, buildRagPrompt 인젝션 방어). DB 마이그레이션
`20260721020000_ai_embeddings.sql`(pgvector + embeddings 테이블 RLS + `match_embeddings` top-k 함수) +
rollback. 검증: core 88 tests(+19)·build·lint GREEN. **적용은 사용자 `supabase db push` 필요(배포 시)**.

**슬라이스 A/B/C 구현 완료(로컬 커밋, `/loop /next-step` 자율 밤샘)**:
- **A(a50eb2d) `packages/api`**: `gemini`(geminiEmbed/geminiGenerate, 429→quota_exceeded 폴백 신호),
  `embeddings`(upsertEmbedding/searchEmbeddings/indexSource/deleteSourceEmbeddings, pgvector 리터럴),
  `aiChat`(answerQuestion: 라우팅→질문 임베딩→본인 데이터 top-k→buildRagPrompt→생성). api 75 tests.
- **B(2f3e4a2) `packages/ai` 신설**: `useChat` 훅 + `resolveDuckReply`(순수·테스트) + `reindexSource`
  (fire-and-forget). ai 6 tests. import 규칙 `apps/*→ai→api→core` 준수, pnpm 재링크.
- **C(769fa7f) `apps/web`**: `/api/ai/chat`·`/api/ai/embed`(서버 `GEMINI_API_KEY` + 세션 auth 가드 +
  인메모리 레이트리밋 20·60/min + zod 검증), `DuckChatPanel`(오리 대화 UI), 홈 배선. 쿼터 소진 시
  route:rule로 우아하게 degrade.
- **저장 시 임베딩 배선**: MemoWidget/TodoWidget 생성·수정·삭제 시 `reindexSource`(빈 텍스트=서버가 삭제).
- **검증**: core 88 / api 75 / ai 6 / mascot 5 tests, 전체 `next build` GREEN(`/api/ai/*` 라우트 빌드 확인).

**남은 사용자 몫(아침 확인)**: (1) `supabase db push`로 `embeddings` 테이블 + `match_embeddings` 적용,
(2) Vercel 환경변수 `GEMINI_API_KEY` 등록(무료 티어), (3) 실호출 검증(메모/할일 저장→자동 인덱싱, 오리에게
질문→RAG 답변, 인사→룰 대사). 적용 전까지 대화 패널은 키 미설정 안내(500)/빈 응답 — 기존 위젯은 정상.

**code + security 리뷰(자율, 병렬) 결과**: 배포 차단(SEC-CRITICAL/HIGH, code CRITICAL) 0건.

- **반영(수정 커밋)**:
  - (code HIGH) `indexSource`가 "삭제 먼저 → 임베딩 나중" 순서라 Gemini 실패(쿼터 소진 등, 이 Phase의
    주 실패 모드) 시 기존 RAG 인덱스가 유실되던 문제 → **임베딩 성공 후에만 갱신**하도록 순서 반전
    (`deleteStaleChunks`로 꼬리 청크만 정리). 실패 시 기존 인덱스 보존. 회귀 테스트 추가.
  - (sec M1) `embeddings` 테이블에 DB 레벨 제약(`source_type` enum check, `content`/`source_id` 길이
    check) 추가 — PostgREST 직접 호출로 앱 계층(zod/chunkText) 우회 시 자기계정 self-DoS 방어.
    `searchEmbeddings`도 `parse`→`safeParse`로 손상 행 건너뛰기.
  - (code MED) `allowRequest`(레이트리밋)를 `apps/web`(테스트 인프라 없음)에서 `packages/api`로 이전 +
    단위 테스트(한도·윈도우 경계) 추가.
  - (LOW) `.env.example`에 `GEMINI_API_KEY` 추가.
- **이월(비차단, 문서화)**:
  - (sec M2) 프롬프트 인젝션 방어를 Gemini `systemInstruction` 필드 분리로 강화 — 현재는 읽기 전용 Q&A +
    본인 데이터(RLS) 한정이라 실피해 제한적. **Phase 10 에이전트 액션(tool-calling) 도입 전 선결**로 이월.
  - allowlist 미도입(솔로 v1), 인메모리 레이트리밋(인스턴스별 근사)은 소셜/멀티유저 전 재검토.
  - reindexSource fire-and-forget 재시도 큐 없음(RAG 품질 문제 시 도입).
