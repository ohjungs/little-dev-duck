# Status.md — 현재 Phase 진행 현황

> **`/loop` 자율 세션(2026-07-24 04:2x~ 시작) 진행 중**: 코드 완결 가능한 노션-격차/이월 기능을 STDD+ponytail로
> 연속 구현·커밋(각 tsc+eslint+테스트 GREEN). **푸시·배포 정책: 6시간 간격.**
> **1차 배포(~06:55 KST)**: 21개 기능 + 리뷰 수정 배치. 검증=리뷰(code+security, CRITICAL 0, HIGH/MEDIUM
> 전건 수정) + 테스트 + web tsc + 전체 eslint + next build GREEN. push 직후 CI red(api 빌드 tsc가 테스트 파일
> 포함 — pages.test 뷰 픽스처 sort/filters 누락) 발견·즉시 수정 → CI green. **교훈: core 계약 변경 시 전 패키지
> tsc 필수**(메모리 기록).
> **2차 배포(~07:35 KST)**: DB 열숨기기·팔레트 최근페이지·보드 select 칩·단축키 도움말 4개. 검증=전 패키지 tsc
> (core/api/ai/mascot) + 테스트 423(core 197/api 211/ai 10/mascot 5) + web tsc + eslint + 프로덕션 next build GREEN.
> **누적 25개 기능 배포.** 이후 배포는 **6시간 간격 또는 검증된 배치가 쌓일 때**. cron 워치독(1분)이 세션 중단 시
> /next-step으로 재개. 완료 기능 요약은 아래 각 Phase "후속" 항목 및 커밋 로그(git log) 참조.
> **중간 리뷰(2026-07-24, 20커밋 누적 diff)**: code-reviewer + security-reviewer 병렬 실행. **CRITICAL/배포차단 0건.**
> HIGH 1건(낙관적 업데이트 stale rollback — 실패 응답이 그 사이 성공한 최신 편집을 덮어씀) + MEDIUM 3건
> (에러 타이머 미취소, addFilter MAX_FILTERS 미가드, CSV 수식 인젝션) + 보안 선택 1건(RSS href 스킴) **전부 수정**.
> stale rollback은 함수형 업데이터로 "현재값==내가 설정한 값일 때만 롤백"으로 해소. 전체 테스트 422 GREEN
> (core 196/api 211/ai 10/mascot 5) + web tsc + 전체 eslint GREEN.

현재 Phase: **Phase 13(상용 마감) — T1~T4 코드 완료(2026-07-24, `/loop` 인계 세션). T1 온보딩 튜토리얼,
T2 키보드 접근성(전역 focus 링+공용 모달 훅+스킵 링크), T3 계정 데이터 파기 1단계(security-definer RPC
+위험구역 UI, 강한 확인 게이트), T4 공개 랜딩(/welcome, 비로그인 리다이렉트 대상). T5 Sentry·T6 i18n은
인프라·범위로 이월. Phase 12(공개 공유+알림+대시보드) T1~T5 코드 완료(T6 대시보드 이월, 최종 리뷰 대기).
Phase 11(DB 뷰) T1~T5 완료·배포. Phase 10은 코드 완료.
미적용 마이그레이션 db push 대기: pages_db_view(11), pages_public_share(12 T1), delete_all_my_data(13 T3).
Phase 완료분은 사용자 db push + 실기 검증만 남음(코드는 전부 배포됨).**

**인계 경위(2026-07-24 01:00~)**: 먼저 돌던 `/loop` 세션이 Phase 13 T1 커밋(01:00) 후 27분간 정지 →
두 번째 `/loop` 세션(사용자 새로 지시)의 워치독이 죽음으로 판단하고 개발 인계. 같은 폴더 공유(worktree
격리 없음)라 병렬 편집 대신 단일 세션 인계로 진행. **목표(Phase 17까지) 도달** — 인계 세션이 Phase 13
T2~T4 + Phase 14 스코프 + Phase 15/16/17 코드 슬라이스를 순차 구현·커밋. 각 Phase의 인프라/기기/OAuth/
DDL 필요분(db push 4건 등)은 이월(사용자 몫). 로드맵 Phase 1~17 전부 최소 1개 슬라이스 코드 완료 상태.
Phase 1~9 전부 완료. `supabase db push` 2건 사용자 적용 확인(Supabase MCP로 직접 재확인 완료 —
마이그레이션 18개 전부 local==remote, `user_google_tokens`/`action_log` 테이블 RLS 켜진 채 존재).
계획 문서: docs/plans/phase_01~10.md, 리뷰 스냅샷 docs/reviews/2026-07-21-phase5.md·2026-07-22-phase9.md.

**T3 실기 검증 경과(2026-07-23, 사용자+세션 협업)**: 오리 대화창 통합(단일 DuckChatPanel) 배포 후 사용자가
직접 시도하며 실회귀 4건을 순차 발견 → 전부 그 자리에서 수정·배포. Google Calendar MCP로 사용자 실제
캘린더를 직접 조회해 "코드는 성공을 반환했는데 실제로 반영 안 됨" 부류의 버그까지 검증 가능했던 게 큰 도움.
1. **Google Cloud OAuth 재설정**: 기존 클라이언트를 찾지 못해 사용자가 새 GCP 프로젝트에 OAuth 클라이언트
   신규 발급 → Supabase Google 프로바이더 Client ID/Secret 교체. **캘린더 API 활성화 누락**으로 403 발생
   → 사용자가 활성화.
2. **routeUtterance 버그**: "내일 회의잡아줘"류 짧은 명령문이 키워드 매칭 없이 길이<=12 폴백에 걸려 rule로
   분류돼 Gemini 호출 자체가 안 됨 → "~줘" 어미를 QUESTION_HINT에 추가(8b1d8b1).
3. **thoughtSignature 유실**: gemini-flash-latest가 함수 호출 응답에 얹는 thoughtSignature를 우리 코드가
   모델 turn을 재구성하며 빠뜨려 도구 루프 2회차에서 400 → 파싱 재조립 대신 Gemini가 준 parts를 그대로
   되먹이도록 수정(d42a9fa).
4. **RAG 지침이 액션을 억누름**: buildRagContext의 "[사용자 자료]에 없으면 모른다고 답하라"가 도구 카탈로그가
   있어도 액션 요청을 거절하게 만듦 → 카탈로그가 있을 때만 "액션 요청엔 도구 우선" 지침 추가(a8a8e05).
