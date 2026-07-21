# 노션 격차 분석 및 개발 지시서 (2026-07-21)

작성 배경: 프로젝트 전체를 노션(Notion)과 비교해 기능·다양성·사용자 편의성·UI/UX 격차를 판정하고,
아키텍처·SW 구조·이식성·모듈성·재사용성·효율성·유지보수성 관점의 보강 항목을 하나의 지시서로 통합한다.
이 문서는 백지 설계가 아니다 — docs/DECISIONS.md 5절에 이미 노션형 워크스페이스의 포함/차기/제외
결정이 존재하므로, 이 지시서의 역할은 (1) 기존 결정의 검증, (2) 결정됐으나 Phase 미배정인 항목의 회수,
(3) 노션 2025 기능셋 기준 업데이트, (4) 품질 부채 상환 계획이다.

---

## 0. 요약

**판정 총괄 (노션 코어 26축 기준)**: 있음 0, 부분 2, 계획됨 11, 결정됨·Phase 미배정 5,
로드맵 공백 3, 의도적 제외·보류 8. [확인됨 — 2절 매트릭스]

**즉시 조치 (P0)**:
1. CLAUDE.md 문서-코드 불일치 2건 정정 (static export 문구, Tauri Release 문구) — 이 지시서와 함께 적용
2. Phase 5 T4 잔여 사용자 검증 2항목 (로그인 필요 — docs/Status.md 참조)
3. `activity_daily` 마이그레이션 실제 `supabase db push` 적용 확인
4. Phase 9를 "블록 에디터"에서 **"워크스페이스 코어"**(앱 셸 + 페이지 계층 + 에디터 + 검색 + 내보내기
   + 파일 업로드 + Quick Capture 연결)로 재정의 — phase_09.md 작성 시 반영

**구조 결정 제안 (사고 게이트 안건)**:
- pages는 BlockNote jsonb 통짜 저장, blocks 테이블 비생성 (6.5절) — Phase 8/9 착수 게이트에서 확정
- 임베딩 차원 768 축소 (6.5절) — Phase 8 착수 게이트에서 확정
- 댓글+멘션의 "오리 인라인 대화" 재해석 (5.3절) — 보류 안건

---

## 1. 분석 기준

**노션 2025 기능셋 스냅샷** [학습 지식 기준, 추정 포함]: 블록 에디터 30+ 블록타입, 페이지 무한 계층,
데이터베이스 6뷰(테이블/보드/캘린더/리스트/갤러리/타임라인) + 속성 시스템(수식/관계/롤업),
Quick Find(Cmd+K, AI 답변 통합), Notion AI(워크스페이스 Q&A, 커넥터 검색, 작문 보조, 회의 노트),
공유/권한 체계, 동기화 블록, 백링크, 댓글+멘션, 실시간 동시편집, 가져오기/내보내기(md/CSV/PDF),
공개 발행(Notion Sites), 웹클리퍼, 오프라인 모드(2025 정식 출시), 모바일 앱, 공개 API,
템플릿 마켓플레이스, DB 자동화/버튼/폼/차트.

**판정 5단계**: 있음 / 부분 / 없음 / 계획됨(Phase N — 문서 근거 있는 경우만) / 의도적 제외·보류.
문서 근거 없이 로드맵 항목명에만 존재하면 "없음(문서 미작성)"으로 엄격 판정한다.

**기준선 문서**: docs/DECISIONS.md 5절(워크스페이스 포함/차기/제외), docs/ARCHITECTURE.md 6절(Phase
로드맵), docs/plans/phase-mapping-proposal-2026-07-20.md(85건 매핑, 승인됨), docs/FEATURES.md(146개
백로그), docs/CONSTRAINTS_FREE_TIER.md(무료 티어 제약).

---

## 2. 기능 격차 매트릭스

### 2-1. 에디터 코어

