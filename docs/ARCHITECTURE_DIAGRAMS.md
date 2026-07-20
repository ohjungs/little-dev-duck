# ARCHITECTURE_DIAGRAMS.md — 참조 다이어그램 (기능 백로그 부속)

> **충돌 시 기존 ARCHITECTURE.md가 우선한다. 이 문서는 참조용이며 스키마 변경은
> 별도 마이그레이션 승인 절차를 거친다.**

출처: `docs/plans/2026-07-20-1st_Fut_list.md`의 `[아키텍처 참조 다이어그램]` 섹션(7종)을
원문 그대로 이관했다. 각 다이어그램 뒤에 기존 `docs/ARCHITECTURE.md`와의 차이를 정리한다.
본 문서 자체는 코드 구현이나 마이그레이션 파일 생성을 수반하지 않으며, 신규 테이블·컴포넌트는
전부 [기획안] 단계로 취급한다.

---

## 1. 컴포넌트 다이어그램 (전체 구조)

```
┌───────────────────────── CLIENT ─────────────────────────────┐
│  apps/widget (Tauri 2, 데스크톱)   apps/web (Next.js@Vercel) │
│  ├ 오리 렌더 (GLB 3D / 2D fallback) ├ BlockNote 워크스페이스 │
│  ├ 픽셀 오피스 (Canvas 2D)          ├ 뉴스 리더·스크랩       │
│  ├ 대장오리 조작·직원 대화          ├ Cmd+K 검색             │
│  ├ 오늘 할일·Quick Capture          ├ 대시보드·습관 히트맵   │
│  └ 알림 센터 (총량 상한)            └ 뉴스레터 발행 페이지   │
│         │ ▲                                                  │
│         │ └─ sidecar WS ◄─ 이벤트 큐 ◄─ Claude Code hooks    │
│         │    (localhost+토큰)  (JSONL)   (VS Code, 로컬)     │
└─────────┼──────────────────────────┬─────────────────────────┘
          ▼                          ▼
┌──────────────── packages (플랫폼 무관 공용 로직) ────────────┐
│ core: 할일·습관·뉴스 파이프라인 │ duck: 감정·XP 상태머신     │
│ ui: 디자인 토큰(캐릭터 바이블 색상 상수)                     │
└────────────────────────────┬─────────────────────────────────┘
                             ▼
┌────────────────── Supabase Free (단일 허브) ─────────────────┐
│ Auth(OAuth)  Postgres+RLS(deny-default)  pgvector(검색·추천) │
│ Storage(에셋)  Realtime(위젯 push)  Edge Fn(요약·임베딩 큐)  │
└──────┬───────────────────┬───────────────────┬───────────────┘
       ▼                   ▼                   ▼
┌ Gemini Free ┐   ┌ GitHub Actions ┐   ┌ 외부 소스·액션 ─────┐
│ 기사 요약    │   │ 뉴스 수집·발송  │   │ RSS 피드 (수집만)   │
│ 임베딩       │   │ Supabase       │   │ Gmail API (본인발송)│
│ 오리 RAG대화 │   │  keepalive     │   │ MCP 에이전트:       │
│ (한도카운터  │   │ CI·Dependabot  │   │  Calendar/Drive/    │
│  +캐시 공유) │   │ 백업 자동화     │   │  GitHub/Notion 등   │
└──────────────┘   └────────────────┘   └─────────────────────┘
```

### 기존 ARCHITECTURE.md와의 차이

- **패키지 이름 불일치**: 새 다이어그램은 `core / duck / ui` 3개만 그린다. 기존
  ARCHITECTURE.md 2절은 `ui / mascot / ai / api / core` 5개 패키지 구조를 확정 스택으로
  명시한다. `mascot`이 `duck`으로 개명된 것인지, 별도 패키지인지 불명확 — 확정 필요.
  `ai`, `api` 패키지는 새 다이어그램에서 아예 등장하지 않는다(생략일 뿐 폐기는 아닌 것으로 추정
  [추정]).