5. **날짜/지속시간 버그(Google Calendar API 직접 조회로 발견)**: "내일" 요청이 실제로 11일 뒤 날짜에,
   시작=종료(0초) 일정으로 생성됨 — LLM이 오늘 날짜를 모름 + 종료시각 필수라 모델이 start로 채움.
   매 턴 오늘 날짜(KST) 명시 + 종료시각 선택화·서버가 시작+1시간 기본값 결정론적 보정으로 수정(a8a8e05).
6. **부가 기능(사용자 요청)**: GitHub 로그인 사용자도 Google Calendar 별도 연동 가능하도록 Supabase
   Identity Linking(`linkIdentity`) 적용 — 설정 페이지에 연동 버튼 추가(a8a8e05).
7. **쿼터 소진이 "명령 이해 못함"으로 위장**: quota_exceeded를 status:"rule"로 매핑하던 Phase 8 원칙이
   액션 요청까지 덮으면서, 실제로는 llm 라우팅됐는데도 매번 rule 캔 답변만 나가 원인 파악이 어려웠음
   (routeUtterance 직접 재테스트로 로직 자체는 정상임을 먼저 확인, Vercel 런타임 로그로 200+무로그 패턴
   확인 후 특정). status:"unavailable"으로 분리해 실제 원인을 안내하도록 수정(32fe5e2).
8. **불명확한 요청에 값을 지어내 바로 실행**: 시각·제목 등을 명시하지 않아도 오리가 임의값(예: "10시")을
   채워 바로 도구를 호출함 — TOOL_PREFERENCE_GUARD에 "정보가 불명확하면 먼저 되물어라" 지침 추가(efbe9b1).

**T3 검증 통과 확인(2026-07-23, 사용자)**: 위 8건 전부 수정 반영 후 사용자가 "잘됐다"고 확인. Google
Calendar 어댑터 end-to-end(계약→토큰→라우트→승인카드→실제 Google API 반영→감사로그) 전부 실사용 검증
완료로 T3 종결. **다음 세션: T5(두 번째 어댑터) 또는 T6(Gmail, 격리) 착수** — phase_10.md Task 초안
참조해 어댑터 후보 확정(GitHub 이슈/Notion 등) 후 계약 잠금·구현.

## Phase 17 — 픽셀 오리 오피스 상호작용 — 플레이어 조작 슬라이스 (2026-07-24, `/loop` 인계)

Phase 16 웹 오피스 위에 조작·상호작용·동적배치. 순수함수는 core, STDD 검증. 상세는 phase_17.md "구현 현황".

- [x] T1 플레이어 조작: core `movePlayer`(그리드 스냅·충돌·경계) + 캔버스 포커스 게이트 키입력(방향키/WASD,
  화살표 preventDefault). 카메라 팔로우는 맵=뷰포트라 불필요. 4방향 스프라이트 이월(절차 오리+👑).
- [x] T2 상호작용: core `isAdjacent`+`describeActivity`(LLM 없이) → 근접 "E: 말 걸기" → 대화 패널.
- [x] T3 동적 레이아웃: core `deskSlots`(한 줄 최대 3) → +/− 직원 1~6명, 위치·상태 유실 없이 재배치.
- 검증: core office-play 12 tests + web build GREEN. 실기(조작 감·포커스)는 사용자 몫.

## Phase 16 — 픽셀 오리 오피스 기반 — 웹 렌더링 슬라이스 (2026-07-24, `/loop` 인계)

원설계는 apps/desktop(Tauri) 위였으나 sidecar WebSocket·hooks·스프라이트 에셋은 데스크톱/MCP 필요라
이월하고, 웹에서 완결 가능한 계약·렌더링·상호작용을 구현. 상세는 phase_16.md "구현 현황".

- [x] T2 이벤트 계약: core `office-event.ts`(officeEventSchema+parseOfficeEvents JSONL malformed 스킵). 5 tests.
- [x] T6 상태 매핑: core `eventToState`(도구→상태 데이터 테이블, 미지 도구 idle 폴백).
- [x] T4 렌더링: web `PixelOffice`(Canvas 2D 오피스, 캐릭터 바이블 색 절차적 오리, 상태 애니메이션, 유휴
  퇴근, ~11fps 캡, reduced-motion 준수). T1 결론: 자체 구현(OSS 포크 불필요, PixiJS 미도입).
- [x] T7 배치+클릭: PDCA 4오리 고정 책상 + 클릭 히트테스트 말풍선(LLM 없이). `/office` 라우트+네비.
- [x] 데모 구동: 시뮬레이터가 OfficeEvent 계약대로 이벤트 생성(실 Claude Code 이벤트는 같은 스키마로 연결).
- [x] T7 더블클릭 로그 패널(2026-07-24, `/loop` 자율): 시뮬레이터 이벤트를 bounded 로그(최근 30건,
  ring buffer)로 누적 → 캔버스 더블클릭으로 "활동 로그" 패널 토글(역할·도구·파일·오류·상대시간,
  스크롤). rAF 틱에서 setLog(상한 slice), performance.now 기준 상대시간. 검증 web tsc GREEN.
- [ ] 이월: T3 Tauri sidecar WebSocket 중계·토큰보안·스로틀링(데스크톱), T2 실 hooks/JSONL 소스, T5
  스프라이트 에셋(절차 드로잉 대체), 리소스 예산 자동 하향 실측.
- 검증: core tsc+5 tests + web build GREEN.

## Phase 15 — 뉴스 브리핑 파이프라인 — 수집·요약·리더 슬라이스 (2026-07-24, `/loop` 인계)

무인 실행 제약상 Gmail 발송·GitHub Actions 스케줄러·기기 검증 필요분은 이월하고, 코드로 완결 가능한
수집→요약→리더 수직 슬라이스 구현. 계획·이월 목록 상세는 phase_15.md "구현 현황".

- [x] T1 수집: 마이그레이션 `20260724140000_news`(feeds/articles+RLS+UNIQUE 중복차단+delete_all_my_data
  갱신+rollback) + core `news.ts`(normalizeUrl·parseRssItems RSS2.0/Atom·스키마, 6 tests) + api
  `collectFeed`(중복 23505 스킵, 연속 실패 자동 paused, SHA-256 해시, 6 tests). 본문 전문 미저장.
- [x] T2 요약: api `summarizeArticle`(Gemini 3줄, 클릭베이트 배제)+`setArticleSummary`. 수집 라우트가
  실행당 최대 8건 요약(쿼터 보호, 소진 시 부분 성공).