| 노션 기능 | LDD 판정 | 근거 / 배정 | 우선순위 |
|---|---|---|---|
| 블록 에디터 30+ 블록타입 | 없음 → 계획됨(P9) | phase_09.md 미작성. 현재 "글쓰기"는 MemoWidget textarea가 전부 | **P0** |
| 슬래시 메뉴, 블록 드래그, 마크다운 단축 입력 | 없음 → 계획됨(P9) | BlockNote 기본 제공 — 자체 구현 불필요 | **P0** |
| 페이지 무한 계층 + 사이드바 트리 | 없음 → 계획됨(P9) | ARCHITECTURE.md 5절 골격에 pages/blocks 명시, 테이블 미생성 | **P0** |
| 코드 블록 하이라이팅 | 계획됨(P9) | 매핑표 SHOULD, DECISIONS 5절 포함 | P0 |
| 버전 히스토리 | **결정됨·Phase 미배정** | DECISIONS 5절 포함이나 매핑표에 없음 → **P9 배정(스냅샷 방식)** | P1 |
| 휴지통 + 복원 | 계획됨(P9, MUST) | 매핑표 Phase 9 | P0 |
| 동기화 블록 | 의도적 보류 | DECISIONS 5절 "차기" | P2 |
| 수식(KaTeX), 컬럼 레이아웃 | 없음 | BlockNote 확장으로 가능, 미결정 | P2 |

### 2-2. 데이터베이스

| 노션 기능 | LDD 판정 | 근거 | 우선순위 |
|---|---|---|---|
| 테이블/보드 뷰 + 필터/정렬 | 계획됨(P11) | DECISIONS 5절 포함. phase_11.md 미작성 | P1 |
| 캘린더/타임라인/갤러리/리스트 뷰 | 의도적 보류 | DECISIONS 5절 "차기". 단 캘린더+D-day는 P7 생산성 모듈에 별도 존재 — **P11 착수 시 중복 설계 정리 필요** | P2 |
| 속성 시스템(수식/관계/롤업) | 의도적 보류 | DECISIONS 5절 "차기" | P2 |
| DB 자동화/버튼/폼/차트 | 없음 | 통계 대시보드(P12)·오리 에이전트(P10)가 부분 대체 — 따라가지 않음 | 제외 권고 |

### 2-3. 탐색·검색

| 노션 기능 | LDD 판정 | 근거 | 우선순위 |
|---|---|---|---|
| Quick Find (Ctrl+K) | 계획됨(P9, MUST) | 매핑표 "전역 검색 Command Palette". 범위를 검색→**검색+액션**으로 확장 권고 | **P0** |
| 사이드바 내비게이션 (트리, 즐겨찾기) | **없음 — 로드맵 공백** | 즐겨찾기는 DECISIONS 5절에 있으나 앱 셸 자체가 미배정. 현재 앱은 단일 페이지 세로 스택(apps/web/src/app/page.tsx) | **P0** |
| 백링크 | **결정됨·Phase 미배정** | DECISIONS 5절 포함, 매핑표 부재 → **P11 배정** | P1 |
| 최근 방문, 브레드크럼 | **없음 — 로드맵 공백** | 페이지 계층 생기면 필수 → P9 | P1 |

### 2-4. AI

| 노션 기능 | LDD 판정 | 근거 | 우선순위 |
|---|---|---|---|
| 워크스페이스 Q&A (RAG) | 계획됨(P8) | pgvector + Gemini, DECISIONS 3절 | P1 |
| 에이전트 액션 (외부 도구 실행) | 계획됨(P10) | 어댑터 프레임워크 — 노션 AI보다 야심찬 범위 | P1 |
| 에디터 내 AI 작문 보조 (이어쓰기/요약/톤 변경/번역) | **없음 — 로드맵 공백** | P8은 Q&A, P10은 액션. 에디터와 AI를 잇는 "블록 내 AI"가 어디에도 없음 → **P10에 신규 삽입** (Gemini 프록시 재사용, 신규 인프라 0) | P1 |
| AI 커넥터 (외부 서비스 검색 인덱싱) | 부분 계획(P10) | 어댑터는 실행 중심, 검색 인덱싱은 미정 | P2 |