- **sidecar WebSocket 서버 신규**: `apps/widget` 안에 Tauri sidecar가 localhost+토큰 인증
  WebSocket 서버로 동작한다는 내용은 기존 문서에 없다. ARCHITECTURE.md 3절은 Tauri IPC
  (`invoke`/`event`)만 정의했고 별도 프로세스·WS 프로토콜은 언급하지 않는다. 이는 I(픽셀 오리
  오피스) 신규 기능에 종속된 신규 컴포넌트다.
- **픽셀 오피스·대장오리 조작 신규**: `apps/widget`에 "픽셀 오피스 (Canvas 2D)", "대장오리
  조작·직원 대화" 박스가 추가됐다. 기존 문서에는 존재하지 않는 완전 신규 서브시스템(카테고리 I).
- **뉴스 리더·스크랩, 뉴스레터 발행 페이지 신규**: `apps/web`에 추가된 두 항목 모두 기존
  ARCHITECTURE.md에 없다(카테고리 H 신규 기능). 기존 문서의 "/p/[id] 공개 페이지(읽기 전용
  Publish)"와 "뉴스레터 발행 페이지"가 같은 메커니즘을 재사용하는 것인지 별도 라우트인지는
  명시돼 있지 않다 [가정: 동일 publish 메커니즘 재사용, 구현 시 확인 필요].
- **Supabase Edge Functions 신규**: "Edge Fn(요약·임베딩 큐)"은 새 다이어그램에만 있다.
  ARCHITECTURE.md 1절의 Supabase 박스는 Auth/Postgres+RLS/pgvector/Storage/Realtime까지만
  나열하고 Edge Functions는 언급하지 않는다.
- **GitHub Actions의 역할 확장**: 새 다이어그램은 GitHub Actions를 "뉴스 수집·발송, Supabase
  keepalive, CI·Dependabot, 백업 자동화"까지 담당하는 사실상의 크론 스케줄러로 그린다.
  ARCHITECTURE.md 2절은 `.github/`를 "CI(lint/test), Tauri Release 빌드"로만 정의했다 —
  스케줄러 역할은 신규다(플랜 문서 본문의 "Vercel Hobby cron 한도 부족 시 Actions로 대체"
  방침과 일치).
- **외부 소스 구성 변화**: 기존 문서의 "외부 서비스" 박스는 Gemini/GitHub/Gmail API +
  MCP(Figma/Gamma/Google Cal·Drive/Notion)였다. 새 다이어그램은 GitHub API를 빼고 RSS 피드를
  추가했으며 Figma·Gamma는 나열하지 않았다(생략으로 추정, 폐기 여부 불명 [추정]).
- **Gemini 용도 확장**: "기사 요약", "한도카운터+캐시 공유"가 새로 추가됐다. 기존 문서는
  "Gemini API 무료 쿼터"로만 뭉뚱그려 표기했다.

---

## 2. 배포 다이어그램 (무료 티어 경계)

```
┌─ 사용자 PC ────────────────────────┐  ┌─ Vercel Hobby ─────┐
│ VS Code + Claude Code (에이전트)   │  │ Next.js SSR/ISR    │
│ Tauri 위젯 + sidecar (WS 서버)     │  │ 발행 페이지(공개)  │
│ OS 키체인 (OAuth 토큰)             │  └─────────┬──────────┘
│ 로컬 캐시 (오프라인 할일)          │            │
└──────────────┬─────────────────────┘            │
               │ HTTPS                            │
               ▼                                  ▼
┌─ Supabase Cloud (Free) ──────────────────────────────────────┐
│ Postgres / Auth / Storage / Realtime / Edge Functions        │
└──────────────▲───────────────────────▲───────────────────────┘
               │ 스케줄 실행           │ REST
┌─ GitHub ─────┴───────────┐  ┌─ Google Cloud ────────────────┐
│ 공개 모노레포 (시크릿    │  │ Gemini API (Free Tier)        │
│  스캐닝 ON)              │  │ Gmail API (send scope, 본인)  │
│ Actions: cron·CI·백업    │  │ OAuth (Calendar/Drive)        │
└──────────────────────────┘  └───────────────────────────────┘
비용 경계: 모든 박스가 무료 범위. 한도 소진 시 동작은
CONSTRAINTS_FREE_TIER.md 에 서비스별 기록.
```