- [x] T6 일부: `/news` 리더(피드 추가/일시정지/삭제 + 지금 수집 + 3줄 요약 기사 목록) + `/api/news/collect` + 뉴스 탭.
- [x] T3 클러스터링(2026-07-24, `/loop` 자율): core `news-cluster.ts` — 토큰 Jaccard + union-find
  단일연결 군집화(무의존성 순수함수, 제목+스니펫 토큰화, threshold 기본 0.4). +10 tests. web
  `NewsReader`에 "관련 기사 묶기" 토글(다중 멤버 군집만 시각 그룹, 다중 군집 있을 때만 버튼 노출).
  ponytail: 형태소 분석·임베딩 없이 헤드라인 묶기 수준 — 부족하면 pgvector 임베딩으로 승격.
- [x] T7 스크랩→노트(2026-07-24, `/loop` 자율): 기사 카드 "노트로 스크랩" 버튼 → `createPage`로
  새 페이지 생성(제목=기사 제목, 본문=요약/스니펫 문단+원문 링크 문단, 아이콘 📰). BlockNote 최소
  PartialBlock 구성(서버가 plain_text 파생 → 검색·RAG에도 자동 편입). news→pages 시스템 연결.
  검증 web tsc GREEN.
- [x] T6 일부 — 기사 검색(2026-07-24, `/loop` 자율): NewsReader에 클라이언트 사이드 기사 검색
  (제목·요약·스니펫 부분일치) — 목록·군집 모두 필터 결과 기준, 결과 카운트(N/전체) 표시, 빈 결과 안내.
- [x] T6 일부 — 읽음 상태(2026-07-24, `/loop` 자율): `lib/readArticles.ts`(localStorage, 순수 `markInList`
  분리, 상한 500). 원문 링크 클릭/스크랩 시 읽음 표시 → 읽은 카드 흐리게 + "안 읽음만" 토글(읽은 기사가
  있을 때만) + "모두 읽음"(순수 `markManyInList`, 1회 저장). 순수 web. 검증 web tsc GREEN.
- [ ] 이월: T4 Gmail 발송·스케줄러, T5 발송 알림·아침 브리핑, T6 폴더·음소거·온보딩.
- 검증: core tsc+6 tests / api tsc+6 tests + web build GREEN. **db push(news) + 실기 검증(사용자).**

## Phase 14 — React Native (모바일) — 스코프+이식성 감사 (2026-07-24, `/loop` 인계)

배정 기능 항목 없음(플랫폼 포팅 단계). 이식성 감사: core/api/ai 모두 브라우저/노드 전용 참조 0건 →
RN 재사용 가능(UI 층만 새로 그림). Expo 스캐폴드·기기 검증은 무인 실행 부적합이라 사용자 참여 세션
이월(대형 의존 추가로 다른 Phase 빌드 깨질 위험 + 시뮬레이터 필요). Task 분해는 phase_14.md.

## Phase 13 — 상용 마감 (랜딩, 온보딩, 접근성, 계정) — T1~T4 코드 완료 (2026-07-24, `/loop` 인계)

계획: docs/plans/phase_13.md. 인프라 선행 없는 self-contained 순서로 T1→T2→T3→T4.

- [x] T1 온보딩 튜토리얼(원 세션, 01:00): 최초 방문 오리 안내 오버레이 + 샘플 데이터 생성, localStorage 1회.
- [x] T2 키보드 접근성: globals.css 전역 `:focus-visible` 링(--ring, shadcn ring과 비충돌) + 공용 훅
  `useModalA11y`(Esc 닫기·포커스 진입/복원·Tab 트랩)를 VersionHistory·OnboardingOverlay에 연결
  (CommandPalette는 이미 처리돼 미변경) + (app) 레이아웃 스킵 링크. 검증 web tsc GREEN.
- [x] T3 계정 데이터 파기 1단계: 마이그레이션 `20260724130000_delete_all_my_data`(security-definer 함수,
  15개 데이터 테이블 원자 삭제, profiles 보존=계정 유지) + api `deleteAllMyData`(스토리지 첨부 best-effort
  정리+RPC, +4 tests) + web `DangerZone`(설정 위험구역, `삭제합니다` 타이핑 강한 확인→삭제→로그아웃).
  **db push 필요** + 실기 검증 필요.
- [x] T4 공개 랜딩: `/welcome`(비대칭 히어로+기능 베이토+CTA 밴드, 오리 로고, design-quality 준수) +
  proxy.ts 비로그인 리다이렉트 `/login`→`/welcome`(로그인은 랜딩 CTA로) + PUBLIC_PATHS에 `/welcome`.
- [ ] T5 Sentry PII 스크러빙 — Sentry 계정 미생성이라 이월(사용자 인프라).
- [ ] T6 i18n — 범위 큼, 로드맵 후반 이월.
- 검증: core 126 / api 198 tests + web tsc·build GREEN. **db push 1건(delete_all_my_data) + 실기 검증(사용자).**

## Phase 12 — 공개 공유 + 알림 4채널 + 대시보드 — T1 코드 완료 (2026-07-24, `/loop` 자율)

착수: 로드맵 다음 순번(Phase 11 완료 후). 계획: docs/plans/phase_12.md(6항목 스코프, 슬라이스 순서).

- [x] T1 공개 페이지 공유: 페이지를 "웹에 공개"하면 `/p/<slug>`에서 **비로그인**도 읽기 전용 조회.
  - **보안 설계(핵심)**: anon 키로 pages에 공개 SELECT 정책을 열면 누구나 is_public 행을 전량
    열거(enumeration)해 타인 공개 페이지를 덤프 가능. → **security-definer RPC** `get_public_page(slug)`로
    요청한 slug 한 건만 반환(목록/열거 불가). search_path 고정, anon/authenticated에만 execute grant.
    새 env·service role 불필요(무료 원칙).
  - 마이그레이션 `20260724120000_pages_public_share`(pages에 is_public/public_slug + get_public_page 함수
    + rollback). core pageSchema에 isPublic/publicSlug(하위호환 기본값).
  - api: `publishPage`(추측 불가 랜덤 slug 발급, 멱등) / `unpublishPage`(is_public=false + slug 제거로
    링크 무효화) / `getPublicPage`(RPC 매핑). +5 tests.
  - web: BlockEditor에 `editable` prop(공개 뷰 read-only 재사용) + PageEditor "웹에 공개/링크 복사/공개
    취소" 토글 + `/p/[slug]` 라우트(`PublicPageView`, RPC 조회→read-only BlockNote) + proxy.ts
    PUBLIC_PATHS에 `/p` 추가(미들웨어 인증 게이트 통과).
  - 검증: core 135 / api 194 tests + web build·eslint(진행 중). **db push 필요(pages_public_share)** +
    **사용자 실기 검증 필요**(페이지 공개→링크 복사→시크릿창/로그아웃 상태로 열어 읽기 전용 확인,
    공개 취소 후 링크 무효 확인).