### 2-5. 공유·협업·플랫폼

| 노션 기능 | LDD 판정 | 근거 | 우선순위 |
|---|---|---|---|
| 실시간 동시편집 (CRDT) | **의도적 제외 — 유지** | DECISIONS 5절 "CRDT 인프라가 개인 제품 가치 대비 과대" — 타당 | — |
| 공개 발행 (/p/[id]) | 계획됨(P12) | 개인정보 유출 필터 포함(매핑표) | P1 |
| 권한 체계 (게스트/그룹) | 의도적 제외 권고 | 1인 제품 + 관리자 승인 가입(DECISIONS 9-10)으로 충분 | — |
| 댓글+멘션 | **결정됨·Phase 미배정 → 보류 전환** | 1인 제품에서 재검토 — "오리와의 인라인 대화"로 재해석하면 차별화 기회. 사고 게이트 안건 | P2 |
| md/CSV/PDF 가져오기·내보내기 | 계획됨(P9) | md 내보내기 MUST + 주 1회 자동 백업 SHOULD | P0(내보내기)/P1(가져오기) |
| 공개 API | 의도적 보류 | DECISIONS 5절 "차기" | P2 |
| 웹클리퍼 | 의도적 보류 | 차기. P15 뉴스 스크랩이 부분 대체 | P2 |
| 오프라인 모드 | 의도적 제외 (구조적) | 옵션 A(원격 URL 로드) 확정으로 온라인 전제. Tauri 오프라인 fallback 페이지만 최소 대응(6.3절) | P2 |
| 모바일 앱 | 계획됨(P14, RN) | 단 **웹 반응형 미대응은 별개 문제** — 5.2절 | P1(반응형)/P2(RN) |
| 템플릿 | **결정됨·Phase 미배정** | DECISIONS 5절 포함 → **P9 말미 배정(내장 프리셋 5~10개, 마켓플레이스 없음)** | P1 |
| 파일 업로드 (이미지/첨부) | **결정됨·Phase 미배정** | Supabase Storage 1GB. **이미지 블록 없는 에디터는 반쪽 → P9 동시 배정** | **P0** |

---

## 3. 차별화 전략 — 노션이 구조적으로 못 하는 것

노션의 약점: (a) 감정 없는 도구 — 애착·동기부여 장치 부재, (b) 개발자 활동과 단절,
(c) 항상 떠 있지 않음(탭 속 앱), (d) 유료화 압박.

| 차별화 자산 | 현재 상태 | 강화 지시 | 우선순위 |
|---|---|---|---|
| 3D 오리 + 게이미피케이션 | 도형 플레이스홀더, duck_state 테이블 UI 미연결 | P6/P7 그대로 진행하되 **오리를 에디터에도 상주**시킬 것 — 글 쓸 때 반응(단어 수 마일스톤 축하, 장시간 작성 시 스트레칭 넛지). "노션 + 다마고치"는 카피 불가능한 포지션 | P1 |
| 개발자 활동 통합 (GitHub 잔디 + Claude Code 수집기) | **유일하게 완성된 차별화** [확인됨]. mtime 기반 프라이버시 우선 설계는 그 자체로 셀링 포인트 | 활동 데이터를 에디터로 역류: "오늘 커밋한 저장소" 자동 데일리 노트 블록, 주간 회고 템플릿에 잔디 자동 삽입. P15와 묶어 "개발자 아침 브리핑" | P1 |
| 데스크톱 상시 위젯 (Tauri 360x640 always-on-top) | 동작 확인 완료(P5) | **위젯 → 에디터 Quick Capture 파이프라인**(글로벌 단축키 → 인박스 페이지에 블록 추가)이 킬러 플로우. P5 산출물과 P9를 연결하는 Task를 phase_09.md에 명기 | **P0급 연결고리** |
| 무료/셀프호스팅 | 무료 티어 원칙 문서화, 공개 저장소 | 셀프호스팅 가이드 문서 1장(Supabase 프로젝트 + Vercel 포크 절차) — P13 랜딩에 포함 | P2 |
| 픽셀 오리 오피스 (P16/17) | 미착수 | 노션과 무관한 독자 영역 — 순서상 뒤로 유지가 맞음 (재확인) | P2 |