### 기존 ARCHITECTURE.md와의 차이

- ARCHITECTURE.md에는 별도 "배포 다이어그램"이 없다. 1절(전체 아키텍처)이 배포 구조와
  컴포넌트 구조를 겸하고 있어 직접 대응되는 절이 없다 — 이번에 신규로 분리된 관점이다.
- **OS 키체인(OAuth 토큰) 명시**: 배포 박스에 "OS 키체인"이 처음으로 명시됐다.
  ARCHITECTURE.md 3절 IF(4) OAuth 설명에는 "연동 OAuth 토큰은 Supabase에 암호화 저장,
  서버만 사용"이라고만 돼 있어, 위젯(로컬) 쪽 토큰 저장소를 Supabase 서버 암호화 저장과 OS
  키체인 중 무엇으로 할지 두 문서가 서로 다른 이야기를 한다 — **불일치, 확정 필요**.
- **로컬 캐시(오프라인 할일) 신규**: 오프라인 우선 로컬 캐시는 기존 ARCHITECTURE.md에 없다.
  (FEATURES 백로그의 "오프라인 열화 동작" 항목과 연결되는 신규 요소.)
- **GitHub 시크릿 스캐닝·Actions cron 명시**: 기존 문서 2절은 `.github/`를 "CI(lint/test),
  Tauri Release 빌드"로만 적었다. 시크릿 스캐닝 활성화와 Actions의 cron(스케줄) 역할은
  새 다이어그램에서 처음 명시됐다.
- **"Google Cloud" 묶음 박스 신규**: 기존 문서는 Gemini/Gmail/OAuth를 "외부 서비스" 하나로
  뭉뚱그렸다. 새 다이어그램은 이를 별도 "Google Cloud" 배포 단위로 분리하고, Gmail scope를
  "send, 본인"으로 한정해 명시했다(카테고리 J 보안 요구사항과 일치).
- **CONSTRAINTS_FREE_TIER.md 참조**: 아직 존재하지 않는 신규 문서를 전제로 한다. 이 문서는
  본 Task의 완료 조건 중 하나로 별도 생성 예정이며, 본 다이어그램 문서에서는 생성하지 않는다.

---

## 3. ERD (핵심 테이블, PK/FK만 표기)

```
users ─┬─< todos(id, user_id, project_id?, title, due, rrule,
       │        priority, done_at, deleted_at)   ※ soft delete
       ├─< projects(id, user_id, name)
       ├─< habits(id, user_id, name, freq_rule, day_boundary)
       │     └─< habit_logs(id, habit_id, date, checked, backfilled)
       ├─< documents(id, user_id, parent_id?, blocks_json, deleted_at)
       │     └─< doc_embeddings(doc_id, chunk_no, vector)  ※ pgvector
       ├─< feeds(id, user_id, url, status, fail_count)
       ├─< scraps(id, user_id, article_id, highlight, memo)
       ├─< newsletters(id, user_id, sent_at, html, status)
       ├─< duck_state(user_id PK, emotion, xp, level, costume_id,
       │             last_seen_at)               ※ 단일 소스
       ├─< xp_events(id, user_id, source, amount, ts)
       ├─< notifications(id, user_id, channel, payload, read_at)
       └─< settings(user_id, key, value)
articles(id, feed_id, url_hash UQ, title, summary3, cluster_id,
         published_at)                 ※ 요약 캐시 겸함, 전문 미저장
llm_usage(date, kind, count)           ※ Gemini 일일 한도 카운터
전 테이블 RLS: user_id = auth.uid() 기본 거부.
```

