# Phase 10 — AI 2단계 (에이전트 액션) — 초안

작성 2026-07-22, Phase 9(워크스페이스 코어) 코드 완료 직후 `/loop /next-step`의 "다음 Phase 계획 초안"
단계로 생성. **이 문서는 초안이다. T1 이하 구현 착수는 아래 "착수 조건(T0)"을 전부 통과한 뒤 별도 승인이
필요하다.** 로드맵 정의(ARCHITECTURE.md 6절): Phase 10 = AI 2단계(에이전트 액션, Gmail 포함). 근거:
ARCHITECTURE 4절(에이전트 루프), DECISIONS.md(어댑터 프레임워크·Gmail 규칙), phase-mapping-proposal Phase 10.

## 이 Phase의 실질 범위

Phase 8이 오리를 "아는 비서"(RAG Q&A)로 만들었다면, Phase 10은 "하는 비서"로 만든다. 오리가 Gemini
function calling으로 **어댑터 카탈로그**의 도구를 선택·실행해 외부 서비스에 실제 작업을 수행한다.
ARCHITECTURE 4절 에이전트 루프: (a) 발화 라우팅 → (b) Gemini 호출(function calling = 어댑터 카탈로그)
→ 도구 필요 시 (c) 어댑터 실행(오리 "작업중" 모션) → 결과를 대화로 요약. **파괴적/외부발송 액션은 (c)
진입 전 사용자 승인 게이트를 거친다(CLAUDE.md 5절 안전 규칙 + ARCHITECTURE 144행).**

DECISIONS 핵심: **어댑터 프레임워크를 먼저 세우고 어댑터 1개를 end-to-end 검증한 뒤 확장**한다. 대상
후보: GitHub, Google Calendar/Drive, Notion, Figma, Gamma, Gmail. Gmail은 특수 규칙(아래 T0-6).

## 착수 조건 — T0 (직렬, 구현 전 필수)

1. **Phase 9 실기 검증 통과**(사용자) — supabase db push 5건 + 로그인 후 에디터/검색/휴지통/버전/업로드
   /페이지 RAG 동작 확인. 에이전트가 "페이지 만들어줘/검색해줘"류 액션을 다루려면 워크스페이스가 실동작해야
   검증이 의미 있다.
2. **첫 어댑터 선정**(게이트 기본값 제안: **Google Calendar 이벤트 생성/조회**). 근거: (a) 사용자가 이미
   Google로 로그인(동일 provider라 scope 추가만으로 확장), (b) Phase 7의 내부 `calendar_events`와 자연 연결
   ("다음 주 회의 잡아줘" → 내부+Google 동시), (c) 생성은 비파괴라 승인 게이트 최소. 대안: GitHub 이슈
   생성(Phase 4 provider 토큰 재사용). **1개 검증 후 확장이 DECISIONS 원칙.**
3. **에이전트 루프/도구 스키마 계약** — Gemini function calling 규격(tool declaration = name/description/
   parameters JSON Schema)을 core 도구 스키마로 고정. 루프: LLM이 tool_call 반환 → 서버가 승인 판정 →
   어댑터 실행 → tool_result를 다시 LLM에 넣어 최종 응답. 반복 상한(무한 호출 방지)·토큰 상한을 계약에 둔다.
4. **실행 액션 승인 게이트 모델**(MUST) — 도구를 `readonly`(자동 실행) / `mutating`(사용자 승인 후 실행)로
   분류. mutating tool_call은 서버가 즉시 실행하지 않고 "승인 대기" 상태로 클라에 반환 → 오리 대화 패널에
   "이 작업을 할까요? [승인/취소]" 카드 → 승인 시에만 실행. 게이트 판정은 도구 카탈로그의 분류에 둔다.
5. **프롬프트 인젝션 방어**(MUST) — 외부 텍스트(이메일 본문, 페이지 내용, 뉴스)가 LLM 컨텍스트에 들어갈 때
   시스템/도구 지시를 오염시키지 못하게: (a) 외부 텍스트는 명시적 구획(delimiter)으로 감싸 "데이터"로 표시,
   (b) mutating 액션은 항상 사용자 승인(T0-4)이라 인젝션이 자동 실행으로 직결되지 않음, (c) 도구 인자는
   실행 전 zod 재검증. 이 세 겹이 방어선.
6. **Gmail 특수 규칙**(DECISIONS.md) — 1시간 폴링, 분류/라벨 자동, **휴지통 이동만 승인, 영구삭제 설계상
   금지**, OAuth scope send/read 분리·기능별 개별 동의. 공개 배포 시 restricted scope(CASA) 심사 필요 →
   **본인 설정 옵션으로 격리**(신규 가입자엔 기본 비활성). Gmail은 첫 어댑터로 부적합(scope 심사·파괴성) —
   프레임워크 검증 후 후반 Task로.