---

## 4. 우선순위 판단 기준 (명문화)

1. **라이브러리가 무료로 주는가** — BlockNote가 블록 30종·슬래시 메뉴·드래그·마크다운 단축을 기본
   제공 → 따라간다. CRDT 동시편집은 인프라 비용 → 버린다.
2. **1인 사용자에게 유의미한가** — 권한 체계·게스트·팀스페이스는 무의미 → 버린다. 검색·계층·백업은
   1인에게도 핵심 → 따라간다.
3. **무료 티어 한도에 저촉되는가** — Supabase DB 500MB / Storage 1GB / Gemini 무료 쿼터.
   파일 업로드는 용량 게이지 + 대형 파일 거부 정책과 함께 설계. 임베딩은 차원 축소 필수(6.5절).

---

## 5. 격차 해소 지시 목록

### 5.1 P0 — Phase 9를 "워크스페이스 코어"로 재정의해 흡수

phase_09.md 작성 시(현재 미작성이므로 수정이 아니라 신규 작성) 아래를 범위로 정의한다:

1. **앱 셸**: 접이식 사이드바(페이지 트리, 즐겨찾기, 위젯 대시보드 링크) + 상단바 + 콘텐츠 영역.
   에디터의 선행 Task (T0). 반응형 최소 대응(사이드바 → 모바일 드로어) 포함.
2. **BlockNote 에디터**: 기본 블록셋 + 코드 하이라이팅. 자동저장(debounce) + `updated_at` 충돌 감지.
3. **페이지 계층**: pages 테이블(6.5절 스키마), parent_id 트리, 브레드크럼, 최근 방문.
4. **Ctrl+K 커맨드 팔레트**: 검색 + 액션(페이지 이동/새 페이지/테마 전환/할일 추가) 통합.
5. **휴지통**: deleted_at 소프트 삭제 + 복원.
6. **md 내보내기**: 페이지 단위 + 전체 백업.
7. **이미지 업로드**: Supabase Storage, 이미지 블록과 동시.
8. **Quick Capture 연결**: 데스크톱 글로벌 단축키 → 인박스 페이지에 블록 추가 (P5 산출물 재사용).
9. **빈 상태 디자인**: 페이지 0개 상태 (위젯들은 이미 부분 존재).

### 5.2 P1 — 기존 Phase 보강 + 미배정 5건 회수

| 항목 | 배정 | 비고 |
|---|---|---|
| 버전 히스토리 | P9 (스냅샷 방식) | diff 없이 저장 시점 jsonb 통짜 보관, 페이지당 보관 개수 상한(500MB 방어) |
| 템플릿 | P9 말미 | 내장 프리셋 5~10개 (데일리 노트, 주간 회고 등). 마켓플레이스 없음 |
| 백링크 | P11 | 저장 시 링크 추출 → page_links 파생 테이블 (6.5절) |
| 파일 업로드 | P9 | 이미지 블록과 동시 (5.1절로 승격) |
| 에디터 내 AI 작문 보조 | P10 신규 삽입 | Gemini 프록시 재사용, 신규 인프라 0 |
| 테마 토글 (라이트/다크/시스템) | P7 또는 P13 | darkTheme 토큰은 이미 완비 — 저비용 |
| 웹 반응형 | P9 T0 (앱 셸과 동시) | RN(P14) 이전에 웹 최소 대응 |
| 키보드 단축키 | P9 + P13 | 에디터 단축키는 BlockNote 내장 + Ctrl+K로 80% 해결. 전 기능 키보드 조작은 P13 마감 검수 |
| 접근성 | 횡단 체크리스트 | 포커스 링, aria-label, 키보드 트랩 — 신규 컴포넌트마다 검수 |

