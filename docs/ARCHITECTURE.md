# ARCHITECTURE.md — LDD 구조도

의사결정 배경은 DECISIONS.md, 개발 규범은 CLAUDE.md 참조.

## 1. 전체 아키텍처

```
                        [ 사용자 ]
                            |
        +-------------------+--------------------+
        |                   |                    |
   웹 브라우저          데스크톱 (Tauri)        모바일 (RN) [최종단계]
   ldd.vercel.app      상시 위젯 창
   (앱모드/위젯모드)    always-on-top / 투명 활보 모드
        |                   |
        |              +----+-----+
        |              | WebView  |  배포된 웹 URL 로드 (Vercel, 네이티브 창을 씌운 웹앱)
        |              +----+-----+
        |              | Rust 사이드: Claude Code 로그 수집기 |
        |              +----+-----+
        |                   |
========+===================+==============================
        v                   v
+---------------------------------------------------------+
|                    Vercel (무료 티어)                     |
|  Next.js App                                            |
|   - 페이지/에디터/위젯 UI (React, BlockNote, R3F)         |
|   - /p/[id]  공개 페이지 (읽기 전용 Publish)              |
|   - API Routes (서버 전용 키 보관)                        |
|     /api/ai/*       Gemini 프록시 (RAG, 에이전트)         |
|     /api/actions/*  어댑터 (Figma/Gamma/Google/Gmail...) |
|     /api/github/*   GitHub GraphQL 프록시                |
|   git push -> 자동 배포 (CI/CD)                          |
+---------------------------+-----------------------------+
                            |
            +---------------+---------------+
            v                               v
+------------------------+    +---------------------------+
| Supabase (무료 티어)     |    | 외부 서비스                |
|  - Auth (Google/GitHub)|    |  - Gemini API (무료 쿼터)  |
|  - Postgres + RLS      |    |  - GitHub API             |
|  - pgvector (RAG)      |    |  - Gmail API              |
|  - Storage (파일 1GB)   |    |  - MCP: Figma, Gamma,     |
|  - Realtime (동기화)    |    |    Google Cal/Drive,      |
+------------------------+    |    Notion                 |
                              +---------------------------+
```