- [x] T2 방해금지 시간대(DND): 지정 시간대엔 오리가 유휴 혼잣말을 안 함(밤엔 오리도 잔다). ponytail —
  프로필 테이블/서버 없이 localStorage 저장(Tauri 위젯도 같은 배포 origin이라 web↔위젯 공유). core
  `isQuietHour`(자정 넘김 구간 처리, +3 tests) + mascot Duck에 `quietHours` prop(idle 억제, ref로 최신값
  구독) + web `lib/quietHours.ts`(localStorage+커스텀 이벤트) + `QuietHoursSetting`(설정 카드) + DuckWidget
  배선(이벤트로 즉시 반영). 다른 기기 동기화는 후속(프로필 서버 저장).
- [x] T3 헬스체크 화면: 설정 페이지 "서비스 상태" 카드가 `/api/health`를 조회해 Supabase 도달성
  (GoTrue /auth/v1/health, 5초 타임아웃) + Gemini 키 구성 상태를 표시. Gemini는 실제 호출이 무료 한도를
  소진시키므로 키 존재만 확인(핑 안 함). 스키마·계약 변경 없음. (무료 한도 실시간 소진 감지는 사용량
  추적 필요라 후속.)
- [x] T4 알림(브라우저 네이티브 채널): 오리가 레벨 업 등 주요 순간을 OS 알림으로 알린다. **T2 방해금지
  + 하루 총량 상한 준수** — core `nextDailyCount`(날짜 리셋+상한, +4 tests) + web `lib/notify.ts`
  (`notifyDuck`가 권한/방해금지(isQuietHour 재사용)/일일 상한 통과 시에만 발송) + `NotifySetting`(권한
  상태·켜기 버튼) + DuckWidget 레벨업에 배선 + 설정 카드. localStorage 저장(ponytail). 알림 히스토리
  "통합 센터"(과거 목록)는 후속.
- [x] T5 공유용 성과 카드: 오리 + 레벨/XP/먹이를 Canvas 2D로 그려 PNG로 저장(라이브러리 없음).
  DuckWidget "성과 카드" 버튼 → 모달 → 이미지 저장. duck-logo.png 같은 origin이라 캔버스 taint 없이
  toBlob 가능. 스키마·계약 변경 없음.
- [x] T6 요약 대시보드(2026-07-24, `/loop` 자율): core `dashboard.ts`(dashboardSummary 순수함수 —
  할 일 완료/미완료, 카운트 패스스루, XP→레벨 파생, +3 tests). web `/insights`(통계) 라우트 +
  `InsightsView`(listTodos/pages/memos/habits/articles/getDuckState 병렬 조회 → 집계 → 스탯 타일 7종)
  + AppNav "통계" 탭. 캐시-원본 정합성 검증(원 T6 취지)은 후속. 검증 core +3 tests·tsc + web tsc GREEN.
- **Phase 12 상태: 배정 6항목 전부 완료(T1~T6). T6 대시보드 슬라이스 추가로 마감.**

## Phase 11 — DB 뷰 (표/보드) — T1~T5 완료 (2026-07-23, `/loop` 자율)

착수: 사용자 `/loop /next-step` "현재 Phase 완료 시 다음 Phase 스코프해 Phase 17까지 진행". Phase 10은
코드 완료(남은 건 사용자 db push·OAuth 실기 검증 = 대신 못 함)라 뒤로 미루고 다음 순번 Phase 11 착수.
계획: docs/plans/phase_11.md. **설계 판단(ponytail): 데이터베이스를 새 테이블로 만들지 않고 `pages`에
얹는다** — db_schema가 설정된 페이지=데이터베이스(열+뷰), 그 자식 페이지=행, row_props=행 속성값.
행이 곧 페이지라 트리·검색·휴지통·RAG(Phase 9)를 전부 물려받는다.

- [x] T1 계약 잠금(직렬): core `database-view.ts`(propertyType/selectOption/propertyDef/viewDef/dbSchema/
  rowProps 스키마 + 순수함수 `createDefaultDbSchema`/`coerceRowPropValue`/`groupRowsByProperty`) +
  마이그레이션 `20260723110000_pages_db_view`(pages에 db_schema jsonb·row_props jsonb 컬럼 add + rollback)
  + core `pageSchema`에 dbSchema(nullable default null)/rowProps(default {}) 추가(하위호환 — 기존
  페이지·테스트 그대로 파싱) + api pages.ts 확장(`listChildPages`=행 목록, createPage/updatePage에
  rowProps/dbSchema). STDD: core +9 tests(coerce 타입별·board 그룹핑·기본스키마), api +3 tests.
- [x] T2 표 뷰: `DbTableView`(열 헤더=속성명, 행=자식 페이지, 셀 인라인 편집=`PropertyCell` 타입별
  에디터, 제목 인라인 편집+열기 버튼, "+ 새 행"). PageEditor에 "데이터베이스로 전환" 버튼(db_schema
  null일 때) + db_schema 있으면 본문 아래 `DatabaseView` 렌더 + "+ 속성"(열 추가, 이름+타입).
- [x] T3 보드 뷰: `DbBoardView`(select 속성으로 그룹된 열 + 카드 + **HTML5 드래그로 열 간 이동**, 라이브러리
  없음 + 열별 "+ 새 행"=그 그룹값 프리셋). core `groupRowsByProperty`가 옵션 순서 유지 + "없음" 그룹.
- [x] T4 속성 편집: `DbPropertyMenu`(표 헤더 클릭 팝오버) — 이름변경/타입변경/삭제 + select 옵션
  추가·제거. 삭제 시 그 속성으로 그룹하던 보드 뷰 groupBy 자동 해제. 이제 사용자가 자기 select 속성에
  옵션을 넣어 커스텀 보드 구성 가능(단 새 뷰 추가·groupBy 변경 UI는 아직 없음 — 기본 상태 보드만).