7. **감사 로그**(선택 게이트) — 실행된 mutating 액션을 `action_log`(user_id, tool, args 요약, 결과, 시각)로
   남길지. 되돌리기 어려운 작업 추적·디버깅용. 무료 원칙상 최소 스키마.

**게이트 규칙**: 위 7항 확정 + Phase 9 검증 후 계약 잠금 → T1 착수.

## 계약 잠금 대상 (병렬 착수 전 확정, CLAUDE.md 3-3)

- **`packages/core`**: `toolSchema`(name/description/parameters=**OpenAPI 3.0 Schema 서브셋**(JSON Schema 전체 아님, 아래 미검증 절 확인), kind: readonly|mutating),
  `toolCallSchema`/`toolResultSchema`(LLM ↔ 서버), 에이전트 루프 상태 타입(승인 대기 포함). 순수·테스트.
- **`packages/api`**: Gemini function calling 호출(`geminiGenerateWithTools`), 어댑터 인터페이스
  (`Adapter { catalog: ToolDecl[]; execute(name, args, ctx): Promise<ToolResult> }`), 도구 카탈로그 레지스트리,
  승인 게이트 판정. 첫 어댑터(예: googleCalendar) 1개 구현 + 목 테스트.
- **DB 마이그레이션(down 동반)**: (선택) `action_log`. OAuth provider 토큰은 Supabase가 세션에 보관하는
  것을 재사용(별도 테이블 지양). 새 scope 동의 흐름은 Supabase Auth `signInWithOAuth({scopes})` 재동의.
- **`packages/ai`**: `useAgentChat`(도구 루프 + 승인 카드 상태), Phase 8 `useChat` 확장 또는 병존.
- **`apps/web`**: `/api/ai/agent`(도구 루프 오케스트레이션, 서버 키+auth+레이트리밋), `/api/actions/*`
  또는 어댑터를 agent 라우트 내부에서 실행, DuckChatPanel에 승인 카드 UI.

## Task 초안 (착수 조건 통과 + 승인 후 확정)

- **T1 에이전트 루프 코어**: core 도구/툴콜 스키마 + api Gemini function calling 루프(readonly 자동 실행,
  반복/토큰 상한) + 목 어댑터로 end-to-end 테스트. 아직 외부 호출 없음(프레임워크 검증).
- **T2 승인 게이트**: mutating 도구 "승인 대기" 흐름 + DuckChatPanel 승인/취소 카드 + 승인 후 실행 배선.
- **T3 첫 어댑터(Google Calendar)**: OAuth scope 추가 동의 + calendar 이벤트 생성/조회 도구 + 내부
  calendar_events 연동. readonly(조회) 자동, mutating(생성) 승인.
- **T4 프롬프트 인젝션 방어 하드닝**: 외부 텍스트 구획화 + 도구 인자 zod 재검증 + 승인 게이트 상호작용 검증.
- **T5 두 번째 어댑터(GitHub 이슈/Notion 등)**: 프레임워크 위에 확장(패키지 경계 = 병렬 가능).
- **T6 Gmail 어댑터**(후반, 격리): 폴링·분류·라벨 + 휴지통 이동 승인(영구삭제 금지) + scope 분리 + 본인
  설정 옵션. CASA 심사는 공개 배포 조건이라 개인 사용까지만.
- **T7 감사 로그 + 검증**: action_log(선택) + 에이전트 루프/승인 게이트/인젝션 방어 실기 검증.

## 하지 않는 것 (현재 판단, 착수 게이트에서 재확인)

- **다중 스텝 자율 계획(agentic planner)** — 사용자 발화당 단순 도구 루프까지. 자율 다단계 워크플로는 차기.
- **Gmail 공개 배포(CASA 심사)** — 개인 사용까지. 공개는 Phase 13 상용 마감 이후 별도.
- **파괴적 외부 액션의 자동 실행** — 항상 승인 게이트. 자동화는 신뢰 축적 후 별도 결정.
- **자체 도구 마켓/플러그인 시스템** — 내장 어댑터 카탈로그로 충분(YAGNI).

## 규모 주의

Phase 10은 보안 표면(외부 액션·인젝션·OAuth scope·파괴성)이 로드맵 최대다. **어댑터 1개 end-to-end 검증
(T1~T3)을 MVP로 먼저 닫고**, 승인 게이트·인젝션 방어를 실증한 뒤 어댑터를 확장(T5~)하는 것을 강력 권고.
Phase 8(AI 1단계)의 서버 키·레이트리밋·zod 경계 패턴을 그대로 계승한다.

## 공식 문서 조사 결과 (2026-07-22 갱신, `/loop` 자율 — WebFetch 실측)