### 기존 ARCHITECTURE.md와의 차이

기존 ARCHITECTURE.md 5절(데이터 스키마 골격)의 테이블 목록:

> profiles, todos, memos, pages, blocks, habits, habit_logs, pomodoro_sessions,
> activity_daily(source: github|claude_code), memories, embeddings(pgvector),
> connections(서비스별 OAuth 토큰, 암호화), duck_state(XP, 레벨, 먹이, 코스튬),
> notifications_rules

이 목록과 새 ERD를 대조한 결과는 다음과 같다.

| 구분 | 테이블 | 비고 |
|---|---|---|
| 새 ERD에만 등장(신규) | `projects` | 할일 프로젝트 계층 — 카테고리 A/B "태그·프로젝트 계층" 반영 |
| 새 ERD에만 등장(신규) | `feeds` | RSS 피드 구독 — 카테고리 H 신규 |
| 새 ERD에만 등장(신규) | `scraps` | 뉴스 스크랩 — 카테고리 H 신규 |
| 새 ERD에만 등장(신규) | `newsletters` | 뉴스레터 발송 이력 — 카테고리 H 신규 |
| 새 ERD에만 등장(신규) | `xp_events` | XP 적립 이벤트 로그 — 카테고리 E 신규(GitHub 커밋 연동 등) |
| 새 ERD에만 등장(신규) | `settings` | 사용자 설정 키-값 — 카테고리 A "설정 동기화" 보완 검토 반영 |
| 새 ERD에만 등장(신규) | `articles` | 기사 요약 캐시(전문 미저장) — 카테고리 H 신규 |
| 새 ERD에만 등장(신규) | `llm_usage` | Gemini 일일 한도 카운터 — 무료 운영 원칙 반영 |
| 기존 문서에만 있고 새 ERD에서 빠짐 | `pages` | 문서/블록 에디터 페이지. `documents`가 대체하는 것으로 추정되나 명시적 언급 없음 [추정] |
| 기존 문서에만 있고 새 ERD에서 빠짐 | `blocks` | 위와 동일. `documents.blocks_json`으로 흡수된 것으로 추정 [추정] |
| 기존 문서에만 있고 새 ERD에서 빠짐 | `pomodoro_sessions` | 뽀모도로 세션 기록. 새 ERD·다이어그램 6은 뽀모도로 "시작/종료" 이벤트만 참조하고 저장 테이블은 그리지 않음 |
| 기존 문서에만 있고 새 ERD에서 빠짐 | `activity_daily` | GitHub/Claude Code 활동 집계(잔디). 새 ERD에 대응 테이블 없음 |
| 기존 문서에만 있고 새 ERD에서 빠짐 | `memories` | RAG 에이전트 메모리 추출 저장소. 새 ERD·시퀀스(4,5) 어디에도 메모리 개념이 없음 |
| 기존 문서에만 있고 새 ERD에서 빠짐 | `embeddings` | 범용 임베딩 테이블. `doc_embeddings`(문서 전용)로 범위가 좁혀진 것으로 추정 [추정] |
| 기존 문서에만 있고 새 ERD에서 빠짐 | `connections` | 서비스별 OAuth 토큰(암호화) 저장 테이블. 새 ERD에 대응 없음 — 다이어그램 2의 "OS 키체인" 표기와 상충 가능성(2절 차이점 참조) |
| 기존 문서에만 있고 새 ERD에서 빠짐 | `notifications_rules` | 알림 규칙 설정. 새 ERD의 `notifications`는 알림 인스턴스(payload, read_at)이지 규칙 테이블이 아니다 — 별개 개념으로 신구 문서에 각각 하나씩만 존재 |
| 이름/개념 변경 대응(신규 아님, 확정 필요) | `users` ↔ `profiles` | 새 ERD는 Auth 원본 `users`를 직접 FK 루트로 사용. 기존 문서는 `profiles`(프로필 확장 테이블)를 루트로 사용 — Supabase 관례상 `auth.users`+`public.profiles` 조합이 일반적이므로 두 표기가 같은 것을 가리키는 약칭일 가능성 [가정: profiles가 users의 확장, 구현 시 확인] |
| 이름/개념 변경 대응(신규 아님, 확정 필요) | `documents`/`doc_embeddings` ↔ `pages`/`blocks`/`embeddings` | 블록 에디터 저장 구조가 "페이지+블록 정규화"에서 "문서 1건 + blocks_json 비정규화"로 바뀐 것으로 추정 — BlockNote 데이터 모델과의 정합성 확인 필요 [가정] |
| 이름/개념 변경 대응(신규 아님, 확정 필요) | `duck_state` (공통이나 필드 변경) | 기존: `XP, 레벨, 먹이, 코스튬`. 신규: `emotion, xp, level, costume_id, last_seen_at`. "먹이" 필드가 빠지고 `emotion`, `last_seen_at`이 추가됨 — 먹이(feeding) 메커닉 폐기 여부 확인 필요 [추정: 다이어그램 6의 감정 상태머신과 통합되며 대체된 것으로 보임] |