- [x] T5 code+security 리뷰(병렬 서브에이전트) + 수정: CRITICAL 0. **HIGH 3건 전부 수정** —
  (보안) createPage/updatePage가 db_schema/row_props를 zod 검증 없이 저장하던 것 → 쓰기 전
  dbSchemaSchema/rowPropsSchema.parse로 검증(잘못된 모양이 저장돼 읽기 경로 fromRow의 엄격 파싱을
  터뜨려 워크스페이스 목록 전체가 안 뜨던 자가-DoS 차단). 추가로 fromRow도 safeParse로 관대하게 —
  파싱 실패 필드만 null/{}로 강등해 목록이 항상 뜨게(이중 방어). (코드) 낙관적 업데이트 실패를 조용히
  삼키던 것 → persistRowProps/handleTitleChange/스키마편집에 catch+롤백+에러 표시, listChildPages
  실패를 "행 0개"와 구분. (코드) select→비select 타입 변경 시 보드 groupBy 미해제로 보드가 붕괴하던
  것 → handleEditProperty가 타입 변경 시에도 groupBy 해제. MEDIUM: row_props/db_schema 크기·개수
  상한(ROW_VALUE_MAX 2000/속성 50/뷰 20/행속성 200) + 입력 maxLength, 보드 onDragEnd로 하이라이트
  잔상 제거, coerceRowPropValue 숫자 공백→null. **회귀 테스트 추가**(core 135 / api 189).
  - **이월(알려진 제약)**: (MED) 속성/옵션 삭제 후 row_props 고아 키는 groupRowsByProperty가 "없음"으로
    흡수해 무해 — 명시적 정리는 후속. (MED, 추정) 같은 행 다중 셀 초고속 연타 시 전체객체 PATCH 순서
    미보장 — 개인 단일 사용자라 낮음. (LOW) 보드 카드 이동 키보드 대안 없음 — 표 뷰 select로 접근 가능.
- 검증: core 135 / api 189 tests + web build + eslint GREEN(리뷰 반영 후 재실행). **db push 필요
  (pages_db_view)** + **사용자 실기 검증 필요**(페이지→데이터베이스 전환→표/보드에서 행 추가·속성 편집·
  드래그 이동 확인).
- [x] 후속 — 필터·정렬(2026-07-24, `/loop` 자율): core `sortRows`/`filterRows` 순수함수 +
  `viewDefSchema`에 sort/filters 하위호환 확장(기존 db_schema jsonb에 없으면 null/[] 기본값 —
  **마이그레이션 불필요**). 제목·모든 속성 대상, 빈 값은 방향 무관 맨 뒤 정렬, 필터 연산자 7종
  (equals/not_equals/contains/gt/lt/is_empty/is_not_empty, 타입별 UI 노출) AND 결합. web
  `DbViewToolbar`(정렬 팝오버 + 필터 빌더, 값은 blur 커밋으로 키입력마다 저장 방지) → DatabaseView가
  `filterRows→sortRows`로 표시행 파생(원본 불변, 표·보드 공통). 뷰별 저장(다른 뷰 불변). 검증 core
  +11 tests(23 total)·tsc GREEN + web tsc GREEN.
- [x] 후속 — select 옵션 색상(2026-07-24, `/loop` 자율): core `SELECT_COLORS` 8색 팔레트(색 이름만,
  CSS 매핑은 UI). web `lib/selectColors.ts`(색→Tailwind 정적 리터럴 클래스, 미지의 색 gray 폴백,
  라이트/다크 대응). DbPropertyMenu 옵션별 색 점+스와치 피커, DbBoardView 열 헤더 색 칩, PropertyCell
  select 셀 앞 색 점. 스키마 color는 자유 문자열 유지(하위·전방호환). 검증 core·web tsc GREEN.
- [x] 후속 — 뷰 관리(2026-07-24, `/loop` 자율): "+ 뷰"로 표/보드 뷰 추가(board는 첫 select 속성으로
  자동 그룹, 없으면 표처럼 렌더, MAX_VIEWS 20 상한), "이 뷰 삭제"(최소 1개 유지), board 활성 뷰의
  "그룹 기준" select로 groupByPropId 실시간 변경. 정렬·필터가 뷰별로 저장되므로 이제 이름 붙인
  저장 뷰(여러 표/보드 + 각자의 정렬·필터·그룹)를 구성 가능. 검증 web tsc GREEN.
- [x] 후속 — 행 삭제(2026-07-24, `/loop` 자율): 표 행 hover 시 삭제 버튼, 보드 카드 hover 시 삭제 버튼.
  행=자식 페이지라 `softDeletePage`(휴지통, 복구 가능) — PageWorkspace 트리 삭제와 동일 무확인 낙관적
  패턴, 실패 시 함수형 롤백. 검증 web tsc GREEN. (행 추가만 되고 삭제 UI가 없던 기능 갭 해소.)
- [x] 후속 — CSV 내보내기(2026-07-24, `/loop` 자율): core `db-export.ts`(rowsToCsv 순수함수 — RFC 4180
  이스케이프, select=옵션명·checkbox=예/빈·number=값, +4 tests). DatabaseView "CSV" 버튼이 현재 뷰
  (필터·정렬 반영)의 행을 BOM 포함 CSV로 다운로드(엑셀 한글 대응). 검증 core +4 tests·tsc + web tsc GREEN.
- [x] 후속 — 열 표시/숨김(2026-07-24, `/loop` 자율): `viewDefSchema`에 `hiddenPropIds` 하위호환 확장(jsonb,
  마이그레이션 불필요). 표 뷰 툴바 "열" 팝오버에서 속성별 체크박스로 열 표시/숨김(뷰별 저장). board는
  열 개념이 없어 무시. **계약 변경이라 createDefaultDbSchema·api pages.test 픽스처·core 파싱 테스트의 뷰
  리터럴에 hiddenPropIds 반영 + 전 패키지 tsc 검증**(직전 sort/filters CI 회귀 교훈 적용). 검증 core 197
  tests + core/api/ai/mascot tsc + web tsc GREEN.
- [x] 후속 — 보드 카드 select 칩(2026-07-24, `/loop` 자율): 보드 카드에 select 속성값을 색 칩으로 표시
  (그룹 기준 속성은 이미 열이라 제외, 값 있는 것만). 카드 레이아웃 컬럼화(제목 행 + 칩 행). 노션 카드
  패리티. 순수 web. 검증 web tsc GREEN.
- [x] 후속 — 표 행 개수(2026-07-24, `/loop` 자율): 표 하단에 "N개 행" 표시(필터 시 표시 행 수). 순수 web.
- [ ] 후속: 필터 OR 그룹·정렬 다중키 등 고급. [이월]