계약 형태를 좌우하는 두 API를 공식 문서로 대조했다. 출처: ai.google.dev/gemini-api/docs/generate-content/
function-calling, supabase.com/docs/guides/auth/social-login/auth-google.

**Gemini function calling — generateContent 계약 [확인됨]**
- **API 선택 확정**: `generateContent`는 2026-06 이후 문서상 "Legacy" 표기이나 **여전히 완전 지원 + "안정
  프로덕션 워크로드에는 generateContent 유지 권장"**이 공식 입장. 신규 Interactions API(2026-06 GA)는
  채택하지 않는다(Phase 8 기반 계승, YAGNI). — [확인됨]
- 요청: `tools: [{ functionDeclarations: [...] }]` + `toolConfig: { functionCallingConfig: { mode:
  "AUTO"|"ANY"|"VALIDATED"|"NONE", allowedFunctionNames: [...] } }`. (`VALIDATED`는 신규 mode.) — [확인됨]
- `parameters`는 **OpenAPI 3.0 Schema 서브셋**(JSON Schema 전체 아님): type ∈ string/integer/number/
  boolean/array/object, properties(type/description/enum), required, items. 고급 키워드(oneOf/$ref 등)는
  기대하지 말 것. core toolSchema는 이 서브셋으로 제약. — [확인됨]
- 모델 응답: `candidates[0].content.parts[].functionCall = { name, args, id }`. **`id` 필드 신설** —
  병렬 호출 매칭용. — [확인됨]
- **결과 반환(가장 실수 잦은 지점): content `role`은 `"user"`**. 형식 `{ role: "user", parts: [{
  functionResponse: { name, response: {...}, id } }] }`. 잘못된 role은 400. core toolResult 계약은 이
  role을 **상수 한 곳**에 두어 향후 변경에 대비. — [확인됨]
- 병렬 function calling 지원(한 턴에 다중 functionCall). 루프는 배열로 방어 처리하고 각 결과를 `id`로 매칭. — [확인됨]
- 함수 호출 지원 모델 예시: gemini-3.6/3.5-flash, gemini-2.5-flash/pro. 현재 코드는 alias
  `gemini-flash-latest` 사용 — **alias의 function calling 실동작은 문서에 미명시**. → 착수 스파이크로 실제
  키 curl 1회(tool 1개 선언→generateContent) 관찰 필요(문서보다 실측이 확실). — [확인 필요, 사용자 키]
- 무료 티어 function calling 한도 수치: 문서 미명시(자주 변동). 기존 429→`quota_exceeded` 매핑
  (packages/api/gemini.ts) 재사용 가능. tool 루프 중 429 시 멀티턴 롤백/재시도 정책을 계약에 명시. — [확인 필요]

**Supabase Google OAuth provider token [확인됨]**
- **provider_token은 최초 로그인 시점에만 세션에서 추출 가능** — 공식 문서 "On initial login, extract the
  provider_token and store it in a secure storage medium." 세션 갱신·재조회로는 안 나온다고 가정(문서
  미명시지만 최악 가정 안전). → Google Calendar 어댑터는 **OAuth 콜백(서버 Route Handler)에서 즉시
  캡처→RLS 적용 테이블에 저장**, 이후 재조회 의존 금지. — [확인됨]
- refresh token 수령: Google 기본 미발급 → `options.queryParams: { access_type: 'offline', prompt:
  'consent' }`를 `signInWithOAuth`에 전달해야 `provider_refresh_token` 획득. calendar scope 요청을
  최초 로그인에 통합하거나, 나중에 켤 때 재로그인 리다이렉트 UX. — [확인됨]
- 추가 scope 요청 방식(`options.scopes`), 재-consent(incremental) 필요 여부, 서버 exchangeCodeForSession
  응답의 provider_token 노출 여부는 이 페이지에 미명시. → 착수 전 별도 확인(가장 안전한 가정: **재로그인
  리다이렉트 필요**). — [확인 필요]

## 미검증·확인 필요 (보고 말미)

- [확인 필요, 사용자 키] `gemini-flash-latest` alias의 function calling 실동작 + 무료 티어 한도 — 착수 스파이크
  (실제 키 curl)로 관찰. 로컬엔 키 없음(Vercel 주입).
- [확인 필요] Supabase 추가 scope 요청/incremental re-consent/서버측 provider_token 노출 — 위 참조.
- [가정] mutating/readonly 2분류 + 사용자 승인이 인젝션 방어의 주 방어선 — 외부 텍스트가 readonly 도구로
  민감 데이터를 유출시키는 경로(예: "이 페이지를 요약해 외부로 보내"류)는 T4에서 별도 점검.
- [확인 필요] action_log 채택 여부(T0-7)와 Gmail 착수 시점(프레임워크 검증 후) 게이트 결정.