전 테이블 RLS 원칙(`user_id = auth.uid()` 기본 거부)은 두 문서 모두 동일하게 유지된다.

---

## 4. 시퀀스 — 데일리 뉴스레터

```
Actions(cron)  core수집기   articles DB   Gemini      Gmail   Realtime  위젯(오리)
     │ 실행       │             │           │           │         │        │
     ├──────────►│ RSS fetch   │           │           │         │        │
     │           ├─ url_hash 중복 검사 ────►│           │         │        │
     │           ├─ 신규만: 캐시 확인 ─────►│           │         │        │
     │           │  (미스 시) 3줄 요약 ────►│           │         │        │
     │           │◄─ 요약 (llm_usage++) ────┤           │         │        │
     │           ├─ 저장·클러스터링 ───────►│           │         │        │
     │           ├─ HTML 조립 ──────────────────────────►│ 본인 1통│        │
     │           ├─ 발송결과 기록, 실패 시 재시도 큐     │         │        │
     │           └─ notifications INSERT ──────────────────────────►push──►│
     │                                                                     ├ 신문 연출
     │                                                                     └ 클릭→낭독
```

### 기존 ARCHITECTURE.md와의 차이

- ARCHITECTURE.md에는 뉴스/뉴스레터 관련 시퀀스가 전혀 없다. 4절 "에이전트 루프"가 유일한
  시퀀스 다이어그램인데, 이는 사용자 발화 → RAG → function calling → 어댑터 실행이라는
  범용 에이전트 흐름이며, 뉴스 수집·요약·발송이라는 배치성 파이프라인과는 트리거 방식
  (사용자 발화 vs cron)부터 다르다. 카테고리 H 전체가 완전 신규 시퀀스다.
- 기존 4절의 에이전트 루프는 "(e) 메모리 추출 → memories 적재"로 마무리되는데, 새 뉴스레터
  시퀀스는 `memories`를 전혀 참조하지 않는다 — 뉴스 파이프라인은 메모리 시스템과 별도로
  설계된 것으로 보인다 [추정].
- 기존 4절은 "파괴적 액션은 (c) 진입 전 사용자 승인 게이트를 거친다"고 명시하지만, 새
  시퀀스에는 Gmail 발송(사실상 외부로 나가는 되돌리기 어려운 액션) 전 사용자 승인 단계가
  그려져 있지 않다 — CLAUDE.md 5절 "안전 규칙"(되돌리기 어려운 작업은 실행 전 사용자 확인)과
  잠재적으로 상충한다. 다만 발송 주체가 "본인 1통"이라는 저위험 시나리오이므로 게이트 생략이
  의도적 설계인지, 누락인지는 구현 Phase에서 확인이 필요하다 [가정, 확인 필요].