## Phase 10 — AI 2단계 (에이전트 액션) — T1~T4·T7 코드 완료 (2026-07-22, `/loop` 자율)

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
  **db push 필요. 범위 컷: 계획 phase_10.md는 내부 `calendar_events`와 동시 반영을 언급했으나 미구현 —
  현재는 Google에만 생성, 내부 테이블 연동은 후속 Task.**
- [x] 승인 카드 UI: `packages/ai` `useAgentChat` 훅(대화 상태+승인대기+approve/cancel) + 신규
  `AgentChatPanel.tsx`(DuckChatPanel과 관심사 분리 — RAG 질답 vs 실제 액션, 홈 위젯 그리드 배치). +3 ai tests.
- [x] T4 인젝션 방어 하드닝 착수(로컬 완결 가능한 부분): `runAgentTurn`에 매 턴 고정 방어 지침(도구 실행
  결과 텍스트=데이터, 지시 아님 — 호출부 누락 방지로 한 곳에 고정) + 승인 카드가 제목뿐 아니라 시작/종료
  시각까지 전부 노출(사용자가 정확히 뭘 승인하는지 투명하게, args는 React 텍스트 렌더링이라 HTML 삽입 없음).
  **외부 텍스트(이메일 등) 구획화는 아직 해당 소스가 없어 대상 없음 — T6 Gmail 착수 시 재검토.**
- [x] T7 감사 로그: core `actionLogEntrySchema`+`summarizeForLog`(args/response 원문 대신 200자 요약,
  토큰/PII 노출 최소화) + 마이그레이션 `20260722090000_action_log`(RLS select+insert only, 불변 레코드+
  rollback) + api `logAction` + `/api/ai/agent/approve`에서 실행 결과별 기록(best-effort, 실패해도 응답
  안 막음). **db push 필요.**
- [x] code+security 리뷰(병렬) + 수정: CRITICAL 0. HIGH 2건 수정 — (1) `executeApprovedCalls`가 배치 중
  하나만 실패해도 통째로 예외를 던져 이미 성공한 결과·감사 로그가 유실되던 것 → per-call try/catch로
  격리(회귀 테스트 추가). (2) Google access_token 만료(~1시간, 갱신 미구현) 시 401→일반 502 "처리하기
  어려워요"로만 응답하던 것 → `googleCalendar.ts`가 401을 `unauthorized`로 구분해 던지고 양쪽 라우트가
  "재연동 필요" 안내로 매핑(회귀 테스트 추가). MEDIUM 1건은 mixed-turn(같은 턴에 readonly+mutating 혼재
  시 readonly 유실) ponytail 주석으로 명시(카탈로그 소규모라 현재는 낮은 우선순위, T5+ 확장 시 재검토).
  action_log id 매칭(별도 발견, 이미 수정 커밋 b61b228)은 security-reviewer도 독립 재확인.
- 검증: core 117(+4) / api 142(+4) / ai 9 tests + web build GREEN + core·api·web 로컬 full eslint 선검증.
- [x] **대화창 UX 통합(2026-07-23, 사용자 지시)**: "오리에게 시키는 건 맨위 대화창에서 자연스럽게" —
  DuckChatPanel(RAG)/AgentChatPanel(액션) 분리가 부자연스럽다는 피드백으로 단일 대화창으로 재병합.
  이전 세션이 "관심사 분리"로 일부러 나눴던 결정(2026-07-22 밤)을 사용자가 명시적으로 뒤집음.
  - core `buildRagContext`(질문 없는 RAG 컨텍스트 블록, `buildRagPrompt`가 이를 재사용하도록 리팩터).
  - api `aiChat.ts`: `answerQuestion` 제거 → `runDuckTurn`(룰 라우팅→RAG 검색→`runAgentTurn`에 컨텍스트를
    systemPrompt로 전달) 신설. Gemini `generateContent`는 tools를 줘도 필요 없으면 그냥 텍스트로 답하므로
    RAG 질답과 도구 호출이 **한 호출·한 엔드포인트**에서 자연스럽게 공존 — 별도 라우트가 불필요해짐.
  - api `agent.ts`: `NO_TOOLS_ADAPTER`(Google 미연동 시 카탈로그 0개로 순수 RAG만) 신설, `runAgentTurn`이
    카탈로그가 비면 `tools` 필드 자체를 생략(빈 functionDeclarations는 Gemini가 거부).
  - `geminiGenerate`(미사용이 된 단순 생성 헬퍼) 삭제.
  - web `/api/ai/agent`: `runDuckTurn` 기반으로 통합(토큰 없으면 NO_TOOLS_ADAPTER + 안내 systemPrompt 주입,
    쿼터 소진은 Phase 8과 동일하게 `status:"rule"`로 조용히 폴백). `/api/ai/chat` 라우트 삭제.
  - ai `useChat`+`useAgentChat` → `useDuckChat` 하나로 병합(`resolveDuckMessage` 순수함수로 rule/final/
    approval_pending/unavailable 분기).
  - web `DuckChatPanel.tsx` 1개로 병합(재인덱싱 버튼 + 승인 카드 모두 포함), `AgentChatPanel.tsx` 삭제,
    홈 대시보드 그리드에서 중복 슬롯 제거.
  - 검증: core 119 / api 141 / ai 10 tests + web build GREEN + core·api·ai·web 로컬 full eslint 선검증.
- [x] **T3 실기 검증(2026-07-23, 사용자+세션)**: Google 재로그인(신규 OAuth 클라이언트 발급 필요했음)→
  provider_token 저장→통합된 오리 대화창에서 일정 생성 시도→승인 카드→실제 Google Calendar 반영까지
  전부 확인(Google Calendar MCP로 세션이 직접 대조). `gemini-flash-latest` function calling 실동작 실측
  완료(phase_10.md 미검증 절 해소) — thoughtSignature 요구 등 실측으로만 드러난 사항 확인·반영.
  과정에서 발견·수정한 8건은 위 "T3 실기 검증 경과" 절 참조.
- [x] **인프라(사용자)**: `supabase db push` 2건 적용을 Supabase MCP(claude.ai 연결)로 직접 재확인 완료
  (2026-07-23) — 20260722080000_user_google_tokens, 20260722090000_action_log 마이그레이션 모두
  local==remote, 테이블 RLS 켜진 채 존재.