### 5.3 P2 / 의도적 제외 재확인

**제외 유지 (사유 재확인)**: 실시간 동시편집(CRDT 과대), 권한 체계(1인 제품), DB 자동화/폼/차트
(P10 에이전트·P12 대시보드가 대체), 오프라인 완전 지원(옵션 A 구조상 불가), 공개 API(차기),
템플릿 마켓플레이스(범위 외), 웹클리퍼(P15 부분 대체).

**보류 → 사고 게이트 안건**: 댓글+멘션 — DECISIONS 5절 "포함" 목록에 있으나 1인 제품에서 셀프
코멘트는 가치가 낮다. "오리와의 인라인 대화"(블록에 오리를 멘션하면 해당 블록 맥락으로 AI 응답)로
재해석하는 안을 P10 착수 게이트에서 재검토한다.

**P2 잔여**: 위젯 커스터마이즈(표시 on/off부터, P12), 동기화 블록, 수식/컬럼, 캘린더 뷰(P7 캘린더와
중복 정리 선행), 온보딩 투어(P13 유지).

---

## 6. 아키텍처·품질 지시 목록

### 6.1 유지보수성

1. **에러 계약 최소 도입 (Phase 8 전)**: `packages/core`에 `LddError extends Error { code }` 1클래스
   (code는 `"auth" | "not_found" | "conflict" | "network" | "unknown"` string literal union).
   `packages/api`의 throw 지점에서 PostgrestError.code를 매핑하는 헬퍼 1개. Result 타입 전면 도입이나
   에러 계층 트리는 만들지 않는다. 이것이 P8~10의 에러 분류 요구(429 재시도, 파괴적 액션 실패 알림)의
   토대다.
2. **커버리지 측정 도입 (Phase 6 전)**: `@vitest/coverage-v8` + 루트 공용 vitest.config 1개(현재
   vitest.config 파일 0개 [확인됨]). 게이트(임계치 실패)는 걸지 않고 측정·리포트만. 목표 수치는
   CLAUDE.md에 명문화한 뒤 게이트화. (참고: 저장소 내 문서에 커버리지 목표 수치는 현재 없음 [확인됨].)
3. **apps/web 단위 테스트 인프라 (Phase 9 직전)**: 현재 web 로직은 위젯뿐이고 e2e 24개가 커버 중이라
   당장은 공백 허용. 에디터 주변 로직(백링크 추출, 휴지통)은 e2e로 커버하기엔 느리므로 P9 착수
   게이트에서 vitest + @testing-library/react 도입.
4. **문서-코드 불일치 정정 (즉시)**: CLAUDE.md 2건 — 이 지시서와 함께 적용됨.

### 6.2 모듈성/재사용성

1. **위젯의 packages 승격은 하지 않는다** — 근거: (a) 데스크톱은 WebView가 web을 통째로 로드(옵션 A)
   하므로 위젯 공유가 이미 달성됨, (b) RN 공유 범위는 core/api/ai로 확정, React DOM 컴포넌트는 RN에서
   재사용 불가 — 승격해도 소비자가 apps/web 하나뿐(YAGNI). RN이 실제로 공유할 것은 위젯의 데이터
   로직(낙관적 업데이트 등)이며, 이는 **Phase 14 직렬 구간에서 훅(useTodos 등)으로 추출**한다.
   지금 추출하면 api에 react peer dep이 생기는 비용만 선불.
2. **packages/ui 확장 전략** (소비처 3회 반복 임계치 기준):
   - Toast, Spinner/Skeleton: **P1, Phase 6 전** — 동기화 실패 무알림 부채 + 위젯 3개의 로딩/에러
     중복 구현 해소.
   - Dialog(확인 모달), Menu(드롭다운): **Phase 9 직렬 구간** — 페이지 삭제/휴지통 + P10 파괴적 액션
     승인 게이트의 UI 실체.
   - Tooltip/Popover/Tabs 등은 소비처가 생길 때까지 만들지 않는다.