---

## 5. 시퀀스 — 픽셀 오피스 이벤트·상호작용 (전 구간 로컬)

```
ClaudeCode(hooks)  JSONL큐   sidecar     위젯렌더러      사용자(대장오리)
     │ Tool 실행     │          │            │                │
     ├─ append ────►│          │            │                │
     │              │◄─ watch ─┤            │                │
     │              │          ├─ WS push ─►│                │
     │              │          │            ├ 상태매핑 테이블 │
     │              │          │            ├ 스로틀·병합     │
     │              │          │            └ 오리 애니 갱신  │
     │              │          │            │◄── 이동(WASD) ──┤
     │              │          │            ├ 인접 감지       │
     │              │          │            │◄── 상호작용 키 ─┤
     │              │          │            ├ 대화창: 이벤트  │
     │              │          │            │  템플릿 응답(무료)
     │              │          │            └ "자세히"→로그요약(DEFER)
Claude Code 종료 감지 → 퇴근 모드 연출 전환.
```

### 기존 ARCHITECTURE.md와의 차이

- 가장 가까운 대응은 3절 IF(3) "Tauri IPC" 하나뿐이다: `invoke("collect_claude_logs")`로
  로컬 로그를 파싱해 일별 집계를 생성하고 `event("collector://progress")`로 진행률만
  알린다는 내용. 새 시퀀스는 이와 근본적으로 다른 아키텍처다 — Rust 사이드가 직접 로그를
  파싱하는 것이 아니라, Claude Code hooks가 JSONL 큐 파일에 append하고, 별도 **sidecar
  프로세스**가 그 파일을 watch해 **WebSocket**으로 위젯 렌더러에 push하는 구조다. IPC
  직접 호출 방식에서 파일 큐 + 별도 프로세스 + WS 프로토콜 방식으로 바뀐 것은 신규
  아키텍처 결정이며 기존 3절 계약과 다르다 — **재정의 필요**.
- 기존 문서는 "집계만 (1)로 업로드, 원문은 로컬"이라고 해 수집 결과를 Supabase로 업로드하는
  것을 전제로 한다. 새 시퀀스는 "전 구간 로컬"이라고 명시해 Supabase 업로드 자체를 하지
  않는다 — 목적이 다르다(기존: 커밋 잔디용 활동 집계 업로드 / 신규: 실시간 시각화, 로컬
  전용). 두 메커니즘이 같은 hooks 이벤트 소스를 공유할지, 완전히 분리된 별도 파이프라인일지
  불명확 [가정: 별도 파이프라인, 구현 시 확인].
- 대장오리 조작(WASD 이동), 인접 감지, 상호작용 키, 대화창 응답, 퇴근 모드는 전부 기존
  문서에 없는 신규 개념(카테고리 I)이다.

---

## 6. 상태머신 — 오리 감정 (packages/duck, 데이터 정의)

```
              할일 완료/XP↑          스트릭 달성
   ┌─────┐ ─────────────► ┌─────┐ ─────────► ┌─────┐
   │ idle│                │happy│            │proud│
   └──┬──┘ ◄───── 시간경과 └─────┘ ◄── 〃 ──  └─────┘
      │▲
 기한임박│└──── 해소 ──────┐        뽀모도로 시작
      ▼│                  │      ┌──────► ┌─────┐
   ┌─────┐   미룸 누적    │      │        │focus│ (방해 억제)
   │worry│ ─────────────► ┌┴────┐◄┘        └──┬──┘
   └─────┘                │ sad │  세션 종료──┘
                          └─────┘
   방해금지 시간대 진입 → [sleepy] (모든 상태에서 전이, 알림 정지)
   전이 규칙·강도는 코드 분기 아닌 설정 데이터로 정의.
```

### 기존 ARCHITECTURE.md와의 차이