Tauri WebView는 Next.js **정적 export를 탑재하지 않는다** — Middleware 인증 게이트, 서버 컴포넌트,
API Route(GitHub 잔디, Gemini 프록시 등)가 정적 export로 지원되지 않는 서버 로직에 의존하게 되면서
원 설계(Phase 1)의 정적 export 전제가 깨졌다. 대신 배포된 Vercel URL을 WebView가 그대로 로드하는
"네이티브 창을 씌운 웹앱" 방식으로 확정(2026-07-20, Phase 5 착수 전 사고 게이트, DECISIONS.md #9-11).
오프라인 완전 지원은 없음(Supabase 의존으로 원래도 온라인 전제).

## 2. 소프트웨어 구조 (모노레포 의존 방향)

```
little-dev-duck/
|
|  apps (실행체)                 packages (공유 라이브러리)
|  +-----------+
|  | web       |---+
|  | (Next.js) |   |   +--------+   +--------+   +--------+
|  +-----------+   +-->|  ui    |   | mascot |   |  ai    |
|  +-----------+   |   | 토큰    |   | 상태머신 |   | RAG    |
|  | desktop   |---+   | 컴포넌트 |   | R3F/GLB|   | 에이전트 |
|  | (Tauri)   |   |   +---+----+   +---+----+   +---+----+
|  +-----------+   |       |            |            |
|  +-----------+   |       v            v            v
|  | mobile    |---+   +------------------------------------+
|  | (RN)[차기] |------>|  api  (Supabase 클라이언트, 쿼리 훅)  |
|  +-----------+       +------------------+-----------------+
|                                         v
|                      +------------------------------------+
|                      |  core (도메인 타입, zod 스키마,       |
|                      |        순수 로직 - 의존성 0)          |
|                      +------------------------------------+
|
|  의존 규칙: 화살표 방향으로만 import. core는 아무것도 모른다.
|  RN 재사용 범위: core, api, ai (ui/mascot은 RN용 별도 구현)
|
|  supabase/   마이그레이션(+down), RLS 정책
|  docs/       규범, 계획, History, Status, 리뷰-학습 루프 산출물
|  .github/    CI (lint/test), Tauri Release 빌드
|  .claude/    커맨드 (next-step, review)
```

## 3. 인터페이스 계약 (IF)

```
[브라우저/WebView]
   |--(1) Supabase JS SDK -----------> [Supabase]
   |      JWT 첨부, CRUD 직결            RLS: user_id = auth.uid()
   |      Realtime 구독 (todos, pages)   공개 페이지는 is_public=true 예외
   |
   |--(2) HTTPS/JSON ---------------> [Next.js API Routes]
   |      POST /api/ai/chat              Gemini 키는 서버 env 전용
   |        req: {msg, history[]}        연동 OAuth 토큰은 Supabase에
   |        res: {reply, actions[],      암호화 저장, 서버만 사용
   |              emotion}
   |      POST /api/ai/embed (백그라운드)
   |      POST /api/actions/{service}/{verb}
   |      GET  /api/github/contributions
   |
[Tauri 전용]
   |--(3) Tauri IPC (invoke/event) --> [Rust 사이드]
   |      invoke("collect_claude_logs")  로컬 로그 파싱, 일별 집계 생성
   |      event("collector://progress")  집계만 (1)로 업로드, 원문은 로컬
   |
[인증]
   |--(4) OAuth 2.0
          로그인: Google/GitHub -> Supabase Auth -> JWT
          연동(별도 동의): GitHub repo, Google Cal/Drive, Gmail,
                          Figma, Gamma, Notion
```

## 4. 상호작용 구조 (오리 상태머신 + 에이전트 루프)

```
[이벤트 소스]                    [오리 상태머신]
 접속/복귀(last_seen_at) ---+
 할일 완료/미룸 ------------+     우선순위 큐
 시간대 변화 ---------------+--> +--------------------+
 방치 타이머 ---------------+    | 감정 x 행동 x 대사   |
 커밋 수신 -----------------+    | 기쁨  축하점프 "완료!"|
 마우스 클릭/호버 ----------+    | 졸림  꾸벅꾸벅       |
 뽀모도로 시작/휴식 --------+    | 집중  노트북코딩      |
 AI 응답 도착 --------------+    | 놀람  파닥파닥       |
                                +---------+----------+
                                          v
                              [R3F GLB 애니메이션 + 말풍선 + CC0 효과음]

[에이전트 루프]
 사용자 발화 "이 페이지로 PPT 만들어줘"
   v
 (a) 질문 임베딩 -> pgvector 유사도 검색 -> 내 데이터 상위 N개 첨부
   v
 (b) Gemini 호출 (function calling = 어댑터 카탈로그)
   +--> 답변만 필요 -> 말풍선 출력 [끝]
   +--> 도구 필요 -> (c) 어댑터 실행 (오리: 작업중 모션)
                     (d) 결과 반환 -> 최종 답변 (오리: 축하 모션)
                     (e) 메모리 추출 -> memories 적재 (다음 (a)에서 재사용)

 파괴적 액션(휴지통 이동 등)은 (c) 진입 전 사용자 승인 게이트를 거친다.
```

## 5. 데이터 스키마 골격 (Phase 1에서 v1 확정)

profiles, todos, memos, pages, blocks, habits, habit_logs, pomodoro_sessions,
activity_daily(source: github|claude_code), memories, embeddings(pgvector),
connections(서비스별 OAuth 토큰, 암호화), duck_state(XP, 레벨, 먹이, 코스튬),
notifications_rules. 전 테이블 user_id RLS.

검토 중(2026-07-21): blocks 테이블은 BlockNote 문서를 pages.content jsonb로 통짜 저장하는 방식으로
대체 검토 — 파생 데이터(tsvector 전문 검색, page_links 백링크)로 약점 보완. 근거는
docs/plans/notion-gap-analysis-2026-07-21.md 6.5절, 확정은 Phase 8/9 착수 사고 게이트에서.

## 6. Phase 로드맵

1 코어 기반 - 2 투두+메모 위젯 - 3 오리 1단계(GLB, 클릭반응, 말풍선) - 4 GitHub 잔디
- 5 Tauri 위젯+수집기 - 6 오리 2단계(상태반응, 자율행동, 활보) - 7 게임화+생산성 모듈
- 8 AI 1단계(룰 대사 -> RAG Q&A) - 9 블록 에디터 - 10 AI 2단계(에이전트 액션, Gmail 포함)
- 11 DB 뷰 - 12 공개공유+알림+대시보드 - 13 상용 마감(랜딩, 온보딩, i18n) - 14 RN
- 15 뉴스 브리핑 파이프라인(수집·요약·발행) - 16 픽셀 오리 오피스 기반(이벤트·렌더링)
- 17 픽셀 오리 오피스 상호작용(플레이어 조작)

각 Phase는 [직렬: 계약 잠금] -> [병렬: 패키지 경계 구현] 2구간으로 진행한다.

Phase 15~17은 2026-07-20 docs/plans/2026-07-20-1st_Fut_list.md 백로그에서 도출됐다. 근거와 항목별
배정 사유는 docs/plans/phase-mapping-proposal-2026-07-20.md(매핑 승인됨) 참조. 상세 Task 분해는
docs/plans/phase_15.md, phase_16.md, phase_17.md(초안, 개별 착수 승인 대기).