### 6.3 이식성

1. **옵션 A 유지, static export 전환 안 함** — 전환 불가 사유가 구조에 있다: proxy.ts 인증
   게이트(미들웨어), /api/github 서버 키, 향후 /api/ai 프록시(Gemini 키 서버 전용 원칙).
2. **Tauri 오프라인 fallback (P2, Phase 6 또는 13)**: 로드 실패 시 "오프라인입니다 + 재시도 버튼"만
   있는 정적 HTML 1장을 src-tauri에 내장. 오프라인 리스크에 대한 최소·충분 대응.
3. **RN 준비**: 전 패키지가 raw TS 소스 export(`main: ./src/index.ts`) — RN Metro의 모노레포 TS 소스
   소비는 metro.config 조정 필요. **Phase 14 착수 게이트 체크리스트에 1줄 기록**만, dist 빌드
   파이프라인 도입은 하지 않는다(YAGNI).
4. **packages/ai 신설 경계 (Phase 8)**: 단일 패키지 + 2 entry —
   - `@ldd/ai` (기본): 순수 로직(프롬프트 빌더, 청킹, 도구 카탈로그 zod 스키마, /api/ai fetch
     클라이언트). DOM/키 무의존 → RN 공유 가능.
   - `@ldd/ai/server`: Gemini 실호출. **import 허용처는 apps/web/src/app/api/ai/* route만** —
     eslint restricted path 규칙으로 강제.
   - 의존 방향 `apps → ai → api → core`는 CLAUDE.md 3-5 기존 규칙 그대로.

### 6.4 효율성

1. 인메모리 캐시(/api/github 30분 TTL): **현상 유지** — 서버리스 인스턴스별 캐시지만 1인 사용 + 목적이
   공유 토큰 요율 방어이므로 충분. "best-effort, 인스턴스별" 주석 1줄만 추가. Gemini 캐시가 필요해지면
   P10에서 llm_usage 테이블과 함께 DB 기반 재검토.
2. three.js 번들: DuckWidget이 이미 next/dynamic ssr:false로 청크 분리 — 적정. drei tree-shaking
   실태는 P6 착수 시 번들 분석으로 확인 [추정 — 미실측].
3. **Turbo 원격 캐시 연결 (P2)**: Vercel Remote Cache(무료) — CI가 매번 콜드 빌드 중. 15분 작업.
4. CI e2e job의 중복 install/빌드 정리 (P2, Phase 9에서 테스트 증가 시).

### 6.5 스키마 준비 (사고 게이트 안건 — Phase 8/9 착수 시 확정)

**제안: pages는 BlockNote jsonb 통짜 저장, blocks 테이블은 만들지 않는다.**

근거:
- block-per-row 트리가 필요한 이유는 (a) 블록 단위 실시간 협업 — 제외 확정, (b) 블록 단위 권한/동기화
  블록 — 차기. 소비자가 없다.
- BlockNote 네이티브 포맷이 document JSON — 통짜 저장은 load/save 각 1줄, block-per-row는 트리
  분해/조립/순서 관리 코드가 통째로 추가된다.
- 500MB 제약에서도 통짜가 유리: row 오버헤드가 블록 수만큼 곱해지는 것을 피하고 jsonb는 TOAST 압축
  대상. 500MB를 먼저 위협하는 것은 문서가 아니라 임베딩이다.
- 통짜의 약점 3건은 파생 데이터로 해결: 전문 검색 → pages에 tsvector GENERATED 컬럼 + GIN 인덱스,
  백링크 → 저장 시 링크 추출 → page_links(from_page, to_page) 파생 테이블, RAG 청킹 → 텍스트 청크
  단위(블록 단위 아님).

**pages 스키마 골격 (Phase 9 직렬 구간에서 계약 잠금)**:
`pages(id, user_id, parent_id nullable, title, content jsonb, icon, is_public, deleted_at,
created_at, updated_at)` + RLS `user_id = auth.uid()` + `is_public=true` 읽기 예외.
버전 히스토리는 `page_revisions` 스냅샷 + 사용자당 보관 상한.

**임베딩 (Phase 8 게이트 안건)**: Gemini 기본 3072차원은 float32로 벡터당 약 12KB — 500MB 예산에서
수만 청크로 바닥난다. **768차원 축소(+필요시 halfvec)를 기본안**으로 상정.
CONSTRAINTS_FREE_TIER.md의 "임베딩 차원/보관 정책 설계 단계 산정" 항목을 이 게이트로 연결.

**Realtime**: 용도는 협업이 아니라 1인 멀티 서피스(웹 탭 + 데스크톱 위젯) 동기화.
postgres_changes 구독 → invalidate-and-refetch. 세밀한 patch/presence/broadcast는 만들지 않는다.
에디터는 last-write-wins + updated_at 비교로 충돌 감지 시 Toast 경고. 구독 헬퍼는 packages/api에
1개(`subscribeTable`) — 소비처 2곳 이상 생기는 P7~9에서 도입.

---

## 7. 기술 부채 상환표

| 등급 | 항목 | 파일/근거 | 상환 시점 |
|---|---|---|---|
| P0 | CLAUDE.md 불일치 2건 (static export, Tauri Release) | CLAUDE.md 2절 | **이 지시서와 함께 적용됨** |
| P0 | Phase 5 T4 잔여 사용자 검증 2항목 (로그인 필요) | docs/Status.md | 즉시 (사용자) |
| P0 | activity_daily 마이그레이션 `supabase db push` 적용 확인 | supabase/migrations/20260721000000 | 즉시 (사용자 확인 후) |
| P1 | 동기화 실패 무알림 → Toast 도입과 함께 해소 | apps/web/src/components/DesktopCollectorSync.tsx | Phase 6 전 |
| P1 | upsertActivityDaily 입력 zod 검증·count 상한·updated_at 미갱신 | packages/api/src/activity.ts | Phase 6 전 (한 커밋) |
| P1 | Rust symlink 미검증 (find_session_files) | apps/desktop/src-tauri/src/collector/mod.rs | Phase 6 전 |
| P1 | 커버리지 측정 부재 + vitest.config 부재 | 루트 (6.1절) | Phase 6 전 |
| P1 | SEC-04: auth callback `next` 파라미터 `/` 시작 검증 (1줄) | apps/web/src/app/auth/callback/route.ts, docs/reviews/2026-07-20.md | Phase 6 전 |
| P1 | Supabase 7일 pause 방지 keepalive 워크플로 (15분 작업) | docs/CONSTRAINTS_FREE_TIER.md 1절 | Phase 6 전 권장 |
| P1 | 에러 계약 부재 → LddError 최소 도입 | packages/api/src/*.ts, packages/core (6.1절) | Phase 8 전 |
| P2 | style-src unsafe-inline (전면 nonce 전환) | apps/web/src/proxy.ts | Phase 9 재평가 (인라인 style 관례를 버릴 때만 의미) |
| P2 | 테마 토글 UI | packages/ui/src/tokens.ts (토큰은 완비) | Phase 7 또는 13 |
| P2 | apps/web vitest 인프라 | apps/web/package.json | Phase 9 직전 |
| P2 | Tauri 오프라인 fallback 페이지 | apps/desktop/src-tauri | Phase 6 또는 13 |
| P2 | Turbo 원격 캐시 + CI e2e 중복 정리 | .github/workflows/ci.yml | Phase 9 |
| P2 | Sentry 연동 (이월) | docs/DECISIONS.md 9절 | Phase 13 |
| P2 | 관리자 승인 가입 워크플로 | docs/DECISIONS.md 9절 | Phase 12~13 |

---

## 8. 로드맵 정합

**결정: Phase 순서 유지. 재정렬·별도 트랙·하드닝 Phase 신설 전부 기각.**

- 재정렬 기각: 6(오리2)→7(게임화)→8(AI1)→9(에디터) 순서는 승인된 매핑이고, P6~8이 P9보다 작아 순서
  변경의 실익이 적다. 오리 차별화 모멘텀도 유지.
- 별도 트랙 기각: 1인 개발에서 트랙 병행은 허구.
- 하드닝 Phase 기각: 기능 없는 순수 하드닝 Phase는 리듬을 끊는다. 기존 프로세스에 삽입 지점이 이미
  2개 있다 — (a) 각 Phase 착수 전 사고 게이트, (b) Phase 종료 시 /review.

**삽입 방식**:
1. **Phase 6 착수 게이트 확장**: 7절 P1 중 "Phase 6 전" 항목 전건(Toast/Spinner, activity.ts 3건,
   Rust symlink, 커버리지 측정, SEC-04, keepalive)을 phase_06.md 서두 "착수 조건"에 명기.
   합쳐서 1~2세션 규모 — Phase로 승격할 크기가 아니다.
2. **Phase 8 착수 전 구조 준비 게이트**: pages jsonb 통짜(6.5절, ARCHITECTURE.md 5절 골격 수정),
   packages/ai 2-entry 경계(6.3절), 임베딩 차원 768(6.5절), LddError 완료 확인(6.1절) — P8~10에서
   필요한 계약을 이 게이트에서 한꺼번에 잠근다. 기존 [직렬: 계약 잠금] 구간 규칙에 부합.
3. **Phase 9 = 워크스페이스 코어 재정의**: 5.1절 9개 항목을 범위로 phase_09.md 신규 작성.
4. **UX 부채 횡단 체크리스트**: 테마 토글·반응형·접근성·빈 상태는 특정 Phase에 묶지 않고 각 Phase
   종료 게이트(/review)에서 1~2건씩 소화.
5. P2는 각 관련 Phase의 직렬 구간에 배정 (7절 상환 시점 열 그대로).

**계약을 지금 미리 만들지 않는 것**: pages/embeddings/ai req-res의 zod 스키마 자체는 각 Phase 직렬
구간이 계약 잠금 지점이라는 기존 규칙(CLAUDE.md 3-3)대로 그 시점에 작성한다. 지금 만들면 Phase 8
착수 시점의 실측(Gemini 한도, BlockNote 버전)과 어긋난 추측 계약이 된다.

---

## 9. 후속 문서 갱신 목록

| 문서 | 갱신 내용 | 시점 |
|---|---|---|
| CLAUDE.md | 불일치 2건 정정 | 이 지시서와 함께 적용됨 |
| docs/DECISIONS.md 5절 | 노션 2025 대비 재검토 기록 + 미배정 5건 배정 | 이 지시서와 함께 적용됨 |
| docs/ARCHITECTURE.md 5절 | blocks 항목에 jsonb 통짜 검토 표기 (게이트 확정 전이므로 표기만) | 이 지시서와 함께 적용됨 |
| docs/Status.md | 지시서 링크 + Phase 6 착수 조건 참조 | 이 지시서와 함께 적용됨 |
| docs/plans/phase_06.md | 착수 조건에 7절 P1 목록 반영 | Phase 6 계획 수립 시 |
| docs/plans/phase_09.md | 5.1절 워크스페이스 코어 범위로 작성 | Phase 9 계획 수립 시 |
| CLAUDE.md | 커버리지 목표 수치 명문화 | 커버리지 측정 도입 후 |

---

## 미검증 항목 (표기 규칙 준수)

- 노션 2025 기능셋 스냅샷은 학습 지식 기준 [추정] — 세부 기능 명세는 공식 문서 대조 미실시.
- drei tree-shaking 실태는 번들 분석 미실시 [추정] — P6 착수 시 확인.
- Rust collector의 symlink 부채는 phase_05.md 리뷰 기록 기준 [확인됨-문서] — 소스 재검증은 상환 시.
- 요약 통계(26축 판정 수)는 2절 매트릭스 집계 [확인됨].