- 기존 문서 4절은 상태머신을 "우선순위 큐" 모델로 그린다: 이벤트 소스(접속/복귀, 할일
  완료/미룸, 시간대 변화, 방치 타이머, 커밋 수신, 마우스 클릭/호버, 뽀모도로 시작/휴식, AI
  응답 도착)가 큐에 들어가면 "감정 x 행동 x 대사" 조합(기쁨/졸림/집중/놀람)으로 출력되고,
  R3F GLB 애니메이션 + 말풍선 + 효과음으로 표현된다. 새 다이어그램은 명시적 유한 상태
  전이 그래프(FSM)로, 상태 이름 자체가 다르다: `idle / happy / proud / worry / sad / focus /
  sleepy` 7개. 두 모델이 같은 상태머신의 다른 표현(구현 상세 vs 전이 로직)인지, 설계가
  바뀐 것인지 확정되지 않았다 — **재정의 필요**.
- 대응 관계 추정: `focus`≈기존 "집중", `sleepy`≈기존 "졸림"과 유사하나, 기존의 "기쁨"은 새
  다이어그램에서 `happy`/`proud` 두 단계로 세분화됐고, 기존의 "놀람"은 새 다이어그램에
  대응 상태가 없다(빠짐). 반대로 `worry`, `sad`는 기존 4개 감정에 없던 신규 상태다.
- 새 다이어그램은 XP·스트릭·뽀모도로·방해금지 시간대라는 구체적 트리거를 상태 전이 조건으로
  명시한다. 이는 카테고리 C(습관·스트릭), D(리츄얼), G(방해금지 시간대) 기능과 결합된
  설계로, 기존 문서의 범용 이벤트 소스 나열보다 훨씬 구체적이다 — 신규 기능이 상태머신
  설계에 역으로 영향을 준 사례다.
- "전이 규칙·강도는 설정 데이터로 정의한다"는 원칙은 두 문서 공통이며 상충하지 않는다.

---

## 7. 클래스 다이어그램 — 교체 가능성(인터페이스) 중심

```
packages/core.news                    packages/duck
┌─────────────────┐                  ┌──────────────────────┐
│ NewsPipeline    │                  │ DuckStateMachine     │
│ +run()          │                  │ +dispatch(event)     │
└──┬──────────────┘                  │ -rules: TransitionCfg│
   │ uses                            └──────────┬───────────┘
   ▼                                            │ emits
┌──────────┐ ┌─────────┐ ┌───────────┐          ▼
│Collector │ │Deduper  │ │Clusterer  │  ┌──────────────┐
└──────────┘ └─────────┘ └─────┬─────┘  │ XpLedger     │
                               │ uses   └──────────────┘
        «interface»            ▼        «interface»
┌────────────────┐   ┌────────────────┐ ┌──────────────┐
│ LlmClient      │◄──┤ Summarizer     │ │ MailSender   │
│ +summarize()   │   └────────────────┘ │ +send(html)  │
│ +embed()       │                      └──────▲───────┘
└───────▲────────┘   구현체 교체로 무료 서비스  │
        │            이전 가능(가역성 확보)     │
┌───────┴────────┐                      ┌──────┴───────┐
│ GeminiClient   │                      │ GmailSender  │
│ (한도카운터·   │                      │ (재시도 큐)  │
│  캐시 내장)    │                      └──────────────┘
└────────────────┘
```

### 기존 ARCHITECTURE.md와의 차이

- ARCHITECTURE.md에는 클래스/인터페이스 수준 다이어그램이 없다. 2절은 패키지 단위 의존
  그래프(`web/desktop/mobile → ui/mascot/ai → api → core`)까지만 그리며, 그 안의 클래스
  구성은 다루지 않는다. 완전 신규 상세도다.