- [x] **T5 두 번째 어댑터 — GitHub 이슈**(2026-07-23, `/loop` 자율): Google Calendar와 동일 구조로 확장.
  - core `github-oauth-token.ts`(google-oauth-token.ts 동형이나 expiresAt/refreshToken 사실대로 nullable —
    GitHub OAuth App 기본 토큰은 만료도 refresh_token도 없음).
  - 마이그레이션 `20260723100000_user_github_tokens`(user_google_tokens 동형 RLS 4정책+rollback).
  - api `githubIssues.ts`: `createGitHubIssuesAdapter`(listGithubIssues readonly + createGithubIssue
    mutating, args zod 재검증, 401→unauthorized). `githubTokens.ts`(save/get, googleTokens.ts 동형).
  - **어댑터 합성**: `agent.ts`에 `composeAdapters(adapters[])` 신설 — 카탈로그를 이어붙이고 도구명으로
    올바른 어댑터에 위임(빈 배열이면 NO_TOOLS_ADAPTER). `/api/ai/agent`·`/api/ai/agent/approve`가 이제
    Google Calendar+GitHub 토큰을 각각 조회해 연동된 것만 배열에 담아 합성 — 두 서비스가 한 대화창에서
    동시에 동작(단일 어댑터 가정이던 기존 라우트를 다중 어댑터로 확장).
  - **scope 설계 판단**: GitHub 기본 로그인 버튼(LoginForm.tsx)은 이슈 쓰기 scope(`repo`)를 요청하지
    않는다(로그인용 최소 권한 유지) — Google처럼 `provider==="github"`로 자동 캡처하면 scope 없는 토큰을
    "연동됨"으로 잘못 저장하게 되므로, 설정 페이지의 별도 "GitHub 이슈 연동" 버튼(`GitHubIssuesLink.tsx`)이
    `link=github` 쿼리로 명시할 때만 콜백이 캡처하도록 분기(Google의 `provider==="github"` 자동 캡처
    분기와 다른 판단 — GitHub는 로그인 시 이 scope를 애초에 요청하지 않으므로 그 분기가 성립 안 함).
  - GitHub이 이미 주 로그인이면 `linkIdentity`(동일 provider 재연결)가 거부될 가능성이 있어(미확인)
    `signInWithOAuth` 재로그인으로 처리, 그 외엔 `linkIdentity`로 새 identity 추가. **[확인 필요, 실기
    검증 시]** — Google T3처럼 재로그인 흐름이 실제로 repo scope를 재발급하는지는 실사용으로만 확인 가능.
  - DuckChatPanel `TOOL_LABELS`에 `createGithubIssue` 라벨 추가 + `describeCall`이 owner/repo도 승인
    카드에 노출(어느 저장소인지도 승인 판단에 필요한 정보, CLAUDE.md 5절).
  - `unauthorized` 에러 응답을 어댑터별 고정 문구 대신 `error.message`(어댑터가 이미 담아 던짐) 기반으로
    일반화 — 두 어댑터가 같은 라우트를 공유하므로 어느 쪽이 만료됐는지 하드코딩된 메시지로 구분 불가능해짐.
  - code+security 리뷰(병렬) + 수정: CRITICAL 1건은 이번 diff와 무관(`.mcp.json`의 Supabase MCP
    `--read-only` 제거, 이전 세션 작업으로 추정) — 커밋 대상에서 제외해 분리. HIGH 1건 수정 —
    `githubIssues.ts` owner/repo가 URL 경로에 그대로 삽입돼 `/`·`..` 섞이면 승인 카드에 보인 대상과 실제
    요청 경로가 달라지는 confused-deputy 경로를 GitHub 명명규칙 화이트리스트(zod regex)로 차단(회귀
    테스트 추가). MEDIUM 2건 중 1건 수정 — `upstreamError`가 GitHub/Google 오류도 전부 "gemini"로
    오라벨링하던 것을 `service` 파라미터로 구분(회귀 테스트 추가), 1건은 수용 — GitHub 토큰 저장 시
    실제 부여 scope를 API로 재검증하지 않는 것은 Google 어댑터도 동일한 기존 패턴이라 이번 범위 밖으로
    유보. LOW 1건(`GitHubIssuesLink`의 signInWithOAuth 재로그인 분기가 세션을 통째로 재발급해 사용자가
    GitHub 동의 화면에서 스스로 다른 계정을 고르면 로그인 계정이 바뀌는 위험)은 개인 워크스페이스
    단일 사용자 모델이라 수용, 코드 주석으로 명시 + 실기 검증 시 재확인 항목으로 남김.
  - 검증(리뷰 반영 후 재실행): core 123(+4) / api 168(+25) / ai 10 tests + web build GREEN +
    core·api·web 로컬 full eslint 선검증(전부 clean). **db push 필요(user_github_tokens)** +
    **사용자 실기 검증 필요**(설정 페이지에서 GitHub 이슈 연동 → 오리에게 "OOO 저장소에 이슈 만들어줘"
    요청 → 승인 카드 → 실제 GitHub 반영 확인, GitHub-주로그인 재동의 흐름이 실제로 repo scope를
    재발급하는지 포함).
- [x] **T6 Gmail 어댑터**(2026-07-23, `/loop` 자율): 공식 문서(Gmail API v1 users.messages) WebFetch로
  list/get/trash 엔드포인트 실측 후 착수. Calendar/GitHub과 동일 패턴이나 두 가지 설계 판단 추가.
  - **범위 데스코프**: phase_10.md T0-6 초안의 "1시간 자동 폴링·분류/라벨"은 사용자 개입 없는 자율
    다단계 워크플로라 같은 문서 "하지 않는 것"(자율 다단계 워크플로는 차기)과 충돌 — Calendar/GitHub과
    동일하게 사용자 발화당 단순 도구 호출로 좁혀 착수(`listRecentEmails` readonly + `trashEmail`
    mutating만). 자동 폴링·분류는 후속 이월. **영구삭제는 설계상 아예 도구화하지 않음**(trash 엔드포인트만
    구현, delete 엔드포인트 없음 — CLAUDE.md 5절).
  - **토큰 테이블 분리 원칙 확립**: Calendar와 Gmail은 둘 다 Google 로그인이지만 서로 다른 scope를 별도
    시점에 동의받으므로 `user_google_tokens`를 공유하면 나중에 연동한 쪽이 먼저 것을 덮어쓴다 — GitHub과
    같은 이유로 `user_gmail_tokens`를 신설(어댑터=scope 단위로 테이블 분리, 프로바이더 단위 아님).
  - core `gmail-oauth-token.ts`(google-oauth-token.ts 동형) + 마이그레이션
    `20260723103000_user_gmail_tokens`(동형 RLS 4정책+rollback).
  - api `gmail.ts`: `createGmailAdapter` — `listRecentEmails`(list로 id만 받은 뒤 각각
    get(format=metadata)로 제목/발신자/미리보기만 채움, 본문 전체는 가져오지 않아 프롬프트에 불필요한
    외부 텍스트가 과도하게 실리는 걸 방지)/`trashEmail`(POST .../trash). T5 보안 리뷰에서 지적된
    path-injection 패턴을 선제 반영 — messageId를 영숫자/-/_ 화이트리스트로 검증(회귀 테스트 포함).
    `gmailTokens.ts`(save/get, googleTokens.ts 동형).
  - `/api/ai/agent`·`/api/ai/agent/approve`가 세 번째 어댑터로 합성(`composeAdapters`가 N개로 자연
    확장됨을 실증 — 코드 변경 없이 배열에 추가만 함).
  - web `auth/callback`에 `link=gmail` 분기(Calendar의 `link=google`과 별개 — provider는 같지만 scope와
    저장 테이블이 다름), `GmailLink.tsx`(GoogleCalendarLink.tsx와 동일 패턴, "영구삭제 안 함" 고지 포함),
    설정 페이지 카드 추가.
  - DuckChatPanel: `trashEmail` 라벨 추가 + `describeCall`이 `subject`(messageId만으론 사람이 어느
    메일인지 알 수 없어 표시 전용으로 LLM이 되돌려주는 필드)도 노출.
  - 검증: core 126(+3) / api 181(+13, gmailTokens.test.ts 5건+gmail.test.ts 8건) tests + web build
    GREEN + 로컬 full eslint 선검증. **db push 필요(user_gmail_tokens)** + **사용자 실기 검증 필요**(Gmail 연동 → "최근
    이메일 보여줘"/"OOO 메일 휴지통으로 옮겨줘" → 승인 카드 → 실제 Gmail 반영 + 영구삭제 아님을 육안
    확인).
- [ ] T6 후속: 자동 폴링·분류(데스코프됨, 에이전트 자율 워크플로 전체와 함께 재검토 대상).

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
- [x] **후속 — 페이지 아이콘 이모지**(2026-07-24, `/loop` 자율): `pages.icon` 필드는 있었으나 설정 UI가
  없었음. PageEditor 제목 위 아이콘 버튼 + 큐레이션 40종 이모지 그리드 피커(라이브러리 없음, 즉시
  updatePage 저장·롤백) + "아이콘 제거". PageWorkspace 트리도 아이콘 표시(없으면 FileText 폴백).
  뉴스 스크랩(📰)과 일관. 검증 web tsc GREEN.
- [x] **후속 — 명령 팔레트(T4 확장)**(2026-07-24, `/loop` 자율): Cmd/Ctrl+K 팔레트에 빠른 동작 추가
  (새 페이지 만들기, 뉴스/오피스/설정/통계 이동) — 검색어로 액션도 필터, 액션+최근+페이지를 단일 목록으로
  통합해 ↑↓/Enter 내비게이션. 결과에 페이지 아이콘 표시. 순수 web(스키마·DB 무변경). 검증 web tsc GREEN.
- [x] **후속 — 최근 페이지(팔레트)**(2026-07-24, `/loop` 자율): `lib/recentPages.ts`(localStorage MRU 8개,
  제목/아이콘 스냅샷, 순수 `pushEntry` 분리, SSR 가드+안전 파싱). PageEditor 열람 시 기록 → 팔레트를 빈
  검색어로 열면 최근 페이지가 액션 아래 표시(빠른 재접근). 검증 web tsc GREEN.
- [x] **후속 — 단축키 도움말**(2026-07-24, `/loop` 자율): `ShortcutsHelp`(app 레이아웃 상주) — `?` 키로
  전역 단축키 목록 오버레이(입력 필드 타이핑 중엔 미가로챔). 기능이 늘어난 앱의 단축키(Cmd+K, 오피스
  WASD/E/더블클릭, Ctrl+Enter 메모 등) 발견성 향상. 순수 web. 검증 web tsc GREEN.
- [x] **후속 — 즐겨찾기**(2026-07-24, `/loop` 자율): `lib/favorites.ts`(localStorage + 커스텀 이벤트로
  같은 탭 동기화 + storage 이벤트로 다른 탭 동기화, 순수 `toggleInList` 분리, 무료 원칙 — DB/마이그레이션
  없음). PageWorkspace 트리 행에 별 토글 + 상단 "즐겨찾기" 섹션(순서 유지, 삭제된 페이지 자동 제외).
  다른 기기 동기화는 후속(프로필 서버). 검증 web tsc GREEN. **추가(2026-07-24)**: PageEditor 헤더에도
  현재 페이지 즐겨찾기 별 토글(같은 lib 구독으로 사이드바와 즉시 일관).
- [x] **후속 — 브레드크럼 내비게이션**(2026-07-24, `/loop` 자율): PageWorkspace가 현재 페이지의 상위
  체인(root→parent, 순환/누락 guard)을 계산해 PageEditor에 전달 → 제목 위에 클릭 가능한 브레드크럼
  (아이콘+제목, ChevronRight 구분). 중첩 페이지에서 상위로 빠르게 이동. 검증 web tsc GREEN.
- [x] **후속 — 페이지 복제**(2026-07-24, `/loop` 자율): 트리 행 hover 시 복제 버튼 → 제목("(사본)")·본문·
  아이콘·부모를 복사해 새 페이지 생성 후 이동. db_schema는 createPage 계약 미포함이라 데이터베이스
  페이지는 일반 페이지로 복제(알려진 제약). 검증 web tsc GREEN.
- [x] **후속 — 페이지 통계**(2026-07-24, `/loop` 자율): core `page-stats.ts`(pageStats 순수함수 — 공백 제외
  글자 수·단어 수·읽기 시간 500자/분, +5 tests). PageEditor가 편집 중 content에서 extractPlainText로
  실시간 계산해 하단에 "N자 · 약 M분" 표시. 검증 core +5 tests·tsc + web tsc GREEN.

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
- [x] 후속 — TodoWidget 완료 숨기기(2026-07-24, `/loop` 자율): "완료 숨기기/완료 표시(N)" 토글(완료 항목이
  있을 때만 노출). "N개 남음" 배지는 항상 미완료 기준으로 정확 유지. 순수 web. 검증 web tsc GREEN.
- [x] 후속 — MemoWidget 검색(2026-07-24, `/loop` 자율): 메모가 5개 초과일 때 검색창 노출, 내용 부분일치
  필터 + 무결과 안내. 순수 web. 검증 web tsc GREEN.

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