- **`packages/core.news`라는 서브네임스페이스가 신규**다. 기존 문서 2절은 `core`를 "도메인
  타입, zod 스키마, 순수 로직 - 의존성 0"으로 정의한다. 그런데 `core.news`의 `Collector`,
  `Summarizer`가 `LlmClient` 인터페이스를 통해 외부 LLM 호출에 의존하는 구조는, 인터페이스로
  추상화돼 있어도 "의존성 0" 원칙과 긴장 관계에 있다 — 어댑터(`GeminiClient`)가 core 밖에
  있는지 안에 있는지 새 다이어그램만으로는 불명확하다 [가정: 인터페이스는 core에, 구현체는
  하위 패키지(예: 기존 `ai`)에 위치, 구현 시 확인 필요].
- **`packages/duck`이라는 이름이 여기서도 반복**된다(다이어그램 1과 동일 이슈). 기존 문서의
  `mascot` 패키지와의 관계 확정이 필요하다. `DuckStateMachine`, `XpLedger`는 기존 문서
  2절에는 없는 클래스명이지만, 4절의 "오리 상태머신"과 5절의 `duck_state` 테이블 개념과는
  대응된다.
- `MailSender`/`GmailSender` 인터페이스-구현체 분리 패턴은 카테고리 H(뉴스레터)에 종속된
  신규 요소로, 기존 문서에는 이메일 발송을 다루는 클래스 설계가 전혀 없었다(3절 IF에는
  `/api/actions/{service}/{verb}` 어댑터 라우트만 있고 구체 클래스는 없음).
- "구현체 교체로 무료 서비스 이전 가능(가역성 확보)" 원칙은 플랜 문서 본문의
  "외부 API 의존 코드는 전부 인터페이스 뒤에 두어 무료 서비스 교체가 가능하게 한다"는
  지침과 일치하며, 기존 ARCHITECTURE.md에는 이 원칙이 명문화돼 있지 않다 — 새로 추가된
  설계 원칙이다.

---

## 종합: 확정이 필요한 상충·미결 항목

이관 과정에서 발견된, 두 문서 사이의 명확한 상충 또는 확정되지 않은 지점만 모았다(각
다이어그램 절의 상세 근거는 위 참조).

| 항목 | ARCHITECTURE.md | 새 다이어그램(플랜) | 상태 |
|---|---|---|---|
| 마스코트 패키지명 | `mascot` | `duck` | 이름 불일치, 확정 필요 |
| `ai`/`api` 패키지 | 5개 패키지 구조에 포함 | 다이어그램 1·7에 미등장 | 생략인지 폐기인지 불명 [추정: 생략] |
| OAuth 토큰 저장 위치 | Supabase 서버 암호화 저장 | 위젯 로컬 "OS 키체인" | 저장 주체 불일치, 확정 필요 |
| Claude Code 로그 수집 경로 | Tauri IPC 직접 호출 | JSONL 큐 + sidecar + WS | 아키텍처 재정의 필요 |
| 오리 감정 상태 이름 | 기쁨/졸림/집중/놀람(우선순위 큐) | idle/happy/proud/worry/sad/focus/sleepy(FSM) | 모델 자체가 다름, 확정 필요 |
| `duck_state`의 "먹이" 필드 | 존재(XP, 레벨, 먹이, 코스튬) | 부재(emotion, xp, level, costume_id, last_seen_at) | 폐기 추정 [추정, 확인 필요] |
| 문서/블록 저장 구조 | `pages` + `blocks`(정규화) | `documents.blocks_json`(비정규화) | 데이터 모델 변경 추정 [가정] |
| 뉴스레터 발송 전 승인 게이트 | "파괴적 액션은 승인 게이트 필수"(CLAUDE.md 5절과 일치) | 시퀀스 4에 게이트 미표기 | 누락 추정, 확인 필요 [가정] |

이 표의 항목은 모두 **의사결정 대기 상태**이며, 본 문서는 어느 쪽도 확정하지 않는다. 실제
반영은 담당 Phase 계획 및 마이그레이션 승인 절차에서 별도로 진행한다.
