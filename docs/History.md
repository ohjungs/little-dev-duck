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
- [~] Phase 10 AI 2단계 (에이전트 액션) — 2026-07-23 T1~T7 코드 완료(Google Calendar/GitHub 이슈/Gmail
      3개 어댑터 + composeAdapters 합성 + 승인 게이트 + 인젝션 방어 + 감사 로그). T3 실기 검증 통과,
      T5/T6은 db push(2건) + 실기 검증 대기 (아래 기록)
- [~] Phase 11 DB 뷰 (표/보드) — 2026-07-24 T1~T5 코드 완료·리뷰(HIGH 3건 수정). db push(pages_db_view)·실기 검증 대기
- [~] Phase 12 공개 공유 + 알림 4채널 + 대시보드 — 2026-07-24 T1~T5 코드 완료(T6 대시보드 이월). db push(pages_public_share)·최종 리뷰·실기 검증 대기
- [~] Phase 13 상용 마감 (랜딩, 온보딩, i18n, Sentry/Analytics) — 2026-07-24 T1~T4 코드 완료(T5 Sentry·T6 i18n 이월). db push(delete_all_my_data)·실기 검증 대기
- [~] Phase 14 React Native — 2026-07-24 스코프+공유패키지 이식성 감사 완료(core/api/ai 플랫폼 중립 확인). Expo 앱 스캐폴드·기기 검증은 사용자 참여 세션 이월(phase_14.md)
- [~] Phase 15 뉴스 브리핑 파이프라인 (수집·요약·발행) — 2026-07-24 수집(RSS 파싱·중복차단·자동일시정지)+요약(Gemini 3줄)+리더 UI 슬라이스 완료. Gmail 발송·스케줄러·클러스터링·스크랩은 이월. db push(news)·실기 검증 대기
- [~] Phase 16 픽셀 오리 오피스 기반 (이벤트·렌더링) — 2026-07-24 웹 슬라이스: 이벤트 계약(core)+상태매핑+Canvas 2D 오피스 렌더링(절차적 픽셀 오리·유휴 퇴근·클릭 말풍선, 데모 구동). Tauri sidecar 중계·실 hooks·스프라이트 에셋은 이월
- [~] Phase 17 픽셀 오리 오피스 상호작용 (플레이어 조작) — 2026-07-24 웹 슬라이스: 대장오리 키보드 조작(그리드 이동·충돌·포커스 게이트)+근접 상호작용("지금 뭐 하는 중?")+동적 인원 배치. core 순수함수 12 tests. 데스크톱 위젯 통합·4방향 스프라이트는 이월
- [x] Phase 18 공유·성장 루프 — 2026-07-26 T1~T5 완료. 공개 페이지 OG 카드·시작 템플릿 갤러리·빈 상태 코치(축소)·오리 주간 다이제스트·SEO 표면(robots/sitemap). 검증 중 실제 버그 3건 발견·수정(OG 이미지/robots/sitemap이 미들웨어에 막혀 크롤러가 못 읽던 상태)
- [x] Phase 19 VOC 주도 스코프 — 2026-07-26 T1 오리 습관 체크 액션 + T2 뉴스 주제별 추천 피드. 추천 피드 URL 9개는 추측하지 않고 전부 실제 요청해 200+RSS 확인 후 등록
- [~] Phase 20 할 일 반복 규칙 — 2026-07-26 T1~T3 코드 완료(파서·다음 발생일 계산 58 tests, 완료 시 롤오버, 선택 UI). **마이그레이션 미적용이라 실동작 대기**(manual-verification 14번)
- [x] Phase 21 삭제 되돌리기 — 2026-07-26 할 일·메모를 같은 id로 되살리는 계약 + 되돌리기 안내 UI. 습관은 체크 기록이 cascade로 함께 사라져 되돌리기가 성립하지 않아 **삭제 전 확인으로 설계 변경**(되돌릴 수 있으면 안 묻고, 못 되돌리면 묻는다)
- [x] Phase 22 스키마 안전 계약 정적 검사 — 2026-07-26 RLS 활성·정책 존재·롤백 스크립트·계정 파기 도달성을 매 빌드마다 확인. 손으로 돌린 검사는 샌다(롤백 5건이 실제로 그랬다)
- [x] Phase 23 오리 마감일·반복 — 2026-07-26 createTodo 도구가 마감일·반복을 받는다. 형식 위반은 조용히 버리지 않고 오류로 알리고, 승인 카드에 날짜·반복을 노출해 사용자가 승인 전에 판단한다
- [~] Phase 24 Supabase 어드바이저 대응 — 2026-07-26 **막힌 줄 알았던 점검이 다른 연결로 가능**함을 확인하고 실행. `award_xp` 인증 없는 타 사용자 데이터 변경 결함 발견·수정안 작성. **마이그레이션 미적용**(manual-verification 17번). 리뷰 스냅샷: docs/reviews/2026-07-26-security-audit.md
- [x] Phase 26 마감일 입력 — 2026-07-26 "앱이 쓰는 데이터인데 사용자가 넣을 방법이 없는 것"을 렌즈로 발굴. 마감일 필터는 있는데 입력 수단이 없었다
- [x] Phase 27 캘린더 시각 — 2026-07-26 같은 렌즈를 스키마 전체에 적용해 **없는 시각이 붙는 버그** + 시각 입력 부재를 함께 해결
- [x] Phase 29 백업이 실제로 백업인가 — 2026-07-26 **내보내기에 문서 본문이 한 글자도 없었다**(목록용 조회를 재사용한 조합 지점 결함). T1 내보내기 채우기 · T2 가져오기(복원) · T3 라운드트립 회귀. 신규 테스트 55건
- [~] Phase 30 사용자 피드백 잔여 — 2026-07-26 T1 오리 자율 발화 · T2 오리 제어(수정·삭제·뽀모도로·예약) · T3 템플릿 파일 · T4-a 인쇄·PDF · T5 로고 영상 · T6 설정 통합 완료. **T7 마이그레이션 4건은 사용자 실행 대기**(PENDING 1번). T4-b/T4-c는 Phase 33·34로 이관
- [x] Phase 31 백업이 못 덮던 데이터 — 2026-07-26 형식 v2·v3·v4. 피드·오리 진행도·집중 기록·활동 집계 + **브라우저에만 있던 설정 8종**. **DB로 옮기지 않기로 한 판단과 근거**를 함께 기록(마이그레이션 적체·즉시 반응 요구·기기별 취향)
- [x] Phase 32 외부 텍스트 인젝션 방어 — 2026-07-26 `FEATURES.md:218` MUST가 절반만 되어 있었다(RAG는 있고 **뉴스 요약에는 없었다**). 생성 진입점 3곳·프롬프트 빌더 4개를 전수 확인하고 공용 지시문 하나로 통일. 진입점 개수를 테스트로 못박아 새로 생기면 먼저 운다
- [x] Phase 33 표 열 집계 (피드백 2-6 "엑셀") — 2026-07-26 수식 문자열을 파싱하지 않고 **열마다 집계 종류만** 고른다(파서를 들이면 순환 참조·오류 표기·주입 표면이 따라온다). 마이그레이션 0. **A1 스프레드시트 해석은 미확인**(PENDING 8번)
- [x] Phase 34 발표 모드 (피드백 2-6 "파워포인트") — 2026-07-26 고정 캔버스 편집기를 만들지 않고 **본문의 h1을 슬라이드 경계**로 삼는다. 문서와 슬라이드가 한 원본이라 어긋나지 않는다. 신규 의존성 0. **자유 배치 편집기 해석은 미확인**(PENDING 8번)
- [~] Phase 35 계정 파기 (FEATURES.md MUST) — 2026-07-26 콘텐츠만 지워지고 **계정·이메일이 남던** 나머지 절반. 서버 라우트 + 환경변수 1개(Edge Function·마이그레이션 없이). **키가 없으면 꺼진 채로 배포** — 켜는 것은 사용자 결정(PENDING 9번)
- [x] Phase 36 상한 인벤토리 정정 — 2026-07-26 Phase 35에서 **공용 `allowRequest`가 있는데 재구현한 것**(CLAUDE.md 3-5 최고 심각도)을 스스로 찾아 교체. 공용 구현의 키 누수도 함께 수정(창을 키와 함께 저장해 남의 창으로 재지 않게)
- [x] Phase 37 미적용 마이그레이션 오류 문구 — 2026-07-26 교훈은 payload 쪽을 고쳤는데 **사용자가 보는 것**은 그대로였다. 대기 중 컬럼 때문에 뜨던 영문 DB 오류를 한국어로. 컬럼 없음 신호만 좁게 보고 **모르는 오류는 원문을 그대로** 보여준다(과하게 감싸면 진짜 원인을 가린다)
- [x] Phase 38 정적 프리렌더 CSP 회귀 가드 — 2026-07-26 **같은 CSP 함정을 두 번째로** 밟고 있었다(`/_not-found`가 정적). `force-dynamic`으로 고치고, 교훈이 주석이라 또 밟았으므로 **`buildStaticGuard` 검사로 만들었다**. 그 검사가 곧바로 두 번째 사례(`/_global-error`)를 잡았고 고칠 수 없어 **사유와 함께 허용 목록**에 넣었다
- [x] Phase 40 e2e 인증 세션 계약 — 2026-07-26 **62건 중 44건이 세션이 없어 죽어 있던** 자리. 10개 스펙에 복사된 스킵 계약을 `e2e/authState.ts` 한 벌로(결정적 변환이라 스크립트로, 옛 참조가 남으면 실패) · **만료된 세션을 실패가 아니라 사유 있는 스킵으로**(전에는 실행되어 실패해서 "세션 만료"와 "진짜 회귀"가 같아 보였다) · CI가 `E2E_AUTH_STATE_B64`를 **받을 준비만** 만들었다(꺼진 채로 — README가 "단계를 추가해야 한다"고만 적어 둬서 등록해도 아무 일도 일어나지 않던 것을 뒤집었다). **네 가지 상태를 실제로 재현해 증명**(없음·유효·만료·쿠키없음)
- [~] Phase 41 이메일 로그인 (사용자 요청 0번) — 2026-07-26 **T1만 완료.** 확정 스택 변경이라 `DECISIONS.md` 12번에 비용 4가지와 되돌리는 방법까지 기록했다(CLAUDE.md 2절이 못박은 `Auth Google+GitHub`에 Email 추가 — [Phase 40](plans/phase_40.md)이 명시적으로 거부했던 항목이고, 뒤집는 근거는 **사용자의 명시적 요청 하나**다). 자격증명 오류를 **원인 구분 없이 한 문구**로 낸다(core `authErrorMessage` + 테스트 10건) — "없는 계정"과 "틀린 비밀번호"를 구분하면 **어느 이메일이 가입돼 있는지 알려주는 통로**가 된다. **provider가 꺼진 채로 배포**돼 켜기 전까지 앱 동작은 안내 문구 하나 외에 안 바뀐다(Phase 35 계정 삭제와 같은 방식). **T1을 만든 세션은 커밋 전에 끊겼고**(pid 1756, 하트비트 미갱신) 다음 세션이 그 고아 작업을 **검증해서 확정했다** — core 924 / turbo 18/18 / 공개 e2e 6/6 / `/login`이 여전히 동적(`ƒ`)인 것까지. **남음: T2(비밀번호 정책·상한) · T3(재설정 — 없으면 비밀번호를 잊은 사용자가 영구 잠긴다) · T5(CI 자동 로그인) · T6.** T4는 Phase 40이 이미 했다
- [ ] Phase 42~52 2차 피드백 40항목 + 메신저 Group 0~2 — 2026-07-26 **계획만 작성(미착수).** 사용자가 배포된 화면을 다시 써 보고 남긴 40항목의 원인 7건을 코드에서 줄 번호까지 특정해 계획으로 옮겼다([feedback-2026-07-26-2.md](feedback-2026-07-26-2.md))
- [ ] Phase 53~60 메신저 734항목 전수 배정 — 2026-07-26 **계획만 작성(미착수).** 배정표를 **코드로 생성**해 누락·중복·유령 ID 0을 검증했고, 그 검사가 결함 4건을 잡았다(K-001 이미지 업로드 MUST 누락 · F-002 Enter 전송 MUST가 P54로 밀림 · W-005 중복 · SKIP 2건 혼입). [messenger-assignment.md](catalog/messenger-assignment.md)
- [x] Phase 39 의존성 감사 게이트 — 2026-07-26 취약점을 **사람이 기억하지 않게** CI에 게이트를 걸었다(`pnpm audit --prod --audit-level high --ignore-registry-errors`). **판정 로직 0줄** — 계획이 짜려던 T1·T2·T3를 pnpm이 이미 네이티브로 갖고 있었다(특히 `--prod`가 "빌드 전용이냐 런타임이냐"를 의존성 트리로 판정해 손으로 쓸 사유를 하나 없앴다). 새로 짠 것은 **테스트 7건**뿐이고 그게 값이다: 사유 없는 면제·전제조건 만료(sharp ↔ `remotePatterns`)·게이트 기준 완화를 잡고, **검사가 작동하는지 가짜 입력으로 확인**한다
- [x] 의존성 취약점 9건 — 2026-07-26 Next.js `16.2.10 → 16.2.11`. **하루 전 세션이 이미 세어 놓고 결정 없이 남겨 둔 것**으로, 프록시 우회·서버 액션 DoS·SSRF 2건 등 **공개 배포된 앱의 런타임에 실제로 걸리는** 것들이었다. 남은 5건은 노출 경로가 없음을 코드로 확인하고 **측정한 채 두었다**(PENDING 10번 — `pnpm audit`은 노출 경로를 보지 않고 버전만 본다). 배포 `READY` + 실사이트 실측 확인. 재발 방지는 [Phase 39 draft](plans/phase_39.md)
- [x] Phase 61 뉴스 데일리 브리핑 (cherrypick 벤치마킹: 10개 카드·진행·날짜·보기) — 2026-07-29 완료(코드분)
- [x] Phase 62 할 일 마감일 사용성 (마감일순 보기·아이콘 발견성) — 2026-07-29 완료
- [x] Phase 63 취업 준비 지원 (지원 현황 템플릿·DB 행 RAG 연결) — 2026-07-29 완료

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
- 2026-07-23 : Phase 10 T3 실기 검증 통과(사용자 "잘됐다") 후, 사용자가 `/loop /next-step` 자율 진행 +
  3시간 단위 커밋/푸시/배포 자동화를 명시 지시 — T5(GitHub 이슈)·T6(Gmail) 두 어댑터를 이어서 구현.
  - T5 GitHub 이슈 어댑터(39b907e): Google Calendar와 동일 구조(listGithubIssues readonly +
    createGithubIssue mutating). code+security 병렬 리뷰 반영 — owner/repo가 URL 경로에 그대로 삽입되던
    confused-deputy 경로를 GitHub 명명규칙 화이트리스트로 차단, `upstreamError`의 서비스 오라벨링("gemini"
    로 고정 표시되던 문제) 수정. GitHub 기본 로그인은 이슈 쓰기 scope를 요청하지 않는다는 점에 착안해
    `link=github` 명시적 동의로만 토큰을 캡처하도록 설계(Google의 `provider==="github"` 자동 캡처
    분기와 다른 판단).
  - `composeAdapters`(agent.ts) 신설 — 여러 어댑터의 카탈로그를 병합하고 도구명으로 올바른 어댑터에
    실행을 위임. `/api/ai/agent`·`/api/ai/agent/approve`가 단일 어댑터 가정에서 다중 어댑터 합성으로
    확장됨(이후 T6에서 세 번째 어댑터 추가 시 코드 변경 없이 배열에 push만 하면 되는 것으로 실증).
  - T6 Gmail 어댑터: 공식 Gmail API v1 문서(WebFetch 실측) 확인 후 착수. **범위 데스코프 판단** — 초안의
    "1시간 자동 폴링·분류"는 자율 다단계 워크플로라 phase_10.md의 "하지 않는 것"과 충돌해 제외,
    Calendar/GitHub과 동일하게 사용자 발화당 단순 도구 호출(listRecentEmails readonly + trashEmail
    mutating)로 좁힘. 영구삭제 엔드포인트는 설계상 아예 구현하지 않음(trash만). **어댑터별 토큰 테이블
    분리 원칙 확립** — Calendar와 Gmail은 같은 Google 로그인이지만 서로 다른 scope를 별도 시점에
    동의받으므로 `user_google_tokens`를 공유하면 안 됨을 깨닫고 `user_gmail_tokens`를 신설(GitHub과
    동일 원리, 프로바이더 단위가 아니라 어댑터=scope 단위로 테이블 분리). code+security 리뷰에서 발견된
    N+1 fan-out(list 후 각 메시지 get) 부분 실패 문제를 `Promise.allSettled`로 격리.
  - **동시 작업 충돌 발견**: T6 커밋 시도 중 다른 세션(사용자로 추정)이 같은 작업 디렉토리에서 오리 3D
    GLB 모델 교체 작업을 직접 커밋·푸시(`1b8d067`)하면서, 스테이징돼 있던 T6 파일들이 그 커밋에 함께
    쓸려 들어감(git worktree 미분리로 인한 알려진 위험, CLAUDE.md에 기 문서화). 데이터 유실은 없음(CI
    green, Vercel production READY 확인) — 커밋 메시지가 Gmail 작업을 언급하지 않는 불일치만 남음,
    히스토리 재작성은 하지 않고 이 기록으로 갈음.
  - 검증: core 126 / api 183 tests + web(core/api 격리 검증, mascot 동시편집으로 web 전체 build는
    일시적 방해받음—Duck.tsx만 stash 후 확인) build GREEN + core·api·web 로컬 full eslint 선검증.
  - Phase 10 T1~T7 전부 코드 완료. 남은 것: T5/T6 db push(user_github_tokens/user_gmail_tokens) +
    실기 검증(GitHub 이슈 생성, Gmail 조회·휴지통 이동, GitHub/Gmail 재동의 흐름이 실제로 넓은 scope를
    재발급하는지). gstack `/review`는 이 프로젝트가 항상 main에 직접 커밋하는 워크플로라(별도 브랜치
    없음) "base 브랜치라 diff 없음"으로 스킵 — code-reviewer+security-reviewer 병렬 리뷰로 갈음.
- 2026-07-24 : Phase 11~13 야간 `/loop` 자율 진행 — 두 세션 인계. **원 세션**(23:32~01:00)이 Phase 11(DB
  표/보드 뷰), Phase 12(공개 페이지 공유 /p/[slug]·방해금지 DND·헬스체크·브라우저 알림·성과 카드 PNG),
  Phase 13 T1(온보딩 튜토리얼)을 약 10분 간격으로 커밋. 01:00 커밋 후 27분 정지 → **두 번째 세션**(사용자가
  새 `/loop` 지시)의 워치독이 죽음으로 판단하고 인계. worktree 격리 없는 공유 폴더라 병렬 편집 대신 단일
  인계로 전환(충돌·편집유실 방지). 인계 세션이 Phase 13 T2~T4 구현:
  - T2 키보드 접근성: 전역 `:focus-visible` 링(--ring) + 공용 훅 `useModalA11y`(Esc·포커스 트랩·복원) →
    VersionHistory/OnboardingOverlay 연결 + (app) 스킵 링크. CommandPalette는 이미 처리돼 미변경.
  - T3 계정 데이터 파기 1단계: security-definer RPC `delete_all_my_data`(15개 테이블 원자 삭제, profiles
    보존) + api `deleteAllMyData`(스토리지 첨부 정리 포함, +4 tests) + 설정 위험구역 UI(문구 타이핑 확인).
  - T4 공개 랜딩 `/welcome`(편집형 히어로+베이토+CTA) + 미들웨어 비로그인 리다이렉트 대상 변경.
  - T5 Sentry·T6 i18n은 인프라·범위로 이월. 검증 core 126 / api 198 tests + web tsc·build GREEN.
  - db push 3건 대기(pages_db_view·pages_public_share·delete_all_my_data)는 사용자 몫(DDL 안전 규칙).

- 2026-07-27 : Phase 41 T3(비밀번호 재설정) + **Phase 42 완료**(원인 확정 버그 7건) — `/loop` 5분 러너 세션.
  - **Phase 41 T3**: 이메일 로그인이 만든 "잊으면 영구 잠김" 구멍을 닫았다. 메일 링크는 `next=/auth/reset`을
    달아 **이미 OAuth가 쓰는 `/auth/callback`**으로 들어온다(교환 라우트·open redirect 방어 재사용).
    세션 없이 폼이 렌더되지 않는 것을 인증 게이트 + 페이지 판정 **두 겹**으로 잠갔다(e2e가 303을 못박음).
    만료 판정을 로그인 규칙표에 **섞지 않았다** — 섞었다면 로그인 실패에 "재설정 링크 만료"라는 거짓말이 떴다.
    곁다리로 `/login?error=auth`의 침묵(빈 폼만 다시 뜸)을 없앴다. SMTP 상한 조사해
    `CONSTRAINTS_FREE_TIER.md`에 추가(가입 확인 메일과 재설정 메일이 **같은 시간당 통**을 쓴다).
  - **Phase 42 T1~T7**: 도구 모음·사이드바 `flex-wrap` · 인사말이 무시하던 프로필 이름(core
    `resolveDisplayName` 한 벌) · 뉴스 "수집된 기사 없음"이라던 **거짓 문구**(이유를 값으로 반환) ·
    velog 홈 거부 → **전체 피드 등록** · 습관 잔디 대비를 **CIE ΔE로 잠금**(globals.css 실물 파싱) ·
    로고 24 → 32px.
  - **계획의 전제가 세 번 틀렸고 세 번 다 착수 전 실측이 잡았다**: T2 원인①(`publishedAt` 없으면 버림 —
    `createdAt` 폴백이 있어 성립 안 함) · T3("velog에 전체 피드 없음" — **있었다**, 실측 200/20건) ·
    T5("재인코딩 필요" — 원본이 이미 96×96이라 불필요). → lessons-learned **L-17** 신설.
  - 검증: turbo test·lint·build 18/18 GREEN / core 947 / web 신규 16 / e2e 19 통과·46 스킵.
    **화면 검증은 Phase 42 7건 중 0건** — 전부 로그인 뒤 화면이라 스크린샷 불가(Phase 41 T5 의존).
    사용자 확인 항목은 `docs/loop-eng/manual-verification.md` 41·42번에 절차로 남겼다.

- 2026-07-27 : **Phase 43·44·45·46 진행** — `/loop` 5분 러너 세션(계속). 커밋 14건, 전부 배포됨.
  - **Phase 43**(도구 모음 재편): 템플릿 안내 문구 채움 + 흩어진 다섯 컨트롤을 모달 하나로
    (컨트롤 14 → 10) + 오리 도구 `convertPageToDatabase`(승인 필수, 되돌릴 수 없음을 설명에 명시).
  - **Phase 44**(대시보드 상호작용): 뽀모도로 완료음이 **한 번도 난 적이 없던 것**을 고침
    (제스처 없이 만든 AudioContext는 suspended로 시작) + 카드 드래그(HTML5 네이티브, 의존성 0) +
    캘린더 오늘 기본·지난 일정 토글·크기 3단계 + 메모 색 대비(ΔE 기준).
  - **Phase 45 완료**: 오리 자율 발화를 LLM으로(규칙이 "무엇을", LLM이 "어떻게" — HD-003의
    정확한 적용) + 작문 도우미에 템플릿·다른 페이지 가져오기·걷는 오리.
  - **Phase 46 완료**: 기간별 조회(core 순수 함수, 윤년·월경계 테스트) + **차트를 라이브러리
    없이 SVG로** + PNG·CSV 내보내기(CSV 이스케이프는 기존 수식 인젝션 방어를 공용화해 재사용) +
    스탠드업 이름·설명 재정의 + 요일별 패턴.
  - **계획 전제가 여섯 번 틀린 것을 착수 전 실측으로 잡았다**: 뉴스 원인·velog 전체 피드 존재·
    로고 재인코딩 불필요·내보내기 버튼 이미 있음·CSV 이미 있음·작문 도우미 1차 상태.
    → lessons-learned **L-17**("부재 증명은 탐색 방법 하나로 성립하지 않는다") 신설.
  - **신규 의존성 0개**를 전 구간 유지(차트·드래그·PNG·CSV 전부 플랫폼 기능).
  - 검증: 매 커밋 turbo test·lint·build **18/18 GREEN**. **화면 검증은 대부분 못 했다** —
    작업 대상이 전부 로그인 뒤 화면이고 e2e 46건이 세션 없이 스킵된다(Phase 41 T5 대기).
    사용자 확인 항목 18건은 `docs/loop-eng/manual-verification.md`에 절차로 남겼다.

---

## Status 이관 기록 (2026-07-29 정리 — 원문 그대로, 최신순)

> ## 2026-07-29 `/loop-eng` — 선행 버퍼 충전: [Phase 62 draft](plans/phase_62.md)
> Phase 61 완료·메신저 보류로 착수 가능 계획이 소진돼 버퍼(5-A)를 채웠다.
> **할 일 마감일 사용성** — 오늘 사용자 마찰("오늘 마감 안 나옴")의 뿌리(마감일 입구가
> 수정 모드에 숨음)를 겨눈다. T1 인라인 마감 설정 · T2 마감일순 보기 · T3/T4는 확인 먼저
> (중복이면 폐기). 다음 사이클에 stale 가드 통과 후 T1 착수.

> ## ✅ 2026-07-29 `/loop-eng` — 뉴스 방문 시 자동 수집 (Phase 61 후속)
> "매일 10개"가 수동 수집 버튼에만 매달리지 않게 — 마지막 수집이 6시간 넘었으면 뉴스
> 화면 진입 시 한 번 자동 수집한다.
>
> - 판정은 `newsAutoCollect` 순수 함수(테스트 4건: 첫 방문·경과·미경과·기록 손상).
>   실행은 기존 onCollect 그대로(재구현 금지), 성공 시각만 기록(실패 기록하면 6시간
>   재시도가 막힌다). 기록은 기기별 — 서버 저장은 url_hash 유니크라 중복 없음.
> - **정직한 한계**: 진짜 "매일 자동"(방문 없이도)은 서버 예약 실행이 필요하고 그건
>   CRON_SECRET([PENDING 6번](loop-eng/PENDING.md)) 승인 대기다.
> - 검증: turbo lint·test·build **18/18 GREEN**. 실기: [mv 103번](loop-eng/manual-verification.md).

> ## ✅ 2026-07-29 `/loop-eng` — 대시보드 TOP 3 → 브리핑 10 전환 (Phase 61 후속)
> 사용자 지시 원문("top 3를 매일 10개 이슈로")의 마지막 남은 자리 — 대시보드 위젯.
>
> - NewsTopWidget 개편: 선정·오늘 창(KST)·카테고리를 뉴스 화면 브리핑과 **같은 core 한 벌**
>   (dailyIssues·briefingRange)로. 읽음·진행 n/10도 read-articles 한 벌이라 화면 간 동기.
> - 콤팩트 줄 형태(번호·카테고리 칩·제목 한 줄·매체 수·시각). 완주 시 "다 읽었어요!".
> - XP는 위젯에서 안 준다 — 주는 곳은 뉴스 화면 하나(두 곳이면 이중 지급 경로).
> - 검증: turbo lint·test·build **18/18 GREEN**. 실기: [mv 102번](loop-eng/manual-verification.md)
>   (위젯 높이가 과하면 다음 사이클에서 접기 보완).

> ## ✅ 2026-07-29 `/loop-eng` — [Phase 61](plans/phase_61.md) T4: 한 장씩 보기·글자 크기
> cherrypick 보기 옵션 두 가지. **T4의 코드-완결 조각은 이것으로 끝** — 남은 RSS 이미지는
> articles 컬럼 추가(DDL)가 필요해 [PENDING 12번](loop-eng/PENDING.md)으로 사용자 결정 대기.
>
> - 한 장씩 보기: 카드 1장 + 이전/다음 + n/m. 목록과 **같은 카드 마크업 한 벌**(issueCard).
>   한 장 모드에선 요약을 줄이지 않는다(넘겨 읽는 모드). 위치는 파생 clamp — 필터로 목록이
>   줄어도 범위를 안 벗어난다(effect 리셋 없음).
> - 글자 크기 "가+"(기본/크게) — 보기 방식과 함께 기기별 localStorage(briefingPref 한 곳,
>   dataSaverPref와 같은 결).
> - 검증: turbo lint·test·build **18/18 GREEN**. 실기: [mv 101번](loop-eng/manual-verification.md).
> - **Phase 61 코드-완결분 전체 완료** (T1 선정 → T2 카드·진행·XP → T3 날짜·카테고리 → T4 보기).

> ## ✅ 2026-07-29 `/loop-eng` — [Phase 61](plans/phase_61.md) T3: 브리핑 날짜·카테고리
> 오늘/어제/지난주 탭 + 달력 + 카테고리 칩. cherrypick 탐색 구조가 갖춰졌다.
>
> - core `briefingRange`(테스트 5건): 탭 → (now, windowHours) 변환. **KST 경계는
>   kstDayRange 한 벌**(검색 필터와 같은 판정). 지난주 = 오늘 00:00 KST 이전 7일(오늘 제외
>   — 겹치면 같은 기사가 두 탭에 나온다). 월 경계 어제 계산 테스트로 잠금.
> - DailyBriefing: 탭·달력·카테고리 칩(카드에 있는 카테고리만, 2개 이상일 때). 진행 n/10과
>   완주 XP는 **오늘 탭 전용**. 카테고리 필터는 보기만 거른다(선정 재실행 없음).
> - 검증: turbo lint·test·build **18/18 GREEN**. 실기: [mv 100번](loop-eng/manual-verification.md).
> - Phase 61 잔여: T4(한 장씩 보기·글자 크기·RSS 이미지 — 후순위).

> ## ✅ 2026-07-29 `/loop-eng` — [Phase 61](plans/phase_61.md) T2: 오늘의 브리핑 카드
> 뉴스 화면 상단에 하루 10개 이슈 카드(번호·카테고리·제목·요약·n개 매체) + "오늘의 진행
> n/10". cherrypick 벤치마킹의 화면 절반이 붙었다.
>
> - `DailyBriefing` 신규 — 선정은 core dailyIssues, **읽음은 기존 read-articles 한 벌**
>   (카드에서 열면 아래 목록 읽음 표시와 같이 움직인다 — 추적 두 벌 금지).
> - 완주(10/10) 시 오리 칭찬 + XP +10(core XP_REWARDS.briefingDone, 잠금 테스트) —
>   하루 1회 게이트(briefingXp, msgXpBudget과 같은 nextDailyCount 한 벌).
> - 빈 상태 구분: 기사 0건 / 24시간 창 밖(windowHours를 문구에 그대로).
> - 검증: turbo lint·test·build **18/18 GREEN**. 실기: [mv 99번](loop-eng/manual-verification.md).
> - 다음: T3 — 날짜(오늘/어제/지난주·달력)·카테고리 필터.

> ## ✅ 2026-07-29 `/loop-eng` — [Phase 61](plans/phase_61.md) T1: 데일리 이슈 선정 core
> 하루 10개 이슈 선정 로직(cherrypick 벤치마킹의 심장). **topArticles 한 벌 재사용** —
> 이 층이 더한 것은 24시간 창·피드별 상한(3)·카테고리 라벨(topicForUrl → 없으면 종합)뿐.
>
> - core `news-daily.ts` `dailyIssues`(테스트 6건) + `news-feeds.ts` `topicForUrl`(테스트 2건).
> - 10개 미만이면 있는 만큼(부족을 숨기지 않음), 빈 이유(no-articles/none-recent) 그대로 전달.
> - 검증: turbo lint·test·build **18/18 GREEN**. 다음: T2 — 뉴스 화면 이슈 카드 + 진행 n/10.

> ## ⚠ 2026-07-29 사용자 피드백 5건 — 방향 전환 (커밋 0ae6af1·7e0bf99)
> 사용자가 실사용 중 보고: ① 메신저 메뉴 입구 자체가 없었음(수정·배포) ② **메신저가
> "조회만 되고 아무것도 못 하는" 상태** — 방 생성 코드가 저장소에 없었고 오리도 응답하지
> 않았다(오리와 대화하기 버튼 + ensureAgentRoom + /api/ai/agent 재사용 응답 배선으로 수정)
> ③ 로고 해상도 깨짐(192px 재인코딩) ④ 오늘 마감 필터에서 추가해도 안 보임(필터 중 추가
> 시 오늘 마감일 부여) ⑤ 뽀모도로 길이 선택 줄바꿈 깨짐(4칸 그리드).
>
> **판단 기록**: "내가 말한 건 저런 게 아니라고" — 메신저 세부 기능(Phase 55~59)을 쌓는
> 동안 핵심 사용 경로(방 만들기·오리 응답)가 비어 있었다. **메신저 신규 세부 기능 개발은
> 보류**하고, 사용자 지시로 [Phase 61 — 뉴스 데일리 브리핑](plans/phase_61.md)
> (cherrypick.today 벤치마킹: 하루 10개 이슈 카드·진행 추적·날짜 아카이브)을 다음
> 우선순위로 진행한다.

> ## ✅ 2026-07-29 `/loop-eng` — [Phase 59](plans/phase_59.md) T1: 메시지 → 노트 변환 (S-007)
> 메시지 메뉴에 "노트로 만들기"가 붙었다 — 할 일·메모 변환(Phase 52)과 같은 자리,
> 같은 영수증 관례. 대화에서 나온 내용을 워크스페이스 문서로 승격하는 T1 네 번째 조각.
>
> - core `conversionReceiptText`에 "page" 종류(테스트 1건 RED→GREEN) — 영수증 문구
>   한 벌 유지("…메시지를 노트로 만들었어요").
> - web `textToBlocks`(pageTemplates): 평문 → paragraph 블록. **블록 리터럴을 다시
>   만들지 않고 템플릿의 para 한 벌 재사용.** 빈 줄은 빈 문단으로 보존(문단 구분 유지).
> - MessageRoom: `createPage` 재사용(재구현 금지), 제목은 할 일 변환과 같은
>   todoTitleFrom 한 줄 규칙. 생성은 되돌릴 수 있어 확인 없이 바로 실행(기존 결).
> - 검증: turbo lint·test·build **18/18 GREEN**.
> - 실기 확인: [manual-verification.md 97번](loop-eng/manual-verification.md).

> ## ✅ 2026-07-29 `/loop-eng` — [Phase 59](plans/phase_59.md) T1: 메시지 속 노트 링크 (S-006)
> 메시지에 붙여넣은 내 페이지 URL이 맨 주소 대신 **"노트: 제목"**으로 보인다 —
> 메신저와 워크스페이스(노트)가 이어지는 T1 방향의 세 번째 조각.
>
> - core `pageIdFromHref`·`collectPageIds`(테스트 4건): **감지는 linkifyParts 한 벌 위**
>   (K-016과 같은 원칙 — 말풍선 링크와 노트 인식이 갈라지면 어느 쪽 고장인지 모른다).
>   호스트는 안 본다(도메인 변경 무관) — 남의 /pages/ URL은 제목 조회가 null이라
>   평문 링크로 남을 뿐. core에 URL 전역이 없어 순수 정규식(빌드가 잡아줌).
> - MessageRoom: 제목 일괄 조회(imageUrls와 같은 패턴 — 이미 받은 것 재조회 없음,
>   getPage 재사용·RLS가 범위), MessageBodyParts에 pageTitles prop. 조회 전·실패는 평문 링크.
> - 검증: core 1347건 / turbo lint·test·build **18/18 GREEN**.
> - 실기 확인: [manual-verification.md 96번](loop-eng/manual-verification.md).

> ## ✅ 2026-07-29 `/loop-eng` — [Phase 59](plans/phase_59.md) T1: 습관 체크 → 오리 방 기록 (S-009 완결)
> 직전 사이클의 `recordToDuckRoom` 한 벌을 그대로 재사용 — 새 코드 최소(배선 한 줄).
> 이로써 S-009(습관·뽀모도로 신호 → 메신저)가 완결됐다.
>
> - HabitWidget 체크 성공 경로에 기록 연결. **체크 해제는 기록하지 않는다** —
>   해제 알림은 소음이고, 남은 기록이 거짓이 되지도 않는다(체크했다가 무른 사실은 참).
> - 중간에 타입체크가 필드 오기(name→title)를 잡음 — 검증 게이트가 제 역할.
> - 검증: turbo lint·test·build **18/18 GREEN**.
> - 실기 확인: [manual-verification.md 95번](loop-eng/manual-verification.md).

> ## ✅ 2026-07-29 `/loop-eng` — [Phase 59](plans/phase_59.md) T1: 뽀모도로 → 오리 방 기록 (S-009 일부)
> 계획이 "값이 가장 확실"이라 한 T1(연동 심화)의 첫 조각 — 뽀모도로를 마치면 오리 방에
> system 안내줄이 남는다. **오리 방이 하루의 기록이 되기 시작한다**(제품 정체성 방향).
>
> - lib `recordToDuckRoom`(테스트 3건): 원칙 둘을 계약으로 — **방을 만들지 않는다**
>   (없으면 조용히 스킵 — 사용자가 안 만든 방을 자동 생성하면 놀란다) · **실패는 조용히**
>   (본 기능이 기록 때문에 죽으면 안 된다, 진단 기록만).
> - 전송은 기존 sendMessage type:"system"(변환 영수증과 같은 관례) — 새 배관 0.
> - PomodoroWidget 완료 경로에 fire-and-forget 한 줄. 습관 체크(S-009 나머지)는 다음 조각.
> - 검증: turbo lint·test·build **18/18 GREEN**.
> - 실기 확인: [manual-verification.md 94번](loop-eng/manual-verification.md).

> ## ✅ 2026-07-29 `/loop-eng` — [Phase 59](plans/phase_59.md) **착수** — T3: 대화 XP (Y-007)
> phase_58의 무인-가능 조각 소진 → phase_59("제품 정체성 — 고르는 게 일") 진입.
> 계획 원칙 "결정 없이 만들 수 있는 것부터" + **선행 차단이 오늘 풀린 항목**을 골랐다:
> Y-007은 "연결만 하면 된다"인데 `award_xp` 권한 결함(PENDING 1)이 조건이었고,
> `harden_security_definer`가 **오늘 적용 확인**돼 경로를 늘려도 되는 상태가 됐다.
>
> - core `XP_REWARDS.messageSent = 1` — **보상표에서 가장 작음을 테스트로 잠금**
>   (대화는 성취가 아니라 접촉, 도배가 XP 농사가 되면 안 된다).
> - lib `msgXpBudget`: 하루 상한 20건(최대 20XP/일 = 할 일 2개 수준) —
>   core `nextDailyCount` 재사용(알림 상한과 한 벌). 클라이언트 상한의 한계는 주석에 정직 기술.
> - MessageRoom: **전송 성공 뒤** 비동기 지급 + `emitXpChanged`(위젯 즉시 갱신).
>   실패는 조용히 + 진단 기록(전송이 실패한 줄 알면 같은 말을 두 번 쓴다).
>   슬래시 커맨드는 조기 return이라 제외.
> - 검증: turbo lint·test·build **18/18 GREEN**.
> - 실기 확인: [manual-verification.md 93번](loop-eng/manual-verification.md).

> ## ✅ 2026-07-29 `/loop-eng` — [Phase 58](plans/phase_58.md) T5: CSRF 확인·주석 (U-012)
> 계획 지시: "메시지 전송 라우트에도 같은 근거가 적용되는지 **확인하고 주석에 남긴다** —
> 재조사 금지(Phase 36이 실측해 뒀다)."
>
> - 확인 결과: **메시지 전송에는 서버 API Route 자체가 없다** — rooms.ts의 모든 쓰기는
>   supabase-js → PostgREST 직결이고, 인증은 쿠키가 아니라 **Authorization 헤더의 JWT**.
>   크로스사이트 폼·이미지 태그는 커스텀 헤더를 못 실으므로 이 경로로 CSRF가 성립하지
>   않는다(쿠키 자동 전송에 기대지 않아 sameSite 논거보다 강한 성질).
> - rooms.ts 머리 주석에 근거 기록(서버 라우트 쪽은 account/delete/route.ts의 Phase 36
>   실측 주석 참조 연결). 코드 동작 무변경 — 검증 18/18 GREEN.
> - phase_59 가드 예비 확인: ③ 오리 코스튬 결정(PENDING 4)은 그림 자산이 필요한
>   **사용자-블록**. ①(Gemini 쿼터 예산)·②(직원↔에이전트 매핑 배포)는 다음 사이클에
>   코드로 확인 예정.

> ## ✅ 2026-07-29 `/loop-eng` — [Phase 58](plans/phase_58.md) T5: 민감 정보 자동 감지 (U-016)
> 계획 지시 3개를 전부 지켰다: ① 판정은 정규식(HD-003) ② **경고만, 막지 않는다**
> (막으면 정상 메시지가 막힌다) ③ **좁게만 잡는다**(Phase 37의 판단 — 과하면 경고가 무시된다).
>
> - core `detectSensitiveInfo`(테스트 7건): 주민번호(6-7, 성별 자리 1-4)·카드(4-4-4-4
>   구분자 필수 — 무구분 16자리는 오탐이라 안 잡음)·API 키 접두사(sk-/ghp_/AKIA)·
>   긴 JWT. **전화번호·날짜·짧은 숫자는 일부러 안 잡는다**(오탐 방지 테스트로 잠금).
>   **값이 아니라 종류 라벨만 반환** — 감지 결과가 또 하나의 유출 경로가 되면 안 된다.
> - MessageRoom: 전송 **후** 비차단 경고(amber, role=status) — "잘못 보냈다면 삭제하세요"
>   (삭제 기능은 이미 있다). 닫기 버튼.
> - 검증: core 1336건 / turbo lint·test·build **18/18 GREEN**.
> - 실기 확인: [manual-verification.md 92번](loop-eng/manual-verification.md).

> ## ✅ 2026-07-29 `/loop-eng` — [Phase 58](plans/phase_58.md) T2: 클라이언트 에러 기록 (V-007)
> 계획: "Sentry(외부 반출) 전에 **자체 수집 먼저**." 화면에 잠깐 떴다 사라지는 에러는
> 진단 내보내기(T-027)가 못 봤다 — 그 공백을 메웠다.
>
> - **링 저장 로직이 세 번째로 필요해져 공용 승격**: `localRing`(generic, 테스트 4건) —
>   알림 히스토리(M-028)를 **동작 보존 리팩터링**으로 그 위에 얹고(기존 7건 green이 근거),
>   에러 기록이 같은 한 벌을 쓴다. recentList(중복 제거 목록)와는 계약이 달라 별도.
> - `clientErrorLog`: 에러 **문구만** 기록(개인 데이터 없음), 50건 링, `ldd:` 접두어라
>   기기 설정 초기화(T-031)에 함께 지워짐.
> - MessageRoom의 동일 2줄 패턴 **16곳**을 `describeError` 헬퍼로 교체(표시+기록 동시),
>   MessageSearch 1곳 동일. 진단 꾸러미(T-027)에 clientErrors 포함.
> - 검증: turbo lint·test·build **18/18 GREEN**.
> - 실기 확인: [manual-verification.md 91번](loop-eng/manual-verification.md).

> ## ✅ 2026-07-29 `/loop-eng` — [Phase 58](plans/phase_58.md) T3: 고아 첨부 검사·정리 (V-022)
> Phase 50이 "정리 대상으로 기록"까지만 해둔 고아 첨부(업로드는 됐는데 메시지가 안
> 만들어진 파일)를 검사·정리하는 도구. 계획 지시: "되돌릴 수 없으므로 **먼저 목록을
> 만들고 개수를 보고한 뒤** 실행한다" — 검사와 삭제를 분리하고 삭제는 확인 대화상자 뒤에만.
>
> - api `listOrphanAttachments`(테스트 4건): 핵심 안전 계약 — **참조 목록 조회가 상한
>   (5000행)에 잘리면 고아 판정 자체를 거부**(safe=false, 목록 비움). 잘린 참조로 판정하면
>   살아있는 첨부를 지우게 된다. 삭제된 메시지 행의 참조도 포함(행이 경로를 들면 고아 아님).
> - api `deleteOrphanAttachments`: 준 경로만 100개씩 삭제, 개수 반환.
>   버킷 delete 정책은 마이그레이션 원문으로 멤버 허용 확인.
> - UI: 저장 공간 카드에 "고아 파일 검사" → 개수·용량·경로 미리보기(5개) →
>   "정리(N개 삭제)" → ConfirmDialog(개수·용량 명시). 판정 불가면 정리를 권하지 않는 안내.
> - 검증: api 45건 / turbo lint·test·build **18/18 GREEN**.
> - 실기 확인: [manual-verification.md 90번](loop-eng/manual-verification.md).

> ## ✅ 2026-07-29 `/loop-eng` — [Phase 58](plans/phase_58.md) **착수** — T1: DB 백업 스크립트 + 복구 런북 (V-010~V-012)
> 계획이 "가장 조용하고 위험한 사실"로 지목한 것: **무료 플랜에 자동 백업이 없고, 이
> 저장소에 덤프 스크립트도 없었다** — 메신저에 지우면 복구 불가한 개인 대화가 쌓이는 중.
> stale 가드 통과(마이그레이션 0건 · audit high 전부 기존 무시 목록 관리·moderate 1 잔존 ·
> CRON_SECRET은 여전히 PENDING 6 사용자 대기).
>
> - `scripts/db-backup.sh`(bash -n 통과): supabase CLI 우선·pg_dump 폴백, **DB URL은
>   환경변수로만**(어디에도 안 적음), 빈 덤프는 실패 처리(빈 파일을 백업이라 부르면 최악).
> - `docs/runbooks/backup-restore.md`: 복구 4단계(복구 전 현재 백업 먼저) · 리허설
>   체크리스트 · **자동화 한계 정직 기술**(서버 스케줄러 없음 — Windows 작업 스케줄러
>   권장·GitHub Actions는 개인 대화라 비권장) · **스토리지(사진) 미포함 한계 명시**.
> - `backup/` gitignore — 개인 대화 덤프가 저장소에 커밋되면 안 된다(SEC 렌즈).
> - **리허설은 사용자 대기**(DB URL 시크릿 — 루프가 만지지 않음): [manual-verification.md
>   89번](loop-eng/manual-verification.md). "복구해 본 적 없는 백업은 문서다."
> - 검증: turbo 18/18 GREEN(FULL TURBO — 코드 무변경, 문서·스크립트만).

> ## ✅ 2026-07-29 `/loop-eng` — [Phase 57](plans/phase_57.md) T3: 말풍선 렌더 메모이제이션 (W-026)
> **W-024(content-visibility 가상 스크롤)는 이번에 안 했다** — 계획이 "실측하고 결정한다"를
> 요구하는데 무인 환경에선 스크롤 실측이 불가하고, 채팅의 바닥 고정·과거 로딩과의 상호작용은
> 눈 없이 적용하면 위험하다(실기 확인 가능해지면 재개). 대신 실측 없이도 확실한 결함을 잡았다:
>
> - **타이핑마다 전체 메시지 파싱이 재실행되고 있었다** — draft 상태 변경 → MessageRoom
>   전체 재렌더 → 메시지마다 codeFenceParts+linkifyParts 재파싱(본문은 안 바뀌었는데).
> - 본문 조각 렌더를 모듈 스코프 `MessageBodyParts`(React.memo)로 추출 — **인라인이던
>   JSX를 그대로 옮겼다**(동작 보존, 전체 green이 근거). body 같으면 파싱 스킵.
> - `handleCopy`를 useCallback으로 참조 고정 — 렌더마다 새 함수면 memo가 무력화된다.
> - 검증: turbo lint·test·build **18/18 GREEN**.
> - 실기 확인: [manual-verification.md 88번](loop-eng/manual-verification.md).

> ## ✅ 2026-07-29 `/loop-eng` — [Phase 57](plans/phase_57.md) T2: 메신저 키보드 단축키 도움말 (W-004)
> 계획 원문: "`ShortcutsHelp`가 이미 목록을 그린다 — **거기에 추가한다. 새 도움 화면 금지.**"
> 그대로 — 데이터 항목 추가만.
>
> - "메신저" 그룹 5항목: 전송(Enter/Ctrl+Enter — 설정 모드 명시) · Shift+Enter 줄바꿈 ·
>   인라인 수정 저장/취소 · 뷰어 ←→ · Esc 닫기.
> - **실제로 동작하는 키만 적었다** — 문서화 전에 코드로 실존 확인(뷰어 화살표·Esc 등).
>   없는 키를 적으면 도움말이 거짓말이 된다.
> - 검증: turbo lint·test·build **18/18 GREEN**.
> - 실기 확인: [manual-verification.md 87번](loop-eng/manual-verification.md).

> ## ✅ 2026-07-29 `/loop-eng` — [Phase 57](plans/phase_57.md) T2: 오프라인 전송 차단 안내 (W-013)
> 계획 원문 그대로: "`OfflineIndicator`가 **이미 있다**. 재구현 금지 — 메신저 전송 차단
> 안내만 연결한다." 오프라인에서 전송하면 fetch가 정체 모를 에러로 죽던 것을,
> 이유를 말하는 안내로 바꿨다.
>
> - lib `offlineGuard`(테스트 3건): 판정(`isOffline`, navigator 주입으로 테스트 가능 ·
>   SSR/node에선 막지 않음)과 문구 한 벌. **문구가 "쓴 내용은 남아 있어요"를 말한다** —
>   지워진 줄 알면 사용자는 다시 쓴다.
> - MessageRoom 전송 2경로(글 submitDraft · 사진 sendImageFile)에 같은 게이트.
>   초안·파일 선택은 보존.
> - 검증: turbo lint·test·build **18/18 GREEN**.
> - 실기 확인: [manual-verification.md 86번](loop-eng/manual-verification.md).

> ## ✅ 2026-07-29 `/loop-eng` — [Phase 57](plans/phase_57.md) T1: KST 계산 core 승격 (X-013)
> 계획이 "이 Task에서 가장 값이 크다"고 지목한 항목 — 하루 밀림을 여러 번 겪어 eslint
> 규칙까지 만든 저장소인데, UTC→KST 표시 계산이 **네 곳에 따로** 있었다: 홈 인사
> `kstHour()`(로컬 함수) · 오피스 시계 포맷터 · agent 날짜 프롬프트 · 대화 내보내기 시각.
>
> - core date-util에 한 벌 승격(테스트 6건): `kstHourMinute`·`kstHourOf`·`kstFullDateLabel`
>   ·`kstTimeString`. 포맷터 캐시도 core가 갖는다(오피스 게임 루프처럼 반복 호출 자리).
>   UTC 자정 경계(15:30Z = KST 00:30)를 테스트로 잠금.
> - 소비자 4곳 교체(동작 보존): 홈 인사·날짜 라벨 / PixelOffice kstClock / agent
>   buildDateContext / transcript kstTime(내부 중복 삭제). 전체 green이 보존 근거 —
>   특히 기존 transcript 테스트가 시각 규칙 동일함을 보증.
> - **정적 잠금**: apps/web에 "Asia/Seoul" 리터럴 금지 스캔 + core 한 벌 존재 확인.
> - 검증: core 1329건 / turbo lint·test·build **18/18 GREEN**.
> - 실기 확인: [manual-verification.md 85번](loop-eng/manual-verification.md).

> ## ✅ 2026-07-29 `/loop-eng` — [Phase 57](plans/phase_57.md) **착수** — T1: 모션 축소 판정 한 벌 (X-006)
> phase_56의 무-마이그레이션 조각 소진 → phase_57 draft를 stale 가드(Tauri 옵션 A 유지 ·
> a11y 기반 유지) 통과 후 꺼냈다. 계획이 core 승격 대상으로 못박은 X-006부터:
> "모션 축소 판정을 세 곳에서 따로 — 금지. 한 벌로."
>
> - 실태: 판정이 **세 벌**이었다 — mascot 훅(정본) · DuckVideo 효과 안 원시 matchMedia ·
>   PixelOffice 게임 루프 원시 matchMedia. 리터럴이 흩어지면 한 곳만 고쳐진다.
> - mascot에 `prefersReducedMotionNow()`(비-훅, 효과·루프용 즉시 읽기) 추가 — 훅의 첫 렌더
>   false 함정(DuckVideo가 겪은 그것)을 주석으로 못박고, 두 원시 사용처를 교체.
> - **메신저에도 적용**: "맨 아래로" smooth 스크롤 2곳이 모션 축소 시 즉시 이동.
> - **정적 잠금**: "matchMedia + prefers-reduced-motion 같은 줄" 금지 스캔(CSS @media는
>   정당하므로 파일 단위가 아니라 줄 단위 판정 — 검사 파일 자신은 제외).
> - 검증: turbo lint·test·build **18/18 GREEN**.
> - 실기 확인: [manual-verification.md 84번](loop-eng/manual-verification.md).

> ## ✅ 2026-07-29 `/loop-eng` — [Phase 56](plans/phase_56.md) T2: 진단 로그 내보내기 (T-027)
> "왜 안 되지"를 물을 때 첨부할 꾸러미(.json) — 활동 로그(200건, 요약은 core가 이미
> 200자 캡)·알림 기록·설정 키 **이름**·userAgent.
>
> - **localStorage 값은 담지 않는다**(시크릿 렌즈) — 초안·개인 데이터가 들어 있을 수 있다.
>   키 이름만으로 "어떤 설정이 존재하는가"는 충분하다. 이 배제를 테스트로 잠금(3건).
> - 파일 스스로 말한다(note): "키 이름만 담고 값은 담지 않습니다."
> - 조립은 순수함수(lib buildDiagnostics), 수집은 버튼 — 이 저장소의 분업 관례 그대로.
> - 검증: turbo lint·test·build **18/18 GREEN**.
> - 실기 확인: [manual-verification.md 83번](loop-eng/manual-verification.md).

> ## ✅ 2026-07-29 `/loop-eng` — [Phase 56](plans/phase_56.md) T2: 기기 설정 초기화 (T-031)
> 되돌릴 수 없는 동작 — [Phase 35](plans/phase_35.md)의 계약(문구 타이핑 · 위험 동작마다
> **다른** 문구)을 그대로 썼다. 계획 원문: "확인 문구를 다르게 쓴다 — 손이 기억한 대로
> 눌러 되돌릴 수 없는 쪽까지 지운다."
>
> - core `SETTINGS_RESET_PHRASE`("설정을 초기화") 추가 — **세 위험 문구(콘텐츠 삭제·계정
>   삭제·설정 초기화)가 전부 다르고 서로 접두어가 아님**을 테스트로 잠금(3×3 상호 검사).
> - lib `resetLocalSettings`(테스트 3건): **접두어 규칙**("ldd"로 시작하는 키만) — 키 목록을
>   손으로 유지하면 새 키마다 어긋난다. supabase 인증 토큰 등 남의 키는 후보에도 안 올림.
>   열거를 끝낸 뒤 지운다(지우며 돌면 인덱스가 밀린다).
> - 위험 구역 카드: 무장(armed) → 문구 입력 → 실행 → 새로고침(마운트 시점 값이 곳곳에
>   있어 새로고침이 가장 정직한 반영). **DB는 안 건드린다** — 설명에 명시.
> - 검증: core 1316건 / turbo lint·test·build **18/18 GREEN**.
> - 실기 확인: [manual-verification.md 82번](loop-eng/manual-verification.md).

> ## ✅ 2026-07-29 `/loop-eng` — [Phase 56](plans/phase_56.md) T2: 버전 정보 (T-023)
> 설정 "앱 정보"의 **하드코딩 "v1.0.0"이 어떤 배포와도 무관한 낡은 표기**였다(정직 위반
> 발견). 실제 배포 커밋으로 교체 — 오늘만 17번 배포한 제품에 고정 버전 문자열은 거짓말이다.
>
> - lib `buildLabel`(테스트 3건): Vercel이 주입하는 `VERCEL_GIT_COMMIT_SHA`를 7자로 —
>   해시가 없거나(로컬) 형식이 아니면 "개발 빌드"(아는 척하지 않는다). 비밀 아님(공개 repo 해시).
> - 서버 컴포넌트에서 env 읽기라 클라이언트 노출 경로 없음.
> - 검증: turbo lint·test·build **18/18 GREEN**.
> - 실기 확인: [manual-verification.md 81번](loop-eng/manual-verification.md).

> ## ✅ 2026-07-29 `/loop-eng` — [Phase 56](plans/phase_56.md) T2: 데이터 절약 모드 (T-009)
> 계획이 "값이 실제로 있다"고 못박은 항목 — 무료 티어 대역폭(5GB/월) 대책의 다음 단계.
> 지연 로딩(K-024)이 "화면 밖은 나중에"라면 이건 "**누르기 전엔 아예 안 받는다**".
>
> - lib `dataSaverPref`(기본 꺼짐 — SSR/node에서도 평소처럼). 설정 카드 토글(기기별).
> - MessageRoom: 절약 모드에서는 서명 URL 자동 발급을 건너뛰고, 사진 자리에
>   "사진 보기 (데이터 절약 중)" 버튼 — 누른 사진만 그때 불러온다(requestedPaths).
>   **모아보기·확대 뷰어는 평소대로** — 사용자가 연 것은 의도가 명확하다.
> - 검증: turbo lint·test·build **18/18 GREEN**.
> - 실기 확인: [manual-verification.md 80번](loop-eng/manual-verification.md).

> ## ✅ 2026-07-29 `/loop-eng` — [Phase 56](plans/phase_56.md) T1: "지금 이 방 알림이 오는가" 한 줄 — **T1 알림 묶음 완결**
> 계획이 T1 말미에 못박은 요구: 판정이 다섯 겹(권한·집중·방해금지·상한·알림 방식·방
> 음소거)이라 사용자가 추적할 수 없다 — "정체 모를 실패 대신 왜 안 되는지 말한다."
>
> - lib `describeMessageNotifyStatus`(테스트 5건): **문구 합성만** 한다 — 판정은 전부 기존
>   것(notifyBlockReason·msgNotifyPref) 재사용, 새 판정 0개. 우선순위: 전역 게이트 →
>   알림 방식(끔/키워드 0개=사실상 꺼짐/키워드 N개만) → 켜짐.
> - 방 헤더에 "알림: …" 한 줄(마운트·음소거 변경 시 갱신). 방 음소거는 기존 버튼이 말한다.
> - **T1(알림 심화)에서 지금 코드로 가능한 것 완결**: M-007·008(키워드)·011(요일)·028
>   (히스토리)·031(테스트 발송)·상태 한 줄. 잔여는 선행 의존(M-019 그룹화←그룹방,
>   M-032·033←예약 전송, M-025 이메일←SMTP 상한 실측, M-014 알림음←Phase 44 음원).
> - 검증: turbo lint·test·build **18/18 GREEN**.
> - 실기 확인: [manual-verification.md 79번](loop-eng/manual-verification.md).

> ## ✅ 2026-07-29 `/loop-eng` — [Phase 56](plans/phase_56.md) T1: 요일별 방해금지 (M-011)
> 계획 원문 "**QuietHoursSetting의 확장. 재구현 금지**" 그대로 — 새 판정을 만들지 않고
> 기존 한 벌을 넓혔다. 소비자 3곳(알림 notify · 위젯 DuckWidget · 마스코트 혼잣말)이
> **같은 `isQuietNow`**를 쓴다.
>
> - core `isQuietNow`(테스트 4건): `days`(0=일~6=토) 없으면 매일 — **옛 설정이 그대로
>   동작한다**(하위호환). 자정 넘는 구간의 요일 판정은 **지금 요일 기준**(월요일만 켜면
>   화요일 새벽은 시끄러움) — 시작-요일 역산 같은 규칙은 설정 화면으로 설명할 수 없다.
> - 백업 coercion(local-prefs)·web lib 파싱에 days 확장(0-6 정수만·중복 제거, 테스트 3건).
> - 설정 UI: 요일 체크박스(기본 전부). 전부 켜짐이면 days를 저장하지 않아 옛 셰이프
>   유지. **전부 끄면 "적용되지 않아요" 경고**(키워드 빈 목록과 같은 정직 패턴).
> - 검증: core 1312건 / turbo lint·test·build **18/18 GREEN** (mascot 포함).
> - 실기 확인: [manual-verification.md 78번](loop-eng/manual-verification.md).

> ## ✅ 2026-07-29 `/loop-eng` — [Phase 56](plans/phase_56.md) T1: 알림 히스토리 (M-028)
> M-031(지금 왜 막히나)의 짝 — "**아까** 알림이 왜 안 왔지?"의 사후 기록.
> 새 로그 테이블은 만들지 않았다(계획 M-034의 결) — 알림 상한·권한이 기기별이므로
> 기록도 기기별 localStorage 링(50건)이 맞다. 백업에도 안 담는다(파생 기록).
>
> - lib `notifyHistory`(테스트 7건): 최신 앞 · 상한 자르기 · 깨진 값 무시 · **기록 실패가
>   알림을 막지 않는다**(전부 조용히 삼킴). 결과 라벨(보냄/미지원/권한/집중/방해금지/상한)
>   완비를 테스트로 잠금.
> - `notifyDuck`이 발송이든 차단이든 결과를 남긴다. **본문은 안 남긴다** — 제목이면
>   어떤 알림인지 충분하고, 메시지 내용이 기록에 복제되면 안 된다.
> - 설정 브라우저 알림 카드에 "최근 알림 기록"(최근 8건 표시 + 지우기).
> - 검증: turbo lint·test·build **18/18 GREEN**.
> - 실기 확인: [manual-verification.md 77번](loop-eng/manual-verification.md).

> ## ✅ 2026-07-29 `/loop-eng` — [Phase 56](plans/phase_56.md) T1: 테스트 알림 + 차단 사유 진단 (M-031)
> `notifyDuck`은 권한·집중 모드·방해금지·상한에 막히면 **조용히** 돌아간다 — 사용자는
> "왜 안 오지?"에 답을 얻을 길이 없었다. 게이트 판정을 `notifyBlockReason` 한 곳으로
> 모아 발송과 진단이 **같은 순서 한 벌**을 보게 했다(동작 보존 리팩터링, 전체 green이 근거).
>
> - `notifyBlockReason`: 차단 사유(unsupported/permission/focus/quiet/cap) 또는 null.
>   **진단은 상한을 소모하지 않는다**(peek와 consume 분리) — 사유를 반복 확인해도
>   오늘 몫이 줄지 않는다. 사유별 한국어 문구(`NOTIFY_BLOCK_MESSAGES`) 완비를 테스트로 잠금.
> - 설정 → 브라우저 알림에 "테스트 알림 보내기": 나가면 실제 알림, 막히면 그 사유를 화면에.
> - 선행 버퍼 점검: phase_57~59 draft 존재 — 버퍼 충분, 추가 기획 안 함(상한 2 준수).
> - 검증: turbo lint·test·build **18/18 GREEN**.
> - 실기 확인: [manual-verification.md 76번](loop-eng/manual-verification.md).

> ## ✅ 2026-07-29 `/loop-eng` — [Phase 56](plans/phase_56.md) **착수** — T1: 알림 방식·키워드 알림 (M-007·M-008)
> Phase 55의 무-마이그레이션 조각이 얇아져 **선행 버퍼(phase_56 draft)를 stale 가드
> 재검증 후 꺼냈다**: 설정 카드 구조·알림 배선(notifyDuck 단일 지점)·localStorage 결
> 모두 코드로 확인 — 가드 3항목 통과, draft → 진행 중.
>
> - core `shouldNotifyMessage`(테스트 7건): 전부/키워드만/끔. 키워드는 부분일치·영문
>   대소문자 무시. **멘션(M-007)은 키워드로 환원** — 그룹·멘션 개념이 아직 없어 모호한
>   모드를 만드는 것보다 정직하다(계획이 M-021에 내린 결).
> - 배선은 **notifyDuck 호출부 한 곳** 앞의 게이트뿐 — 권한·방해금지·하루 상한은
>   notifyDuck이 이미 본다(두 벌 금지, 계획 원문 그대로).
> - 키워드는 **백업 허용 목록에 추가**(`ldd:notify-keywords` — 손으로 고른 낱말이라
>   파생값이 아니다). 기존 잠금 테스트(키 목록 못박기)가 울어서 갱신 — 잠금이 제 역할.
>   core↔web 키 리터럴 일치는 정적 검사로 잠금. 모드는 백업 안 담음(한 클릭 복구).
> - 설정 카드: 라디오 3모드 + 키워드 칩 편집기. **키워드 모드+빈 목록이면 "아무 알림도
>   오지 않아요" 경고**(말 안 하면 고장으로 안다).
> - 검증: core 1301건 / turbo lint·test·build **18/18 GREEN**.
> - 실기 확인: [manual-verification.md 75번](loop-eng/manual-verification.md).

> ## ✅ 2026-07-29 `/loop-eng` — [Phase 55](plans/phase_55.md) T2: 저장 공간 계기판 (Q-022)
> Phase 55의 착수 기준이 "**스토리지 사용량 50% 초과?**"인데 그 숫자를 볼 수단이 없었다 —
> 계기판부터 만들었다(측정 없는 기준은 기준이 아니다).
>
> - core `formatBytes`·`storageUsagePercent`(테스트 5건): 100% 초과를 자르지 않고 그대로,
>   작은 사용량도 0으로 안 뭉갬(소수 1자리). 한도 상수는 한 곳(`STORAGE_FREE_TIER_BYTES`).
> - api `messengerStorageUsage`(테스트 4건): 방별 폴더(`방id/…`)를 돌며 크기 합산.
>   **모르는 것은 근사치라고 말한다** — 폴더 목록 상한(1000)·크기 미상 항목·방 200 상한에
>   닿으면 approximate. 조회 실패는 0을 돌려주지 않고 던진다.
> - 설정 카드 "메신저 저장 공간": **버튼을 눌렀을 때만** 계산(방 수 × 목록 조회라 공짜가
>   아니다). 게이지(progressbar aria) + 50% 초과 시 경고색·정리 안내.
> - 검증: core 1292건 / api 41건 / turbo lint·test·build **18/18 GREEN**.
> - 실기 확인: [manual-verification.md 74번](loop-eng/manual-verification.md).

> ## ✅ 2026-07-29 `/loop-eng` — [Phase 55](plans/phase_55.md) T1: 검색 결과 내보내기 (L-020) + **Q-005 계약 검토 결론**
> **Q-005(카카오톡 txt 가져오기) 계약 검토 — 사용자 결정 대기(PENDING).**
> 마이그레이션 원문으로 확인한 사실:
> ① `messages.seq`는 `generated always as identity` — 클라이언트 지정 불가, 순서는
> 시간순 순차 insert로만 보존(가능). ② `created_at`은 default라 명시 삽입을 스키마·정책이
> 막지 않는다 [추정 — 실 insert로 확인 필요]. ③ **`sender_type`이 'user'(본인 uid 강제)와
> 'agent'(null 강제)뿐** — 카카오톡 "상대방" 발화를 표현할 자리가 없다. 본인으로 넣으면
> 위조, 오리로 넣으면 사칭. **정직한 구현에는 스키마 확장이 필요하다**(예: sender_name
> 컬럼 또는 'imported' sender_type + RLS 확장). DDL = 계약 변경 = 사고 게이트 —
> 무인 루프가 임의로 진행하지 않는다. 원하는 방향을 알려주면 마이그레이션(down 포함)
> 초안부터 만든다.
>
> **L-020 검색 결과 내보내기 (구현 완료)**: 결과 목록 위 ".txt·.json" 버튼 —
> 대화 내보내기와 **같은 포매터 한 벌**(formatTranscript·transcriptJson) 재사용,
> 화면에 보이는 결과 그대로(재조회 없음 — 재조회하면 화면과 파일이 다를 수 있다).
> 파일명에 검색어 포함. 검증: turbo lint·test·build **18/18 GREEN**.
> 실기 확인: [manual-verification.md 73번](loop-eng/manual-verification.md).

> ## ✅ 2026-07-29 `/loop-eng` — [Phase 55](plans/phase_55.md) T1: 방 이름 필터 (L-023) + 표시 제목 공용화
> 방 표시 제목 폴백(`title ?? "오리와의 대화"/"이름 없는 대화"`)이 **목록과 전달 대화상자
> 두 곳에 인라인 중복**돼 있었다 — core `roomDisplayTitle`로 모으고 세 소비자(목록·전달·
> 필터)가 한 벌을 쓴다. 필터가 raw title이 아니라 **보이는 제목**으로 거른다는 게 핵심:
> 제목 없는 오리 방이 "오리"로 걸린다.
>
> - core `roomDisplayTitle`·`filterRoomsByTitle`(테스트 7건): 부분일치 · 대소문자 무시 ·
>   빈 검색어는 전체. 픽스처의 방 타입 오기("dm")를 core build가 잡아 "direct"로 교정.
> - `RoomList` 클라이언트 컴포넌트 추출: 서버가 실어 준 목록(상한 200)을 왕복 0회로
>   거른다. **방 6개 미만이면 입력을 숨긴다** — 방 두 개에 검색창은 소음이다.
> - 검증: core 1287건(room 79) / turbo lint·test·build **18/18 GREEN**.
> - 실기 확인: [manual-verification.md 72번](loop-eng/manual-verification.md).

> ## ✅ 2026-07-29 `/loop-eng` — [Phase 55](plans/phase_55.md) T3: 첨부 이미지 지연 로딩 (K-024)
> 무료 티어 대역폭(5GB/월) 방어 — 대화·갤러리의 `<img>`에 `loading="lazy"`+`decoding="async"`.
> 화면 밖 사진은 스크롤 전에 내려받지 않는다. **블러 플레이스홀더는 안 만들었다**(썸네일
> 인프라 필요 — Phase 51 경로에서 별도 판단, 지금은 YAGNI).
>
> - 정책을 **정적 검사로 잠금**(`lazyMessageImages.test.ts`): MessageRoom의 모든 `<img>`에
>   lazy가 없으면 실패 — 다음에 이미지가 추가될 때 조용히 빠지는 회귀를 막는다.
> - 확대 뷰어(MessageImageViewer)는 사용자가 연 것이라 즉시 로드 유지(의도된 예외, 검사 주석에 명시).
> - 검증: turbo lint·test·build **18/18 GREEN**.
> - 실기 확인: [manual-verification.md 71번](loop-eng/manual-verification.md).

> ## ✅ 2026-07-29 `/loop-eng` — [Phase 55](plans/phase_55.md) T4: 날짜로 이동 (E-039)
> 새 배관 없이 기존 것 두 벌의 조합: **kstDayRange**(검색 필터의 KST 경계)로 그 날 시작을
> 구하고, 점프는 검색의 **`?focus=` 경로**(주변 로딩 L-005 · 스크롤 · 강조)에 그대로 맡겼다.
>
> - api `firstMessageOnOrAfter`(테스트 3건): 그 날 시작 이후 첫 메시지(seq 오름차순 1건).
>   날짜 형식이 틀리면 **조회 없이 null** — 경계를 버리고 조회하면 방의 맨 첫 메시지로
>   점프해 "그 날로 갔다"고 오인하게 된다.
> - 방 헤더: 날짜 선택 + "날짜로 이동". 없으면 "그 날 이후 메시지가 없어요".
> - **소프트 내비게이션 함정 수정**: 방 안에서 focus만 바뀌면 React가 컴포넌트를 재사용해
>   초기 목록·focus 1회 가드가 남는다 — 페이지에서 `key={focus}`로 재마운트를 강제.
> - 검증: api 37건 / turbo lint·test·build **18/18 GREEN**.
> - 실기 확인: [manual-verification.md 70번](loop-eng/manual-verification.md).

> ## ✅ 2026-07-29 `/loop-eng` — [Phase 55](plans/phase_55.md) T1: 최근 검색어 (L-017) + recentList 공용화
> "localStorage 최근 목록"의 **두 번째 소비자**가 생겨(이모지 피커에 이어 검색) 피커 추출 때와
> 같은 원칙으로 공용 lib로 꺼냈다 — 두 곳이 정책(중복 하나·최신 앞·상한·조용한 실패) 한 벌을 쓴다.
>
> - lib `recentList`(테스트 9건): read·push·clear. storage 주입으로 node 테스트 가능,
>   접근 차단 환경(사생활 모드)에서도 기능이 죽지 않는다.
> - EmojiPicker를 **동작 보존** 교체(키·상한 20 그대로, 전체 테스트 green이 근거).
> - 검색: 성공한 검색만 최근에 남긴다(실패어가 쌓이면 목록이 못 쓰게 된다) · 칩 클릭은
>   제출과 **같은 runSearch 경로**(필터 동일 적용) · 지우기 버튼 · 최대 10.
> - **백업(localPrefs)에는 안 담는다** — local-prefs.ts가 이미 "파생값이라 쓰면 다시
>   쌓인다"고 결정해 둔 항목이다(선례 준수).
> - 검증: web 테스트 파일 62(+1) / turbo lint·test·build **18/18 GREEN**.
> - 실기 확인: [manual-verification.md 69번](loop-eng/manual-verification.md).

> ## ✅ 2026-07-29 `/loop-eng` — [Phase 55](plans/phase_55.md) T1: 검색 필터 (L-006~L-008)
> 검색 심화의 첫 조각 — 기존 부분일치 검색(Phase 51 방식) 위에 얹었고 마이그레이션 0건.
>
> - core `kstDayRange`(테스트 5건): 기간 필터의 **KST 날짜 경계**가 계약 —
>   상한은 다음날 시작(배타)이라 "그 날까지"가 23:59:59.999까지 포함된다.
>   틀린 날짜 형식은 그 경계만 무시(검색 전체가 죽으면 안 된다).
> - api `searchMessages`에 filter 인자(sender_type · created_at gte/lt · attachment_path) —
>   **캡처 목 테스트 4건**: 필터가 조용히 무시되면 사용자는 "걸렸다"고 믿은 채 전체 결과를
>   보게 되므로, 조건이 실제 쿼리에 얹혔는지를 잠갔다. 미지정 시 기존 동작 보존.
> - UI: 검색창 아래 필터 줄(보낸 사람 전체/나/오리 · 기간 date × 2 · 사진만 체크박스).
>   "찾기"를 누를 때 적용. a11y 정적 검사에 걸린 체크박스 aria-label 수정.
> - 검증: core 1280건 / api 34건 / turbo lint·test·build **18/18 GREEN**.
> - 실기 확인: [manual-verification.md 68번](loop-eng/manual-verification.md).

> ## ✅ 2026-07-29 `/loop-eng` — [Phase 55](plans/phase_55.md) T2: 대화 내보내기 md·json (Q-002)
> Q-001(.txt) 위에 형식 두 개를 얹었다. **세 형식이 정책 한 벌**(seq 정렬 · KST 날짜 경계 ·
> 발화자 판정 · 지운 메시지는 안내 문구)을 공유한다 — 형식마다 판정이 갈라지면 어느
> 파일이 맞는지 모른다. JSON도 원본 행을 통째로 쏟지 않는다(삭제 본문 미포함, deleted 표시).
>
> - core `formatTranscriptMarkdown`·`transcriptJson`(테스트 +11) · `transcriptFileName` 확장자 인자.
> - 방 헤더: "대화 내보내기 .txt · .md · .json" 인라인 버튼(음소거 기간 버튼 관례 — 모달 불필요).
>   수집은 백업 v5와 같은 `fetchAllRoomMessages` 한 경로.
> - 검증: core 1275건(transcript 20) / turbo lint·test·build **18/18 GREEN**.
> - 실기 확인: [manual-verification.md 67번](loop-eng/manual-verification.md).

> ## ✅ 2026-07-29 `/loop-eng` — [Phase 55](plans/phase_55.md) T2: 백업 v5 — 메신저 대화 보관 (Q 잔여의 실체)
> 계획이 T2의 실체로 못박은 "**메시지를 백업 형식에 추가**"를 처리했다. 대화는 다시 만들
> 방법이 없는 유일본인데 지금까지 "내 데이터 내보내기"에서 통째로 빠져 있었다.
>
> - core 백업 **v4 → v5**: `messageRooms`·`messages` 추가. **보관 전용** — 메시지에는
>   상대방·오리가 보낸 행이 섞여 있고 RLS는 내 행만 insert를 허용하므로 자동 복원은
>   성립하지 않는다. 복원 계획이 `archived`로 따로 세고(가져오기 개수에 안 섞음),
>   가져오기 대화상자가 "보관용이라 복원 안 됨"을 명시한다(말 안 하면 복원됐다고 믿는다).
> - `buildBackup`에 `knownTruncated` 추가 — 메시지는 방별 왕복 가드라 개수-상한 비교로는
>   잘림을 알 수 없어, 가드에 닿은 사실 자체를 호출부가 전달한다. v1~v4 파일은 그대로 읽힌다.
> - api `fetchAllRoomMessages` 추출: 대화 내보내기(.txt)의 인라인 루프와 백업이 **같은
>   수집 경로 한 벌** — 경로가 갈라지면 "전부"의 기준도 갈라진다. MessageRoom도 이걸 쓰도록 교체.
> - 검증: core 1264건 / api 30건(rooms) / web 27건(backup) / turbo lint·test·build **18/18 GREEN**.
> - 실기 확인: [manual-verification.md 66번](loop-eng/manual-verification.md).

> ## ✅ 2026-07-29 12:2x — **마이그레이션 11건 전부 적용 완료** (사용자 지시, MCP 경로)
> CLI 자격 증명 없이 **claude.ai Supabase 커넥터(MCP)** 로 적용했다. 이력·테이블·어드바이저 검증 완료.
> - 적용: todo_recurrence · **harden_security_definer(보안 구멍 패치)** · rls_initplan_rest ·
>   user_roles_and_layout · messenger_rooms · message_attachments_bucket ·
>   message_attachment_column · room_activity_trigger · message_reply · message_reactions ·
>   message_edit — 원격 이력 40건, 메신저 4테이블 RLS ON 확인.
> - **관리자 지정 완료**: 두 계정 role='admin' (문서의 SQL은 profiles에 없는 email 컬럼을
>   참조해 auth.users 조인으로 교정 실행).
> - 어드바이저(security): **이전의 치명 항목(anon award_xp) 해소 확인.** 남은 WARN은
>   의도된 설계(공개 페이지 anon RPC · RLS 재귀 차단 함수들) + 사용자 토글(유출 비밀번호
>   보호) + 기존 항목(vector/pg_trgm in public). 유일한 코드 후속: touch_room_on_message의
>   authenticated EXECUTE 회수(트리거 전용이라 RPC 호출은 거부되지만 명시 회수가 깔끔).
> - **이제 메신저가 실제로 동작하는 상태다** — 실물 확인 항목(50~65번)을 사용자가 점검할 수 있다.

> ## ✅ 2026-07-29 `/loop-eng` — [Phase 55](plans/phase_55.md) T3: 링크 모아보기 (K-016) — 오늘 루프 종료(사용자 지시)
> - core `extractLinks`(테스트 6건): 감지는 말풍선과 **같은 linkifyParts 한 벌** — 말풍선에서
>   링크가 되는 것과 모아보기에 잡히는 것이 다르면 어느 쪽이 고장인지 모른다.
>   최근 것부터 · 같은 URL은 하나만 · 지운 메시지 제외.
> - api `listRoomLinkMessages`: 서버 필터는 고정 패턴 '%http%'(사용자 입력 미접촉) —
>   넓게 걸러도 실제 추출은 core가 하므로 가짜 히트는 자연히 떨어진다. 최신 500건 상한.
> - 방 헤더 "링크 모아보기" → 목록(새 탭, noopener). 사진 모아보기와 같은 오버레이 관례.
> - 검증: core 1252건(파일 92) / turbo lint·test·build **18/18 GREEN**.
> - **사용자 지시로 오늘 자율 루프 종료.** 5분 예약 해제·락 해제. 오늘 총 18사이클·18배포.
>   실물 확인 대기 항목: manual-verification 50~65번(e2e 세션 생성 시 자동화 가능).

> ## ✅ 2026-07-29 `/loop-eng` — [Phase 55](plans/phase_55.md) T2·T3: EXIF 제거 확인 + 대화 .txt 내보내기
> Phase 54 코드-완결 잔여 소진 → 55 스윕에서 두 조각.
>
> - **K-008·K-009**: 계획의 추정("canvas를 거치면 EXIF가 날아간다")을 **확인하고 기록**했다 —
>   `toBlob`은 픽셀만 인코드하므로 **촬영 위치(GPS)가 서버에 올라가지 않는다.** 추가로
>   `createImageBitmap`에 `imageOrientation: "from-image"`를 명시 — 방향도 EXIF에 있어서
>   안 하면 세로 사진이 눕는 브라우저가 있다(회전 보정 K-009까지 한 줄로).
> - **Q-001**: 방 헤더 "대화 내보내기(.txt)" — 화면 창(50개) 밖 과거까지 **전부** 읽어 담는다
>   (일부만 담고 내보냈다고 하지 않는다 · 무한 루프 가드 100회). core `formatTranscript`
>   (테스트 9건): KST 날짜 구분줄(`dayKey` 재사용) · 시각 · 나/오리/상대 라벨 · **지운 메시지는
>   안내 문구로**(내보내기가 삭제를 되살리면 안 된다) · system은 "(알림)". 파일명은 OS 금지
>   문자 제거(`transcriptFileName`). **새 백업 체계를 만들지 않았다**(백업 v4 그대로).
> - 검증: core 1258건(파일 91) / turbo lint·test·build **18/18 GREEN**.
> - 실물 확인: [manual-verification.md 64번](loop-eng/manual-verification.md).

> ## ✅ 2026-07-29 `/loop-eng` — Phase 54 T1 + 56 선행: 여러 줄 입력(textarea) + 전송 키 설정
> **스레드(T2)는 착수하지 않았다** — `last_read_message_id` 모델 재설계가 낀 계약 변경이라
> 무인 루프의 임의 판단 범위 밖(계획 스스로 "착수 전에 판단한다" 게이트). 대신 F-003이
> 실은 **여러 줄 입력과 세트**임을 확인했다: 입력이 `<input>`이라 줄바꿈 자체가 불가능했다.
>
> - 입력창 input → **textarea**(F-001): 최대 4줄 자동 확장, Shift+Enter 줄바꿈.
>   말풍선에 whitespace-pre-wrap — 줄바꿈이 이제 보인다.
> - `shouldSendOnKey`(테스트 +7, **IME 가드와 같은 파일** — 전송 판정과 조합 판정이 갈라지면
>   한쪽만 고쳐진다): enter 모드(Enter 전송·Shift+Enter 줄바꿈) / ctrl-enter 모드(Enter 줄바꿈).
>   조합 중이면 어느 모드든 전송 안 함.
> - 설정 → **"메시지 전송 키"** 카드(`SendKeySetting`, NotifySetting 관례): 한글이 잘리는
>   일이 잦으면 Ctrl+Enter 모드. 기기별 localStorage(`sendKeyPref`), 방 진입 시 1회 적용.
> - 폼 버튼과 키 판정이 같은 `submitDraft` 경로를 쓴다(추출) — 슬래시 커맨드 포함.
> - 검증: web 테스트 파일 60 / turbo lint·test·build **18/18 GREEN**.
> - 실물 확인: [manual-verification.md 63번](loop-eng/manual-verification.md).

> ## ✅ 2026-07-29 `/loop-eng` — [Phase 54](plans/phase_54.md) T3: 코드 블록 렌더 + 복사 (H-013)
> T4를 먼저 읽었는데 대부분 DEFER 등급이거나 계획 스스로 "정직하게 안 만든다"고 정한
> 항목(전송 취소)이었다. 실가치 조각은 T3의 코드 블록 — **오리 응답과 코드 스니펫 보관**
> ("나와의 채팅"이 개발자의 코드 메모장이 된다) 대비다.
>
> - core `codeFenceParts`(테스트 8건): ``` 펜스만 분리 — **마크다운 파서를 만든 게 아니다**
>   (재구현 금지 항목). BlockNote는 말풍선 read-only 렌더에 부적합(메시지마다 에디터
>   인스턴스 = 성능 붕괴)하다는 판단을 명시했다. 닫히지 않은 펜스는 끝까지 코드(마크다운
>   관례) · 빈 블록 무시 · **코드 안은 그대로 보존**(URL 링크화 안 함).
> - 말풍선 렌더 합성: code 조각 → `<pre>` + 언어 라벨 + **복사 버튼**(기존 handleCopy 재사용),
>   text 조각 → 기존 linkify. HTML 문자열 생성 없음.
> - 구문 강조는 안 했다 — 라이브러리(신규 의존성)가 필요해 "신규 의존성 0" 계약과 충돌.
>   필요해지면 Phase 51 H-012 경로에서 별도 판단.
> - 검증: core 1249건(파일 90) / turbo lint·test·build **18/18 GREEN**.
> - 실물 확인: [manual-verification.md 62번](loop-eng/manual-verification.md).

> ## ✅ 2026-07-29 `/loop-eng` — [Phase 54](plans/phase_54.md) T1: 이모지 피커 공용화 + 메시지 입력 연결
> 계획이 "재사용, 재구현 금지"라 한 F-011~F-013. 실체는 **PageEditor 내부의 IconPicker**였다
> (별도 컴포넌트가 아니었다) — 그대로 꺼내 공용 `EmojiPicker`로 만들고 두 곳이 쓴다.
>
> - 추출은 **동작 보존**: 카테고리 탭 · "자주 쓰는"(localStorage, 최근 20) · 아이콘 제거 버튼
>   (onClear 옵션으로 — 메시지엔 지울 대상이 없어 안 보인다) · aria 접두사만 호출부 인자로.
> - 페이지 아이콘과 메시지 입력이 **같은 "자주 쓰는" 목록을 공유**한다(키 한 곳).
>   재분열 회귀는 정적 검사로 잠갔다(키 리터럴이 EmojiPicker 밖에 있으면 실패).
> - 메시지 입력: 🙂 버튼 → 입력창 위 피커 → 선택 시 초안 끝에 붙고 닫힘.
> - 검증: web 테스트 파일 60(+1) / turbo lint·test·build **18/18 GREEN**
>   (PageEditor 추출 후에도 전체 green — 동작 보존의 결정적 근거).
> - 실물 확인: [manual-verification.md 61번](loop-eng/manual-verification.md).

> ## ✅ 2026-07-29 `/loop-eng` — [Phase 54](plans/phase_54.md) T1: IME 전송 방지 + 붙여넣기·드래그 첨부
> T1 우선순위 "높음" 두 줄을 처리했다. grep 결과 **X-018(Phase 50)도 실제로는 미구현**이었다 —
> 한국어 조합 중 Enter가 쓰다 만 문장을 전송하는 상태였다(오리 채팅 포함).
>
> - `lib/composition.ts` `isComposingEnter`(테스트 3건 + **단일 출처 정적 검사**): isComposing +
>   keyCode 229 안전망. 계획이 못박은 대로 X-017·X-018을 **한 벌로** — 메시지 입력·수정 입력·
>   오리 채팅(DuckChatPanel) 세 곳이 같은 판정을 쓴다.
> - **F-006 붙여넣기 첨부**: 클립보드의 이미지면 첨부로, 글이면 평소대로. **F-007 드래그 첨부**:
>   대화 영역에 놓으면 첨부로(브라우저가 파일을 여는 기본 동작 차단).
> - 파일 선택·붙여넣기·드래그가 **한 업로드 경로**(`sendImageFile`)를 쓴다 — 경로가 갈라지면
>   형식·크기 검사도 갈라진다.
> - 검증: web 테스트 파일 59(+1) / turbo lint·test·build **18/18 GREEN**.
> - 실물 확인: [manual-verification.md 60번](loop-eng/manual-verification.md) — IME 동작은
>   실제 한글 입력기로만 확인된다.

> ## ✅ 2026-07-29 `/loop-eng` — Phase 54: 메시지 URL 링크화
> 본문 속 URL이 평문으로만 보여 클릭이 안 됐다. **미리보기 카드는 만들지 않았다** —
> 외부 fetch가 필요해 쿼터·SSRF 표면이 생긴다. 링크화는 fetch 0회의 결정적 가공.
>
> - core `linkifyParts`(테스트 10건): URL 문자 집합을 명시해 **한글이 안 딸려 들어간다**
>   ("https://a.com입니다" → 링크는 a.com까지). 끝 문장부호 제거 · 위키식 괄호 짝 보존 ·
>   **`javascript:` 스킴 원천 차단**(허용 목록 방식 — 이 경로로 에이전트 응답도 렌더된다).
> - 말풍선: 링크만 `<a target=_blank rel="noopener noreferrer">`, HTML 문자열 생성 없음
>   (평문 렌더 원칙 유지). 긴 URL은 break-all로 말풍선을 안 넘친다.
> - 검증: core 1238건(파일 89) / turbo lint·test·build **18/18 GREEN**.
> - 실물 확인: [manual-verification.md 59번](loop-eng/manual-verification.md).

> ## ✅ 2026-07-29 `/loop-eng` — Phase 54: 메시지 전달 + **Phase 51 코드 범위 완결 판정**
> Phase 51 잔여 스윕: 남은 코드 항목은 M-023(오리 표정 반응)뿐인데 **메시지 화면에는 오리가
> 없다** — 반응을 보여 줄 자리가 없어 보류(YAGNI, DuckChatPanel 흡수 때 재평가).
> **Phase 51은 코드로 가능한 범위 완결.** 이어 Phase 54의 전달을 만들었다.
>
> - core `canForwardMessage`(테스트 3건): 글 메시지만. 지운 것(다른 방에 살아나면 안 된다)·
>   system 영수증(그 방의 기록이지 내용이 아니다) 불가. **남의 메시지는 전달 가능** —
>   받은 말을 옮기는 것이 전달의 본래 쓰임.
> - 메뉴 "전달" → 방 고르기(그때 목록 조회 — 새 방 반영, 지금 방 제외) → 전송 → "전달했어요".
> - **사진 전달은 재업로드다**: 첨부 경로가 방 스코프(버킷 정책이 경로 첫 칸으로 멤버 판정)라
>   경로 재사용이 안 된다. `downloadMessageImage` → 새 Blob → `uploadMessageImage` 조합 —
>   전부 기존 함수, 신규 api 0, 마이그레이션 0.
> - 검증: core 1228건 / turbo lint·test·build **18/18 GREEN**.
> - 실물 확인: [manual-verification.md 58번](loop-eng/manual-verification.md).

> ## ✅ 2026-07-29 `/loop-eng` — [Phase 51](plans/phase_51.md) T3 후속: 위로 스크롤 과거 로딩 + 실시간 병합
> 사이클 9가 남긴 두 한계를 함께 닫았다.
>
> - core `mergeMessages`(테스트 4건): id 기준 합집합 + seq 정렬. **겹치면 새 쪽이 이긴다**
>   (수정·삭제 반영). 실시간 reload가 이제 목록을 **갈아치우지 않고 병합**한다 —
>   옛 구간(검색 점프·과거 로딩)을 보는 중 이벤트가 와도 보던 자리가 남는다.
> - api `listMessagesBefore`(테스트 2건): 이 seq 이전 조각. 빈 배열 = 처음까지 왔다.
> - 화면: 꼭대기 근처 스크롤 → 과거 이어 붙이기. **layout 효과로 스크롤 보정**(안 하면
>   목록이 늘어난 만큼 화면이 밀린다) · ref 잠금(스크롤 이벤트는 몰려온다) · 처음 도달 시
>   중단 · "이전 대화 불러오는 중" 표시.
> - **꼬리 변경 감지**: 위에 이어 붙인 것은 새 도착이 아니다 — 마지막 메시지 id가 그대로면
>   "새 메시지 ↓" 버튼을 띄우지 않는다.
> - 검증: core 1225건 / api 481건 / turbo lint·test·build **18/18 GREEN**.
> - 실물 확인: 57번 항목에 합산(위로 스크롤 시 자연스러운 이어짐은 육안 확인 필요).

> ## ✅ 2026-07-29 `/loop-eng` — [Phase 51](plans/phase_51.md) T3 완결: 표적 주변 로딩 (L-005)
> 직전 사이클이 정직하게 남긴 한계("최근 50개 밖이면 안내만")를 닫았다 — 검색 점프가
> **얼마나 오래된 메시지든 그 주변 맥락째** 연다.
>
> - core `mergeAroundWindow`(테스트 4건): 이전(최신순)·이후(오래된순) 두 조회를 화면
>   순서 하나로. **뒤집기 계약을 core 한 곳에 잠갔다** — 화면마다 하게 두면 한 곳은 틀린다.
> - api `listMessagesAround`: 표적 seq 조회 → 위 25 + 아래 25 병렬 조회 → 병합.
>   **표적을 못 찾으면 null** → 페이지가 평소 목록으로 폴백(조용한 실패 없음).
> - 화면 안내 문구를 실제 의미로 교체("열 수 없어요 — 지워졌을 수 있어요").
>   이제 이 안내가 뜨는 경우는 그 사이 삭제된 표적뿐이다.
> - **[알려진 한계 · 정직하게]** 옛 구간을 보는 중 실시간 이벤트가 오면 목록이 최신 50개로
>   돌아온다(reload가 listMessages를 부른다). 위로 무한 스크롤(과거 페이지네이션)은 별도
>   슬라이스 — 지금은 점프한 자리에서 읽는 것이 목적이라 수용.
> - 검증: core 1217건 / api 477건 / turbo lint·test·build **18/18 GREEN**.
> - 실물 확인: 57번 항목에 합산(같은 재현 절차, 이제 옛 메시지도 열림).

> ## ✅ 2026-07-29 `/loop-eng` — [Phase 51](plans/phase_51.md) T3 잔여: 검색 하이라이트 + 원문 점프
> T3의 [확인 필요] 항목을 grep으로 실측했다 — 검색은 있는데 **하이라이트(L-002)와 원문
> 점프(L-003)가 둘 다 없었다**(결과 클릭이 방 상단으로만 갔다). 이번에 채웠다.
>
> - core `splitByQuery`(테스트 8건): 본문을 hit/non-hit 조각으로. **정규식을 안 쓴다** —
>   검색어의 `$`·`(` 이스케이프는 한 글자만 빠져도 검색어가 패턴이 된다. indexOf 순회가
>   그 실수 자체를 없앤다. 대소문자 무시·원문 표기 보존·이모지 안전.
> - 검색 결과: `<mark>`로 맞은 부분 표시(HTML 문자열 생성 없음 — 평문 렌더 원칙 유지),
>   링크가 `?focus=<메시지id>`로.
> - 대화 화면: 표적이 있으면 **바닥 대신 그 메시지에서 시작**(가운데 정렬 + 2.5초 반짝임).
>   **로드 창(최근 50개) 밖이면 조용히 실패하지 않는다** — "찾은 메시지가 최근 50개보다
>   오래돼 보이지 않아요" 안내. 옛 메시지 구간 로딩(around-seq 페이지네이션)은 별도 슬라이스로
>   정직하게 남긴다.
> - 검증: core 1213건(파일 88) / turbo lint·test·build **18/18 GREEN**.
> - 실물 확인: [manual-verification.md 57번](loop-eng/manual-verification.md).

> ## ✅ 2026-07-29 `/loop-eng` — Phase 54 선행: 메시지 입력 임시저장
> 쓰다 만 메시지가 방을 나갔다 오면 사라졌다 — 다시 쓰게 만드는 확실한 이탈 지점.
> [Phase 54](plans/phase_54.md)의 임시저장을 선행 슬라이스로 당겨 왔다(마이그레이션 0건).
>
> - `lib/messageDraft.ts`: localStorage(`ldd-msg-draft:<roomId>`), local-prefs.ts와 같은 결 —
>   기기별 초안은 DB로 옮길 값이 아니다. **빈 값은 키를 지운다**(방마다 죽은 키가 쌓이지 않게).
>   저장 실패(프라이빗 모드)에도 입력을 막지 않는다.
> - MessageRoom: 방 진입 시 복원(마운트 후 — hydration 불일치 방지) · 입력마다 저장 ·
>   **복원 전 저장 금지 ref**(순서가 뒤집히면 빈 값이 초안을 덮는다) · 보내면 자동 삭제.
> - 검사(node 환경이라 localStorage 실동작 불가): 키 규칙 + **단일 출처 정적 검사**
>   (MessageRoom이 키 문자열을 재작성하지 않는다 — focusMode 관례).
> - **보류 판단**: pg_trgm 검색 인덱스는 테이블 미적용이라 실측 불가 + 개인 규모에서
>   시기상조(YAGNI). 실측 가능해지는 시점(마이그레이션 적용 후)에 재평가.
> - 검증: turbo lint·test·build **18/18 GREEN** (web 테스트 파일 58, +1).
> - 실물 확인: [manual-verification.md 56번](loop-eng/manual-verification.md).

> ## ✅ 2026-07-29 `/loop-eng` — [Phase 51](plans/phase_51.md) T4 잔여: 메시지 수정 + "수정됨"
> Phase 52 T3(승인 카드 인입)를 검토하다 **선행이 잘못된 순서**임을 확인했다 — 승인 카드는
> DuckChatPanel의 방 흡수(마이그레이션 적용 후) 뒤에나 의미가 있고, /요약류도 같은 이유로
> 대기다. 대신 Phase 51 T4에 **미구현으로 남아 있던 수정(I-010·I-011)**을 찾아 완성했다
> (반응·답장·삭제만 되어 있었다 — grep으로 확인).
>
> - **마이그레이션 1건 신규**(`20260729010000_message_edit`, down 동반): `messages.edited_at`.
>   수정 이력 테이블은 안 만들었다 — 무료 500MB에서 상시 이력은 과잉(파일 주석에 근거).
>   **적용 대기 마이그레이션이 1건 늘었다** — 기존 대기 배치와 함께 `db push`로 적용된다.
> - core `canEditMessage`(테스트 5건): 내 것 + text + 미삭제만. **system 영수증은 수정 불가**
>   (기록을 고치면 기록이 아니다) · 지운 것 불가(삭제가 삭제여야 한다).
> - api `updateMessage`(테스트 4건): trim · 1~4000자 · `deleted_at is null` 조건 + `.single()`로
>   **0행이면 조용히 성공한 척하지 않는다.** 갱신 행을 돌려줘 화면이 그대로 갈아끼운다.
> - UI: 메뉴 "수정"(판정은 core — 눌러도 실패할 버튼은 안 보여 준다) → 인라인 입력(Enter 저장 ·
>   Escape 취소) → 말풍선 옆 "수정됨". 마이그레이션 적용 전엔 `pendingMigrationMessage`가 안내.
> - 검증: core 1200건 / api 475건 / turbo lint·test·build **18/18 GREEN**.
> - 실물 확인 보류: [manual-verification.md 55번](loop-eng/manual-verification.md).

> ## ✅ 2026-07-29 `/loop-eng` — [Phase 52](plans/phase_52.md) T2: 슬래시 커맨드 (/할일 · /일정)
> 계획이 못박은 두 가지를 지켰다: **파싱은 정규식(코드)** — LLM에 맡기면 쿼터를 태우고
> 불안정하다(HD-003). **CommandPalette와 동작 공유** — 같은 api 생성 함수를 부르므로
> 두 입구가 갈라지지 않는다(확인: CommandPalette는 메모·페이지만 만들고 할 일·일정
> 생성은 없어 중복 자체가 없었다).
>
> - core `slash-command.ts`(테스트 21건): `/할일 제목` · `/일정 YYYY-MM-DD [HH:MM] 제목`.
>   달력에 없는 날짜(2026-02-30) 거부 · 윤년 통과 · 25:00 거부 · **제목 없는 "/일정 날짜
>   14:00"에서 시각을 제목으로 삼키지 않음** · 자연어 날짜("내일")는 안 받는다 — 어림짐작하면
>   틀린 날짜가 조용히 저장된다(오리 LLM의 영역으로 남김).
> - **KST 보정은 api의 기존 `coerceEventStart` 재사용**(오리 도구와 같은 경로) — 배럴 export만 추가.
> - 커맨드 오류는 **보내지 않고 알려 준다** — "/할일"이 그냥 전송되면 이유를 모른다.
>   성공은 system 영수증("...할 일을 만들었어요")으로 방에 남는다.
> - 자동완성 팝업(F-021): "/" 입력 시 목록, 앞글자 필터, 공백 후 접힘. 클릭하면 usage가 채워진다.
> - **[안 한 것 · 정직하게]** /요약·/오늘·/주간은 오리(LLM) 응답 기능이라 **DuckChatPanel
>   흡수(Group 2 R-00x) 때** 함께 배선한다 — 지금 만들면 응답 경로가 두 벌이 된다.
> - 검증: core 1195건(테스트 파일 87) / turbo lint·test **17/17 GREEN** / build 성공.
> - 실물 확인 보류: [manual-verification.md 54번](loop-eng/manual-verification.md).

> ## ✅ 2026-07-29 `/loop-eng` — [Phase 52](plans/phase_52.md) T1 착수: 메시지 → 할 일·메모
> Phase 51의 코드 가능 범위가 소진돼 Phase 52로 넘어왔다. T6 잔여(방 검색·사이드 메뉴·
> 참여자 목록)는 **그룹방이 생기는 Phase 53의 일**이라 건너뛰었다 — 지금 방은 오리·나뿐이라
> 참여자 목록이 보여 줄 것이 없다(YAGNI).
>
> - 메시지 메뉴에 **"할 일로 만들기" · "메모로 저장"**. 계획이 못박은 대로 **생성 로직 재구현
>   없이** `createTodo`·`createMemo`를 그대로 부른다. 생성은 되돌릴 수 있어 승인 카드 없이 실행.
> - core `todoTitleFrom`(공백류 한 칸 · 코드 포인트 단위 200자 절단 — todo 계약 max 200) ·
>   `conversionReceiptText`(영수증 문구). 테스트 +8.
> - **변환 영수증을 system 메시지로** 방에 남긴다(컬럼 추가 없이 — 표시가 없으면 같은 메시지를
>   두 번 변환한다). `sendMessage`에 `type?: "text"|"system"` 추가(DB CHECK가 이미 허용),
>   화면은 system을 말풍선이 아닌 회색 안내줄로 그린다. api 테스트 +2.
> - **[남은 것 · 정직하게]** "일정으로"는 날짜 입력이 필요해 별도 슬라이스(즉석 LLM 해석은
>   쿼터·불안정, 계획 T2 슬래시 커맨드와 함께 판단). "노트로"는 문서를 바꿔 승인 카드가
>   필요하다(계획 T1) — 다음 슬라이스.
> - 검증: core 1174건 / api 471건 / turbo lint·test **17/17 GREEN** / build 성공.
> - 실물 확인 보류: [manual-verification.md 53번](loop-eng/manual-verification.md).

> ## ✅ 2026-07-29 `/loop-eng` — [Phase 51](plans/phase_51.md) T5: 방별 사진 모아보기
> 대화 헤더의 "사진 모아보기" → 방 전체 사진 격자(최근 것 먼저) → 누르면 사이클 2의
> 전체화면 뷰어가 그대로 뜬다.
>
> - **화면의 메시지 창은 최근 일부만 들고 있어서** 거기서 뽑으면 옛 사진이 빠진다 —
>   api `listRoomAttachments`(지운 것 제외 · 최신 500장 상한 · **오래된 순 반환**: 뷰어
>   이전/다음이 대화 순서와 같아야 한다). 상한 밖 옛 사진은 안 나온다(정직한 한계).
> - 뷰어 경로 목록을 상태로 분리(`viewerPaths`) — 대화에서 열면 창의 사진들, 모아보기에서
>   열면 방 전체. 하나로 합치면 옛 사진에서 이전/다음이 끊긴다.
> - **삭제 시 닫힘 판정을 교체**: "목록에 없으면 닫기"였다면 모아보기에서 연 옛 사진(창 밖)이
>   전부 닫혔다 — core `attachmentDeleted`(지워진 것으로 **확인된 때만** 닫는다, 테스트 4건).
> - 초점 관리: 인라인 콜백 ref 대신 열림/뷰어 닫힘 시 1회 focus — 매 렌더 focus면 뷰어
>   화살표 키가 죽는다.
> - 검증: core 1166건 / api +2 / turbo lint·test **17/17 GREEN** / build 성공.
> - 실물 확인은 e2e 세션 부재로 보류(50·51번과 동일) — [manual-verification.md 52번](loop-eng/manual-verification.md).

> ## ✅ 2026-07-29 `/loop-eng` — [Phase 51](plans/phase_51.md) T5: 전체화면 이미지 뷰어
> 인라인 max-h-60로만 보이던 사진에 **전체화면 뷰어**(이전/다음 · 위치 표시 · 원본 저장)를 달았다.
>
> - core `galleryPaths`·`galleryNav`(room.ts, 테스트 +9): seq 순서 · **지운 메시지의 사진은
>   뷰어에도 없다** · 끝에서 순환하지 않음(몇 장째인지 감을 잃는다) · 보는 중 삭제되면
>   index -1 → 뷰어가 닫는다.
> - api `downloadMessageImage`: **서명 URL에 download 속성은 안 된다**(다른 출처라 브라우저가
>   무시) — SDK로 Blob을 받아 같은 출처 Blob URL로 저장.
> - `MessageImageViewer`(dumb component, ConfirmDialog 패턴): Esc·화살표 키 · 배경 클릭 닫기 ·
>   저장 중 버튼 잠금. 판정은 전부 core.
> - 검증: core **1162건** / turbo lint·test **17/17 GREEN** / build 성공.
> - 실물 확인은 [manual-verification.md 50번](loop-eng/manual-verification.md)에 합산(e2e 세션 부재).

> ## ✅ 2026-07-29 `/loop-eng` — [Phase 51](plans/phase_51.md) T6: 날짜·미읽음 구분선 + 스크롤 보호
> 대화 화면에 남아 있던 T6 세 조각을 마저 했다. **날짜 경계는 KST 기준 core 순수 함수**로 —
> 이 저장소가 날짜 경계로 여러 번 데인 그 함정을 화면 코드에 다시 만들지 않았다
> (`kstDateString` 재사용, 재구현 0).
>
> - core `message-timeline.ts`(테스트 24건): `dayDivider`(첫 메시지 앞엔 항상 · KST로 갈리면 UTC가
>   같아도 나눔) · `dayLabel`(오늘/어제/그 외 "2026년 7월 25일 (토)" — **미래 날짜를 "내일"로 부르지
>   않는다**, 시계 어긋난 기기 방어) · `firstUnreadId`(**`unreadCount`와 같은 기준** — 뱃지는 3인데
>   구분선이 다른 자리면 둘 중 하나는 거짓말) · `isNearBottom`(DOM 없이 숫자만, 테스트 가능).
> - 화면: 새 메시지가 와도 **위를 읽는 중이면 끌어내리지 않는다** — 바닥 근처일 때만 따라가고,
>   아니면 "새 메시지 ↓" 버튼. 미읽음 앵커는 **들어온 순간의 읽음 위치를 붙잡아** 둔다(서버 값을
>   따라가면 읽음 표시가 나가는 즉시 구분선이 사라진다).
> - `Intl` 로캘 포맷 대신 날짜 문자열에서 직접 조립 — ICU 데이터에 따라 결과가 갈리는 문제 회피.
> - 검증: core **1153건**(+24) / turbo lint·test **17/17 GREEN** / build 성공.
> - 실물 스크린샷은 e2e 인증 세션이 없어 불가 — [manual-verification.md 50번](loop-eng/manual-verification.md) 보류.

> ## 📌 다음 세션은 여기서 시작한다 (2026-07-27 02:5x 기준)
>
> **Phase 48 완료** (T1 직무별 원천 · T2 원천 추적+패널 · T3 상시 말풍선 · T4 확대+목록 선택).
> 다음 후보: **Phase 49**(설정·권한 — **마이그레이션 선행 필요, 사용자만 적용 가능**) ·
> **Phase 50~52**(메신저). Phase 47 T1(뉴스 번역)도 마이그레이션 대기.
> 즉 **코드만으로 나아갈 수 있는 다음 줄기는 Phase 50대**다.
>
> **막힌 것 · 사용자만 할 수 있는 것부터** ([PENDING.md](loop-eng/PENDING.md) 상세):
> 1. **Supabase → Authentication → Providers → Email 켜기** — Phase 41 T1·T3가 배포됐지만
>    **꺼진 상태**라 로그인·재설정 폼이 안내 문구만 낸다.
> 2. **`supabase db push`** — 마이그레이션 **4건 미적용**. 그중
>    `harden_security_definer`는 **지금 열려 있는 보안 구멍**(로그인 없이 남의 오리 XP·레벨 변경).
> 3. 적용 뒤 관리자 지정: `update public.profiles set role='admin' where email in
>    ('5555jungs@gmail.com','555jungs@gmail.com');` — **둘 다 관리자**로 사용자가 결정했다.
>
> **코드로 이어서 할 것**: [Phase 47](plans/phase_47.md)의 **T1(뉴스 번역·요약)** —
> 다만 **마이그레이션 1건**이 필요하고 Phase 45(오리 발화)와 **같은 무료 쿼터**를 쓰므로
> 예산 설계가 선행돼야 한다. 그 뒤 [Phase 48](plans/phase_48.md).
> T2-(1)(추천 회전)은 2026-07-27에 끝냈다. [Phase 48](plans/phase_48.md) T1(직무별 작업 원천)도 완료. [Phase 44](plans/phase_44.md)는
> T1·T2·T4 완료 + T3의 **채도**까지 했고, 남은 것은 **메모 색 고르기**뿐인데
> `memos.color` 마이그레이션이 필요해 **다섯 번째 대기**가 된다 — 사용자 판단 후에 한다. [Phase 43](plans/phase_43.md)은
> T1·T3 완료 + T2의 **오리 도구까지** 했고, 남은 건 **사용자 확인 뒤에 하는 게 안전한 것들**이다
> (툴바 버튼 제거는 오리 경로가 실제로 도는 걸 본 뒤, "설정에서 전체 db화"는 해석 확인 뒤).
> **[Phase 42](plans/phase_42.md)는 T1~T7 전부 완료**(2026-07-27).
> Phase 41에 남은 것은 **전부 사용자·설계 대기**다: T2는 설계 재검토(클라이언트가 Supabase를
> 직접 부르므로 서버 메모리 상한이 걸릴 자리가 없다), T5·T6은 사용자가 시크릿 2개를 등록해야 열린다.
> Phase 41 T4는 [Phase 40](plans/phase_40.md)이 이미 했다 — **다시 만들면 인벤토리 위반**이다.

> ## ✅ 2026-07-27 `/loop-eng` — [Phase 48](plans/phase_48.md) T3: "계속 말하게"의 함정을 피했다
> 요청은 "직원들은 말풍선으로 **계속** 말하게"였다. 계획이 함정을 짚었다 — **말풍선을 채우려고
> 문장을 생성하면 그게 정확히 1차 5-7의 "일하는 척"**이다. 규칙을 코드로 못박았다:
> **실제 업무가 있을 때만 그 업무를 말한다. 없으면 "쉬는 중"이거나 아무 말도 안 한다.**
>
> - core `bubbleText`(순수, 테스트 7건). `describeActivity`(상호작용용 긴 문장)와 **역할이 다르다** —
>   이건 머리 위 **짧은 문구**다. 길면 겹쳐서 못 읽고 그게 "UI가 이상해"가 된다.
> - 퇴근한 오리 위엔 안 띄운다 · **업무명이 비면 지어내지 않는다** · 긴 이름은 **코드 포인트
>   단위**로 잘라 말줄임(이모지가 깨지지 않게).
> - **LLM을 쓰지 않았다** — 직원 수 × 갱신 빈도만큼 호출이 생겨 **쿼터가 즉시 터진다.**
> - **타입체크가 내 실수를 잡았다**: 테스트에 `"working"`이라는 **없는 상태값**을 썼는데 vitest는
>   런타임만 봐서 통과했고 `tsc`가 걸렀다. 검사 셋을 다 돌리는 이유가 이것이다.
> - **[남은 것 · 정직하게] 캔버스 배선은 안 했다.** `PixelOffice.tsx`가 1410줄이고 말풍선 렌더
>   경로가 **하나도 없다**(grep 0건). 겹침 회피까지 포함하면 별도 슬라이스다 —
>   **이번 변경은 아직 화면에 보이지 않는다.**
> - 검증: core **16건**(+7) / turbo **18/18 GREEN**.

> ## 🔴 2026-07-27 `/loop-eng` — [Phase 48](plans/phase_48.md) T1: 개발자 오리가 습관 체크를 했다
> 사용자가 본 그 화면의 원인을 코드에서 찾았다. `mapWorkspaceToOfficeTasks`가 **일의 종류를 보지
> 않고** 부서를 순서대로 돌렸다 — 그래서 습관이 engineering에 갈 수 있었다.
>
> - **직무 → 원천 매핑을 core에 데이터로** 뒀다. 화면에 흩으면 검사할 수 없다.
> - **종류마다 커서를 따로 둔다.** 전에는 커서가 하나로 이어져 **할 일이 몇 개냐에 따라 습관이
>   어느 부서로 갈지 달라졌다** — 그 성질을 테스트로 못박았다.
> - **할 일 제목으로 "개발"을 판정하지 않았다**(계획이 짚은 함정). 키워드 매칭은 오탐이 크고
>   제목 쓰는 방식을 우리가 정할 수 없다. 지금 가진 신호 중 개발에 가장 가까운 **뽀모도로**를
>   개발 직무에 뒀다 — GitHub·Claude Code 로그 연결은 별도 Task다.
> - **`[추정]`을 표시했다**: 요청이 명시한 건 개발자·인사팀뿐이다. 나머지는 추정이고
>   **틀리면 그 표만 고치면 된다.**
> - **"쉬는 중" 계약을 지켰다** — 받을 부서가 없으면 배정하지 않는다. **없는 업무를 만들지
>   않는다**(`simulateNpcTasks`를 되살리면 1차 5-7의 "일하는 척"으로 되돌아간다).
>   가드로 그 함수가 **아직 삭제 상태**인 것도 확인했다.
> - **옛 계약을 잠그던 테스트 3건을 사유를 적고 고쳤다** — 그 테스트들이 지키던 것이 바로
>   사용자가 지적한 동작이었다.
> - 검증: core **15건**(+6) / turbo **18/18 GREEN**. **화면은 못 찍었다**(로그인 뒤).

> ## ✅ 2026-07-27 `/loop-eng` — [Phase 47](plans/phase_47.md) T2-(1): 추천이 마르지 않게
> **"추천이 갱신되지 않는다"의 실체를 계획이 정확히 짚었다** — `unregisteredFeeds`가 등록한 것을
> 걸러 내므로 **다 등록하면 추천 섹션이 통째로 사라진다.**
>
> - **날짜 시드로 6개씩 회전.** **무작위가 아니라 결정적**이다 — 무작위면 새로고침마다 흔들려
>   **방금 본 추천을 다시 찾을 수 없다.** 대시보드 동기부여 문구와 **같은 방식**을 썼다.
> - **주제를 고르게 섞는다** — 그냥 잘라 내면 앞쪽 주제만 계속 나오고 뒤쪽은 영영 안 보인다.
>   테스트가 **며칠에 걸쳐 전체가 한 번씩 노출되는지**까지 확인한다.
> - 경계: 빈 목록·0개 요청·**음수 시드**·전체보다 많은 요청. `dayOfYearOf`는 날짜 문자열만
>   받는다(Date를 넘기면 시간대가 개입한다) — 윤년 검증 포함.
> - 곁다리로 코드를 끼워 넣으며 밀려난 `unregisteredFeeds` 설명 주석을 제자리로 돌렸다.
> - 검증: core **33건**(+11) / turbo **18/18 GREEN**.
> - **남은 것**: T1(번역·요약)은 **마이그레이션 1건**이 필요하고 Phase 45와 **같은 쿼터**를 쓴다 —
>   둘을 따로 만들면 합쳐서 초과한다(계획이 짚은 제약). 예산 설계가 선행돼야 한다.

> ## ✅ 2026-07-27 `/loop-eng` — [Phase 46](plans/phase_46.md) T4 + Phase 46 완료
> **"스탠드업 생성" → "오늘 활동 요약 만들기".** 원문이 "무슨 기능인지 모르겠어서"였다 —
> "스탠드업"은 애자일 용어라 눌러 봐야 안다. **기능은 지우지 않았다**(동작은 쓸 만하고 Phase 32가
> 인젝션 방어까지 붙여 뒀다). **무엇이 만들어지는지(새 페이지) 버튼 옆에 적었다** —
> 통계 화면에서 페이지가 생기는 건 예상 밖의 결과다.
>
> - **"통계에 쓸만한 모든 내용"은 열린 요구**라 **원천이 확실한 것부터** 채웠다. 요일별 패턴은
>   날짜 문자열만 있으면 된다 — 없는 데이터로 만든 통계는 1차 4-5의 "조회수" 함정이다.
> - **Date 객체로 요일을 구하지 않았다**(UTC 파싱 → KST 하루 밀림). Zeller 합동식으로 직접 세고
>   **실제 달력·윤년(2028-02-29)·세기 경계(2000-01-01)**로 검증했다(13건).
> - **항상 7칸**을 돌려준다(기록 없는 요일이 빠지면 그 요일이 사라진 것처럼 보인다) ·
>   **기록이 없으면 "최다 요일"을 만들지 않는다**(아무 날도 안 했는데 "일요일이 최고"는 거짓).
> - **[Phase 46 완료]** T1(SVG 차트)·T2(기간 조회)·T3(PNG·CSV 내보내기)·T4(스탠드업 재정의).
>   **신규 의존성 0개** — 차트도 내보내기도 플랫폼 기능으로 했다.
> - 검증: core **+13** / turbo **18/18 GREEN**. **화면은 못 찍었다**(로그인 뒤).

> ## ✅ 2026-07-27 `/loop-eng` — [Phase 46](plans/phase_46.md) T3: 차트 내보내기도 의존성 0개
> - **PNG**: SVG를 canvas에 그려 뽑는다. **고정 배율(3x)** — 화면 크기로 뽑으면 좁은 화면에서
>   쓸 수 없는 그림이 나온다. **배경을 흰색으로 칠한다**(투명 PNG는 어두운 테마에서 막대가
>   안 보인다). SVG를 data URI로 넘겨 **canvas 오염을 피했다**(오염되면 `toBlob`이 막힌다).
> - **CSV: 이스케이프를 새로 짜지 않았다.** `db-export.ts`에 **수식 인젝션 방어**(`=`·`+`·`@`로
>   시작하는 셀)와 RFC 4180이 이미 있다. 표 조립만 `toCsv`로 올리고 **`rowsToCsv`도 그걸 쓰게**
>   했다 — 복붙했다면 **보안 방어가 한쪽에만 남았을 것**이다.
>   기존 CSV 테스트 **5건 그대로 통과**(계약 보존).
> - 버튼은 `no-print` — 종이에 버튼이 찍히면 의미가 없다.
> - 검증: turbo **18/18 GREEN**. **실제 파일은 못 받아 봤다**(로그인 뒤 화면).

> ## ✅ 2026-07-27 `/loop-eng` — [Phase 46](plans/phase_46.md) T1: 차트를 라이브러리 없이
> 계획이 ponytail 사다리를 태워 **"SVG로 시작하라"**고 권고했고 그대로 했다 — **의존성 0개.**
> 우리 데이터는 일별 카운트뿐이라 축·막대 계산이 몇십 줄이고, `recharts`는 번들이 커서
> **대시보드 첫 화면 성능에 바로 영향**을 준다.
>
> - **계산은 core `buildBarChart`(순수, 테스트 11건)** — JSX 안에 계산을 섞으면 검사할 수 없다.
> - **가장 쉽게 깨지는 자리를 먼저 잠갔다**: 전부 0일 때 **0으로 나누지 않는다** · 빈 데이터에
>   던지지 않는다 · **음수는 0으로 본다**(아래로 뻗는 막대를 그리면 상류 결함이 그럴듯해 보인다) ·
>   NaN·Infinity도 0 · **눈금 중복 없음**(max가 작을 때 0·0·1·1이 되는 자리).
> - **축 최댓값을 보기 좋은 수로 올린다**(1·2·5·10·20…) — 7·13으로 끝나면 읽는 사람이 셈을 한다.
> - **접근성**: `role="img"` + 한 줄 요약(구간 수·합계·최고점) + 막대별 `<title>`.
>   **그림만 있는 차트는 보조기기에 아무 정보도 아니다.**
> - **잔디를 지우지 않았다** — 잔디는 "언제 했나", 막대는 "얼마나 했나"다.
> - 검증: core **+11** / turbo **18/18 GREEN**. **화면은 못 찍었다**(로그인 뒤).

> ## ✅ 2026-07-27 `/loop-eng` — [Phase 46](plans/phase_46.md) T2: 통계를 기간별로 본다
> 사용자가 "**어떻게 기간별로 조회할 수 있는지**"를 물었는데 통계 기간이 **90일 고정**이었다.
>
> - **계산은 core `resolveDateRange`(순수)로 뺐다.** 화면에서 날짜를 세면 같은 "최근 7일"이
>   화면마다 다른 날을 가리킨다 — 이 저장소가 겪은 하루 밀림이 그 부류다.
> - **경계를 전부 테스트로 못박았다**(17건): 월·연 경계 · **윤년 2월** · 1일에 "이번 달" ·
>   1월에 "지난 달" · 양 끝 포함 · 타임스탬프 입력.
> - **"최근 N일"은 오늘 포함**이다 — 어제까지로 잡으면 **오늘 한 일이 통계에서 사라진다.**
> - **"이번 달"은 오늘까지**다 — 월말까지 넣으면 분모가 커져 평균이 실제보다 낮아 보인다.
> - **"지난 달 마지막 날"을 직접 세지 않는다**(윤년·2월) — "이번 달 1일의 하루 전"으로 구한다.
> - **다시 받지 않는다.** 이미 받은 90일치를 걸러 쓴다 — 기간을 바꿀 때마다 조회하면 무료 티어
>   대역폭을 먹는다(계획이 짚은 제약). 90일이 최대 구간이라 재조회가 필요 없다.
> - **고른 구간의 실제 날짜를 화면에 쓴다** — 말하지 않으면 사용자가 셈을 해야 한다.
> - 검증: core **+17** / turbo **18/18 GREEN**. **화면은 못 찍었다**(로그인 뒤).

> ## ✅ 2026-07-27 `/loop-eng` — [Phase 45](plans/phase_45.md) T2 마무리 + Phase 45 완료
> "다른 페이지 가져오기"도 **LLM 없이** 됐다. 이미 쓴 글을 가져오는 일이라 생성할 것이 없다.
> 검색은 `searchPages`를 그대로 쓴다 — **임베딩 검색은 이 용도에 과하다**(비용·지연).
> **새 라우트 0개 · 새 의존성 0개 · LLM 호출 0회.**
>
> - 지금 글을 검색어로 쓰고 **글이 비었으면 최근 페이지**를 보여 준다 — 빈 화면에서
>   "가져오기"를 누르는 게 가장 흔한 경우인데 거기서 아무것도 안 나오면 막힌다.
> - **고른 페이지 본문을 결과 칸에 넣는다**(지금 쓰던 글을 말없이 덮지 않는다 — 되돌릴 수 없다).
> - 본문이 빈 페이지를 골라도 그 사실을 말한다(빈 결과는 고장으로 보인다).
> - **[Phase 45 완료]** T1(오리 LLM 발화)·T2(작문 도우미). 남은 건 **날씨 API 연동 여부**로
>   사용자 결정 대기다([manual-verification 15번](loop-eng/manual-verification.md)).
> - 검증: turbo **18/18 GREEN**. **화면은 못 찍었다**(로그인 뒤).

> ## ✅ 2026-07-27 `/loop-eng` — [Phase 45](plans/phase_45.md) T2: 1차에 빠진 것을 대조로 찾았다
> 2차 요청이 1차와 **글자 단위로 같았다.** 계획이 "그건 1차가 기대에 못 미쳤다는 신호"라며
> **무엇이 부족했는지부터 확인하라**고 했다. 코드로 대조하니 셋은 이미 있었고 셋이 없었다:
> 오리 이미지·상태 문구 **있음** / 요약·작문 **있음** / **돌아다니기·템플릿 이용·다른 페이지 가져오기 없음**.
>
> - **템플릿 이용**을 넣었다. **LLM을 부르지 않는다** — 정해진 구조라 생성할 이유가 없다.
>   정의는 새 페이지가 쓰는 **`PAGE_TEMPLATES` 그대로**(두 곳이 다른 구조를 보여주면 안 된다).
>   `templateToText`(순수) + 테스트 4건. **안내 문구가 실리는지도 검사한다** — 빠지면
>   Phase 43 T3에서 고친 "빈 페이지 같다"가 여기서 다시 생긴다.
> - **템플릿 버튼은 글이 없어도 눌린다** — 템플릿은 빈 문서에서 시작할 때 가장 필요하다.
> - **오리가 걷는다**(좌우로 오가며 방향 전환). 움직임 줄이기 설정은 `motion-safe:`가 지킨다.
> - 곁다리: 핸들러를 `useTemplate`으로 지었더니 **린트가 React 훅으로 오해**했다 → `applyTemplate`.
> - **남은 것**: "다른 페이지 가져오기"(RAG 배선). 임베딩·검색은 이미 있어 배선 문제다.
> - 검증: web **29건**(+4) / turbo **18/18 GREEN**. **화면은 못 찍었다**(로그인 뒤).

> ## ✅ 2026-07-27 `/loop-eng` — [Phase 45](plans/phase_45.md) T1: 오리가 매번 다르게 말한다
> **이전 판단을 뒤집는 자리라 근거를 남겼다.** Phase 30 T1은 자율 발화에 LLM을 쓰지 않았고
> 그 근거는 HD-003("결정적 작업은 코드로")이었다. 그 자체로 옳았다. **그런데 사용자가 원한 것은
> 정확성이 아니라 다양성이다** — 템플릿은 문장 수가 유한해서 며칠이면 다 본다.
>
> - **역할을 나눴다**(HD-003의 정확한 적용): 규칙이 **무엇을 말할지**, LLM은 **어떻게 말할지**.
>   사실은 규칙이 만든 문장에서 그대로 오고 **여기서 다시 조립하지 않는다.**
> - **프롬프트가 "주지 않은 정보를 말하지 말라"고 못박는다**(날씨를 예로). LLM은 오늘 날씨를
>   모르고 물으면 **그럴듯한 거짓말**을 만든다.
> - **출력을 JSON 한 줄로** 받아 파싱을 결정적으로 만들었다. 파서는 코드펜스를 벗기고
>   허용 목록 밖 표정·빈 문장·상한 초과를 거부한다. **길면 자르지 않고 거부한다** —
>   중간에서 자르면 문장이 끊겨 더 이상해진다.
> - **저하 모드가 곧 기존 동작이다**: 화면이 템플릿을 **먼저** 띄우고 응답이 오면 갈아 끼운다.
>   실패·쿼터 초과는 **429가 아니라 200 + `line: null`** — 호출부에게 "실패"가 아니라
>   "이번엔 템플릿을 써라"이기 때문이다.
> - **쿼터가 이 Task의 진짜 제약이다**: 자율 발화는 부르지 않아도 주기적으로 일어난다 →
>   **시간당 12회**(작문은 분당 20)로 잡고 **공용 `allowRequest`**를 썼다(L-16 재발 방지).
> - **날씨는 하지 않았다** — "오늘은 비가오네요"를 사실로 만들려면 날씨 API가 필요하고 그건
>   사용자 결정이다. 계획이 정한 (나) 경로로 갔고 그 사실을 적었다.
> - 검증: core **+14** / api **+4** / turbo **18/18 GREEN** / 라우트가 빌드 출력에 등록됨.
>   **실제 발화는 못 봤다**(로그인 + Gemini 키 필요).

> ## ✅ 2026-07-27 `/loop-eng` — [Phase 44](plans/phase_44.md) T3(절반): 메모가 흰 종이였다
> 요청("메모가 잘 안보여서 색깔 지정")은 **두 가지**다 — ① 색이 흐려서 안 보인다 ② 고를 수 없다.
> **①은 마이그레이션이 필요 없어 먼저 했다.**
>
> - **숫자가 사용자 말을 확인해 줬다**: `-50` 단계는 흰 카드와 **ΔE 6~10**이었다. 최소 식별치
>   (2.3)보다 크긴 하지만 **훑어보는 화면에서는 사실상 흰색**이다. 다크(`-950/30`)는 서로도
>   구분이 안 됐다.
> - 색을 `globals.css`의 **`--memo-*` 한 곳**으로 빼고, 검사가 그 파일을 파싱해
>   **카드 대비 ΔE ≥ 15 · 색끼리 ΔE ≥ 10**을 잠근다.
> - **ΔE 계산을 core로 올렸다**(`color-distance.ts`, 테스트 8건) — 잔디 검사(Phase 42 T6)와
>   같은 잣대를 쓰기 위해서다. 복붙하면 한쪽 공식만 고쳐져 두 화면이 다른 기준으로 통과한다.
> - **검사가 헛돌 뻔한 것을 잡았다**: 정규식을 템플릿 리터럴에 넣으며 `\s`가 `s`로 죽어
>   **아무것도 매칭하지 않았다**(`String.raw`로 수정). **통과했다고 검사가 살아 있는 게 아니다.**
> - **②(색 고르기)는 안 했다** — `memos.color` 컬럼이 필요하고 미적용 마이그레이션이 이미 네 건이다.
>   다섯 번째를 쌓기 전에 사용자 판단을 받는 편이 낫다고 봤다.
> - 검증: core +8 / web +5 / turbo **18/18 GREEN**. **화면은 못 찍었다**(대시보드 위젯).

> ## ✅ 2026-07-27 `/loop-eng` — [Phase 44](plans/phase_44.md) T4 (a)(d): 크기 3단계 + 작게는 목록
> 요청의 "뭉개진다"와 "사이징도 변경가능하게"를 함께 풀었다.
> - **크기 3단계**(작게·보통·크게). 자유 리사이즈는 하지 않았다 — 그리드 안에서 임의 크기는
>   다른 카드를 밀어내고 저장·복원 비용이 크다. **기본은 보통**이라 안 고른 사용자 화면은 그대로다.
> - **"작게"에서는 월 그리드를 아예 그리지 않는다.** 좁은 카드에 **7열을 쥐어짜는 것**이
>   뭉개짐의 직접 원인이라, 칸을 더 줄이는 대신 목록만 남겼다.
> - **작게에서 날짜 선택을 풀 수단을 따로 뒀다** — 달력이 사라지면 해제 버튼도 사라지는데
>   오늘이 자동 선택되므로 **다른 날 일정을 영영 볼 수 없게 된다.**
> - **[남은 것] 카드 자체의 가로 폭은 못 바꾼다.** `col-span`은 대시보드 서버 컴포넌트가 정하고
>   사용자별로 바꾸려면 **마이그레이션 대기 중인 `dashboard_layout`**에 저장해야 한다.
>   "사이징"이 카드 폭을 뜻하셨다면 그쪽에서 이어야 한다 — 추측으로 그리드를 건드리지 않았다.
> - 검증: turbo **18/18 GREEN**. **화면은 못 찍었다**(대시보드 위젯).

> ## ✅ 2026-07-27 `/loop-eng` — [Phase 44](plans/phase_44.md) T2: 1차의 반대 근거 둘을 피했다
> **사용자가 같은 요청을 다시 했다**(카드를 끌어서 옮기기). 1차에서 위/아래 버튼으로 처리하고
> "완료"로 적었는데, 그때 드래그를 안 한 근거가 코드 주석에 남아 있었다 —
> **"라이브러리를 들여와야 한다"**와 **"키보드로 못 쓴다"**. 둘 다 피했다.
>
> - **HTML5 네이티브 드래그**(의존성 0개 — ponytail 사다리 4단계) + **위/아래 버튼 유지**
>   (키보드·보조기기 경로). 드래그는 **더한 것이지 바꾼 것이 아니다.**
> - **core `reorderWidget` 신설**(테스트 8건). `moveWidget`은 한 칸씩만 옮겨 임의 위치로 가는
>   드래그를 표현할 수 없다. **끼워 넣기지 자리 바꾸기가 아니다** — 스왑하면 놓은 자리의 카드가
>   원래 자리로 튄다. 그 성질을 테스트로 못박았다.
> - **놓일 자리를 선으로 보여 주고**(안 보이면 어디 떨어질지 모르고 놓는다), **저장 중에는 끌 수
>   없게** 했다(저장 중 재정렬은 어느 쪽이 남는지 예측할 수 없다), **끌 수 있다는 안내**를 뒀다
>   (드래그는 보이지 않는 기능이다).
> - 곁다리로 내가 붙였던 `aria-hidden`을 도로 뗐다 — 순서 번호는 보조기기에도 의미 있는 정보이고,
>   근거 없이 숨기는 것은 a11y 회귀다.
> - **[알아 둘 것] 지금은 저장이 실패한다** — `dashboard_layout` 마이그레이션 미적용(PENDING 1번).
>   계획이 예고한 그대로이고 화면은 한국어로 사유를 말한다(Phase 37).
> - 검증: core **34건**(+8) / turbo **18/18 GREEN**. **화면은 못 찍었다**(설정 화면).

> ## 🔴 2026-07-27 `/loop-eng` — [Phase 44](plans/phase_44.md) T1: 그 소리는 한 번도 난 적이 없다
> 계획이 `[추정]`으로 적어 둔 것("사용자는 이 소리를 아예 못 들었을 가능성이 높다")이
> **코드로 확정됐다.** 전에는 **완료 시점에** `new AudioContext()`를 만들었는데, 브라우저는
> **사용자 제스처 없이 만든 컨텍스트를 `suspended`로 시작**시킨다. 타이머 만료는 제스처가
> 아니다. 게다가 완료할 때마다 새 컨텍스트를 만들고 닫지 않아 **누수**까지 있었다.
>
> - **컨텍스트를 시작 버튼(진짜 제스처) 때 한 번 만들어 재사용**한다 — `suspended`와 누수가
>   한 번에 사라진다. 새 파일도 새 의존성도 없다.
> - **알림은 새로 만들지 않았다.** `lib/notify.ts`의 `notifyDuck`이 **권한·방해금지 시간대·
>   하루 총량**을 이미 전부 판정한다(계획이 "재구현 금지"로 못박은 그대로 배선만).
> - **권한은 시작 버튼에서 묻는다.** 로드 시 물으면 반사적으로 거부되고, **한 번 거부되면
>   브라우저 설정을 직접 열기 전에는 되돌릴 수 없다.**
> - **소리는 합성음으로 남겼다(정직하게)** — `public/sounds/`의 CC0 자산은 문·발소리·타이핑뿐이라
>   알람으로 쓸 게 없고, 외부 자산 내려받기는 라이선스 확인이 필요해 범위 밖으로 뒀다.
>   대신 단발 삐 소리를 **두 음 차임(삼각파)**으로 바꿨다(이 저장소가 사인파로 지적받은 전례).
> - **음소거 스위치**를 함께 뒀다 — 소리는 늘 끌 수 있어야 한다.
> - 검증: turbo **18/18 GREEN**. **소리·알림은 실제로 못 들어 봤다**(로그인 뒤 화면 + 권한은
>   사람이 눌러야 한다) → [manual-verification](loop-eng/manual-verification.md) 11번.

> ## ✅ 2026-07-27 `/loop-eng` — [Phase 44](plans/phase_44.md) T4 (b)(c): 캘린더가 오늘부터 보인다
> 요청 원문이 네 가지를 한 문장에 담고 있었다("뭉개지고, 아무것도 안골르면 당장 오늘로하고,
> 지난거는 볼건지안볼건지도 중요하고, 사이징도"). 그중 **판정이 명확한 둘**을 먼저 했다.
>
> - **(b) 기본 선택을 오늘로.** 전에는 `null`로 시작해 **전체 일정**이 쏟아졌다.
>   **날짜 계산을 새로 쓰지 않았다** — `todayIso`가 이미 있다(하루 밀림으로 eslint 규칙까지 만든 저장소다).
> - **(c) 지난 일정 보기 토글, 기본값 숨김.** "볼지 말지"를 물었다는 것 자체가 지금 보이는 게
>   방해된다는 뜻으로 읽었다.
> - **날짜를 직접 고른 경우에는 숨기지 않는다**(고르는 행위가 곧 "그날을 보겠다"는 뜻이다).
>   그 상태에서는 **토글도 감춘다** — 눌러도 아무 일이 없으면 그것도 고장으로 보인다.
> - **숨긴 건수를 말한다.** 말 없이 사라지면 "일정이 없어졌다"가 된다.
> - 설정은 **localStorage**에 뒀다 — 서버 설정 경로는 마이그레이션 4건이 밀려 있어 얹지 않았다.
> - 곁다리로 같은 값을 두 벌로 두지 않게 기존 `todayKey`를 재사용했고, 린트가 잡은
>   `setState in effect`는 **이 파일이 이미 쓰는 예외 방식**을 그대로 따랐다.
> - 검증: turbo **18/18 GREEN**. **화면은 못 찍었다**(대시보드 위젯).
> - **남긴 것**: (a) 뭉개짐 · (d) 크기 조절은 대시보드 그리드를 함께 건드려야 해 분리했다.

> ## ✅ 2026-07-27 `/loop-eng` — [Phase 43](plans/phase_43.md) T2: 오리가 페이지를 표로 바꾼다
> 계획의 `[확인 필요]`("이 변환이 되돌릴 수 있는가")에 답이 나왔다. **화면에서는 되돌릴 수 없다**
> (`dbSchema`를 null로 세우는 자리가 UI에 하나도 없다). 다만 **API는 이미 지원한다** —
> `updatePage` 주석이 "null=데이터베이스 해제"라고 적고 검증도 그 경우를 비켜 간다.
> **없는 것은 기능이 아니라 입구다.** 이 사실을 승인 카드에서 보이도록 **도구 설명 첫머리에
> "되돌릴 수 없다"를 적었다** — 사용자가 승인 버튼을 누르기 전에 알아야 하는 정보다.
>
> - **오리 도구 `convertPageToDatabase`**(요청 원문: "오리한테 시켜서 할수있거나").
>   `mutating`이라 **승인 없이는 실행되지 않는다.**
> - **제목 매칭은 `findTodoByTitle`을 그대로 썼다** — 제네릭이라 페이지에도 맞는다.
>   새로 짜면 "정확 일치 → 부분 일치 → 여러 개면 되묻기" 규칙이 두 벌이 된다.
> - **안전장치 둘**: 여러 개면 실행하지 않고 되묻는다 · 이미 데이터베이스면 거부한다
>   (다시 바꾸면 사용자가 만든 열·뷰가 기본값으로 덮인다).
> - **목을 만들다 두 번 틀렸고 둘 다 값진 발견이었다**: 목이 `.limit()`을 빠뜨려 실제 쿼리
>   체인과 달랐고, `db_schema`에 대충 만든 객체를 넣었더니 `fromRow`의 zod 검증에 걸려
>   **조용히 null**이 됐다 — 그러면 "이미 데이터베이스" 검사가 헛돈다.
>   **대충 만든 목은 통과해도 실제와 다른 걸 검사한다.**
> - **툴바 버튼은 아직 안 지웠다(의도).** 오리 경로가 실제로 도는 것을 사용자가 확인하기 전에
>   지우면 **표를 만들 유일한 입구가 사라진다.**
> - 검증: api **55건**(+5) / turbo **18/18 GREEN**. **화면은 못 찍었다**(로그인 뒤).

> ## ✅ 2026-07-27 `/loop-eng` — [Phase 43](plans/phase_43.md) T1: 계획이 적은 "빠진 기능"은 없었다
> 계획은 **"Markdown 내보내기는 함수만 있고 버튼이 없다"**고 적었다. **버튼은 있었다.**
> 계획이 "새로 만들 것"으로 든 **CSV도 이미 있다** — `rowsToCsv`를 `DatabaseView.tsx:320`이
> BOM까지 붙여 쓰고 있다. **T1에서 새로 만들 기능은 하나도 없었다.**
> 남은 진짜 문제는 계획의 제목 그대로 **버튼이 너무 많은 것**이었다.
>
> - 흩어져 있던 **다섯 컨트롤**(Markdown 내보내기 · 템플릿으로 저장 · 인쇄·PDF · 텍스트 복사 ·
>   가져오기)을 모달 하나로 모았다. **동작은 한 줄도 바꾸지 않았다** — 모달이 기존 핸들러를
>   그대로 부른다. 이 Task의 값은 로직이 아니라 배치다.
> - **도구 모음 컨트롤 14개 → 10개**(실측). Phase 42 T1의 `flex-wrap`은 증상만 막았고
>   이번이 그 원인을 줄인 것이다.
> - **발표는 남겼다**(자주 쓰는 단독 동작) · **텍스트 복사만 모달을 닫지 않는다**(닫으면
>   "복사됨!"을 볼 수 없다) · **CSV는 넣지 않았다**(글 문서에서 고르면 빈 파일을 받는다).
> - 접근성은 공용 `useModalA11y`를 썼다 — 새로 만들면 두 벌이 된다.
> - 곁다리로 미사용 import 2건을 정리했다. **상시 경고는 사람이 린트를 통째로 무시하게 만든다.**
> - 검증: turbo **18/18 GREEN**(경고 0). **화면은 못 찍었다**(로그인 뒤 화면).

> ## ✅ 2026-07-27 `/loop-eng` — [Phase 43](plans/phase_43.md) T3: 템플릿이 왜 "빈 페이지 같았나"
> 계획이 **"각 템플릿의 실제 내용이 몇 줄인지 착수 전 반드시 보라"**고 적어 뒀다. 봤더니
> **구조는 이미 있었고 모든 칸이 빈 문자열**이었다(`bullet("")`·`para()`·`check("")`).
> 사용자가 "빈페이지말고 실제 노션에서 쓰는 회의록처럼"이라고 한 이유가 이것이다 —
> **문제는 목록도 구조도 아니라 "뭘 쓰면 되는지가 없는 것"**이었다.
>
> - **11개 템플릿의 빈 칸을 전부 안내 문구로 채웠다.** 지우고 쓰면 되고, 안 지워도 문서가 성립한다.
> - **회의록**(사용자가 이름을 댄 것)에 메타 줄(날짜·시간·장소)과 "논의" 섹션을 더하고,
>   액션 아이템에 **담당자·기한 자리**를 넣었다 — 그 둘이 없으면 아무도 하지 않는다.
> - **계약 4개를 테스트로 잠갔다**: 빈 블록 0개 · **h1이 둘 이상인 템플릿 없음**(Phase 34 발표
>   모드가 h1을 장 경계로 삼아서, 여러 개면 **회의록 하나가 여러 장으로 흩어진다**) ·
>   글 템플릿은 첫 블록이 h1 · **허용 블록 타입만**(내보냈다 가져올 때 조용히 사라지지 않게).
> - **처음 쓴 규칙이 한 번 틀렸다**: "h1은 정확히 하나"로 잡았더니 데이터베이스 템플릿
>   (`project-tracker`)이 걸렸다 — 표로 열려서 본문 제목이 없는 게 맞다. **진짜 제약은
>   "둘 이상이면 안 된다"**여서 그렇게 고쳤다(검사가 계약을 정확히 말하게).
> - **`quote` 블록이 실제 에디터 스키마에 있는지 확인하고 썼다**(BlockNote 0.52.1 기본 블록).
>   허용 목록에만 있고 스키마에 없으면 회의록이 렌더에서 터진다.
> - **stale 가드 4개 통과**, 다만 ②에서 **툴바 버튼이 계획의 9개가 아니라 13개**임을 확인했다
>   (상태·아이콘 전용 포함) — 근본 정리(T1·T2)가 계획보다 더 필요하다는 뜻이다.
> - 검증: web 템플릿 테스트 **25건**(+5) / turbo **18/18 GREEN**. **화면은 못 찍었다**(로그인 뒤).

> ## ✅ 2026-07-27 `/loop-eng` — [Phase 42](plans/phase_42.md) T5 + Phase 42 완료
> **또 계획의 전제가 실측과 달랐다.** 계획은 "24px용으로 인코딩한 로고 영상을 40px로 키우면
> 업스케일이라 뭉개진다"며 재인코딩을 요구했는데, `ffprobe`로 재 보니 **원본이 이미 96×96**이다.
> 32px로 키워도 **3배 축소**라 뭉개질 여지가 없다 — **계획이 걱정한 문제가 애초에 없었다.**
> 파일을 새로 만들지 않았고 용량(24.8KB)·화질 예산도 그대로다.
>
> - 로고 24 → **32px**, 그릇 32 → **40px**. **두 자리 모두**(펼침 `Brand` + 접힘) 고쳤다 —
>   한쪽만 고치면 접었다 펼 때 로고가 튄다. 접힘 폭 `w-16`(64px)에 들어가는 것도 확인했다.
> - 아바타(`/duck-logo.png`)는 건드리지 않았다 — 요청은 로고에 대한 것이다.
> - **JSX 주석을 삼항 표현식 자리에 넣어 파싱이 한 번 깨졌다.** lint가 잡았고 위치를 옮겨 고쳤다
>   (테스트·빌드가 아니라 **lint가 먼저 운 사례** — 그래서 셋을 다 돌린다).
>
> **[Phase 42 완료] 7건 전부.** 완료 전에 잔여물을 코드로 훑었다: 옛 잔디 색 클래스 0건 ·
> 옛 뉴스 문구 0건 · 옛 로고 그릇 크기 0건 · `unresolvable`을 쓰는 규칙 0건.
> **이번 Phase에서 계획의 전제가 세 번 틀렸다**(T2 원인 ①·T3 "전체 피드 없음"·T5 재인코딩 필요).
> 세 번 다 **착수 전 실측**이 잡아냈다 — stale 가드와 `[확인 필요]` 표기가 값을 한 회차다.
> - 검증: turbo test·lint·build **18/18 GREEN** / core 947 / web 신규 7 / e2e 19 통과·46 스킵.
> - **화면 검증은 7건 중 하나도 못 했다** — 전부 로그인 뒤 화면이다(계획이 예고한 Phase 41 의존).
>   [manual-verification 42번](loop-eng/manual-verification.md)에 항목별 확인 절차를 적어 뒀다.

> ## ✅ 2026-07-27 `/loop-eng` — [Phase 42](plans/phase_42.md) T6: "안 보인다"를 숫자로 확인했다
> 사용자가 습관 잔디를 "잘 안 보인다"고 했다. **눈으로 색을 다시 고르면 다음에 또 지적받는다** —
> 그래서 기준을 숫자로 잠갔다.
>
> - **숫자가 사용자 말을 확인해 줬다**: 다크 모드 레벨 0은 카드 배경과 **지각 거리 ΔE 1.8**이었다.
>   사람이 겨우 알아채는 최소 차이가 **2.3**이다 — "거의 안 보인다"가 아니라 **못 보는 게 맞았다.**
> - 원인 4개를 전부 고쳤다: 셀 경계(`border` 대신 inset shadow — border는 셀 크기를 키워 열
>   정렬을 흔든다) · 레벨 0을 카드와 구분되는 값으로 · 레벨 간격 확대 · **월 라벨 + 범례**.
> - **색을 `globals.css`의 `--heat-*` 한 곳으로 뺐다.** 컴포넌트에 클래스로 박으면 검사할 수
>   없어서다 — 새 테스트가 **그 CSS 파일을 직접 파싱해** 대비를 잰다
>   (`buildStaticGuard`·`schemaGuard`가 빌드 산출물·마이그레이션에 쓰는 방식과 같다).
> - **명도(WCAG)가 아니라 지각 거리(CIE ΔE)를 골랐다.** 명도만 재면 밝기가 비슷하고 색이 다른
>   두 칸을 "구분 안 됨"으로 잘못 판정한다. 기준: 인접 ΔE ≥ 12, 레벨 0 vs 카드 ΔE ≥ 6.
> - **가드가 실제로 막는지 실측했다**(이 저장소가 Phase 39에서 세운 방식): 레벨 1을 레벨 0에
>   가깝게 바꿔 보니 **ΔE 0.35로 실패**했고 방향 검사도 함께 걸렸다. 확인 후 되돌렸다.
> - **계획의 `[추정]` 날짜 파싱 위험은 고치지 않았다.** 확인해 보니 `"...T00:00:00"`은 로컬
>   파싱이고 `getDay()`도 로컬이라 **같은 기준끼리 상쇄된다** — 위험한 조합은 UTC로 파싱해
>   로컬로 읽는 쪽이다. **없는 문제를 고치면 멀쩡한 동작을 깬다** → 근거만 주석으로 남겼다.
> - **셀 크기도 그대로 뒀다** — 키우면 1년치가 가로로 넘친다(크기 조절은 Phase 44에서 함께).
> - 검증: web 신규 **7건** / turbo test·lint·build **18/18 GREEN** / e2e 19 통과·46 스킵.
>   **화면은 못 찍었다** — 대시보드 위젯이라 로그인이 필요하다.

> ## 🔴 2026-07-27 `/loop-eng` — [Phase 42](plans/phase_42.md) T3: "없다"고 적은 실측이 틀렸다
> 계획이 **"velog 전체 피드가 있는지 실측하라, 없다고 단정하지 말 것"**이라고 적어 뒀다.
> 실측했더니 **있었다** — `https://v2.velog.io/rss/`가 200에 RSS **20건**(전부 title·link·pubDate,
> 발행 시각 당일). 즉 코드 주석·테스트·사용자 안내 문구 **세 곳에 적혀 있던 "velog는 사이트 전체
> 피드를 제공하지 않아요"가 거짓**이었다.
>
> **1차 조사는 홈 HTML의 `<link rel=alternate>`만 봤다.** 그건 "자동 발견이 안 된다"는 증거일
> 뿐인데 **"피드가 없다"는 결론으로 넘어갔고**, 그 문장이 다음 사람(나)의 전제가 됐다.
> → [lessons-learned L-17](lessons-learned.md) 신설: **부재 증명은 탐색 방법 하나로 성립하지 않는다.**
>
> - 이제 홈 주소를 **거부하지 않고 전체 글 피드로 등록**한다. note가 "특정 사용자만 받으려면
>   `velog.io/@아이디`"로 다음 단계를 안내한다. **거부는 해결이 아니다** — 1차에서 안내만 띄우고
>   "완료"로 적었더니 사용자가 **같은 항목을 2차 피드백에 다시 올렸다.**
> - **계획이 제안한 "아이디 입력 UI"는 만들지 않았다.** 전체 피드가 있으므로 물어볼 이유가
>   사라졌다 — 없는 이유로 화면을 늘리지 않는다(ponytail 1단계).
> - **부류를 전수로 봤다**: `unresolvable`을 쓰는 규칙은 velog 하나뿐이었고 이제 **하나도 없다.**
>   그 갈래에 "기본값으로 쓰지 말고 데려갈 길이 없는지 실측한 뒤에만 쓴다"를 계약으로 적었다.
> - 호출부 2곳(`NewsReader`·`addFeed`)이 이미 `rewritten`을 올바로 처리해 **UI 변경 0줄**이다.
> - 검증: turbo **18/18 GREEN**(옛 전제를 잠그던 api 테스트 1건은 사유를 적고 고쳤다) /
>   core 947 / e2e 19 통과·46 스킵.

> ## 🔴 2026-07-27 `/loop-eng` — [Phase 42](plans/phase_42.md) T2: 화면이 한 말이 거짓말이었다
> **계획이 적은 원인 ①이 틀렸다는 걸 착수하면서 찾았다.** "`publishedAt`이 없으면 버린다"는
> 이 경로에서 성립하지 않는다 — `timeOf`가 `createdAt`으로 폴백하고 그 컬럼은 **nullable이
> 아니다**. 계획을 그대로 따랐다면 **없는 문제를 고쳤을 것이다.**
>
> **진짜 기전**: RSS가 2주 전에 발행한 글을 **오늘 수집**하면 `publishedAt`이 먼저 쓰여 창
> 밖이 된다. 기사는 `/news`에 보이는데(그쪽은 수집일 정렬) 대시보드에서만 사라지고, 화면은
> **"최근 3일 안에 수집된 기사가 없어요"**라고 말한다 — **수집은 방금 했다.** 문구가 거짓이었다.
>
> - `topArticles`가 순위 배열 대신 **왜 비었는지까지** 돌려준다. 화면은 둘로 나눠 말한다:
>   수집 전이면 "아직 수집된 기사가 없어요", 전부 창 밖이면 **"수집된 기사 N건은 발행일이
>   3일보다 오래됐어요"** — **숫자로** 말해서 오류로 오해하지 않게 한다.
> - **창을 넓히지 않았다.** "오늘의 뉴스"가 2주 전 기사를 보여주면 위젯 이름이 거짓이 된다.
> - **`windowHours`를 함께 돌려준다** — 화면이 "3일"을 따로 적으면 창을 바꾸는 날 그 문구만
>   거짓으로 남는다. 이 저장소가 "두 벌이면 한쪽만 고쳐진다"로 반복해서 데인 부류다.
> - **기준 시각이 깨졌을 때 "오래됐다"고 지어내지 않는다**(판정 불가와 오래됨은 다르다).
> - 기존 테스트 14곳은 **코드로 일괄 수정**(HD-003), 새 계약 테스트 7건 추가.
> - **[미확인] 실제 DB 수치는 못 셌다** — Supabase MCP가 인증 게이트에 막혔다(PENDING 1번과
>   같은 게이트). **어느 원인이든 맞는 설계**로 갔고, 그 사실을 계획서에 적었다.
> - 검증: core **947**(+16) / turbo **18/18 GREEN** / e2e 19 통과·46 스킵.
>   **화면은 못 찍었다** — 대시보드 위젯이라 로그인이 필요하다. 이 저장소에 컴포넌트 렌더
>   테스트 환경이 없어(`environment: "node"`) 문구 자체는 코드 검토까지만 확인했다.
>   **테스트 라이브러리를 새로 들이지 않았다**(요청에 없는 의존성 추가 금지).

> ## ✅ 2026-07-27 `/loop-eng` — [Phase 42](plans/phase_42.md) T4·T1·T7: 화면이 하던 거짓말 셋
> **stale 가드 5개를 먼저 돌렸고 전부 통과했다**(전제가 살아 있었다). 그중 셋을 고쳤다.
>
> - **T4가 이번 사이클의 본체다.** 인사말이 프로필 이름을 무시한 건 **계산이 두 벌**이어서였다 —
>   사이드바는 프로필을 읽는데 대시보드는 안 읽었다. **대시보드만 고치면 두 벌이 그대로 남아
>   다음에 또 갈린다** → core `resolveDisplayName`(순수, 테스트 9건)으로 모으고 **두 호출부를
>   모두** 바꿨다. 대시보드는 이미 같은 파일 70행에서 그 데이터를 받아 놓고 권한 판정에만 썼다.
> - **`[확인 필요]`였던 이메일 폴백은 코드에서 근거를 찾아 제거했다**: `AppNav.tsx:188~189`가
>   이름 바로 아래에 이메일을 따로 그려서 **같은 주소가 두 줄로 겹친다.** 함수가 **이메일을
>   아예 인자로 받지 않게** 했다 — 안 받으면 실수로도 새어 나갈 수 없다. 되돌리기 쉬운 문구라
>   진행하고 [manual-verification 42번](loop-eng/manual-verification.md)에 적었다.
> - **T1·T7은 같은 부류다**(`flex-wrap` 없음). T7은 요청이 두 갈래로 읽혀 **깨짐 쪽만** 고쳤다 —
>   깨진 것이면 답이고 아니어도 해가 없다. **배치 기능은 추측으로 만들지 않았다.**
> - **경계값을 테스트로 잠갔다**: `user_metadata`는 사용자가 덮어쓸 수 있는 임의 JSON이라
>   숫자·객체가 오면 화면이 `[object Object]`가 된다 → 문자열만 받는다. 300자 이름은 인사말
>   한 줄을 밀어내므로 50자(=`profileSchema` 상한)로 자르되 **코드 포인트 단위**로 자른다
>   (`slice`는 이모지 중간을 끊어 깨진 글자를 만든다).
> - 검증: core **940**(+9) / turbo test·lint·build **18/18 GREEN** / e2e **19 통과 · 46 스킵**.
> - **화면 검증 못 했다** — 셋 다 로그인 뒤 화면이다. 이 Phase의 계획이 예고한 의존 그대로다.
>   회귀 잠금 e2e 2건을 넣었지만 **지금은 스킵된다**(Phase 41 T5가 켜면 함께 돈다).
>   **없는 testid를 쓰지 않았다** — 안 맞는 선택자는 "살아 있는 척 죽은 테스트"가 된다.
>
> **계획은 [Phase 42](plans/phase_42.md)~[60](plans/phase_60.md)까지 차 있다.** 발굴하지 말고 꺼내 쓰면 된다.

> ## ✅ 2026-07-27 `/loop-eng` — [Phase 41](plans/phase_41.md) T3: 잊으면 잠기던 계정을 연다
> T1이 이메일 로그인을 켠 순간 **비밀번호를 잊으면 영구 잠기는 상태**가 처음 생겼다
> (OAuth 사용자에겐 없던 구멍이다). 그걸 닫았다.
>
> **새로 만든 것보다 안 만든 것이 많다.** 메일 링크는 `next=/auth/reset`을 달아 **이미 OAuth가
> 쓰는 `/auth/callback`**으로 들어온다 — 교환 라우트도, open redirect 방어도 재사용했다.
> 새 파일은 `/auth/reset` 한 화면과 core 함수 하나뿐이다.
>
> - **세션 없이 비밀번호 폼이 뜨지 않는 것을 두 겹으로 잠갔다.** `proxy.ts` 인증 게이트(공개
>   경로에 넣지 **않았다**) + 페이지 자체 판정. **게이트만 믿지 않는 이유**는 그게 다른 파일의
>   경로 목록이라 다른 이유로 편집되다 조용히 열릴 수 있어서다 → e2e가 303을 못박는다.
> - **만료 판정을 로그인 쪽에 섞지 않았다.** "expired"·"session missing"은 로그인 실패에도
>   나온다 — 공용 규칙표에 넣었다면 로그인 실패에 **"재설정 링크가 만료됐습니다"라는 거짓말**이
>   떴을 것이다. 규칙표를 따로 두고 그 오탐을 테스트로 못박았다(7건 중 1건이 정확히 그것).
> - **곁다리로 침묵 하나를 없앴다**: `/auth/callback` 실패가 보내는 `/login?error=auth`는
>   지금까지 **한 글자도 말하지 않았다**(빈 폼이 다시 뜰 뿐). 만료된 재설정 링크가 정확히 그
>   경로로 떨어진다. **원인별로 나누지 않았다** — OAuth 실패와 링크 만료가 같은 파라미터로 오고
>   서버는 어느 쪽인지 모른다. 추측해 말하면 그게 거짓말이 된다.
> - **계획의 `[확인 필요]`(SMTP 상한)를 해소했다.** 판단에 실제로 쓰이는 사실은 숫자가 아니라
>   **가입 확인 메일과 재설정 메일이 같은 시간당 통을 쓴다**는 것이다(프로젝트 전체 합산).
>   그래서 **e2e는 전용 계정을 재사용해야 한다** — 매번 새로 가입시키면 실사용자의 재설정이
>   그 시간 동안 막힌다. **정확한 건수는 적지 않았다**: 문서가 그 자리를 동적 값으로 채워
>   원문에 숫자가 없다. 확인 방법(대시보드 Rate Limits)을 대신 적었다.
> - 검증: core **931**(+7) / turbo test·lint·build **18/18 GREEN** / e2e **19 통과 · 44 스킵**
>   (스킵 계약 회귀 없음 — +1은 이번 가드) / `/auth/reset`이 빌드 출력에서 **`ƒ`**(정적으로
>   구워지면 nonce CSP가 스크립트를 막아 비밀번호를 바꿀 수 없다).
> - **화면을 실제로 찍었다**(desktop·mobile × 기본·빈 이메일 안내·가입 탭 = 6장):
>   [screenshots/2026-07-27/password-reset/](loop-eng/screenshots/2026-07-27/password-reset/index.md).
>   가입 탭에서 재설정 진입점이 **사라지는 것**까지 확인했다(계정 없는 사람에겐 막다른 길이다).
> - **못 한 것**: 메일이 실제로 오는지·링크가 열리는지. provider가 꺼져 있고, 확인하려면
>   실제 주소로 메일이 나간다(되돌릴 수 없는 외부 발송) →
>   [manual-verification 41번](loop-eng/manual-verification.md)에 절차를 적고 **멈추지 않고 진행했다.**
> - **[사용자]** 위 1번 스위치를 켜기 전까지 재설정도 안내 문구만 냅니다.

> ## 📋 2026-07-26 — 메신저 734항목을 전수 배정했다 (Phase 53~60 신설, 코드 0줄)
> 사용자가 작성한 **메신저 기능 카탈로그 734항목**을 "전부 계획값으로" 요청받아 배정했다.
> 처음엔 Group 0~2만 계획하고 Group 3·4를 카탈로그 보관으로 뒀는데, **하나도 남기지 않게** 다시 했다.
>
> **배정표를 코드로 생성했다**([messenger-assignment.md](catalog/messenger-assignment.md), HD-003).
> 734행을 손으로 옮기면 틀리는 것보다 **빠뜨린 것을 알 수 없는 게 더 문제다.**
> 생성기가 **누락 0 · 중복 0 · 원본에 없는 ID 0**을 검증한다.
>
> **그 검사가 결함 4건을 잡았다 — 코드로 만든 값이 이것이다:**
> - **K-001(이미지 업로드, MUST)이 배정에서 빠져 있었다.** Group 0에 H-002(이미지 메시지)를
>   넣었으면서 **업로드를 안 넣었다** — 이미지 메시지를 만들 수 없다.
> - **F-002(Enter 전송, MUST)가 Phase 54로 밀려 있었다.** 그거 없이는 Phase 50에서
>   **메시지를 보낼 수가 없다.**
> - **W-005 중복 배정** — 커맨드 팔레트는 L-024와 같은 것이고 `CommandPalette.tsx`로 **이미 있다.**
>   배정 오류가 아니라 **판정 오류**였다.
> - **SKIP 등급 2건이 계획에 섞였다**(결제 스토어·피드형 강제 — 안 하기로 한 것).
>
> **버킷**: 이미 있음 49 · 기존 Phase 41·48·49 18 · P50~52 157 · **P53~60 469** · 안 함 41.
> **MUST 61건 중 60건이 P52 이전**이다(계획을 뒤로 밀면서 MUST가 딸려 가지 않았다).
> 유일한 예외 W-002는 SHOULD로 내리고 근거를 적었다 — **웹에서 메신저가 성립하기 전에
> 두 번째 표면을 만들면 양쪽을 두 번 고친다.**
>
> **새 계획서 8건이 찾아낸 것 셋**
> - **[P53](plans/phase_53.md)은 전제가 없으면 만들 값이 없다.** 방장·강퇴·초대·차단 31개는
>   **실제 사람을 초대할 때만** 의미가 있다. 계획이 없으면 **약 30개가 죽은 코드**가 되고
>   RLS만 복잡해진다 → 착수 전 확인 항목으로 걸었다.
> - **[P58](plans/phase_58.md)이 가장 조용한 위험을 짚었다** — **무료 플랜에 자동 백업이 없고
>   이 저장소에 DB 덤프 스크립트가 없다.** 메신저가 생기면 지울 수 없는 개인 대화가 쌓이는데
>   잃으면 복구 수단이 없다. 카탈로그 등급은 SHOULD지만 **메신저를 만들면 MUST에 가까워진다.**
> - **[P59](plans/phase_59.md)의 약 12개는 코드로 못 만든다** — 오리 코스튬·표정 그림이 필요하고
>   **오리 외형은 사용자 영역**이다([PENDING 4번](loop-eng/PENDING.md)이 이미 같은 벽에 막혀 있다).
>
> **[P60](plans/phase_60.md)은 성격이 다르다 — "언제 열 수 있나" 문서다.** 56항목은 지금 못 하지만
> **"안 함"과도 다르다**(전제가 바뀌면 열린다). 6묶음마다 해제 조건을 적었다 — **빈칸도 낡은 기록이다.**
> 핵심: **E2EE와 검색·RAG는 양립 불가**(카탈로그 U-026이 정확히 지적했다). 전 방에 적용하면
> **이 제품에서 메신저를 만드는 명분 자체가 사라진다** → 방 단위 선택만이 길이다.
>
> - **검증 해당 없음** — 문서뿐이고 코드를 한 줄도 안 바꿨다. 죽은 링크 검사만 돌렸다(24개 문서, 0건).
> - 곁다리로 **`(app)` 라우트 그룹의 괄호가 마크다운 링크를 조기 종료시키는 실제 결함 6건**을 고쳤다.

> ## 🧹 2026-07-26 — 끊긴 세션의 고아 작업을 검증해 확정 + 락 정리
> **`/loop-eng` 세션(pid 1756)이 23:36:56에 시작해 Phase 41 T1을 만들고 커밋 전에 끊겼다.**
> 하트비트가 **시작 시각에서 한 번도 갱신되지 않았고** 프로세스도 없었다 — 즉 곧바로 죽었다.
> 작업물이 워킹 트리에 고아로 남아 있었다.
> - **버리지 않고 검증해서 확정했다**(`cbb38b7`). 내용이 온전했다 — 이메일 폼 + core
>   `authErrorMessage`(계정 열거 방지) + 테스트 10건 + DECISIONS 12번(확정 스택 변경 기록).
> - **검증은 내가 직접 돌렸다**(끊긴 세션은 보고를 남기지 못했다): core **924 GREEN**(+10) ·
>   turbo test·lint·build **18/18 GREEN** · 공개 화면 e2e **6/6**(콘솔 오류 0) ·
>   **`/login`이 빌드 출력에서 여전히 `ƒ`(동적)** — 정적으로 구워지면 nonce CSP가 스크립트를
>   전부 막아 **로그인이 완전 불능**이 된다(실사용자에게 발견당한 그 사고). 로그인 화면을
>   건드렸으니 그 조건을 눈으로 확인했다.
> - **고아 락을 치웠다**: `.claude/loop-eng.lock` 제거 + `~/.claude/loop-eng/active.json`에서
>   **죽은 항목만** 골라 제거(전체를 비우면 다른 프로젝트의 정상 세션을 지운다).
>   삭제 전에 pid가 정말 죽었는지 다시 확인했다.

> ## ⏭ 2026-07-26 `/loop-eng` — [Phase 41](plans/phase_41.md) T1: 이메일 로그인 (사용자 요청 0번)
> 다른 세션이 계획 41~52를 커밋하고 조용해진 뒤 이어받았다. **stale 가드를 돌렸더니 ④가
> 실패했다** — "Phase 40이 미착수인가"인데 **이미 배포돼 있었다**(`fa12c22`). 그 결과:
> - **T4(스킵 계약 10곳 → 한 벌)는 이미 완료다.** 다시 하지 않았다(재구현은 최고 심각도 위반).
> - **"Phase 40을 폐기한다"는 성립하지 않는다** — 계획 문서가 아니라 배포된 코드다. 특히
>   T3(만료 판정)를 "통째로 사라진다"고 본 판단은 **CI에만 맞는다**: CI는 매 실행마다 세션을
>   새로 만들지만 **로컬에서 손으로 만든 OAuth 세션은 여전히 만료된다.** 남기는 비용은 0이고
>   지우는 비용은 "세션 만료 vs 진짜 회귀" 구분의 상실이다 → 남겼다.
>
> **한 일(T1)**: `LoginForm.tsx`에 이메일 폼 — OAuth 위 · 이메일 아래(기존 사용자가 "내 계정이
> 없어졌나" 하고 헷갈리지 않게) · 한 폼에서 로그인/가입 탭(라우트를 늘리면 `/login`에서
> **두 번 밟은** 정적 프리렌더+CSP 함정을 다시 밟는다) · `autoComplete`을 모드에 따라 나눔 ·
> 오류 `role="alert"` · 안내 `role="status"`.
>
> **계정 열거 차단이 이 작업의 핵심이다.** core `authErrorMessage`(순수, 테스트 10건)가
> 자격증명 실패를 **원인 구분 없이 한 문구**로 낸다 — "없는 계정"과 "틀린 비밀번호"를 구분하면
> **어느 이메일이 가입돼 있는지 알려주는 통로**가 된다. `User already registered`도 같은 문구다.
> **`friendlyError`를 쓰지 않았다(의도)** — 그건 모르는 오류의 원문을 그대로 보여주는 방침이라
> 인증에서는 영문 노출 + 열거 방지 붕괴가 된다. 재구현이 아니라 **다른 계약**이고 두 파일에 적었다.
>
> **계획보다 한 걸음 더 갔다**: 계획은 "provider를 켜기 전까지 폼은 오류만 낸다"고 했는데
> 그러면 **로그인 화면이 정체 모를 실패를 내는 상태로 배포**된다. `Email logins are disabled`를
> 잡아 "이메일 로그인이 아직 준비되지 않았습니다. Google 또는 GitHub로 계속해 주세요."로 바꿨다
> (Phase 37이 세운 방식). **켜지기 전까지 앱 동작은 이 문구 외에 바뀌지 않는다.**
>
> **화면을 실제로 봤다 — 이번 40항목 중 내가 눈으로 검증할 수 있는 유일한 화면이다**
> (`/login`은 공개라 세션 없이도 찍힌다). e2e **6/6** · 콘솔 오류 0 · **정적 프리렌더 가드 통과**.
> **스크린샷에서 결함을 찾아 고쳤다**: 모바일에서 `이메일로`가 `이/메일로`로 끊겼다 →
> `break-keep`(globals.css가 에디터 본문에 **같은 규칙을 이미 쓴다** — 새 판단이 아니다).
> 고친 뒤 재빌드·재촬영해 확인했다.
>
> **확정 스택 변경이라 `DECISIONS.md` 12번에 기록했다** — 무엇을·왜·**비용 4가지**·완화 조치·
> 되돌리는 방법. Phase 40이 이걸 거부했던 사실과 **그 판단이 그 맥락에서 옳았다**는 것도 적었다.
>
> **계획의 `[확인 필요]` 3건을 코드로 해소**: `profiles` 트리거가 provider를 가리지 않아
> **마이그레이션 0개 확정**(표시 이름 폴백 `split_part(email,'@',1)`이 이미 이메일 가입 형태다) ·
> SMTP 상한은 **진짜로 미기록**(계획이 정확했다 — 내 grep이 잡은 2건은 결제 이메일·Gmail scope로
> 무관했다) · 신규 의존성 0개.
>
> **T2는 재검토가 필요하다(정직하게)**: 계획은 로그인 상한에 공용 `allowRequest`를 쓰라고 했지만
> 그건 **서버 메모리 기반**이고 `signInWithPassword`는 **클라이언트가 Supabase를 직접** 부른다 —
> 우리 서버를 거치지 않아 그 상한이 걸릴 자리가 없다. 실제 방어선은 Supabase Auth 자체 상한이고,
> 완충을 두려면 **API Route로 감싸는 설계 변경**이 필요하다. 값이 그 비용을 넘는지가 먼저다.
> - 검증: core 924(+10) / turbo test·lint·build **18/18 GREEN** + 공개 e2e **6/6**.
> - **[사용자]** Supabase 대시보드 → Authentication → Providers → **Email 켜기** 전까지
>   폼은 안내 문구만 냅니다(PENDING 11번).

> ## 📋 2026-07-26 — 2차 피드백 40항목 + 메신저 734항목을 계획으로 (Phase 41~52 draft)
> **코드는 한 줄도 안 바꿨다. 이번 산출물은 계획서 12건 + 카탈로그 2건이다.**
> 사용자가 배포된 화면을 다시 써 보고 **40항목**을 남기고, 이어서 **메신저 기능 카탈로그
> 734항목**을 직접 작성해 줬다. 요청은 "조사해서 계획에 전부 넣어 달라"였다.
>
> **착수 전 사용자 확인 4건을 받았다**(추측으로 진행하면 방향이 크게 어긋나는 것만):
> 0번 로그인 화면이 비어 있던 것 → **이메일+비밀번호 로그인** · "모든 기능 다"(1-10·3-1·6-4) →
> **카탈로그 문서만** · 관리자 이메일(`555` vs `5555`) → **둘 다** · 마이그레이션 → **계획만 먼저**.
>
> **조사에서 원인을 확정한 결함 7건**(추측 아님, 줄 번호까지):
> - **2-1 페이지 상단 UI 깨짐** — `PageEditor.tsx:488`이 `flex-wrap` 없이 버튼 **9개**를
>   `max-w-3xl`(768px)에 넣는다. 사용자가 말한 범위("즐겨찾기~웹에공개")가 **정확히 그 div의 자식 전체**다.
> - **1-8 뉴스 안 보임** — `news-top.ts`가 **72시간 창 밖**(`:64`)과 **`publishedAt` 없는 기사**(`:63`)를
>   버린다. 기사가 DB에 있어도 0건이 되고, 화면은 그 사실을 말하지 않는다.
> - **1-2 인사말 이름** — `displayName`이 **두 곳에서 다른 규칙**으로 계산된다.
>   사이드바(`layout.tsx:44`)는 프로필을 읽는데 대시보드(`page.tsx:82`)는 안 읽는다.
>   **그런데 대시보드는 같은 파일 70행에서 이미 그 데이터를 받아 놓고 권한 판정에만 쓴다.**
> - **1-6 메모** — 색이 `index % COLORS.length`로 **자동 배정**돼 고를 수 없고,
>   하나 지우면 **나머지 색이 다 밀린다.** 게다가 `-50` 단계라 흰 배경에서 안 보인다.
> - **1-4 뽀모도로** — 완료음이 **사인파 523Hz 0.5초**다(팝업 없음). 이 저장소가 오피스에서
>   **사인파를 "이상한 사운드"로 지적받아 걷어낸 그 부류**다. **[추정] 사용자는 아예 못 들었다** —
>   제스처 없이 만든 `AudioContext`는 `suspended`로 시작한다(게다가 매번 새로 만들고 닫지 않는다).
> - **3-2 습관 잔디** — 셀 12px에 **테두리가 없어** 같은 레벨이 뭉치고, 레벨 0이 `bg-muted`다.
> - **4-1 velog** — 1차에서 "완료"로 적었지만 지금은 **등록을 거부하고 안내만 한다**(`news-feeds.ts:96`).
>   **거부는 해결이 아니다.**
>
> **1차와 겹치는 항목 6건의 공통 패턴을 찾았다 — 이게 이번 조사의 가장 값진 부분이다.**
> 4-1·2-5·1-5·4-3·6-1·5-x가 다시 올라왔고, **2-5는 원문이 1차와 글자 단위로 같다.**
> 전부 **1차 처리가 "최소 구현"이었고 사용자는 그다음을 원한** 경우다
> (버튼 vs 드래그 · 정적 목록 vs 계속 갱신 · 거부 vs 다음 단계 안내).
> ponytail 사다리는 맞았지만 **최소 구현에서 멈춘 것을 "완료"로 적은 것**이 문제였다 →
> **모든 Task에 "어디까지 하면 끝인가"를 명시했다.**
>
> **메신저 734항목은 대조부터 했다. Group 0 MUST 34개 중 20개(59%)가 이미 있거나 계획돼 있었다.**
> - **B-004 실시간 수신이 이미 있다** — `subscribeTable`을 위젯 5개가 쓰고 publication도 적용돼 있다.
> - **A-001~A-005·A-008·A-009는 Phase 41과 정확히 같다.**
> - **V-001·V-002(자동 일시정지 회피)는 `/api/keepalive`가 이미 한다** —
>   카탈로그가 "치명적"이라 한 제약 2개 중 하나가 이미 막혀 있다.
> - **가장 중요한 발견**: `DuckChatPanel`이 이미 완전한 1:1 에이전트 채팅이다
>   (카탈로그 R 섹션 MUST 4개가 거기 있다). **메신저의 정확한 정의는 "새 채팅 만들기"가 아니라
>   "그것을 방으로 일반화하고 영속화하는 것"이다** — 새로 만들면 오리 채팅이 두 벌이 된다.
> - **대조 없이 시작하면 이미 있는 것 14개를 다시 만들었을 것이다**(최고 심각도 인벤토리 위반).
> - 판정을 바꾼 것 중 하나: **X-018 IME Enter 방지를 SHOULD → MUST로 올렸다.**
>   한글 조합 중 Enter는 전송이 아니라 확정이라, 안 막으면 **반토막 문장이 나간다.**
>   이 저장소는 한국어 인코딩 결함(CP949)을 이미 한 번 겪었다.
>
> **Phase 41을 1번으로 놓은 이유**(순서가 이 계획의 핵심 판단이다): 요청 40항목이 **전부 로그인 뒤
> 화면**인데 **e2e 62건 중 44건이 세션이 없어 죽어 있다.** 먼저 켜지 않으면
> "테스트는 통과했지만 렌더는 못 봤다"가 40번 반복된다(Status에 이미 다섯 사이클 연속 적혀 있다).
> 그리고 **이메일 로그인은 Phase 40의 base64 세션 주입 방식보다 낫다** —
> **비밀번호는 만료되지 않으므로 Phase 40 T3(만료 판정)이 통째로 사라진다.**
> **Phase 40은 Phase 41 완료 시 폐기하고 T2(스킵 계약 10곳 중복)만 흡수했다.**
>
> **정직하게 남긴 것**
> - **이메일 로그인은 확정 스택 변경이다**(CLAUDE.md 2절 "Auth Google+GitHub").
>   **Phase 40이 명시적으로 거부한 항목**이고, 뒤집는 근거는 **사용자의 명시적 요청 하나**다.
>   `DECISIONS.md`에 비용(인증 표면 +1 · 비밀번호 관리 책임 · 계정 연결 복잡도)까지 기록한다.
> - **"오늘은 비가오네요"는 제미나이가 할 수 없다.** LLM은 오늘 날씨를 모르고, 물어보면
>   **그럴듯한 거짓말을 만든다.** 날씨 API(Open-Meteo, 무료·키 불필요) 연동 여부를
>   **사용자 결정으로 남겼다** — 이 저장소가 "없는 데이터는 지어내지 않는다"를 이미 세웠다(1차 4-5 조회수).
> - **해석이 갈리는 것 3건을 추측으로 만들지 않았다**: 1-9(로그아웃 위치가 레이아웃 깨짐인가
>   배치 기능인가 — **깨짐 쪽을 먼저 고친다, 그쪽이면 답이고 아니어도 해가 없다**) ·
>   2-3("전체 db화"가 기본값인가 일괄 변환인가 — **일괄은 되돌릴 수 없어 확인 후**) ·
>   5-5("기능 최대한"이 화면 확대인가 새 게임 요소인가 — **후자면 1차 5-5와 정면 충돌**).
> - **5-1과 5-5는 서로 긴장 관계다**(빼라 vs 넣어라). 5-1을 "매핑의 정확성",
>   5-5를 "화면·조작의 확대"로 읽었고 **그 해석을 계획에 못박았다.**
> - **검증은 0이다.** 이번 산출물은 문서뿐이라 테스트·빌드·화면 검증이 **해당 없다.**
>   각 Phase의 stale 가드에 "착수 시 이것을 먼저 확인하라"를 적어 뒀다 —
>   **낡은 계획이 가장 비싸다**는 것을 이 저장소가 세 번 겪었다.
> - **[확인 필요]로 남긴 것 14개**를 각 계획서에 표시했다(velog 전체 피드 존재 여부 ·
>   Supabase SMTP 발송 상한 · 한국어 FTS 확장 · 뽀모도로 소리가 실제로 나는지 등).
>   **추정을 사실로 적지 않았다.**

> ## ✅ 2026-07-26 `/loop-eng` — [Phase 40](plans/phase_40.md): 만료된 세션과 진짜 회귀를 구분한다
> **e2e 62건 중 44건이 로그인 세션이 없어 죽어 있었다.** 여섯 번 연속 "감사 결함 0"이었지만 그
> 감사는 전부 정적 분석이었다 — 남은 위험은 실제로 렌더·클릭되는 자리에 있는데 그쪽이 꺼져 있었다.
>
> 순서를 계획과 달리 **T2 → T3 → T1**로 했다: T3(만료 판정)가 스킵 계약을 바꾸므로
> **먼저 한 벌로 모아야 10곳을 안 고친다.**
> - **T2**: 10개 스펙에 복사된 3줄 계약을 `e2e/authState.ts` 하나로. **결정적 변환이라 코드로
>   했다**(HD-003) — 스크립트가 파일별 변경을 보고하고 **옛 참조가 남으면 실패**하며, import는
>   다른 용도로 안 쓰일 때만 지운다(`not-found-csp`는 `path`를 계속 써서 남겼다).
> - **T3**: `judgeAuthState` 순수 함수 + 가짜 입력 테스트 10건. **"확실할 때만 막는다"** —
>   만료 시각을 알 수 없는 세션 쿠키나 분할 토큰 일부 만료는 **살아 있다고 본다**(모르면서
>   막으면 멀쩡한 세션으로도 44건이 계속 죽는다).
> - **T1**: CI가 `E2E_AUTH_STATE_B64`를 **받을 준비만** 만들었다(꺼진 채로, Phase 35 방식).
>   전에는 README가 "단계를 추가해야 한다"고만 적어 둬서 **등록해도 아무 일도 일어나지 않았다** —
>   등록할 이유가 없는 상태였다. 순서를 뒤집었다.
>
> **네 가지 상태를 실제로 재현해 증명했다**(세션 없음 → 스킵 · 가짜 **유효** 세션 → **실행 후
> 실패**(= 스킵을 멈춘다) · **만료** → 스킵 + `"만료됐습니다 … 갱신하세요"` · 인증 쿠키 없음 →
> 스킵 + 사유). **전에는 만료된 파일이 있으면 실행되어 실패했고**, CI에서 그게 "세션 만료"인지
> "진짜 회귀"인지 구분되지 않았다. 사유가 **보고서에 실제로 보이는지**까지 확인했다 —
> 안 보이면 안내가 없는 것과 같다.
>
> **stale 가드가 오탐을 하나 걸러냈다.** 루트 `.gitignore`에 `.auth`가 없어 "공개 저장소에 세션
> 토큰이 커밋될 수 있다"고 판단했지만, `git check-ignore`로 보니 `apps/web/.gitignore:47`에
> 있었다. **grep이 아니라 권위 있는 판정을 써야 했다** — 없는 문제를 고치지 않았다.
> 탐색용으로 만든 가짜 세션 파일도 지웠다(두면 44건이 스킵을 멈추고 전부 실패한다).
>
> **곁다리**: `pnpm lint`가 계속 내던 경고 1건(`DangerZone.tsx` 미사용 import)을 지웠다.
> **먼저 배선 결함인지 확인했다** — 계정 삭제 확인 문구가 안 걸린 것이면 되돌릴 수 없는 기능의
> 결함이다. `DeleteAccountButton.tsx`가 제대로 쓰고 있어 **죽은 import**였다. 상시 경고는
> 사람이 린트 출력을 통째로 무시하게 만든다.
>
> **스코프 밖은 되돌렸다**: prettier가 `buildStaticGuard`·`buildFreshness`·`public-visual`도
> 다시 포맷하려 했지만 원복했다(이 저장소는 prettier를 lint에 넣지 않아 원래 미포맷이고
> 이번 작업과 무관하다).
> - 검증: web 439(+10) / turbo test·lint·build **18/18 GREEN** + e2e **18 통과 / 44 스킵**(동일).
>   **화면 검증 해당 없음** — UI 변경은 미사용 import 제거뿐이라 보이는 것이 바뀌지 않는다.
>
> **⚠ [동시 작업 감지] 다른 세션이 같은 작업 디렉터리에서 작업 중이다.**
> 커밋 직전 `git status`에 **내가 만들지 않은 파일 2개**가 있었다 —
> `docs/feedback-2026-07-26-2.md`(사용자 2차 피드백 **40항목**)와 `docs/plans/phase_41.md`.
> 이 저장소는 2026-07-24에 **같은 사고로 남의 작업이 커밋에 쓸려 들어간 전례**가 있다
> (History.md 기록). 그래서 **`git add -A`를 쓰지 않고 내 파일만 경로로 지정해 커밋했다.**
> 그 두 파일은 손대지 않고 그대로 뒀다.
>
> **그리고 그 2차 피드백이 내 다음 계획보다 우선한다** — 사용자가 실제로 말한 40항목이
> 내가 발굴한 항목보다 앞선다. 다음 사이클은 그쪽을 따른다(선행 버퍼를 새로 만들지 않았다 —
> 이미 Phase 41~49가 그 세션에서 만들어지는 중이다).

> ## ✅ 2026-07-26 `/loop-eng` — [Phase 39](plans/phase_39.md): 취약점을 사람이 기억하지 않게 (판정 로직 0줄)
> 직전 사이클이 큐에 넣은 draft를 꺼냈다. stale 가드 3개 통과(잔여 5건 그대로 · CI에 감사 단계
> 없음 · `remotePatterns` 여전히 없음) 후 착수했는데, **ponytail 사다리 4단계(플랫폼 네이티브)에서
> 계획이 무너졌다 — `pnpm audit`이 계획의 T1·T2·T3를 이미 전부 갖고 있었다.**
>
> | 계획이 짜려던 것 | 실제 |
> |---|---|
> | 심각도 게이트 로직 | `--audit-level high` |
> | "런타임 의존만" 분류 | `--prod` |
> | 허용 목록 자료구조 | `pnpm-workspace.yaml`의 `auditConfig.ignoreGhsas` (pnpm 11 네이티브) |
> | 감사 실패 vs 위반 구분 | `--ignore-registry-errors` |
>
> **특히 `--prod`가 계획의 가장 약한 부분을 없앴다.** 계획은 "빌드 전용이냐 런타임이냐"를 사람이
> 사유로 적게 하려 했는데 pnpm이 의존성 트리로 판정한다 — `brace-expansion`(eslint 경유)이
> 자동으로 빠져 **손으로 관리할 사유가 하나 줄었다.** 결과: **판정 로직 0줄**, 신규 의존성 0개.
>
> **새로 짠 것은 테스트 7건뿐이고, 그게 이 Phase의 값이다.** 게이트와 목록은 설정이라
> 아무도 지켜 주지 않는다:
> - **사유 없이 한 줄 늘리면 실패한다** — YAML 주석은 강제되지 않으므로 테스트가 강제한다.
> - **sharp 면제는 `remotePatterns`가 없다는 전제에 얹혀 있다.** 추가하는 순간 근거가 거짓이
>   되는데 목록은 조용히 남는다 → 그 조합을 실패로 만들었다. **면제의 진짜 위험은 사유가 아니라
>   사유가 낡는 것이다.**
> - **게이트 기준을 못박았다** — 조용히 `critical`로 넓히거나 `--prod`를 떼면 테스트가 먼저 운다.
> - **검사가 작동하는지 가짜 입력으로 확인했다**(4건). 실제 파일만 읽는 검사는 통과해도
>   살아 있는지 알 수 없다 — 이 저장소가 `schemaGuard` 머리말에 적어 둔 원칙이다.
>
> **막는 쪽과 통과하는 쪽을 둘 다 실측했다**: 면제 없이 → `exit=1`, 면제 3건 적용 → `exit=0`,
> 면제 안 된 advisory가 기준선에 걸리는 상황 재현 → `exit=1`. **아무것도 막지 못하는 게이트가
> 아님을 숫자로 봤다.**
>
> **정직하게 남긴 것 두 가지**
> - 허용 목록 3줄은 내가 `pnpm audit --ignore GHSA-…`로 **동작을 탐색하다 실제로 기록됐다**
>   (그 플래그가 설정 파일에 영속하는 걸 몰랐다). 의도한 변경이 아니었으므로 `git diff`로 내용을
>   확인하고 **`--frozen-lockfile`이 깨지지 않는지 검증한 뒤** 의도한 설계와 같아서 채택했다.
> - **레지스트리 장애 시 감사가 조용히 통과한다** — `--ignore-registry-errors`의 대가다.
>   계획의 T3는 세 상태를 구분하려 했지만 그러려면 감싸는 스크립트가 필요하고, 피해는 그 실행
>   한 번의 감사를 놓치는 것뿐이다. **스크립트를 유지할 값이 그보다 크지 않다고 판단했고 적었다.**
> - 검증: web 429(+7) / turbo test·lint·build **18/18 GREEN** + `--frozen-lockfile` 정상.
>   **화면 검증 해당 없음** — UI를 한 줄도 건드리지 않았다(CI 설정 + 테스트).
> - **CI에서 실제로 도는 것까지 확인했다**(게이트를 새로 넣으면 이후 모든 푸시가 걸리므로):
>   `lint-and-test`·`e2e` 둘 다 success, 감사 단계 로그가 `3 high (3 ignored)`로 통과,
>   신규 테스트 7건도 CI에서 실행됨. **단계가 조용히 건너뛰어지지 않았다는 증거를 로그로 봤다.**
>
> **[선행 버퍼] [Phase 40 draft](plans/phase_40.md) — 검증 공백 최대 지점.**
> **e2e 62건 중 44건이 로그인 세션이 없어 죽어 있다**(실측). 여섯 번 연속 "감사 결함 0"이었지만
> 그 감사는 전부 **정적 분석**이었다 — 정적으로 볼 수 있는 건 이미 잘 잠겨 있고, **남은 위험은
> 실제로 렌더되고 클릭되는 자리에 있는데 그쪽을 보는 44건이 꺼져 있다.** Phase 34·38이 만든
> 스펙은 작성만 되고 **한 번도 실행된 적이 없다** — 실행되지 않은 테스트는 문서다.
> 계획은 셋으로 나눴다: CI가 세션 시크릿을 **받을 준비를 먼저**(꺼진 채로, Phase 35 방식) ·
> 10곳에 복사된 스킵 계약을 **한 벌로**(Phase 32의 "두 벌이면 한쪽만 고쳐진다") ·
> **만료된 세션이 진짜 회귀처럼 보이지 않게**. 이메일 로그인 추가와 `service_role` 세션 합성은
> **하지 않는다**(전자는 확정 스택 변경이라 사고 게이트, 후자는 얻는 것보다 잃는 게 크다).

> ## 🔴 2026-07-26 `/loop-eng` — 공개 배포된 앱에 열려 있던 런타임 취약점 9건 (Next.js 패치)
> 감사 각도가 여섯 번째로 비었다(아래). 그래서 **감사를 더 하지 않고, 이미 측정돼 있으면서
> 아무도 결정하지 않은 위험**으로 갔다 — 직전 세션이 취약점 14건을 세어 놓고 "사용자 지시 대기"로
> 남겨 둔 항목이다.
> - **14건 중 9건이 `next` 하나였고, 전부 `>=16.2.11`에서 패치돼 있었다.** 우리는 16.2.10이었다 —
>   **한 패치 뒤.** 프록시 우회 · 서버 액션 DoS · **SSRF 2건** · 캐시 혼동 2건 · 내부 서버 함수
>   엔드포인트 노출 등으로, **공개 배포된 앱의 런타임에 실제로 걸리는 것들**이다.
> - `16.2.10 → 16.2.11`로 올렸다. **확정 스택 안의 패치 레벨이라 스택 변경이 아니다**
>   (react peer 범위 동일함을 먼저 확인했다). `eslint-config-next`도 같은 계열이라 함께 맞췄다 —
>   이 저장소는 둘을 정확히 같은 버전으로 고정해 왔다.
> - **프레임워크 상향은 우리 코드를 한 줄도 안 고치지만 렌더링·라우팅 계층 전체가 바뀐다.**
>   그래서 테스트 통과만으로 끝내지 않고 **실제로 화면을 띄워 봤다**: turbo test·lint·build
>   **18/18 GREEN** + 공개 화면 e2e **6/6**(콘솔 오류 0건) + **Phase 38의 정적 프리렌더 가드 통과**
>   (프레임워크를 올려도 정적으로 구워진 HTML 페이지가 새로 생기지 않았다).
>
> **남은 5건은 고치지 않았다 — 측정하고 근거를 남겼다(`PENDING.md` 10번).**
> - `sharp`(high 1건)는 **남이 만든 이미지가 닿는 길이 없다**는 것을 코드로 확인했다:
>   `next.config.ts`에 `remotePatterns`가 없어 Next가 원격 호스트를 전부 거부하고,
>   `next/image`에 넘기는 값은 우리 `/duck-logo.png`뿐이며 **유일한 변수 src는 `unoptimized`**라
>   최적화 경로를 아예 안 거친다.
> - `postcss`(3건)는 빌드 시점, `brace-expansion`(1건)은 **린트 때만** 돈다 — 배포 산출물에 없다.
> - **버전을 강제하지 않은 이유**: `brace-expansion`의 패치는 `>=5.0.8`인데 그걸 요구하는
>   `minimatch@3`은 `^1.1.7`을 기대한다 — **메이저 4단계 점프**다. 이 저장소가 계정 삭제 CSRF에서
>   쓴 판단과 같다: **이미 막혀 있고, 잘못 고치면 정상 동작을 깨는 쪽의 위험이 더 크다.**
> - **`pnpm audit`은 노출 경로를 보지 않고 버전만 본다.** 숫자를 0으로 만드는 것과 실제로
>   안전해지는 것은 다르다 — 9건은 후자였고 남은 5건은 전자다. 셋 중 하나를 골라 달라고 적었다.
>
> **[정정] "Turbopack을 안 쓰니 프록시 우회 CVE는 해당 없다"는 틀렸다.**
> 직전 세션이 `next.config.ts`에 Turbopack 설정이 없다는 이유로 그 CVE 1건을 실제 위험에서
> 빼고 "고위험은 7건"이라고 적었다. **Vercel 배포 메타데이터는 `"bundler": "turbopack"`이라고
> 답한다**(이번 배포와 직전 배포들 모두 실측). Next 16은 빌드 번들러가 Turbopack이 기본이라
> **설정 파일에 아무것도 안 써도 쓰고 있는 것**이다 — 설정 부재를 미사용의 증거로 삼은 게
> 오류였다. 지금은 패치했으니 노출은 사라졌지만, **근거가 틀린 채로 남으면 다음 세션이 같은
> 결론을 반복한다**(이 저장소가 "낡은 기록이 가장 비싸다"로 세 번 겪은 부류다).
>
> **배포까지 확인했다**: Vercel 프로덕션 `READY` + 실사이트 실측 — `/welcome` 200 ·
> `/login` 200 · 없는 주소 303(Phase 38이 기록해 둔 그 동작 그대로). 프레임워크를 올려
> 배포했으니 "테스트가 통과했다"에서 멈추지 않고 **배포된 것이 실제로 뜨는지** 봤다.
>
> **[선행 버퍼] [Phase 39 draft](plans/phase_39.md)** — 이번 일의 진짜 교훈은 "9건을 놓쳤다"가
> 아니라 **하루 전에 이미 세어 놓고도 아무 장치가 그걸 다시 들어 올리지 않았다**는 것이다.
> CI는 build·lint·test·e2e를 돌리지만 의존성 감사는 없다. 새 고위험이 조용히 들어오면
> CI가 먼저 울게 하는 계획을 큐에 넣었다(허용 목록은 `schemaGuard`의 `PUBLIC_BY_DESIGN`
> 방식으로 **이유를 강제**, 게이트는 high·critical만 — moderate까지 막으면 사람이 검사를 끈다).
>
> **[감사 6회차 — 결함 0]** "계정 전체 삭제가 정말 전부 지우는가"를 봤다. `account.ts:9` 주석이
> "계정 삭제는 2단계로 이월 — profiles는 남는다"고 말하는데 Phase 35에서 만들었으니
> **낡은 주석이거나 실제로 이메일이 남는 결함**일 터였다. 둘 다 아니었다:
> `profiles.id`가 `auth.users`를 `on delete cascade`로 물고 있어 계정을 지우면 이메일도 함께
> 사라진다. 뉴스 테이블(`feeds`·`articles`)이 삭제 함수보다 **나중에** 생겼는데도 그 마이그레이션이
> 함수를 재정의해 포함시켜 두었고, **`schemaGuard`의 `purgeMissing`이 "user_id를 가졌는데 파기로
> 사라지지 않는 테이블"을 이미 검사한다.** 즉 "새 테이블 추가 시 delete 한 줄"이 주석이 아니라
> 검사로 잠겨 있었다. **재구현하지 않았다**(Phase 36에서 바로 이걸로 데였다).

> ## 📋 2026-07-26 `/loop-eng` — 교훈 ↔ 가드 전수 대조 완료 + 빠진 기록 두 건
> 지난 두 사이클이 "교훈 ↔ 지금 상태 대조"로 실제 결함을 찾아냈다(마이그레이션 오류 문구,
> 정적 404). **남은 교훈을 마저 확인해 대조를 끝냈다.**
> - **`post-redirect-get`(재발견 1회)은 이미 가드가 있었다** — `auth-redirect.spec.ts`가
>   "미인증 POST가 405 아닌 303"을 실제 요청으로 확인한다. 리다이렉트 호출부 6곳도 전수 확인:
>   상태 변경 핸들러(`logout` POST, `proxy`)는 **303 명시**, `auth/callback`은 **GET이라 무관**.
> - **L-13(브랜드 중복)도 가드 있음**(`public-visual.spec.ts`, 최종 `page.title()` 검사).
> - **이로써 다섯 번째 감사도 결함 0.** 기록된 교훈이 전부 가드되거나 검증된 상태다.
>
> **[빠진 기록 1] CSP 교훈의 재발견 횟수가 1회로 남아 있었다 — 내가 방금 두 번째로 밟았다.**
> 2회로 고치고, 왜 또 밟았는지(1회차 교훈이 "붙여라"였는데 **붙었는지 확인하는 장치가 없었다**),
> 이번엔 검사로 만들었다는 사실, 그리고 **검증의 한계**(브라우저 확인은 로그인 대기)를 적었다.
>
> **[빠진 기록 2] 이번 세션의 인벤토리 위반이 교훈에 없었다 → L-16 신설.**
> 공용 `allowRequest`가 있는데 자체 `Map`으로 재구현한 건(CLAUDE.md **최고 심각도**).
> **"간단한 30초 쿨다운"이라 찾아볼 생각을 안 했다** — 작을수록 더 그렇다는 걸 적었다.
> 재구현의 비용은 중복 코드가 아니라 **고칠 자리가 둘로 갈라지는 것**이다(실제로 키 누수가
> 양쪽에 있었고, 공용 쪽은 한 번에 고쳐졌다).
>
> **[부록] 교훈 ↔ 가드 대조표를 남겼다.** 다음 사이클이 같은 조사를 처음부터 다시 하지 않도록.
> **가드를 안 만든 것은 왜 안 만들었는지도 적었다** — L-15는 도구 문제라 코드로 못 막고,
> L-16은 "이미 있는 걸 또 만들었나"가 의미 판단이라 소스 검사로는 오탐이 크다.
> 빈칸으로 두면 다음 사람이 다시 센다.
> - 검증: turbo test·lint·build **18/18 GREEN** + **표에 적은 가드 파일이 실제로 존재하는지
>   코드로 대조**(전부 존재, eslint 날짜 규칙·303 검사 내용까지 확인).

> ## 🔴 2026-07-26 `/loop-eng` — 같은 CSP 함정을 **두 번째로** 밟고 있었다 (Phase 38)
> 지난 사이클의 방식(교훈 ↔ 지금 상태 대조)을 이어갔다. `lessons-learned.md`에서 아직 확인
> 안 한 교훈을 겨냥했더니 **재발견 1회짜리 교훈이 지금도 재현 중**이었다.
> - **교훈**: "nonce 기반 CSP는 정적 프리렌더링 페이지에서 무효" — 빌드 때 구운 스크립트가 매
>   요청의 nonce와 영영 불일치해 `strict-dynamic` 아래서 **전부 막힌다.** 처음 겪었을 때는
>   `/login`이 정적이라 **로그인이 완전 불능**이었고 **실사용자가 발견해 줬다.**
> - **이번엔 `/_not-found`가 정적(`○`)이었다.** 로그인한 사용자가 삭제된 링크·오타로 없는 주소를
>   열면 그 화면의 스크립트가 전부 막힌다(문구는 보이고 하이드레이션이 죽는다).
>   `force-dynamic`으로 고쳤고 **빌드 출력이 `○` → `ƒ`로 바뀌는 것을 확인했다.**
> - **교훈은 "force-dynamic을 붙여라"였는데, 붙었는지 확인하는 장치가 없었다.** 그래서 이번엔
>   증상만 고치지 않고 **검사로 만들었다** — `buildStaticGuard.ts`가 빌드 산출물에서 정적으로
>   구워진 HTML 페이지를 찾아 e2e 시작 전에 막는다(이 저장소 원칙: 규칙을 주석으로만 두면 어긴다).
> - **그 검사가 곧바로 두 번째 사례를 잡았다**: `/_global-error`도 정적이다. 다만 **Next 내장이라
>   우리 코드가 아니고**, 커스텀 `global-error.tsx`는 `"use client"`여야 해서 `dynamic`을 못 받는다.
>   **고칠 수 없어서 허용 목록에 넣고 사유를 적었다** — 루트 레이아웃이 통째로 터진 극단 상황이라
>   감수한다. 모르는 채 통과시키는 것과 알고 감수하는 것은 다르다.
>
> **실행으로 확인한 것 / 못 한 것(정직하게)**
> | 항목 | 상태 |
> |---|---|
> | 빌드 출력 `○` → `ƒ` | **확인함** |
> | 회귀 가드 동작(위험 페이지 0건) | **확인함** — e2e globalSetup에서 실제 실행 |
> | 브라우저 콘솔에 CSP 위반 없음 | **못 함** — 404는 **로그인해야만** 보인다 |
>
> **왜 못 했나(실측)**: 비로그인으로 없는 주소를 열면 미들웨어가 `/welcome`으로 303을 보낸다.
> 처음엔 공개 화면으로 재현하려 했다가 이 사실을 테스트 실패로 알았고, 스펙을 인증 대기 큐로
> 옮겼다. **교훈 본문이 "실제 브라우저로 봐야 한다"고 못박은 그 마지막 한 줄만 남았다.**
> - 검증: turbo test·lint·build **18/18 GREEN** + e2e **18 통과 / 44 스킵**(로그인 대기).

> ## 🔴 2026-07-26 `/loop-eng` — 지금 실제로 보이는 영문 DB 오류 (Phase 37)
> 감사가 계속 비어서 **각도를 메타로 바꿨다**: `lessons-learned.md`의 교훈 중 **아직 검사가
> 없는 것**을 찾다가, 교훈 하나가 **지금 살아 있는 상태와 직결**된다는 걸 알았다.
>
> - **교훈**: "미적용 마이그레이션의 컬럼을 payload에 실으면 그 테이블 쓰기가 통째로 죽는다."
>   그 교훈은 **payload 쪽을 고쳤는데**(값이 있을 때만 키를 넣는다) —
>   **사용자가 무엇을 보는가**는 그대로였다.
> - **지금 실제로 일어나는 일**: `profiles.dashboard_layout` 컬럼을 더하는 마이그레이션이 적용
>   대기라, 설정에서 **대시보드 카드 순서를 바꾸면 화면이 되돌아가면서**
>   `저장하지 못했어요: Could not find the 'dashboard_layout' column ... in the schema cache`가
>   뜬다. **알려진 대기 상태인데 사용자는 영문 DB 오류를 보고 자기 잘못을 의심한다.**
> - 이 저장소 관례 그대로 고쳤다 — "정체 모를 실패 대신 왜 안 되는지 말한다".
>   core `pendingMigrationMessage`(순수)가 판정하고, web `friendlyError`가 화면 문구로 잇는다.
> - **과하게 잡지 않았다**: 컬럼 없음 신호(PostgREST `PGRST204`·`Could not find the '…' column`·
>   Postgres `column "…" does not exist`)만 좁게 본다. **모르는 오류는 원문을 그대로 보여준다** —
>   과하게 감싸면 진짜 원인을 가린다. RLS 위반·중복 키·권한 오류는 안 잡힌다(테스트로 확인).
> - 세 자리에 붙였다(대시보드 배치 · 역할 변경 · 기능 토글). **화면마다 조건을 다시 쓰지 않았다** —
>   그러면 한 곳만 고쳐진다.
>
> **부수로 확인한 것(안심해도 되는 결과)**: 날짜 "하루 밀림" 부류는 **eslint 규칙으로 이미 막혀
> 있었다**(`no-restricted-syntax`가 `toISOString().slice()`를 금지). 남은 두 자리는 UTC 파싱→UTC
> 연산이라 시간대가 개입하지 않고, **주석과 eslint 예외로 근거까지 적혀 있었다.**
> `updateMyProfile`도 교훈대로 **값이 있을 때만 키를 넣는다.** → **네 번째 감사도 결함 0.**
> - 검증: core 914 + web 422 신규 14 / turbo test·lint·build **18/18 GREEN** + 공개 e2e **6/6**.
> - **[사용자]** 이 문구는 **마이그레이션을 적용하면 더 안 보인다**(PENDING 1번). 적용 전까지
>   카드 배치가 저장되지 않는 건 그대로이고, 이제 그 사실을 화면이 한국어로 말한다.

> ## 📋 2026-07-26 `/loop-eng` — 완료 이력이 Phase 24에서 멈춰 있었다 (감사 3건은 깨끗)
> **이번 사이클엔 새 기능을 만들지 않았다.** 감사 각도를 하나 더 써 봤는데 깨끗했고,
> 대신 **기록 쪽에서 진짜 빠진 것**을 찾았다.
>
> **[빈 상태·에러 상태 감사 — 결함 0]** 목록을 그리는 컴포넌트 36개를 훑어 빈 상태 신호가 없는
> 10개를 뽑았는데 **전부 오탐**이었다: 대부분 고정 목록(단축키·옵션·메뉴)이라 비워질 수 없고,
> 데이터가 들어오는 셋(`AdminUserPanel`·`DashboardLayoutPanel`·`GithubContributionWidget`)은
> **이미 처리돼 있었다**(사용자 한 명일 때 안내 문구까지). **없는 문제를 만들지 않았다.**
> — 이로써 a11y·RLS·빈상태 **세 감사 연속 결함 0**이다. 코드베이스가 실제로 건강하다는 근거다.
>
> **[진짜 빠진 것] `History.md`의 Phase 완료 이력이 24에서 멈춰 있었다.**
> CLAUDE.md 3-2가 정한 "Act: History.md와 Status.md 갱신"에서 **History 쪽이 계속 건너뛰어졌고**,
> Phase 26·27·29~36 **10건이 완료 이력에 없었다.** 코드로 세어 빠진 번호를 특정하고 전부 채웠다.
> **삭제 없이 추가만 했다** — 이제 "무엇이 끝났나"는 History 한 장이면 된다.
>
> **[또 낡은 머리말] `phase_30.md`가 아직 "전 Task 미착수"라고 적혀 있었다.** 각 Task에는 완료
> 표시를 했는데 **머리만 안 고쳤다** — 문서를 처음 여는 사람은 머리말부터 읽는다.
> 같은 날 피드백 표·격차 문서에서 겪은 것과 같은 부류로, 이번이 **세 번째**다.
>
> **[정직한 수치 정정] PENDING 7번이 "Status.md 1348줄"이라고 적고 있었다 — 지금은 2055줄이다.**
> 이번 세션에 **내가 10개를 더 쌓은 결과**라 그대로 적었다. 완료 서술을 History로 덜어내는 건
> 되돌리기 어려운 편집이라 **임의로 하지 않고** 선택지를 적어 뒀다.
> 스크린샷은 11장 1.1MB로 아직 정리할 규모가 아니다(측정해 확인).

> ## 🔴 2026-07-26 `/loop-eng` — [Phase 36](plans/phase_36.md): 내가 낸 인벤토리 위반을 스스로 찾았다
> 계획대로 "인스턴스 메모리 한계를 코드에 적기"를 하려고 세 자리를 다시 세다가 **더 중요한 걸
> 찾았다**: `@ldd/api`에 공용 상한 `allowRequest`가 **이미 있었고 테스트까지 있었다.**
> 그런데 직전 사이클에 계정 삭제 라우트에서 **내가 그걸 재구현했다.**
> - CLAUDE.md 3-5절이 **최고 심각도**로 규정한 항목이다("공통 기능은 packages에 이미 있는지 먼저
>   찾는다. 재구현은 인벤토리 위반"). 자체 `Map`을 걷어내고 공용 함수로 바꿨다.
> - `keepalive`는 이미 그걸 쓰면서 **한계까지 주석에 적어 두었다** — 계획의 T1은 그 자리에선
>   이미 되어 있었다. **계획이 예상한 일과 실제로 필요한 일이 달랐고, 그대로 적었다.**
> - 결과가 더 낫다: 키 누수를 라우트마다 막는 대신 **한 곳에서** 막았고 코드가 줄었다.
>
> **공용 구현의 키 누수도 고쳤다.** 넣기만 하고 안 지워 **한 번이라도 요청한 키가 영원히
> 남았다.** 전역 키(`keepalive`)만 쓸 때는 티가 안 났지만 **사용자별 키를 쓰는 순간** 커진다.
> - **정리하다 함정을 만났다**: 키마다 창 길이가 다른데 **지금 호출의 창으로 남의 키를 재면**
>   한 시간짜리 창을 쓰는 키가 1초짜리 호출 때문에 지워진다. **창을 키와 함께 저장**해 각 키를
>   자기 창으로만 판정하게 했고, 그 성질을 테스트로 잠갔다.
> - 테스트가 모듈 전역 Map을 공유하므로 **절대 개수를 단언하지 않았다** — 앞선 테스트가 남긴
>   키가 섞인다. "지난 키가 사라지는가 / 살아 있는 키가 남는가"라는 성질로 봤다.
>
> **부류 전수 확인(안심해도 되는 결과)**: Gemini를 부르는 라우트 7곳이 **전부 이미 공용 상한을
> 쓰고 있었다.** 자체 `Map`이 남은 곳은 GitHub 잔디 **캐시** 하나인데 그건 상한이 아니라
> 캐시라 대상이 아니다. `health`는 키 존재만 보고 호출하지 않아 상한이 필요 없다.
> - 검증: api 444(+4) / turbo test·lint·build **18/18 GREEN** + 공개 e2e **6/6**.

> ## 🔴 2026-07-26 `/loop-eng` — 직전에 낸 코드를 스스로 뜯어봤다 (결함 2건 + [Phase 36 draft](plans/phase_36.md))
> 새 기능 대신 **직전 사이클에 급히 낸 가장 위험한 코드**(계정 삭제 — 되돌릴 수 없고 RLS를
> 우회하는 키를 쓴다)를 적대적으로 다시 읽었다. **결함 2건이 나왔다.**
> - **[결함] 호출 기록이 실패 경로에서 영원히 남았다.** 성공하면 지우는데 실패하면 안 지워서,
>   서로 다른 사용자가 실패할수록 맵이 계속 커졌다. 쓸 때마다 지난 항목을 걷어내게 고쳤다.
> - **[결함] `as string` 캐스트.** `accountDeletionEnabled`가 boolean만 돌려줘 호출부가 캐스트를
>   써야 했다 — **그 캐스트는 나중에 검사를 옮기거나 지웠을 때 undefined가 조용히 통과하는
>   자리**가 된다. 타입 가드(`key is string`)로 바꿔 캐스트를 없앴다. 가드를 되돌리면 타입체크가
>   먼저 운다(테스트가 컴파일로 검증한다).
> - **같은 부류를 하나 더 찾았다**: GitHub 잔디 캐시도 넣기만 하고 안 지워 **한 번이라도 조회된
>   로그인이 영원히 남았다.** 같은 결함이라 함께 고쳤다.
>
> **CSRF는 측정하고 안 고쳤다(근거를 코드에 남김).** "남의 사이트가 이 라우트로 POST하면 계정이
> 지워지나"를 확인했다 — `@supabase/ssr@0.12.3`이 인증 쿠키를 **`sameSite: "lax"`**로 굽는다(dist
> 실측). Lax는 **크로스사이트 POST에 쿠키를 싣지 않으므로** 그런 요청은 401로 떨어지고, `proxy.ts`
> 공개 경로에도 없어 그 앞에서 막힌다. Origin 검사를 따로 안 넣은 이유도 적었다 — 이미 막혀
> 있고, **검사를 잘못 짜면 정상 요청을 막는 쪽의 위험이 더 크다**(되돌릴 수 없어 실패가 비싸다).
> 다음 사람이 같은 조사를 반복하지 않도록 라우트 주석에 근거를 박았다.
>
> **[Phase 36 draft — 선행 버퍼]** 고치면서 드러난 더 큰 사실을 계획으로 남겼다:
> **이 앱의 호출 상한·캐시가 전부 서버 인스턴스 메모리에 산다**(계정 삭제 차단 · 잔디 캐시 ·
> keepalive 상한 3곳). Vercel은 인스턴스를 여럿 띄우므로 **상한은 그만큼 느슨하다.**
> `PENDING.md` 6번이 이미 같은 말을 하는데 **어디에 몇 개나 있는지는 아무도 세지 않았다.**
> 급하지 않아 **T1은 "고치기"가 아니라 "한계를 코드에 적기"**로 잡았다 — 외부 KV 도입은
> 무료 원칙과 충돌하고 지금 규모에서 얻을 게 없다.
> - 검증: core 904 + web 418 / turbo test·lint·build **18/18 GREEN** + 공개 e2e **6/6**.

> ## ⏭ 2026-07-26 `/loop-eng` — [Phase 35](plans/phase_35.md): 계정을 진짜로 지울 수 있게 (MUST의 나머지 절반)
> `FEATURES.md:192`가 MUST로 못박은 "계정 삭제 + 전체 데이터 파기"가 절반만 되어 있었다.
> **코드가 스스로 미완이라고 적어 둔 자리**다(`api/account.ts:9` — "2단계로 이월").
> 공개 배포된 앱인데 가입한 사람이 **자기 계정과 이메일을 지울 방법이 없었다.**
> - **꺼진 채로 배포했다.** 키를 넣기 전까지 앱 동작은 **한 글자도 바뀌지 않는다** — 설정에
>   버튼이 나타나지 않고 라우트는 503으로 사유만 알린다. **되돌릴 수 없는 기능이라 켜는 것은
>   사용자 결정으로 남겼다**([PENDING 9번](loop-eng/PENDING.md)).
> - **마이그레이션 길(SQL SECURITY DEFINER)을 안 썼다** — 4건이 이미 밀려 있어 다섯 번째를
>   쌓으면 검증 못 하는 코드만 는다. 서버 라우트 + 환경변수 1개로 갔다(Edge Function도 신설 안 함).
>
> **`service_role`은 RLS를 통째로 우회한다 — 잘못 배선하면 지금 있는 어떤 구멍보다 나쁘다.**
> 그래서 계약을 먼저 코드에 박고 검사로 잠갔다:
> - **요청 본문을 아예 읽지 않는다.** 지울 대상은 세션에서 꺼낸 본인뿐 — 본문의 id를 믿으면
>   남의 계정을 지우는 구멍이 된다(Phase 29 `restoreTodo`가 세운 계약과 같다).
> - **키 유출 검사**: `NEXT_PUBLIC_` 접두가 붙거나 `"use client"` 파일에서 읽으면 **테스트가
>   실패한다.** 읽는 곳 목록도 못박아 새 사용처가 생기면 먼저 운다.
> - **콘텐츠 먼저, 계정 마지막.** 뒤집으면 세션이 죽어 콘텐츠 삭제가 중간에 멈추고 사용자는
>   **지워졌다고 믿는 남은 데이터**를 갖게 된다. 콘텐츠 삭제가 실패하면 **계정을 지우지 않는다.**
> - 반대로 계정 삭제만 실패하면 **그 사실을 숨기지 않고 알린다** — 지금 상태를 알아야 한다.
> - **확인 문구를 다르게 했다**("계정을 영구 삭제" vs 기존 "삭제합니다"). 같으면 손이 기억한
>   대로 눌러 되돌릴 수 없는 쪽까지 지운다. 한쪽이 다른 쪽의 앞부분이 아닌지도 테스트로 본다.
> - **내가 만든 검사가 오탐을 냈고 고쳤다**: 503 안내문이 변수 **이름**을 언급하는 걸 값 유출로
>   잡았다. 이름을 알려 주는 건 운영자에게 필요한 정보라 **값을 읽는 표현**만 보도록 좁혔다.
> - 검증: core 8 + web 4 신규 / turbo test·lint·build **18/18 GREEN** + 공개 e2e **6/6**.
> - **[사용자 확인]** manual-verification 40번 — **되돌릴 수 없어 제가 실행해 볼 수 없다.**
>   키를 넣기 전이라면 "버튼이 안 보이는 것"이 정상이다.

> ## ⏭ 2026-07-26 `/loop-eng` — 이름이 같은데 하는 일이 다른 버튼 (부류 전수 + [Phase 35 draft](plans/phase_35.md))
> 지난 사이클에 e2e를 쓰다 찾은 접근성 결함을 처리했다. **증상 하나가 아니라 부류를 셌다.**
> - 화면 전체에서 **같은 파일 안의 접근성 이름 충돌**을 코드로 훑어 4건을 찾았고,
>   **그중 진짜 결함은 1건**이었다. 나머지 3건은 오탐이라 **손대지 않았다**:
>   `필터 값`×4(타입별 대체 입력 — 한 번에 하나만 렌더) · `닫기`×2(둘 다 같은 동작이라 같은
>   이름이 맞다) · `추가`×2(서로 다른 팝오버, 동시에 안 열림).
> - **진짜 결함**: `PageWorkspace`의 "새 페이지"가 둘인데 **하나는 메뉴를 열 뿐이고 하나는 즉시
>   만든다.** 스크린리더에는 구분되지 않고, 실제로 **내 e2e도 엉뚱한 쪽을 누를 뻔했다.**
>   사이드바 쪽을 `새 페이지 메뉴`로 고쳤다 — `aria-label`은 화면에 안 보이므로 **눈에 보이는
>   것은 하나도 바뀌지 않는다**(그래서 "UI 문구 변경"으로 미룰 일이 아니었다).
> - **회귀 잠금을 테스트 셀렉터 자체로 걸었다**: e2e가 `exact: true`로 잡으므로 이름이 다시
>   겹치면 "resolved to 2 elements"로 **거기서 먼저 깨진다.** 검사 코드를 새로 만들지 않았다.
> - **스캐너의 맹점도 기록**: 속성 안의 `=>`가 여는 태그를 조기 종료시켜 처음엔 버튼 대부분을
>   놓쳤다(같은 날 a11y 스캔에서 이미 한 번 데인 함정이다). 중화하고 다시 셌다.
>
> **[정정] 격차 문서도 낡아 있었다.** `notion-gap-analysis-2026-07-21.md`의 기술 부채 상환표
> **P1이 전부 이미 상환**돼 있었다 — SEC-04 오픈 리다이렉트 검증 · 동기화 실패 알림 ·
> zod 검증 · 커버리지 설정 · LddError · keepalive. **CLAUDE.md 8절이 이 문서를 개발 지시서로
> 가리키고 있어** 낡은 채 두면 끝낸 일을 다시 하거나 없는 문제를 쫓게 된다. 코드로 하나씩
> 대조해 근거와 함께 적었다(전 사이클 피드백 표와 같은 부류 — **낡은 기록이 비싸다**).
>
> **[Phase 35 draft — 선행 버퍼]** 남은 유일한 MUST인 **계정 삭제**를 설계해 큐에 넣었다.
> - 지금은 **콘텐츠만** 지워지고 계정·이메일은 남는다(`account.ts:9`가 스스로 "2단계로 이월"이라 적어 둠).
> - **마이그레이션 길(SQL SECURITY DEFINER)은 안 쓴다** — 4건이 이미 밀려 있어 다섯 번째를
>   쌓으면 검증 못 하는 코드만 는다. 서버 라우트 + 환경변수 1개로 간다.
> - `service_role`은 **RLS를 통째로 우회**하므로 계약을 먼저 못박았다: 클라이언트 번들 유입 금지 ·
>   **요청 본문의 user id를 믿지 않고 세션만 사용** · **키가 없으면 버튼 자체를 안 보여준다**
>   (미설정이 곧 안전한 기본값) · 콘텐츠 먼저 계정 나중(순서가 뒤집히면 세션이 죽어 절반만 지워진다).
> - 검증: turbo test·lint·build **18/18 GREEN** + 공개 화면 e2e **6/6**(두 사이클 연속 실행).

> ## ✅ 2026-07-26 `/loop-eng` — 세 사이클 미룬 화면 검증을 실제로 돌렸다 (회귀 0)
> Phase 30~34를 배포하며 매번 "화면 검증을 못 했다"고 적었다. 이번엔 **볼 수 있는 만큼은
> 실행으로 확인**했다 — 못 하는 것과 안 하는 것은 다르다.
> - `next build && playwright test public-visual.spec.ts` → **6/6 통과**. 콘솔 오류 0건,
>   공개 페이지가 참조하는 정적 자원 전부 인증 없이 수신. 스크린샷 4장 갱신.
> - **왜 의미가 있나**: 이 세션에서 core 인덱스·`PageEditor`·`globals.css`처럼 **여러 화면이
>   공유하는 파일을 다섯 번** 고쳤다. 로그인 뒤 화면은 못 보지만 공개 화면 회귀는 실제로 잡힌다.
>
> **[정정] 이전 기록이 틀렸다.** Status 406줄에 "`.env.local`이 없어 dev 서버가 뜨지 않는다"고
> 적혀 있는데 **지금은 있고 서버가 뜬다.** 그 기록을 믿고 이후 사이클들이 e2e를 시도조차 하지
> 않았다 — 과거 기록은 그대로 두되(이력이다) 여기서 바로잡는다. **낡은 "못 한다"가 가장 비싸다.**
>
> **발표 모드 e2e 4건을 인증 대기 큐에 추가했다**(`presentation.spec.ts`).
> - 검사 대상은 **배선**이다: 버튼 → 오버레이 → 키보드 → 닫힘. 장 나누기 규칙은 core 18건이
>   이미 순수하게 잠갔다. BlockNote에 타이핑해 제목을 만드는 건 에디터 입력 방식에 의존해
>   잘 깨지고, 그러면 **테스트가 기능이 아니라 에디터를 검사**하게 된다.
> - `playwright test --list`로 4건 수집 확인. **실행은 못 했다** — 세션 파일이 없으면 스킵된다
>   (PENDING 2번). 만드시면 이 4건도 함께 돈다.
>
> **e2e를 쓰다 접근성 결함을 찾았다(REFINE)**: **"새 페이지"라는 이름의 버튼이 둘**인데 동작이
> 다르다 — 사이드바 아이콘은 **메뉴를 열 뿐**이고, 빈 화면 버튼은 **즉시 만든다.** 스크린리더에는
> 둘 다 "새 페이지 버튼"으로 읽혀 구분되지 않는다. **UI 문구 변경이라 임의로 고치지 않았다** —
> 사이드바 쪽을 "새 페이지 메뉴"로 바꾸면 해결된다. 원하시면 적용합니다.
> - 검증: 위 e2e 6/6 + turbo test·lint·build **18/18 GREEN**.

> ## ✅ 2026-07-26 `/loop-eng` — [Phase 34](plans/phase_34.md): 페이지가 발표가 된다 (피드백 2-6 "파워포인트")
> **사용자가 말로 요구한 30여 항목이 이로써 전부 처리됐다**(확인 불가 2건 제외).
> 답을 못 받아 draft에 적어 둔 (가) 발표 모드 가정으로 진행했다 — Phase 33(엑셀)과 같은 방식이다.
> - **새 에디터를 만들지 않았다.** 고정 캔버스(텍스트 상자를 드래그로 놓기)는 BlockNote 위에
>   얹을 수 없어 사실상 새 에디터다. `pptxgenjs`·`reveal.js`도 안 들였다 — 둘 다 우리 블록 모델과
>   **별도의 문서 모델**을 요구한다. **신규 의존성 0개 · 마이그레이션 0개.**
> - **본문의 큰 제목(h1)이 장 경계다.** 사용자가 이미 쓰는 문법이라 새로 배울 게 없고,
>   문서와 슬라이드가 **한 원본**이라 어긋나지 않는다(별도 저장 모델을 만드는 순간 이 근거가 사라진다).
> - **2·3단계 제목으로는 나누지 않는다** — 나누면 회의록 템플릿(h2가 5개)이 5장으로 흩어진다.
> - **제목 앞 서문은 버리지 않고 표지로 만든다.** 버리면 사용자가 쓴 글이 발표에서 사라진다.
> - **렌더러를 새로 만들지 않았다** — 같은 `BlockEditor`를 `editable=false`로 쓴다(공개 페이지가
>   이미 쓰는 방식). 별도 렌더러를 두면 발표에서만 다르게 보이는 블록이 생긴다.
> - `content`는 jsonb라 무엇이든 들어올 수 있다 — **발표 버튼 때문에 페이지가 죽으면 안 되므로**
>   배열이 아니거나 블록 아닌 값이 섞여도 건너뛰고 계속한다. 장 수 상한 200(브라우저 보호).
> - **린트가 진짜 버그를 잡았다**: 렌더 중 `latest.current`를 읽고 있었다("Cannot access refs
>   during render"). 누른 시점의 스냅샷을 상태로 잡도록 고쳤다 — 발표 중 뒤에서 글이 바뀌어도
>   화면이 흔들리지 않는다.
> - **접근성**: 키보드만으로 전부 조작(←/→/스페이스/Home/End/Esc) · 장 전환을 `aria-live`로 알림 ·
>   **포커스를 발표 화면 안으로 옮긴다**(리뷰에서 찾은 빈틈 — 안 옮기면 Tab이 가려진 페이지를 돈다).
> - 브라우저 UI로 전체화면을 빠져나가면 발표도 함께 닫는다 — 안 그러면 오버레이만 남아 페이지를 가린다.
> - **T3(인쇄 한 장씩)은 만들지 않았다(근거)**: 발표 화면은 한 번에 한 장만 렌더해 그대로
>   인쇄하면 한 장만 나온다. 모든 장을 동시에 렌더하면 장마다 BlockNote 인스턴스가 붙어 멎는다.
>   "일반 인쇄에서 h1마다 새 장"으로 우회하면 **이미 배포된 T4-a 동작이 요청 없이 바뀐다.**
>   발표를 끝내고 "인쇄 · PDF"를 누르면 지금도 T4-a 규칙대로 나간다.
> - 검증: core 18 신규 / turbo test·lint·build **18/18 GREEN**.
> - **[사용자 확인]** manual-verification 39번 — 전체화면 API는 **실제 제스처가 있어야** 동작해
>   코드로 재현할 수 없다. **"파워포인트"가 자유 배치 편집기였다면 방향이 다르다.**

> ## 📋 2026-07-26 `/loop-eng` — 요구 기록표가 실제보다 낮게 적혀 있었다 + [Phase 34 draft](plans/phase_34.md)
> 개발 대신 **기록을 사실과 맞췄다.** `feedback-2026-07-26.md`의 상태 표에서 **1-3·1-4·1-6·2-2·6-1이
> 배포된 뒤에도 ⬜/🟡로 남아 있었다.**
> - **왜 고쳤나**: 이 표는 "내가 뭘 요구했고 그게 됐나"의 기록이다. 낡으면 **요구가 다시 밀리거나
>   이미 한 일을 또 한다.** 이 저장소가 Phase 20에서 겪은 부류("MUST로 확정해 두고 안 한 것")의
>   거울상이다 — 이번엔 **해 놓고 안 적힌 것**이었다.
> - 각 행에 무엇을 어떻게 했는지(그리고 **일부러 안 한 것**)를 한 줄씩 남겼다. 상태 글자만 바꾸면
>   다음에 또 낡는다.
> - **2-6은 🟡이 맞다**: 워드 ✅(T4-a) · 엑셀 ✅(Phase 33) · **파워포인트 ⬜**.
>
> **이로써 사용자 요구 30여 항목 중 남은 것은 파워포인트 하나뿐이다**(확인 불가 2건 제외 —
> 사운드 품질은 들을 수 없고, 6번 실동작은 마이그레이션 미적용).
>
> **[Phase 34 draft 작성 — 선행 버퍼]** 파워포인트를 미리 설계해 큐에 넣었다(미착수).
> - **의존성을 들이지 않는다**(`pptxgenjs`·`reveal.js` 둘 다 우리 블록 모델과 별도 문서 모델을 요구).
> - **고정 캔버스 편집기를 만들지 않는다** — BlockNote 위에 얹을 수 없어 사실상 새 에디터다.
> - 대신 **본문의 h1을 슬라이드 경계로 삼는 발표 모드**. 사용자가 이미 쓰는 문법이라 새로 배울 게
>   없고, 문서와 슬라이드가 **한 원본**이라 어긋나지 않는다. 인쇄하면 한 장이 종이 한 장이 된다.
> - **착수 전 해석을 묻는다** — 엑셀에서 겪은 것과 같은 갈림길이다([PENDING 8번](loop-eng/PENDING.md)).

> ## ⏭ 2026-07-26 `/loop-eng` — [Phase 33](plans/phase_33.md): 표에 합계가 보인다 (피드백 2-6 "엑셀")
> 사용자가 말로 요구한 "페이지 안에 엑셀 기능" 중 마지막 조각. **답을 못 받아 Phase 30이 문서로
> 확정해 둔 가정 그대로 진행했다** — 여기서 멈추면 요구 항목이 영영 안 나간다.
> - **계획의 `formula` 속성 타입에서 한 칸 물러났다.** 계획의 괄호 안 정의가 `=SUM(가격)` 수준의
>   **열 집계**였다 — 그렇다면 문자열 수식을 파싱할 이유가 없다. 파서를 들이면 순환 참조 검사·
>   오류 표기·새 주입 표면이 따라온다(미니 프로그래밍 언어다). **열마다 집계 종류만 고른다.**
> - 집계 9종: 개수·채워짐·비어 있음·합계·평균·최소·최대·체크됨.
> - **타입에 안 맞는 집계는 애초에 못 고르게 했다.** 고를 수 있게 두면 사용자는 텍스트 열에 합계를
>   걸고 "왜 0이지"를 겪는다. 화면에서 답을 주는 대신 선택지에서 뺐다.
> - **모르는 건 모른다고 낸다**: 숫자가 하나도 없으면 **합계는 0, 평균은 빈칸**이다.
>   0을 평균으로 내면 "평균이 0"이라는 틀린 말이 된다.
> - **숫자가 아닌 값을 0으로 강등하지 않는다** — 그러면 평균이 조용히 틀어진다. 다만 붙여넣기로
>   들어온 `"1200"` 같은 숫자 문자열은 숫자로 본다(실제로 그렇게 들어온다).
> - **보이는 행만 계산한다.** 필터를 걸어 놓고 전체 합을 보여주면 화면과 숫자가 어긋나 사용자가
>   어느 쪽을 믿을지 알 수 없다.
> - **마이그레이션 없다.** `db_schema`(jsonb)에 선택 필드로 붙였고, 기존 표는 키가 없어 `{}`로
>   열린다 — `sort`·`filters`·`hiddenPropIds`가 쓴 전례 그대로. 하위호환 테스트로 잠갔다.
> - `Math.min(...nums)`을 쓰지 않았다 — 표가 수천 행이면 **인자 개수 상한에 걸려 터진다.**
> - **타입체크가 또 잡았다**: 뷰에 필드를 늘리자 기본 스키마·템플릿·테스트 픽스처 4곳이 빌드에서
>   걸렸다. Phase 31·32에 이어 세 번째로 같은 방식이 빠뜨린 자리를 드러냈다.
> - **T3은 측정하고 안 고쳤다**: 인쇄 규칙 `table { break-inside: avoid }`가 이미 표 전체를
>   통째로 넘기므로 계산 줄도 함께 간다. 없는 문제를 만들지 않았다.
> - 검증: core 32 신규 / turbo test·lint·build **18/18 GREEN**.
> - **[사용자 확인]** manual-verification 38번. **특히 "엑셀"이 셀 주소(A1) 스프레드시트를
>   뜻했다면 방향이 다르다** — PENDING 8번에 확인 요청을 적어 뒀다.

> ## 🔴 2026-07-26 `/loop-eng` — [Phase 32](plans/phase_32.md): MUST로 정해 놓고 절반만 한 인젝션 방어
> 계획이 소진돼 **FEATURES.md의 MUST 21건을 전수 대조**했더니 하나가 절반만 되어 있었다.
> "뉴스 기사·이메일 등 외부 텍스트를 Gemini에 넣을 때 명령으로 해석 금지"(`FEATURES.md:218`).
> - **RAG 경로는 방어가 있는데 뉴스 요약 경로에는 없었다.** 피드 URL은 사용자가 자유로 등록하고
>   기사는 **남의 사이트가 쓴다**. 그 텍스트가 아무 표기 없이 프롬프트에 그대로 붙고 있었다 —
>   조작된 기사 하나로 **요약 자리에 우리가 쓰지 않은 문구**(피싱 링크·거짓 안내)를 띄울 수 있다.
> - **과장하지 않는다**: 이 경로엔 도구 호출이 없어 데이터가 바뀌거나 새지는 않는다.
>   피해는 화면에 우리 이름으로 나가는 문장이 조작되는 것에 한정된다. 그래도 MUST다.
> - **증상이 아니라 부류를 봤다.** 생성 호출부 3곳을 세고, 프롬프트 빌더 4개를 전부 훑었다 —
>   이 저장소가 2026-07-26에만 세 번 겪은 게 "한 자리 고치고 부류를 안 본" 실수다.
> - **판단이 뒤집힌 곳(기록)**: 스탠드업은 "개수뿐일 것"이라 적고 시작했는데 **세어 보니
>   `calendarEvents`가 일정 제목(자유 텍스트)**이었다. 구글 캘린더 연동이 있어 **남이 만든 초대
>   제목**이 들어온다. 작문 보조도 마찬가지 — 본문이 **가져온 템플릿**(Phase 30 T3)에서 왔을 수 있다.
> - **지시문을 두 벌로 두지 않았다.** core `untrustedTextRule` 하나를 4곳이 함께 쓴다.
>   두 벌이면 한쪽만 고쳐지고, 그게 애초에 이 결함이 난 이유다.
> - **지시를 외부 텍스트보다 앞에 둔다** — 뒤에 붙이면 앞의 조작 문구가 이미 맥락을 잡은 뒤다.
>   조작 문구가 든 기사·일정으로 실제 테스트한다.
> - **하지 않은 것(근거)**: 기사 본문을 정규식으로 세탁하는 것. 인젝션은 문자열 필터로 못 막고
>   멀쩡한 기사만 망가진다. 응답을 다시 모델로 검사하는 것도 안 한다 — 무료 쿼터가 배로 나간다.
> - **회귀 잠금**: 프롬프트 조립을 api에서 core로 옮겼다(전에는 api에서 문자열을 이어 붙여
>   **테스트가 닿지 않았고**, 그래서 방어가 빠진 걸 아무도 못 봤다). 진입점 개수도 못박아
>   **새 진입점이 생기면 테스트가 먼저 운다**.
> - 곁다리: RAG 지시문에 `any 지시문은`이라고 **영어가 섞여** 있던 것도 함께 고쳤다.
> - 검증: core 845(+11 신규 파일 2) / turbo test·lint·build **18/18 GREEN**.
> - 마이그레이션·배포·사용자 조치 **불필요** — 전부 코드로 끝났다.

> ## ✅ 2026-07-26 `/loop-eng` — [Phase 31](plans/phase_31.md) 완료: 브라우저에만 있던 값도 담긴다 (T3, 형식 v4)
> 계획이 "**백업에 특수 경로를 만들기 전에 DB로 옮길지부터 정하라**"고 못박아 둔 지점이다.
> 정해 놓고 시작했다.
> - **DB로 옮기지 않는다.** ① 마이그레이션 4건이 권한 게이트에 막혀 미적용인데 **다섯 번째를
>   쌓으면 검증 못 하는 코드만 는다** ② 드래그 정렬·카드 접기는 **즉시 반응이 요구되는 화면
>   상태**라 DB로 옮기면 조작마다 네트워크 왕복이 붙는다 ③ 테마·사이드바 접힘은 **기기별로
>   다른 게 자연스럽다**.
> - **계획의 가정 하나가 틀렸다.** "클라이언트가 읽어 넣어야 해서 계층이 하나 는다"고 적혀
>   있었는데, 내보내기·가져오기는 **이미 전부 브라우저에서 돈다**(`ExportDataButton`은
>   `"use client"`). 새 계층 0개 · 새 테이블 0개 · 마이그레이션 0개로 끝났다.
> - **8개를 담았다**: 할 일 순서 · 습관 순서 · 고정 메모 · 기사 북마크 · 즐겨찾기 · 접어 둔 카드 ·
>   집중 태그 · 방해금지 시간.
> - **뺀 것의 근거를 테스트로 남겼다** — 다음 사람이 "빠뜨렸다"고 오해해 넣지 않도록.
>   특히 **오리 발화 카운터·알림 상한·주간 다이제스트 주차는 복원하면 오히려 해롭다**:
>   하루/주 단위 카운터를 백업 시점으로 되돌리면 상한 계산이 틀어진다.
> - **보안**: 백업 파일은 외부에서 온다 → **허용 목록으로 낯선 키를 버린다.** 없으면 남이 만든
>   파일이 브라우저의 아무 키나 덮어쓸 수 있다. 다만 낯선 키 하나로 **파일 전체를 거부하지는
>   않는다** — 그러면 멀쩡한 할 일·페이지까지 복원하지 못한다.
> - **타입체크가 또 잡았다**: `Backup`에 필드를 늘리자 픽스처 두 곳이 빌드에서 걸렸다
>   (vitest는 타입을 안 본다). T1에서 겪은 것과 같은 자리다.
> - **한계(정직하게)**: 이건 기기 간 동기화가 아니다. **백업을 미리 받아 둬야** 옮길 수 있다.
>   실시간 동기화는 DB가 필요하고 그 길은 지금 막혀 있다.
> - 부수: 설정 카드 설명이 **v2·v3 추가분부터 이미 낡아 있었다**(피드·오리 상태·집중·활동 누락).
>   "담겼다고 믿게 만드는" 바로 그 부류라 함께 고쳤다.
> - 검증: core 31 + web 9 신규 / turbo test·lint·build **18/18 GREEN**.
> - **[사용자 확인]** manual-verification 37번 — **쓰던 브라우저가 아니라 새 브라우저**로 해야
>   티가 난다(이미 값이 있으면 덮어쓰지 않는 게 계약이다).

> ## ⏭ 2026-07-26 `/loop-eng` — [Phase 31](plans/phase_31.md) T2: 무엇을 더 담고 무엇을 안 담을지 (형식 v3)
> **전부 담는 게 답이 아니다.** 네 후보를 하나씩 판단하고 근거를 남겼다 — 근거 없는 누락이
> Phase 29의 원인이었다.
> - **담는다 — 집중 기록**: 통계 이력이라 잃으면 다시 만들 방법이 없다. 행이 작다.
> - **담는다 — 활동 집계**: github은 재수집되지만 **claude_code는 로컬 수집기가 올린 유일본**이다.
>   하루×소스라 1년에 730행 남짓.
> - **안 담는다 — 프로필(보류)**: 대기 중 마이그레이션(역할·기능 토글·대시보드 배치)이 적용돼야
>   컬럼이 확정된다. **지금 담으면 곧 형식이 갈린다.** 표시 이름은 로그인 시 트리거가 다시 만든다.
> - **안 담는다 — 페이지 버전**: 문서 하나에 버전이 수십 개라 **파일이 몇 배로 커진다.** 최신본은
>   이미 담기고, 버전 이력은 "되돌리기 편의"이지 데이터 원본이 아니다.
> - **복원은 둘 다 "이미 있으면 건드리지 않는다".** 활동 집계를 덮어쓰면 지금 수치가 백업 시점으로
>   후퇴한다(오리 상태와 같은 판단).
> - **집중 기록 복원은 XP를 주지 않는다** — 과거 기록을 되돌리는 것이지 지금 집중한 게 아니다.
>   그래서 `completePomodoro`를 거치지 않고 직접 넣는다.
> - v1·v2 백업 파일은 계속 열린다(선택 키). 타입을 늘리자 **모든 픽스처가 컴파일에서 걸려**
>   빠뜨린 자리를 전부 드러냈다.
> - 검증: core 50 / turbo test·lint·build **18/18 GREEN**.
> - **남은 것**: T3 — 브라우저에만 있는 데이터(할 일 순서·북마크·즐겨찾기). 백업에 특수 경로를
>   만들기 전에 **DB로 옮길지부터 정하는 게 순서**다(옮기면 기기 간 동기화도 함께 풀린다).

> ## ⏭ 2026-07-26 `/loop-eng` — [Phase 30](plans/phase_30.md) T4-a: 인쇄·PDF 지면 (피드백 2-6 워드)
> "페이지 안에 워드 기능도" 중 블록 에디터가 아직 못 하던 것은 **종이로 나갈 때의 규칙**이었다.
> BlockNote가 제목·목록·표·코드블록은 이미 한다.
> - **PDF 라이브러리를 들이지 않았다.** 브라우저 인쇄 대화상자가 "PDF로 저장"을 이미 포함한다 —
>   새 의존성 0개. (`docx`·`pptxgenjs`류는 여전히 미설치.)
> - **찾은 결함**: 다크 모드로 인쇄하면 **흰 종이에 밝은 회색 글씨**가 찍힌다(브라우저는 배경을
>   기본적으로 인쇄하지 않는다). 팔레트를 통째로 복사하지 않고 **읽는 데 필요한 변수만** 밝은
>   값으로 되돌렸다.
> - 지면 규칙: `@page` 여백 고정(브라우저 기본값은 지면마다 달라 예측이 안 된다) · 제목이 지면 끝에
>   혼자 남지 않게 · 표·코드블록·인용은 중간에서 안 잘리게 · 외톨이 줄 방지 · 코드블록은 배경 대신
>   테두리(**배경을 강제로 찍으면 잉크만 쓰고 종이에서 더 안 읽힌다**) · 편집기 좌우 패딩 제거
>   (용지 여백과 겹쳐 본문이 좁아진다).
> - **버튼을 붙였다.** 규칙만 있고 누를 곳이 없으면 없는 기능이다. 인쇄 전에 **대기 중인 저장을
>   먼저 밀어낸다** — 방금 친 글이 빠진 채 종이로 나가면 안 된다. 저장이 실패해도 인쇄는 막지
>   않는다(화면에 보이는 건 그대로 찍힌다). 버튼 줄에는 `no-print`.
> - 검증: turbo test·lint·build **18/18 GREEN**. 인쇄 레이아웃은 테스트로 잡히지 않는 영역이라
>   manual-verification 36번으로 넘긴다(**다크 모드에서도 봐 달라**고 적었다).
>
> **T4 범위는 답을 못 받아 가정을 명시하고 진행했다**: 워드부터 → 엑셀은 "수식 있는 표"로 가정 →
> PPT는 별도 Phase. T4-a는 어느 해석에서도 필요한 부분이라 되돌릴 위험이 없어 먼저 했다.
> **엑셀 착수 전에 한 번 더 묻는다** — 해석이 갈리면 통째로 버리는 작업이 된다.

> ## ⏭ 2026-07-26 `/loop-eng` — [Phase 30](plans/phase_30.md) T3: 템플릿을 파일로 주고받는다 (피드백 2-2)
> "마켓플레이스에서 가져올수있는 기능" — **범위를 좁혀 저장소를 새로 만들지 않았다.**
> 진짜 스토어(등록·검색·평점)는 이 제품 규모에 과하고 서버가 필요하다.
> - 페이지에서 **"템플릿으로 저장"** → `.template.json` 다운로드. 새 페이지 메뉴에서
>   **"파일에서 템플릿 가져오기"** → 검사 통과분으로 새 페이지 생성.
> - **템플릿 목록을 쌓아 두지 않는다.** 사용자의 목적은 템플릿을 **쓰는** 것이지 라이브러리를
>   운영하는 게 아니다. 덕분에 마이그레이션도, 새 저장소도, 기기 간 동기화 문제도 안 생긴다.
>
> **보안은 "외부 파일이 그대로 렌더된다"를 전제로 짰다**
> - **블록 타입 허용 목록**(텍스트 계열 8종). 모르는 타입이 통과하면 그게 실행 표면이 된다.
> - **이미지·비디오·파일 블록은 일부러 막았다** — 원격 주소를 품고 있으면 페이지를 여는 순간
>   브라우저가 그 주소를 부른다(추적 픽셀).
> - **중첩 자식까지 검사한다.** 겉만 보고 통과시키면 안쪽에 무엇이든 넣을 수 있다. 깊이 상한을 둬
>   자기 자신을 품은 구조에서 멈추지 않게 했다.
> - 블록 5000개 상한 · `dbSchema` zod 검사 · **원격 URL 직접 수신 금지(SSRF)** · CP949 파일 처리
>   (`decodeTextBytes` 재사용 — 이 저장소가 겪은 한글 깨짐 부류).
> - 검증: core 16 신규 / turbo test·lint·build **18/18 GREEN**.
> - **[사용자 확인]** manual-verification 35번 — 이미지가 든 페이지는 **가져올 때 거부되는 게
>   정상**이다. 그 제한이 실사용에 불편하면 허용 목록을 넓힐지 판단이 필요하다.

> ## ⏭ 2026-07-26 `/loop-eng` — 예약이 실제로 알려준다 (Phase 30 T2 완료, 피드백 1-4)
> **새 도구를 만들지 않았다.** "내일 아침 9시에 약 먹으라고 알려줘"는 이미 있는 `addCalendarEvent`로
> 만들어진다. 빠져 있던 건 만드는 쪽이 아니라 **때가 됐을 때 알려주는 쪽**이었다.
> - **판단을 1분마다 다시 한다.** 그 전에는 화면을 연 순간에만 판단해서, **오후 1시에 열어 둔 채
>   3시 일정을 맞아도 아무 말이 없었다** — 예약이 실제로는 알려주지 않는 셈이었다.
> - **조회는 늘리지 않았다.** 상태는 한 번만 읽어 스냅샷으로 두고, 시간에 따라 변하는 값
>   (남은 분·현재 시)만 로컬에서 다시 계산한다 — **재판단 1회당 네트워크 0회.** 새 일정이 생기면
>   지난 사이클에 만든 승인 실행 신호가 다시 읽게 한다(두 기능이 맞물렸다).
> - **일정만 브라우저 알림도 함께 띄운다.** 일정은 시간이 지나면 되돌릴 수 없어 탭이 뒤에 있어도
>   보여야 한다. 권한·방해금지·하루 상한은 `notifyDuck`이 이미 판정한다 — 새로 만들지 않았다.
> - **일부러 버린 성질(근거)**: "방해금지면 조회조차 하지 않는다". 방해금지가 끝나는 순간(예: 07:00)에
>   쓸 스냅샷이 없으면 그때부터도 말을 못 한다. 조회는 화면당 한 번뿐이라 값이 싸다 — 바꾼 이유를
>   테스트 주석에도 남겼다.
> - **넘을 수 없는 한계(정직하게)**: 앱을 아예 닫아 두면 알림이 오지 않는다. 서버 스케줄러가 없다는
>   무료 원칙의 결과이고 **코드로 못 넘는 선**이다 — manual-verification 34번에 명시했다.
> - 검증: web 신규 5 / turbo test·lint·build **18/18 GREEN**.
> - **이로써 Phase 30 T2 완료** — 수정·삭제 · 뽀모도로 · 예약.

> ## ⏭ 2026-07-26 `/loop-eng` — 오리가 집중 타이머를 켜고 끈다 (Phase 30 T2, 피드백 1-4)
> 지난 사이클에 "실시간 반영 경로가 없어 반쪽이 된다"고 보류했던 것을 **마이그레이션 없이** 붙였다.
> - **막힌 길**: `pomodoro_sessions`는 realtime publication에 없고, 추가하려면 마이그레이션인데
>   그건 사용자 실행 대기 중이다(PENDING 1번).
> - **다른 길**: 오리 대화와 위젯은 **같은 브라우저 탭**에서 돈다 — 서버를 한 바퀴 돌 이유가 없다.
>   승인 실행 직후 커스텀 이벤트로 위젯에 알린다(`xpSignal`이 이미 쓰는 방식).
>   `useDuckChat`에는 `onExecuted` 옵션 하나만 더했다 — **훅이 앱 화면 사정을 알면 계층이 뒤집힌다**.
>   무엇을 갱신할지는 화면이 판단하고, 훅은 결과만 넘긴다.
> - **타이머 자체는 화면이 돌린다.** 도구는 세션 행만 만들고 끝낸다 — 서버 도구가 브라우저 타이머를
>   만들 수는 없다. 계획에 적어 둔 설계 그대로다.
> - **이미 돌고 있으면 새로 시작하지 않는다.** 두 세션이 동시에 열리면 어느 쪽이 끝날지 알 수 없다.
>   **돌고 있지 않은데 중지하면** 그렇게 말한다 — 아무것도 안 끝냈는데 "끝냈다"고 하면 된 줄 안다.
> - 1~180분을 **저장 전에** 막는다. DB CHECK에 걸리면 사용자는 이유 없는 실패를 본다.
>   모델이 분을 문자열로 줄 때가 있어 숫자로 강제 변환한다.
> - 입구도 같은 커밋에서 넓혔다: `뽀모도로|타이머|집중` · `중지|그만`.
> - 검증: api 6 + core 1 신규 / turbo test·lint·build **18/18 GREEN**.
> - **[사용자 확인]** manual-verification 33번 — 대시보드를 **열어 둔 채** 시켰을 때
>   새로고침 없이 위젯이 반응하는지가 이 구현의 핵심이다.

> ## 🔴 2026-07-26 `/loop-eng` — 새로고침만 해도 뽀모도로가 사라지던 것 (오리 도구 착수 중 발견)
> [Phase 30](plans/phase_30.md) T2의 뽀모도로 도구를 붙이려고 위젯을 읽다가 **오리와 무관한
> 기존 버그**를 찾았다. 위젯은 마운트 시 오늘 집계만 읽고 `running`을 false로 시작한다 —
> **새로고침 한 번이면 타이머가 사라지고 `completed_at`이 null인 행만 남는다.** 사용자는 집중한
> 시간도 XP도 잃는다. 탭을 잘못 닫아도 같다.
> - core `findResumablePomodoro`(순수, 9 tests) + 위젯 이어받기. 새 조회를 만들지 않았다 —
>   위젯이 이미 받아 오는 목록에 미완료 세션이 들어 있었다.
> - **이미 시간이 지난 세션은 되살리지 않는다.** 자리를 비운 사이 끝났을 세션을 자동 완료하면
>   **하지 않은 집중에 XP가 붙는다.** 남은 시간이 있는 것만 이어받고 지난 건 그대로 둔다.
> - 시계가 뒤로 간 기기에서 남은 시간이 원래 길이를 넘지 않도록 상한을 걸었고, 남은 초는 올림한다
>   (1초 미만이 0으로 사라지면 이어받자마자 완료로 떨어진다).
>
> **오리 뽀모도로 도구는 이번에 내지 않았다(근거)**: `pomodoro_sessions`가 realtime publication에
> **없어서**, 지금 도구만 내면 **대시보드를 열어 둔 채 말했을 때 아무 일도 안 일어나는 것처럼
> 보인다.** publication 추가는 마이그레이션이고 그건 T7으로 막혀 있다 — 대신 승인 실행 직후
> **같은 탭에서 커스텀 이벤트**로 위젯에 알리는 길(이미 `xpSignal`이 쓰는 방식)로 다음에 붙인다.
> 반쪽으로 내는 게 이 저장소가 반복해서 고쳐 온 부류라 그렇게 하지 않았다.
> - 검증: core 9 신규 / turbo test·lint·build **18/18 GREEN**.
> - **[사용자 확인]** manual-verification 32번(새로고침해도 이어지는지).

> ## ⏭ 2026-07-26 `/loop-eng` — [Phase 30](plans/phase_30.md) T2(일부): 오리가 고치고 지운다 (피드백 1-4)
> 오리는 지금까지 **만들고 완료만** 할 수 있었다. 고치거나 지우지 못했다.
> `editTodo` · `deleteTodo` · `editMemo` · `deleteMemo` 4종 추가.
> - **삭제 도구를 낸 근거**: Phase 19에서 "오삭제 위험"으로 뺐던 판단은 유효하지만 **조건이
>   달라졌다** — 이 경로는 승인 카드가 **실행 전에** 무엇이 지워지는지 보여준다. Phase 21이 고친
>   "hover 아이콘 한 번에 확인도 undo도 없이 소멸"과는 다른 상황이다.
> - **습관·페이지 삭제는 만들지 않았다.** 습관은 `habit_checks`가 cascade라 되살려도 기록이 빈
>   채로 온다 — **되돌릴 수 없는 것에는 대화 삭제를 붙이지 않는다.**
> - **애매하면 아무것도 하지 않는다.** 제목이 여럿 일치하면 지우지도 고치지도 않고 되묻는다.
>   지우는 일에서 "아마 이거겠지"는 위험하다. 정확 일치 우선 규칙도 함께 잠갔다.
> - 바꿀 내용을 안 주면 **조용히 성공시키지 않는다.** 마감일 형식이 틀리면 버리지 않고 알린다.
> - **입구를 같은 커밋에서 넓혔다**(`삭제|지워|지우|바꿔|변경|수정|고쳐`). 오늘 아침에 **도구를
>   만들고 승인 카드까지 붙였는데 라우터에서 막혀 한 번도 안 불린** 사고가 있었다.
>
> **테스트가 잡은 진짜 빈틈**: `editMemo` 승인 카드에서 제목 폴백이 새 본문을 가려
> **무엇으로 바뀌는지 안 보였다.** 사용자가 모른 채 승인하게 되는 자리라, 대상과 새 값을 함께
> 보여주도록 고쳤다(길면 60자에서 자름 — 카드가 화면을 덮으면 못 읽는다).
> - 검증: api 44 + core·web 신규 / turbo test·lint·build **18/18 GREEN**.
> - **[사용자 확인]** manual-verification 31번 — 특히 **카드에 지워질 제목이 분명히 보이는지**.
> - **남은 것**: 뽀모도로 제어 · 미래 시점 예약.

> ## ⏭ 2026-07-26 `/loop-eng` — [Phase 30](plans/phase_30.md) T1: 오리가 먼저 말을 건다 (피드백 1-3)
> **LLM을 쓰지 않았다.** "기한 지난 할 일 3건" · "20분 뒤 회의" · "저녁인데 안 한 습관"은 전부
> 결정적 조건이다. 모델에 맡기면 ① 화면을 열 때마다 무료 쿼터가 나가고 ② 같은 상황에서 매번
> 다른 말이 나와 신뢰가 떨어진다. **판단은 규칙, 문장은 템플릿으로 고정**했다.
> - 우선순위: 기한 지남 → 90분 내 일정 → 오늘 마감 → 안 한 습관.
> - **습관은 18시부터만 재촉한다.** 아침 9시에 "오늘 운동 안 했다"는 틀린 말은 아니지만 무례하다.
> - **표정을 문장과 맞췄다**(사용자가 "이미지랑 통합"을 요구). 재촉이면 sad, 안내면 neutral —
>   재촉하면서 웃고 있으면 어긋난다.
> - 하루 4회 + **종류별 1회**. 같은 상황을 하루에 몇 번이고 말하면 그건 잔소리다.
> - **인프라를 새로 만들지 않았다**: 말풍선·유휴 대사·방해금지는 `Duck`에 이미 있어 `say` 프롭만
>   더했고, 조회도 `listTodosForDuck`·`listEventsForDuck`·`summarizeHabitsForDuck`을 재사용했다.
> - **방해금지면 조회조차 하지 않는다** — 어차피 말 안 할 건데 DB를 두들길 이유가 없다.
> - 조회 실패는 조용히 넘긴다. 자율 발화 때문에 오리 위젯이 사라지면 손해가 더 크다.
>
> **내가 낸 실수와 그걸 잡은 것(기록)**: 배선 코드를 부분 문자열로 끼워 넣다가 **다른 효과의
> 정리 함수 안에** 들어갔다. 린트의 rules-of-hooks가 잡아냈다("useEffect cannot be called inside
> a callback"). 줄 단위 매칭으로 고치고 **조합 지점 테스트 8건**을 추가했다 — 이 저장소가
> 반복해서 데인 자리라 같은 실수를 다시 하면 테스트가 먼저 운다.
> - 검증: core 18 + web 8 신규 / turbo test·lint·build **18/18 GREEN**.
> - **[사용자 확인]** manual-verification 30번(재현 조건·초기화 방법 포함).

> ## ⏭ 2026-07-26 `/loop-eng` — [Phase 30](plans/phase_30.md) T6: 설정에서 찾을 수 있게 (피드백 6-1)
> **기능은 만들어 두고 도달 경로가 어긋나 있었다.** 프로필 편집과 대시보드 구성이 관리자
> 화면에 있었는데, 사용자는 자기 이름을 고치려고 **설정**을 연다. Phase 26이 다뤘던 부류와 같다.
> - **경계 규칙을 코드에 박았다**: 설정 = 내 것(개인화) · 관리자 = 남의 것(권한 부여)·전체.
>   그 기준으로 둘을 설정으로 옮겼고, 관리자에는 사용자 관리·데이터 관리만 남겼다.
> - **새 카드를 만들지 않았다.** 설정에 이미 있던 **읽기 전용** 프로필 카드를 편집 가능하게
>   바꿨다 — 같은 것이 두 곳에 생기면 어느 쪽이 진짜인지 알 수 없다.
> - 이름·이메일을 서버에서 내려주던 것을 걷어냈다. **같은 값을 두 곳에서 가져오면 저장 후
>   한쪽만 낡는다.** 린트가 미사용 변수로 잡아 확인됐다.
> - **카드 14개를 5묶음으로 나눴다**(개인화·연동·데이터·계정과 상태·위험). 다단 배치는 묶음마다
>   따로 잡는다 — 하나로 묶으면 제목이 열 사이를 가로지른다.
> - 접근성: 이름 없는 `<section>`은 스크린리더에 landmark로 안 잡혀 `aria-labelledby`로 제목과
>   묶었다. 처음 넣었던 `sr-only` 설명은 **뺐다** — 보이지도 않는 문구를 일부 사용자에게만 주는
>   건 일관되지 않고, 제목이 이미 설명한다.
> - **재배치로 카드를 잃지 않았는지 코드로 대조했다**: 전후 14개 제목이 각각 정확히 1회.
>   JSX 블록을 손으로 옮기면 하나가 조용히 사라져도 빌드는 통과한다.
> - 검증: turbo test·lint·build **18/18 GREEN**.
> - **[사용자 확인]** manual-verification 29번 — 특히 카드가 열 사이에서 어색하게 끊기지 않는지.

> ## ⏭ 2026-07-26 `/loop-eng` — [Phase 30](plans/phase_30.md) T5: 좌상단 로고가 움직인다 (피드백 1-6)
> 사용자 답으로 **다른 세션이 멈추고 Phase 30·31을 이어받았다.** 계획의 착수 순서대로 작은 것부터.
> - **주신 영상을 그대로 쓰지 않았다.** 로고는 24px인데 `duck-idle.mp4`는 1280×720이다.
>   그대로 붙이면 브라우저가 **24px 하나를 그리려고 720p 프레임을 모든 앱 화면에서 상시**
>   디코딩한다. 같은 영상의 가운데를 정사각으로 잘라 96px로 줄인 파일을 만들었다
>   (311KB → **24.8KB**). **오리 그림 자체는 손대지 않았다** — 해상도만 로고 크기에 맞췄다.
>   계획이 "성능을 먼저 확인한다"고 적어 둔 지점이고, 재고 나서 파일을 나눈 결과다.
> - 폴백을 뒀다: 영상을 못 받으면 기존 SVG 로고로 떨어진다. **로고가 사라지면 상단 좌측이
>   그냥 뚫려 보인다** — poster까지 함께 실패하면 `<video>`는 아무것도 그리지 않는다.
> - **되돌아가면 실패하는 테스트**: 로고가 720p 원본을 쓰면 실패 · 반복 재생이 아니면 실패
>   ("계속 움직이는것처럼"이 요구였다) · 파일이 원본의 1/4보다 크면 실패.
> - 움직임 줄이기 설정은 `DuckVideo`가 이미 지킨다(재생 안 함 + 내려받지도 않음).
> - 검증: turbo test·lint·build **18/18 GREEN**.
> - **[사용자 확인]** 실제 렌더는 로그인 필요 — manual-verification 28번(크롭 구도가 마음에
>   안 들면 조정 가능).

> ## ⏭ 2026-07-26 `/loop-eng` — [Phase 31](plans/phase_31.md) T1: 피드와 오리 진행도도 백업에
> 감사에서 찾은 "잃으면 아까운 것" 둘을 담았다. **등록한 RSS 피드**(잃으면 하나씩 다시 등록)와
> **오리 진행도**(xp·레벨·먹이 — 잃으면 레벨 1로 후퇴, 게다가 1행뿐이라 담는 비용이 없다).
> - **형식 v2로 올렸지만 v1 파일은 계속 열린다.** 새 컬렉션을 **선택**으로 받아 없으면 빈 배열로
>   채운다. 필수로 뒀다면 **오늘 내보낸 파일을 내일 우리가 거부하게 된다** — 버전은 구분용이지
>   차단용이 아니다. 하위호환 테스트 5건으로 잠갔다.
> - **"없음"과 "깨짐"은 구분한다.** 선택 컬렉션이 아예 없으면 빈 배열, 있는데 모양이 틀리면
>   거부한다. 깨진 걸 조용히 버리면 사용자는 넣었다고 믿은 것을 잃는다.
> - **오리 상태는 insert만 한다.** upsert로 바꾸면 지금 레벨이 백업 시점으로 **후퇴**하는데,
>   그건 가져오기의 "지금 데이터를 바꾸지 않는다" 계약 위반이다. **upsert가 되는 순간 실패하는
>   테스트**를 뒀다 — 계약을 말로만 적어두면 다음 사람이 편의상 upsert로 바꾼다.
> - `feeds`의 `fail_count`는 복원하지 않는다. 실패 횟수는 지금 이 계정에서 다시 세는 값이다.
> - 타입을 늘리자 **모든 테스트 픽스처가 컴파일에서 걸렸다** — 컬렉션을 추가하면서 어딘가를
>   빠뜨리는 걸 타입체크가 막는다(vitest는 타입을 안 보므로 빌드 게이트가 잡았다).
> - 검증: core 50 + api 6 + web 신규 / turbo test·lint·build **18/18 GREEN**.
> - **남은 것**: T2(뽀모도로·활동·프로필·페이지 버전 판단), T3(브라우저 로컬 데이터).

> ## 📋 2026-07-26 `/loop-eng` — 백업 감사(측정) + [Phase 31 draft](plans/phase_31.md)
> Phase 29를 끝낸 뒤 **"정말 다 담았나"를 코드로 대조**했다. 전체 테이블 19개 중 백업이 덮는
> 건 **6개**였다. 파생 데이터를 빼면 **사용자가 잃으면 아까운 7개**가 남는다.
> - **가장 아까운 둘**: `feeds`(직접 등록한 RSS 피드 — 잃으면 하나씩 다시 등록) ·
>   `duck_state`(xp·레벨·먹이 — 잃으면 레벨 1로 후퇴, 게다가 **1행뿐**이라 담는 비용이 없다).
> - **별개 부류를 하나 더 찾았다 — 브라우저에만 있는 데이터.** 할 일 순서·기사 북마크·읽음
>   표시·즐겨찾기는 `localStorage`에 있어 **브라우저를 바꾸면 그냥 사라진다.** 백업에도 없다.
>   백업에 특수 경로를 만들기 전에 **DB로 옮길지부터 정하는 게 순서다**(옮기면 기기 간 동기화도
>   함께 해결되고 백업은 자동으로 따라온다).
> - **T1의 관건은 하위호환이다**: 지금 `parseBackup`은 여섯 키를 필수로 본다. 새 키를 같은 식으로
>   필수화하면 **Phase 29가 오늘 내보낸 파일을 우리 손으로 거부하게 된다.** 새 컬렉션은 선택으로
>   받고 버전은 2로 올리되 1도 계속 읽는다 — 버전은 구분용이지 차단용이 아니다.
>
> **측정만 하고 안 고친 것(근거 기록)**: 가져온 데이터를 오리가 아는가 → **이미 된다.**
> 오리 채팅 패널이 뜰 때마다 "빠진 것만" 자동 재색인한다(`DuckChatPanel.tsx:42`). 복원 항목도
> 그 대상에 들어가므로 가져오기에 색인 호출을 붙일 필요가 없다. 붙였다면 500건 백업에
> 임베딩 호출 500번이 나가 무료 쿼터를 통째로 태웠을 것이다. **없는 문제를 만들지 않았다.**

> ## ✅ 2026-07-26 `/loop-eng` — [Phase 29](plans/phase_29.md) 완료: 백업이 실제로 백업이 됐다
> T3 라운드트립 회귀로 마감. **내보내기 → 파일(JSON 문자열) → 가져오기 판정 → 복원 계획**을
> 실제 경로 그대로 통과시켜 한 필드도 잃지 않는지 값으로 대조한다(11건).
> - **왜 조각별 테스트로는 부족한가**: `planRestore`가 도메인 스키마로 `safeParse`하므로
>   **스키마에 없는 필드는 말없이 떨어진다.** 나중에 컬럼을 늘리면서 스키마 갱신을 잊으면
>   사용자는 백업했다고 믿은 값을 복원 때 잃는데, 조각별 테스트는 전부 통과한다.
>   그래서 컬렉션마다 **필드 목록이 내보낼 때와 복원할 때 같은지**까지 단언한다.
> - **검사가 실제로 실패하는지 확인했다.** 픽스처에 스키마에 없는 필드를 하나 넣으니
>   "todos의 필드가 라운드트립에서 바뀌었다"로 2건이 실패했고, 되돌려 복구했다.
>   Phase 22·25에서 세운 관례 — 가짜 입력 검증만으로 끝내지 않는다.
> - **픽스처를 선택 필드까지 전부 채웠다.** 기본값으로 비워 두면 "잃어도 티가 안 나는" 필드가
>   생긴다. 이모지·줄바꿈·따옴표·백슬래시·중첩 테이블 블록·한글 키 행 속성까지 넣었다.
> - 쓰기 단계가 **의도적으로** 바꾸는 것(plain_text 재파생, 공개 상태 미복원, user_id 교체)은
>   이 순수 경로 밖이다 — api 테스트가 따로 잠근다. 한 테스트에 두 의도를 섞지 않았다.
> - 검증: core 11 신규 / turbo test·lint·build **18/18 GREEN**.
> - **Phase 29 전체 결산**: 신규 테스트 55건(core 36 + api 7 + web 12). 배포 3건.
>   남은 것은 **사용자 실물 확인 2건**(manual-verification 25·26)뿐이다.

> ## ⏭ 2026-07-26 `/loop-eng` — [Phase 29](plans/phase_29.md) T2: 백업을 되돌릴 수 있게
> T1으로 백업에 본문이 담기게 됐지만 **되돌릴 방법이 없었다.** 복원 수단이 없는 백업은 백업이 아니다.
> 되돌리기 어려운 작업이라 안전 장치를 먼저 정하고 만들었다.
> - **덮어쓰지 않는다.** 전부 "같은 id로 insert, 이미 있으면 건너뜀"이라 지금 데이터를 지우거나
>   바꾸지 않는다. 두 번 넣어도 결과가 같다(멱등). 실행 전 확인 다이얼로그에 **몇 개가 들어가는지**
>   보여준다.
> - **파일의 userId를 믿지 않는다** — 로그인 사용자로 채운다. Phase 21 `restoreTodo`가 이미
>   같은 함정을 다뤘고 같은 계약을 따랐다.
> - **`plain_text`를 파일 값이 아니라 본문에서 다시 파생한다.** 리뷰에서 잡은 계약 위반이다 —
>   `createPage`/`updatePage`가 "검색·RAG 공용이라 클라이언트를 신뢰하지 않는다"고 명시해 뒀는데
>   복원만 파일 값을 그대로 믿고 있었다. 손으로 편집된 파일이면 검색 결과가 조용히 틀린다.
> - **공개 상태는 복원하지 않는다.** ① 복원했을 뿐인데 문서가 다시 인터넷에 열리면 안 된다
>   ② `public_slug`는 유일 제약이라 부딪히면 23505가 나서 **그 페이지가 통째로 건너뛰어진다**
>   (중복으로 오인). 문서를 잃느니 공개 설정을 버린다.
> - **습관 체크 복원은 XP를 주지 않는다** — 과거 기록을 되돌리는 것이지 오늘 수행이 아니다.
>   백업을 두 번 넣어 레벨이 뛰면 안 된다.
> - **한 건이 실패해도 나머지를 계속 넣는다.** 중간에 멈추면 사용자는 얼마나 들어갔는지 모르는
>   상태로 남는다. 사유는 모아 두었다가 끝나고 함께 보여준다(앞 5건만 — 없으면 원인을 모르고,
>   전부면 화면이 길어진다).
> - **순서가 계약이다**: 습관 → 습관 체크(외래키), 페이지는 부모 먼저. core가 정렬해 주고
>   순차 실행한다 — 병렬로 밀어 넣으면 부모보다 자식이 먼저 도착한다.
> - 부수: `silentCatch` 검사가 내 catch를 잡았다. 실제로 삼키진 않지만(사유를 모아 화면에 표시)
>   그 전달 수단이 등록돼 있지 않았다 — 검사 파일 주석이 지시한 대로 `errors.push`를 등록했다.
>   **검사가 의도대로 동작한 사례다.**
> - 설정 카드 설명도 고쳤다: "페이지 본문은 용량 상 제외됩니다"가 더는 사실이 아니다.
> - 검증: api 7 + web 12 신규 테스트 / turbo test·lint·build **18/18 GREEN**.
>   **e2e는 실행하지 못했다** — 로컬에 Supabase 환경변수(`.env.local`)가 없어 dev 서버가 뜨지 않는다.
>   코드 문제가 아니라 이 환경의 제약이다.
> - **[사용자 확인]** 설정 화면은 로그인이 필요해 실제 화면을 못 봤다 — manual-verification 25번.
> - **[주의] 이 저장소에 다른 자동화가 동시에 작업 중이다.** 같은 작업 트리에서 포트 3000→5000
>   변경이 진행 중이어서 **내 파일만 지정해 커밋했다**(`git add -A` 금지). 위 검증은 그쪽
>   미커밋 변경이 섞인 트리에서 돌렸다 — 모듈이 겹치지 않아 영향은 없지만 사실대로 적는다.
> - **남은 것**: T3 라운드트립 회귀 테스트(내보내기 → 가져오기 → 다시 내보내기).

> ## 🚩 2026-07-26 사용자 피드백 30여 항목 — 22개 배포, [Phase 30](plans/phase_30.md)에 잔여 7개
> 사용자가 화면을 직접 써 보고 남긴 피드백(원문·처리 표: [feedback-2026-07-26.md](feedback-2026-07-26.md)).
> **추측 후보가 아니라 사용자가 말로 요구한 항목**이라 우선 처리했다. 커밋 6건.
>
> **원인을 추측하지 않고 측정해서 찾은 것들** — 전부 "짐작과 실제가 달랐다":
> - **뉴스 4-1 velog**: 홈이 RSS 링크를 하나도 광고하지 않고 실제 피드가 **다른 도메인**
>   (v2.velog.io)에 사용자별로만 있다. 자동 발견으로는 원리적으로 못 찾는 부류였다.
>   사이트 규칙 + 관용 경로 폴백 추가. **가짜 fetch가 아니라 실제 네트워크로 확인**(20건 수집).
> - **페이지 2-1 글자 깨짐**: 파일이 아니라 **읽는 방식**이 원인. `File.text()`는 무조건
>   UTF-8로 해석해서 한국어 Windows에서 흔한 CP949 .md가 전부 깨졌다. BOM·UTF-8 검증으로 판별.
> - **오피스 5-2 벽 침범**: 자산 43개 크기를 직접 재보니 타일은 32px인데 규칙이
>   "32px 이하 → 2타일"이라 **32×32 자산 20개가 64×64로** 그려지고 있었다.
> - **오피스 5-6 사장오리**: 스프라이트시트를 픽셀로 열어 보니 **전 프레임이 같은 오른쪽
>   옆모습**이라 방향을 바꿔도 그림이 같았다. 게다가 down이 쓰던 행은 2프레임뿐인데 4프레임을
>   재생해 **아래로 걸으면 오리가 깜빡였다.**
> - **오피스 5-7 일하는 척**: `simulateNpcTasks`가 게임 1분마다 10% 확률로 **없는 업무를
>   지어내고**("버그 수정 #142") 진행률·만족도·생산성을 난수로 흔들고 있었다. 그래서 같은
>   직원에게 두 번 물으면 매번 다른 답이 나왔다. 생성기와 템플릿 사전을 함께 삭제 —
>   목록이 남아 있는 한 "실제 일하는 것만 보여준다"를 지킬 수 없다.
>
> **없는 데이터를 지어내지 않기로 한 두 곳**:
> - 뉴스 TOP3(4-5): 조회수는 우리에게 없다 → "몇 개 매체가 같은 사건을 다뤘나"를 근거로 쓰고
>   화면에 그대로 밝힌다.
> - 오피스 관리 패널: 자금·수익·급여·평판·MVP·생산성% 전부 제거(전부 시뮬레이터 난수였다).
>
> **새 테이블 없이 만든 것**: 통계 로그(3-1·3-2)는 이미 있는 `action_log`에 이름 규칙
> (`page:view`·`batch:*`·`app:*`)으로 담았다. 종류별 테이블은 조회 4회 + RLS 4벌이 된다.
>
> **설계를 못박은 것**: 기능 토글은 **끄는 목록**이다(허용 목록 아님) — 허용 목록이면 기능을
> 새로 만들 때마다 기존 사용자 전원이 못 쓰게 되고 아무도 켜 주지 않으면 사라진 것과 같다.
> 기본값이 빈 배열이라 **마이그레이션 적용 전후로 기존 동작이 한 글자도 안 바뀐다**(회귀 테스트로 잠금).
>
> - 검증: core 693 · api 406 · web 362 tests GREEN / lint 0 error / next build 통과.
> - 커밋: `5a43f2a`(뉴스+오피스) `243e8c6`(오피스) `0ddcf12`(페이지) `c9f532b`(사운드)
>   `277ca92`(권한·대시보드 구성) `227721c`(통계 로그)
> - **[사용자 조치 필요 · 막힘]** DB 마이그레이션 **4건 미적용**. `apply_migration`과
>   `supabase db push` **둘 다 권한 게이트에 차단**돼 자율 적용이 불가능하다.
>   그중 하나는 **지금 열려 있는 보안 구멍**(로그인 없이 남의 XP·레벨 변경) —
>   [loop-eng/PENDING.md](loop-eng/PENDING.md) 1절.
> - **[확인 못 함]** 오피스 사운드가 실제로 괜찮은지는 들을 수 없어 판정 불가.
>   음소거·번갈아 재생·실패 내성 같은 아래 계약만 테스트로 잠갔다.
> - **잔여 7개는 [Phase 30](plans/phase_30.md)에 설계·착수 순서와 함께 올려 뒀다.**

> ## 🔴 2026-07-26 `/loop-eng` — [Phase 29](plans/phase_29.md) T1: 백업에 본문이 없었다
> **"내 데이터 내보내기"가 문서 본문을 한 글자도 담고 있지 않았다.** 페이지는 제목·아이콘·
> 수정시각 넷만 나갔고, 캘린더 일정과 습관 체크 기록은 **조회조차 하지 않았다.**
> 사용자는 백업했다고 믿고 있었고 그게 틀렸다는 걸 알 방법이 없었다.
> - **원인은 조합 지점이었다.** 조립도 조회도 각각 멀쩡했다 — 내보내기가 **목록용 조회**
>   (`listPages`)를 쓴 게 문제였다. 그 조회가 `content`를 빼는 건 **의도**다(사이드바가 문서
>   전체를 매번 받을 이유가 없다). 백업은 정반대 요구인데 같은 조회를 재사용했다.
>   → 공용 조회를 넓히지 않고 **내보내기 전용 `listPagesForExport`**를 뒀다. 목록 화면
>     전송량은 그대로 두고 백업만 본문을 받는다.
> - **이 저장소가 반복해서 겪은 부류다**(재색인·에이전트 라우트에 이어 세 번째). 그래서 수집·
>   조립을 `lib/collectBackup.ts`로 분리해 **조합을 직접 잠갔다** — "목록용 조회를 쓰지 않는다"를
>   테스트가 검사한다. 컴포넌트 안에 두면 web 테스트가 node 환경이라 검사할 수 없다.
> - **잘린 백업을 조용히 넘기지 않는다.** 조회가 상한(500건, 습관 체크 5000건)만큼 돌아오면
>   뒤가 더 있는지 알 수 없다 → 버튼 아래에 알린다. **"잘렸다"가 아니라 "잘렸을 수 있다"**로
>   적었다 — 실제로 모르는 것을 아는 척하지 않는다.
>   습관 체크는 상한이 아예 없어 PostgREST 기본값에서 **조용히** 잘릴 수 있었다. 선택 인자로
>   상한을 받게 해(기존 호출부 동작 불변) 감지 가능하게 만들었다.
> - **OAuth 토큰은 일부러 넣지 않았다** — 다운로드 파일에 토큰이 실리면 그게 유출 경로다.
> - **파일에 `formatVersion`을 넣었다.** 형식이 바뀌었을 때 옛 백업을 거부할지 변환할지
>   정하려면 파일 자신이 버전을 알아야 한다(T2 가져오기의 판정 기준).
> - 검증: core 9 + api 4 + web 8 신규 테스트 / turbo test·lint·build **18/18 GREEN**.
> - **[사용자 확인]** 설정 화면은 로그인이 필요해 **실제 파일을 열어본 적이 없다** —
>   manual-verification 25번(받은 JSON에 `pages[].content`가 있는지 확인).
> - **남은 것**: T2 되가져오기(복원), T3 라운드트립 회귀 테스트.

> ## 🔴 2026-07-26 `/loop-eng` — 같은 부류를 또 놓쳤다 (도구 9종 전수 재측정)
> 직전 사이클에 라우터를 고치고 **예시 칩 4개**만 테스트로 잠갔다. 이번엔 **도구 9종 전체**의
> 트리거 문장(도구 설명에 스스로 적어둔 예시 포함)과 현실적 변형 **40문장**을 통과시켰더니
> **10건이 여전히 rule로 새고 있었다.**
> - **[결함] "했어"만 넣고 같은 어간의 다른 어미를 안 봤다** — `운동 했다` · `물마시기 했음` ·
>   `청소 다함`이 그대로 막혀 있었다. 직전 사이클이 스스로 "증상 하나를 고치며 부류를 안 본
>   결과"라고 적어놓고 **같은 실수를 연속 두 번** 했다.
> - **[결함] 조회 도구가 있는데 그 도메인 명사가 힌트에 없었다** — `오늘 스케줄` ·
>   `다음주 캘린더` · `습관 현황` · `회의록 문서 하나`. `listCalendarEvents`·`listHabits`가
>   멀쩡히 있는데 명사구로 물으면 도달하지 못했다.
> - **원인이 이름에 있었다**: 명사(`일정`·`할 일`·`마감`·`메모`)가 `QUESTION_HINT`와
>   `COMMAND_HINT`에 흩어져 있었다 — 둘 다 명사를 담을 자리가 아니다. 어디에 무엇을 넣을지
>   이름이 말해주지 않으니 다음 사람도 같은 자리에 잘못 끼워 넣는다.
>   → **`DOMAIN_HINT` 신설**로 도구가 다루는 명사를 한곳에 모았다. 합집합은 이전과 동일하고
>     신규 어휘만 늘었다(동작 보존을 테스트로 잠금).
> - **넓히기 전에 잡담 기준선을 먼저 쟀다.** 수정 전 잡담 10종 중 `뭐하냐` 1건만 llm(기존 `뭐`
>   힌트) → 수정 후에도 **동일**. `밥 먹었다`·`잘 잤음`은 어간이 달라 `했다`·`했음`에 안 걸린다.
> - **고치지 않기로 한 3건(근거 기록)**: `금요일 저녁 약속` · `다음주 월요일 치과` ·
>   `내일까지 보고서 쓰기`. 요일·날짜 명사구나 `~까지`를 힌트에 넣으면 `학교까지 멀어` 같은
>   평범한 잡담이 무료 쿼터를 먹는다. 실제 사용자는 이 경우 `잡아줘`·`추가`를 붙이는 게 보통이라
>   **넓히는 위험 대비 이득이 없다.** 없는 문제를 만들지 않는다.
> - 부수: `reindex-all/route.ts`의 죽은 import 1건 제거(린트 경고 0).
> - 검증: core 18 tests(+3 케이스군) / turbo test·lint·build **18/18 GREEN**.
> - **교훈**: 한 번 고친 자리는 **더 넓은 입력으로 다시 재야 한다.** 4문장으로 통과한 수정이
>   40문장에서는 10건 샜다.

> ## ⏭ 2026-07-26 `/loop-eng` — 짧은 명령을 쓸 수 있다는 걸 알리기 (직전 수정의 후속)
> 직전 사이클에 짧은 명령("장보기 추가")이 오리에게 도달하게 고쳤는데, **사용자가 그걸 알
> 방법이 없었다.** 대화창 안내에 예시가 둘뿐이고 둘 다 긴 문장이었다(도구는 6종).
> 쓸 수 있는데 아무도 모르는 기능은 없는 것과 같다.
> - **예시 칩 4개**로 교체 — 조회·생성·체크를 고르게 덮는다. 누르면 입력창에 채워진다.
> - **바로 보내지 않는다.** 의도 없이 눌렀을 때 무료 쿼터를 쓰지 않게 하고, 문장을 고쳐 쓸
>   여지를 남긴다. e2e로 "눌러도 요청이 안 나간다"를 잠갔다.
> - **예시가 실제로 동작하는지 테스트로 검사한다.** 같은 날 정확히 그 반대가 일어났다 —
>   명세에 적힌 트리거 문장이 라우터에서 새어 도구가 한 번도 안 불렸다.
>   `duckExamples.test.ts`가 **예시마다 `routeUtterance`를 돌려** llm 도달을 확인한다.
>   화면에 걸어 둔 예시가 동작하지 않으면 사용자를 속이는 셈이다.
> - 부수: 내가 이전 사이클에 `describeCall`을 lib으로 옮기며 남긴 미사용 import 정리.
> - 검증: web 229 tests(+4) / turbo test·lint·build 18/18 GREEN. e2e +3(세션 시 자동 실행).


> ## 🔴 2026-07-26 `/loop-eng` — 오리가 짧은 명령을 못 알아듣던 문제 (도구가 입구에서 막힘)
> 실제 사용자 문장을 발화 라우터에 통과시켜 봤더니 **"줘"로 끝나지 않는 짧은 명령이 전부
> 캔 답변으로 새고 있었다.** 그중에 **Phase 19가 자기 명세에 적어둔 트리거 문장
> "오늘 독서 했어"도 있었다** — 습관 체크 도구를 만들고 승인 카드까지 붙이고 테스트로
> 잠갔는데, **입구에서 막혀 도구가 한 번도 불리지 않는 상태**였다.
> - 같은 부류: "장보기 추가", "장보기 완료", "메모해", "회의록 메모", "페이지 만들어",
>   "운동 체크해", "장보기 끝냈어" — 전부 도구가 있는데 도달 못 했다.
> - **원인**: `QUESTION_HINT`는 원래 **질문** 힌트다. Phase 10에서 명령을 살리려고 "줘" 하나만
>   끼워 넣었고 나머지 명령 어휘는 빠져 있었다 — 증상 하나를 고치며 부류를 안 본 결과.
> - **수정**: 도구 카탈로그에 실제로 있는 동작의 어휘로 `COMMAND_HINT`를 좁혀 추가.
>   무작정 넓히면 인사까지 LLM으로 새어 무료 쿼터가 잡담에 소모된다 — 인사는 GREETING이
>   먼저 걸러내는 순서를 유지하고, **회귀 테스트로 잠갔다**("안녕"·"고마워"·"ㅋㅋㅋ" 등 8종).
> - **오분류 비용이 비대칭이라 llm 쪽으로 기울였다**: 잘못 llm이면 쿼터를 조금 쓰고,
>   잘못 rule이면 기능이 아예 동작하지 않는다.
> - **고친 뒤 같은 문장들을 다시 통과시켜 확인**: 명령 12종 전부 llm, 사회적 발화 3종 전부 rule.
> - 교훈 기록: "기능을 만들 때 그 기능에 도달하는 입구도 함께 확인한다" — 도구 테스트는 도구를
>   직접 부르고 라우터 테스트는 라우터만 본다. **둘을 잇는 확인이 없었다.**
> - 검증: core 221 tests(+2 케이스군) / turbo test·lint·build 18/18 GREEN.


> ## ⏭ 2026-07-26 `/loop-eng` — 오리가 못 보던 데이터(데이터베이스 행 속성) 연결
> - **[공백] 데이터베이스 행의 속성값이 RAG에 아예 없었다.** `row_props`는 별도 컬럼이고
>   `plain_text`는 본문에서만 파생된다. 그래서 "프로젝트 트래커"에 상태·우선순위를 채워도
>   오리는 그 값을 못 봤다 — **제품 정의("오리는 RAG로 사용자 데이터를 알고 답한다")와 어긋난다.**
>   → 임베딩 텍스트를 `pageEmbedText(plainText, rowProps)`로 조립. 저장 컬럼과 별개로 호출부에서
>     만드는 건 `todoEmbedText`가 이미 쓰던 방식이라 새 패턴이 아니다.
>   → **`plain_text`는 안 바꿨다**: 속성만 고칠 때도 다시 파생하려면 본문을 함께 알아야 해서
>     편집마다 추가 조회가 붙는다. 그래서 **Cmd+K 검색은 여전히 속성값을 못 찾는다**(한계 명시).
> - **만들다가 걷어낸 것**: 배열 값(다중 선택) 처리를 넣었는데, `RowPropValue`는
>   `string|number|boolean|null`이라 **계약에 없는 형태였다.** 타입체크에 걸려 제거했다 —
>   없는 형태를 미리 다루면 계약이 흐려진다.
> - **이번 사이클에 훑고 지적 0건**: PostgREST 필터 인젝션(사용처 1곳, 이미 이스케이프됨),
>   `extractPlainText`의 블록 순회(테이블·캡션·children 다 처리됨).
> - 검증: core 219 tests(+9) / turbo test·lint·build 18/18 GREEN.
> - **[사용자 확인]** 실제 대화 검증은 로그인 필요 — manual-verification 21번.


> ## 📌 먼저 읽기 — 사용자가 할 일은 [`docs/loop-eng/PENDING.md`](loop-eng/PENDING.md)에 모아 뒀다
> 이 파일은 1300줄이 넘는다. **"내가 지금 뭘 하면 되나"는 PENDING.md 한 장**만 보면 된다
> (DB 변경 적용 · e2e 세션 파일 · 눈으로 볼 화면 · 코스튬 결정).
> 아래는 시간 역순 작업 기록이다.

> ## ⏭ 2026-07-26 `/loop-eng` — 성능·캐시 실측 (지적 0건) + 보류 항목 통합
> - **지난 사이클 캐시 수정이 실제로 듣는지 확인**: `eslint.config.mjs`를 건드리자 lint 캐시가
>   2건 → **0건**으로 전부 재실행됐다. globalDependencies가 의도대로 동작한다.
> - **공개 페이지 무게 실측 — 문제 없음.** `/welcome` HTML 32KB + 정적 자산 14개 gzip 279KB.
>   오리 영상은 `preload="none"` + poster라 **방문자가 강제로 내려받지 않는다**(이미 최적화됨).
> - **캐시 헤더 실측 — 고칠 것 아님.** `public/` 자산이 `max-age=0, must-revalidate`로 나와서
>   의심했는데, **조건부 요청을 실제로 보내 보니 전부 304(다운로드 0바이트)**였다. 재방문 시
>   다시 받지 않는다. `immutable`로 바꾸면 사용자가 오리 자산을 교체했을 때 오래 stale해지는
>   위험만 생긴다 → **측정하고 안 고치기로 했다.** 없는 문제를 만들지 않는다.
> - **보류 항목 통합**: Status.md(1348줄)·manual-verification(20항목)에 흩어져 있던 사용자 조치를
>   `docs/loop-eng/PENDING.md` 한 장으로 모았다(우선순위·명령어·왜 필요한지).


> ## ⏭ 2026-07-26 `/loop-eng` — 뉴스 요약이 비던 문제 + 린트 캐시 구멍
> 지난 사이클에 이어 추천 피드를 실제로 파싱해 **뽑힌 값의 품질**을 봤다(개수만 봐선 안 보인다).
> - **[결함] GeekNews만 요약이 30/30 전부 비어 있었다.** GeekNews(Atom)는 `<content>`를 쓰는데
>   파서가 `description`/`summary`만 봤다. 요약이 없으면 화면 미리보기가 비고, **Gemini 3줄
>   요약도 제목만으로** 만들어진다(요약 품질이 통째로 떨어진다). → `content:encoded`·`content`를
>   대체로 추가. 규격상 발췌(summary/description)가 우선이고 전문(content)은 없을 때만 쓴다.
> - **[결함] 이중 인코딩된 엔티티가 화면에 그대로 보였다** — DEV Community 요약에 `—&gt;`.
>   피드가 HTML을 이스케이프하고 XML로 또 이스케이프해서(`--&amp;gt;`) 한 번만 풀면 남는다.
>   태그를 걷어낸 뒤 한 번 더 푼다(걷어낸 뒤 남은 엔티티는 HTML 본문의 것이다).
> - **고친 파서를 실제 피드에 다시 통과시켜 확인**했다: GeekNews 요약 0/30 → **30/30**, 9개 피드
>   전부 문제 표시 없음.
> - **[내 검증의 구멍] 지난 사이클 "lint GREEN" 보고가 실제보다 약했다.** 루트 eslint 설정을
>   바꿔도 **패키지별 lint 캐시가 살아 있어** 새 규칙이 안 돌고 통과로 보고됐다. 이번에 캐시가
>   무효화되면서 core 테스트의 위반이 그제서야 드러났다.
>   → `turbo.json`에 `globalDependencies`(eslint 설정·tsconfig)를 넣어 루트 설정이 바뀌면
>     모든 패키지 캐시가 무효화되게 했다. 규칙을 추가하고도 안 돌면 규칙이 없는 것과 같다.
> - 검증: core 209 tests(+7) / turbo test·lint·build 18/18 GREEN(**캐시 0건에서 재실행 확인**).


> ## ⏭ 2026-07-26 `/loop-eng` — 추천 피드 실측 검증에서 나온 결함
> 추천 피드 9개를 **실제로 받아 우리 파서에 넣어** 봤다(RSS는 공개라 로그인 없이 검증 가능).
> Phase 19에서 "9개 전부 200 + RSS 확인"이라고 했지만 그건 curl 응답만 본 것이고,
> **파서가 실제로 항목을 뽑는지는 확인된 적이 없었다.**
> - **9개 전부 정상 파싱**(GeekNews 50 · HN 20 · DEV 12 · Google AI 20 · OpenAI 1050 ·
>   GitHub 10 · Vercel 1378 · Meta 9 · Netflix 10). 파서 자체는 문제 없음.
> - **[결함] 두 피드가 전체 아카이브를 통째로 내보낸다** — Vercel 2.9MB/1378건, OpenAI 636KB/1050건.
>   `collectFeed`는 파싱된 항목을 **개수 제한 없이 한 건씩 순차 insert**한다. 즉 추천 칩을 한 번
>   누르면 **1378번 왕복**이 돌아 서버리스 실행시간 안에 끝나지 않고 DB도 두들긴다.
>   → 한 번에 50건까지만 저장(정상 피드 최대가 50건이라 잃는 게 없다). RSS는 관례상 최신이
>     앞이므로 **앞에서부터** 자른다 — 뒤에서 자르면 오래된 것만 남는다.
> - **[하드닝] 응답 크기 상한 5MB**(선언된 Content-Length 기준). 피드 URL은 사용자가 자유롭게
>   넣는데 크기를 안 보고 통째로 버퍼링하고 있었다. Content-Length가 없는 응답까지 막으려면
>   스트리밍이 필요해 **정상 피드를 막을 위험이 있어 헤더가 있을 때만** 차단했다(그 이상은 항목
>   상한이 받아낸다) — 완전 차단이 아님을 주석에 명시.
> - **이건 실측이 아니면 못 찾는 부류다.** 단위 테스트는 2건짜리 가짜 XML만 쓰고, curl은 파싱을
>   안 한다. 실제 피드를 실제 파서에 통과시켜야 1378이라는 숫자가 보인다.
> - 검증: api 336 tests(+6) / turbo test·lint·build 18/18 GREEN.
>   네트워크 검증은 일회성으로 돌리고 CI에는 넣지 않았다(외부 피드 상태에 흔들린다).


> ## ⏭ 2026-07-26 `/loop-eng` — 날짜 버그 부류를 린트 규칙으로 차단
> 하루 동안 같은 부류(`toISOString().slice(0,10)` = UTC 날짜)로 **8건**이 터졌고 그중 2건은
> 내가 낸 회귀였다. 고치는 것만으로는 또 들어온다 — **규칙으로 막았다.**
> - `no-restricted-syntax`로 `x.toISOString().slice(...)`를 금지하고, 대안을 오류 메시지에
>   직접 적었다(클라 `todayIso()`/`toLocalDateString`, 서버 `kstDateString`, 타임스탬프→날짜
>   `localDateKey`). CI의 `pnpm lint`에 그대로 실린다.
> - **루트 설정은 next 앱에 자동 적용되지 않는다** — 웹 설정에서 같은 규칙 객체를 import해
>   쓰게 했다(정의는 루트 한 곳). 웹에 위반을 주입해 실제로 걸리는지 확인하고 복구했다.
> - **의도된 예외 1건만 남기고 사유를 적었다**: `coerceTodoDueDate`의 왕복 검사는 방금 UTC로
>   만든 값을 되읽어 대조하는 것이라 UTC가 맞다(달력에 없는 날짜를 걸러내는 게 목적).
>   여러 줄 주석 뒤에 `eslint-disable-next-line`을 두면 코드 줄에 안 붙는다는 것도 확인했다.
> - 부수: 내보내기 파일명 2곳(`ExportDataButton`·`MemoWidget`)이 UTC 날짜를 쓰고 있었다 —
>   KST 새벽에 어제 날짜로 저장되던 것을 `todayIso()`로 고쳤다.
> - 검증: turbo test·lint·build 18/18 GREEN. 규칙 주입 → 오류, 복구 → 통과 확인.


> ## 🔴 2026-07-26 `/loop-eng` — **내가 낸 회귀 수정** (캘린더 날짜가 하루 밀림)
> 직전 사이클에 캘린더 저장을 UTC 자정 → **로컬 자정**으로 바꿨는데(없는 "오전 9:00"을 없애려고),
> **같은 컴포넌트에서 날짜를 UTC로 읽던 두 곳을 안 고쳤다.**
> - D-day 배지: `daysUntil(startAt, todayIso())` — `daysUntil`은 문자열 앞 10자리(=UTC 날짜)를
>   쓰는데 로컬 자정 저장값을 그대로 넘겼다 → KST에서 하루 밀림.
> - 표시 날짜: `event.startAt.slice(0, 10)` → 마찬가지로 전날.
> **고치기 전엔 시각이 틀렸고 고친 뒤엔 날짜가 틀렸다 — 한 사이클 동안 오히려 나빠졌다.**
> - **수정**: 타임스탬프에서 날짜를 뽑는 일을 `lib/localDateKey.ts` 한 곳으로 모았다. 호출부가
>   UTC/로컬을 매번 다시 고르지 않게 한다. 컴포넌트 안의 중복 정의도 제거(core `toLocalDateString`
>   재사용). 6 tests — UTC 슬라이스와 결과가 갈리는 상황 자체를 테스트로 드러냈다.
> - **함께**: `InsightsView`에 남아 있던 같은 부류 5곳도 고쳤다 — `updatedAt.slice(0,10)`(UTC)을
>   `checkedDate`(로컬)와 같은 Set·같은 주간 범위에 섞어 쓰고 있었다(KST 새벽 완료분이 전날로 셌다).
> - 교훈 갱신: **저장 규약을 바꾸면 그 값을 읽는 모든 지점의 목록을 먼저 만들고 시작한다.**
> - 검증: web 225 tests(+6) / turbo test·lint·build 18/18 GREEN.


> ## ⏭ Phase 28 (2026-07-26 `/loop-eng` — 날짜 시간대 버그 전수 스윕)
> 직전 사이클에 고친 캘린더 버그와 **같은 부류가 더 있는지** 전수로 훑어 **5건을 더 찾았다.**
> - **[버그] 통계 주간 경계가 하루 밀려 있었다.** 로컬 자정 월요일을 `toISOString()`으로 잘라
>   **일요일**을 시작일로 쓰고 있었다 — KST에서 "이번 주 vs 지난 주" 비교가 통째로 하루 어긋난
>   창으로 집계됐다.
> - **[버그] 연속 활동(스트릭)이 KST 새벽에 어긋났다.** 오늘을 UTC로 잘라 얻는데 비교 대상
>   `checkedDate`는 로컬 날짜라, 00:00~09:00엔 "오늘" 키가 어제 것이 됐다.
> - **[버그] 습관 히트맵 범위**도 같은 이유로 KST 새벽에 그날 체크를 제외했다.
> - **[버그] 요일별 집계**가 `new Date("YYYY-MM-DD").getDay()` — 날짜만 있는 ISO는 UTC 해석이라
>   음수 오프셋 지역에서 전날 요일이 나온다.
> - **[버그] 스탠드업 날짜**(서버·라우트 2곳): 서버는 UTC로 돌아 KST 새벽엔 어제 날짜로 적혔다.
>   Phase 19에서 습관 체크가 밟았던 함정과 **정확히 같다** — `kstDateString`으로 교체.
> - **저장소는 이미 세 곳에서 제대로 하고 있었다**(`HabitWidget` 수동 포맷, `HabitHeatmap`의
>   `T00:00:00`, Phase 19 `kstDateString`). 통계·스탠드업만 빠져 있었다 — 한 곳을 고칠 때
>   전수로 훑지 않으면 이렇게 남는다.
> - 날짜 계산을 `lib/insightsDates.ts`로 분리해 **Date를 아예 거치지 않게** 했다(문자열·epoch
>   day로만 계산 → 실행 시간대와 무관). 12 tests — 기준 날짜를 주입해 시간대 독립으로 검증.
> - 교훈 기록: `docs/lessons-learned.md` — "Date를 거쳐 날짜 문자열을 만들면 시간대만큼 하루가
>   밀린다(양방향 함정)".
> - 검증: web 219 tests(+12) / turbo test·lint·build 18/18 GREEN.


> ## ⏭ Phase 27 완료 (2026-07-26 `/loop-eng` — 캘린더에 없는 시각이 붙던 버그 + 시각 입력)
> Phase 26의 렌즈("앱이 쓰는 데이터인데 넣을 방법이 없는 것")를 나머지 컬럼에 마저 적용했다.
> - **[버그] 날짜만 고른 일정마다 "오전 9:00"이 붙고 있었다.** 화면은 자정이면 시각을 숨기도록
>   짜여 있는데(`h===0 && m===0 → null`), 위젯이 `new Date("2026-07-28")`로 만들어 저장했다.
>   날짜만 있는 ISO 문자열은 **UTC로 해석**되므로 한국에선 `getHours()`가 9다. 사용자는 시각을
>   고른 적이 없는데 화면이 9시라고 말했다. → 로컬 자정으로 저장하도록 수정.
>   - **오리와도 어긋나 있었다**: 오리의 `coerceEventStart`는 날짜만 받으면 KST 자정으로 만든다.
>     같은 앱에서 일정을 넣는 두 경로가 서로 다른 시각을 저장하고 있었다.
>   - **할 일 마감일과 규약이 다른 건 의도다**: 할 일은 화면이 문자열 `slice(0,10)`으로 오늘을
>     판정해 UTC 자정이 맞고(Phase 23), 캘린더는 `getHours()`로 읽어 로컬 자정이 맞다.
>     읽는 방식이 다르면 저장 규약도 달라야 한다 — 주석으로 남겼다.
> - **[누락] 시작·종료 시각 입력 추가.** `createCalendarEvent`는 `endAt`을 이미 받는데 화면이
>   안 넘기고 있었다(표시는 하고 있었다). 시각은 선택 — 비우면 종전대로 종일 일정이라
>   날짜만 넣던 흐름이 안 깨진다. 종료는 시작을 넣었을 때만 받고, 시작보다 이르면 막는다.
> - **기존 데이터는 건드리지 않았다.** 저장된 일정의 시각 일괄 수정은 되돌리기 어려운 데이터
>   변경이라 하지 않았다 — 새로 만드는 일정부터 바르게 저장된다(manual-verification 19번).
> - 검증: web 207 tests(+14) / turbo test·lint·build 18/18 GREEN.
>   **시간대와 무관하게 성립하도록** 저장 문자열이 아니라 되읽은 로컬 시/분으로 단언했다.
> - **[사용자 결정 필요] 오리 코스튬**: `costume` 컬럼·"먹이(재화)"·DECISIONS.md 확정이 다
>   있는데 **저장만 되고 아무 데서도 읽히지 않는다** — XP를 쌓아 먹이를 모아도 쓸 곳이 없다.
>   오리는 스프라이트 한 장으로 그려져 **새 그림이 필요**하고, 오리 외형은 사용자가 직접 만들어
>   온 영역이라 **자율로 만들지 않았다** — manual-verification 20번.


> ## ⏭ Phase 26 완료 (2026-07-26 `/loop-eng` — 마감일을 화면에서 넣을 수 있게)
> **데이터를 쓰는 기능은 있는데 넣을 방법이 없었다.** 할 일 위젯에는 "오늘 마감" 필터 버튼,
> "오늘 마감인 할 일이 없어요" 빈 상태, 기한 초과 빨간 표시가 **이미 셋 다** 있었다. 그런데
> 사용자가 마감일을 지정할 UI가 없었다 — 즉 **"오늘 마감"을 눌러도 영원히 빈 목록**이었다.
> Phase 23에서 오리가 마감일을 넣게 됐지만, 그건 "오리에게 말해야만 되는 기능"이라는 뜻이다.
> - **새 기능 추가가 아니라 이미 만든 기능을 쓸 수 있게 하는 일**이라 우선했다.
> - **저장 형식 변환을 다시 짜지 않았다.** Phase 23에서 정한 UTC 자정 규약(`coerceTodoDueDate`,
>   8 tests)을 `@ldd/api`에서 내보내 화면이 그대로 쓴다. 화면에서 또 만들면 **규약이 두 곳에서
>   갈라지고**, 그때부터 "오늘 마감" 필터가 조용히 어긋난다 — 이 저장소가 여러 번 겪은 방식이다.
> - **행에 붙였다**(추가 폼 아님). 마감일은 보통 만든 뒤에 정하고 잘못 잡으면 고쳐야 한다.
>   반복 설정이 이미 행에 있어 **같은 자리·같은 규칙**으로 둬야 패턴이 갈리지 않는다.
> - **폭을 아이콘 크기로 고정**했다. `input[type=date]`는 기본 폭이 넓어 안 보여도 모든 행의
>   제목을 좁힌다 — 반복 select에서 이미 겪은 문제라 이번엔 처음부터 막고 e2e로 잠갔다.
> - **표시는 문자열 앞 10자리를 그대로 쓴다.** `toLocaleDateString`에 태우면 시간대에 따라
>   하루가 밀린다(KST에선 멀쩡해 보이고 음수 오프셋 지역에서 깨지는 부류) — 테스트로 잠금.
> - 검증: web 193 tests(+12) / turbo test·lint·build 18/18 GREEN. e2e +4(세션 시 자동 실행).
> - **[사용자 확인]** 육안 검증은 로그인 필요 — manual-verification 18번.


> ## ⏭ 2026-07-26 `/loop-eng` — 직전 검사의 구멍 막기(테이블·RPC 이름)
> 직전 사이클에 만든 컬럼 대조 검사에 **구멍이 있었다**: 마이그레이션에 없는 테이블은 그냥
> 건너뛰도록 짜서, **테이블명 오타는 오히려 조용히 통과**했다. 검사를 만든 다음 사이클에
> 그 검사를 스스로 점검해서 찾았다.
> - **막은 것**: 코드가 참조하는 모든 테이블·RPC 이름이 마이그레이션에 선언돼 있어야 한다.
>   이름이 한 글자 틀리면 그 기능이 런타임에 통째로 죽는데, 가짜 클라이언트 테스트는 이름을
>   아예 검사하지 않는다.
> - **주석을 걸러낸다**: 검사가 **자기 파일의 주석**에 있는 예시(`.from("table")`)를 실제 호출로
>   착각해 없는 위반을 냈다. 없는 위반을 내는 검사는 곧 무시되므로, 주석을 지우고 훑는다
>   (문자열 안의 `//`는 URL이라 건드리지 않는다).
> - **실제로 잡는지 확인**: 진짜 코드에 RPC 오타(`award_xpp`)와 테이블 오타(`memoss`)를 각각
>   넣어 검사가 실패하는 걸 확인하고 복구했다. 가짜 입력 검증만으로 끝내지 않았다.
> - 현재 코드에는 위반 없음(테이블 15종·RPC 4종 전부 선언돼 있음).
> - 검증: api 329 tests(+10) / turbo test·lint·build 18/18 GREEN.


> ## ⏭ 2026-07-26 `/loop-eng` — 컬럼 오타를 CI에서 잡는 검사 (직전 사고 후속)
> 직전 사이클에 배포된 회귀(없는 컬럼을 payload에 실어 할 일 추가가 실패)를 고친 뒤, **같은
> 부류가 더 있는지 실서버 스키마와 전수 대조**했다. 변이 지점 30곳 — 어긋난 곳 없음.
> - **왜 이 검사가 필요한가**: 이 패키지 테스트는 가짜 supabase 클라이언트를 쓴다.
>   **컬럼 이름 오타를 원리적으로 못 잡는다.** 없는 컬럼이 payload에 있으면 PostgREST가 요청
>   전체를 거부하므로, 오타 하나가 그 테이블 쓰기를 통째로 죽인다.
> - **추가한 규칙**: api 코드가 쓰는 모든 컬럼이 마이그레이션에 선언돼 있어야 한다.
>   조건부 스프레드(`...(x ? { col: v } : {})`) 안의 키도 함께 본다 — 거기 숨은 오타도 실제
>   컬럼으로 나간다.
> - **파서를 실제 스키마로 검증했다**: 마이그레이션에서 뽑은 컬럼 목록이 실서버 19개 테이블과
>   **완전히 일치**함을 확인(차이는 대기 중 마이그레이션의 `recurrence` 하나뿐 = 정상).
>   근거 없이 "잘 될 것"으로 두지 않았다.
> - **만들다가 잡은 내 실수**: 깊이와 키를 한 정규식 교대로 잡았더니 **각 객체의 첫 키를 통째로
>   놓쳤다.** 검사가 조용히 약해지는 부류라 특히 위험하다 — 깊이를 위치별로 따로 세도록 고쳤다.
> - **실제로 잡는지 확인**: 가짜 입력 6종 + **실제 코드에 오타를 넣어 실패를 확인**하고 복구했다.
> - 검증: api 319 tests(+5) / turbo test·lint·build 18/18 GREEN.


> ## 🔴 2026-07-26 `/loop-eng` — **배포된 회귀 발견·수정** (할 일 추가가 실패할 수 있던 상태)
> **내가 Phase 20에서 만든 결함이다.** `createTodo`가 `recurrence`를 **항상** insert payload에
> 담도록 바꿔 배포했는데, 그 컬럼을 만드는 마이그레이션은 DDL이라 사용자 확인 대기 중이었다.
> **실서버 `todos`에는 그 컬럼이 없다**(이번에 `information_schema` 조회로 확인).
> PostgREST는 없는 컬럼이 payload에 있으면 요청 전체를 거부하므로 — **반복을 쓰지 않는 평범한
> 할 일 추가까지 실패하는 상태**로 배포돼 있었다.
> - **왜 못 잡았나**: 하위호환을 **읽기 경로만** 챙겼다(`fromRow`·zod 기본값). 테스트는 가짜
>   클라이언트라 실제 스키마를 모르고, 오히려 **"반복이 없으면 null로 저장한다"는 잘못된 동작을
>   고정하는 단언**이 들어 있었다. 그 단언이 이번에 실패해 문제를 드러냈다 — 교체했다.
> - **수정**: 값이 있을 때만 키를 넣는다(`...(x ? { recurrence: x } : {})`). 미사용 시 payload가
>   마이그레이션 이전과 **완전히 동일**해진다. `createTodo`·`restoreTodo` 양쪽. 회귀 테스트 6건.
> - **같은 부류 전수 확인**: 실서버 19개 테이블의 실제 컬럼을 조회해 코드가 쓰는 컬럼과 대조 —
>   어긋난 건 `recurrence` 하나뿐이었다(나머지 마이그레이션은 전부 적용돼 있음).
> - 교훈 기록: `docs/lessons-learned.md` — "미적용 마이그레이션의 컬럼을 insert payload에
>   무조건 실으면 그 테이블 쓰기가 통째로 죽는다". **null을 넣는 것과 키를 빼는 것은 다르다.**
> - 검증: api 314 tests(+6) / turbo test·lint·build 18/18 GREEN.

> ## ⏭ 2026-07-26 `/loop-eng` — 감사 스윕 0건 + 밀린 절차 정리
> **이번 사이클은 새 기능을 만들지 않았다.** 남은 각도를 훑었는데 지적이 나오지 않았고,
> 대신 **프로젝트 규범이 요구하는데 다섯 Phase 동안 빠뜨린 절차**가 있어 그걸 처리했다.
> - **API 표면 감사(신규) — 지적 0건.** 라우트 10개 전수: 인증 게이트·입력 검증·요청 제한.
>   `/api/health`·`/api/ai/agent` 등이 실제로 막히는지 **실서버 curl로 확인**(303).
>   `/api/keepalive`만 공개(의도). 에이전트 라우트는 zod 대신 직접 검증 중이라 정적 스윕이
>   오탐을 냈고, 코드를 열어 타입·길이·요청 제한이 다 있음을 확인했다.
> - **응답 보안 헤더(신규) — 지적 0건.** 실서버 확인: CSP(nonce+strict-dynamic·frame-ancestors
>   none·object-src none)·HSTS·nosniff·Referrer-Policy·Permissions-Policy·X-Frame-Options 완비.
> - **밀린 절차 처리**: CLAUDE.md 4절이 요구하는 **리뷰 스냅샷**(7/22 이후 없었음)과
>   **History.md 이관**(Phase 17에서 멈춰 있었음)을 채웠다.
>   → `docs/reviews/2026-07-26-security-audit.md`(immutable): 무엇을 어떤 방법으로 확인했고,
>     무엇을 **고치지 않기로 했는지와 그 근거**까지 남겼다. 다음 사람이 같은 조사를 반복하지
>     않게 하는 게 목적이다.
>   → History.md에 Phase 18~24 이관.
> - **[사용자 판단 필요]** Status.md가 1142줄이다. 완료 Phase 서술을 History로 옮기면 짧아지지만
>   **문서 삭제는 임의로 하지 않았다** — 정리 여부는 사용자 결정.

> ## ⏭ Phase 24 (2026-07-26 `/loop-eng` — Supabase 어드바이저 실행·대응) · **적용 대기**
> **막혀 있던 점검이 실은 다른 연결로 가능했다.** 세 사이클 동안 "액세스 토큰이 없어 미실행"이라
> 적었는데, 등록된 Supabase 연결이 **두 개**였고 다른 쪽은 인증돼 있었다. 보안·성능 어드바이저를
> 실제로 실행했다. **교훈: "도구가 막혔다"는 결론도 한 경로만 시도한 결과일 수 있다.**
>
> - **[SEC · 우선순위 높음] `award_xp` 권한 결함 발견.** 세 가지가 겹쳐 있었다:
>   ① SECURITY DEFINER라 RLS 우회 ② 본문이 인자 `p_user_id`를 **검증 없이 신뢰**
>   ③ 실제 권한이 `anon=X` — **로그인하지 않아도 임의 사용자의 XP·레벨·먹이를 바꿀 수 있다.**
>   피해 범위는 마스코트 수치지만 인증 없이 남의 행을 쓰는 통로다.
>   - **왜 이렇게 됐나**: 원 마이그레이션은 `REVOKE ALL ... FROM public`으로 막았다고 **의도**했다.
>     그런데 Supabase는 public 스키마 함수에 `anon`·`authenticated` **개별** 권한을 기본 부여하고,
>     의사 롤 `public`을 회수해도 `anon`에 직접 부여된 권한은 남는다. 의도와 실제가 어긋났고
>     확인해 줄 검사가 없었다.
> - **함께 정리**: 트리거 함수 `handle_new_user`·`cleanup_page_embeddings`가 REST로 노출된 것 회수
>   (둘 다 트리거 문맥 밖에선 Postgres가 거부해 **실제 악용 경로는 확인되지 않음** — 그래도 노출
>   이유 없음). `match_embeddings` search_path 지정(이건 SECURITY **INVOKER**라 위험도 낮음).
> - **고치지 않기로 한 것(근거 기록)**: `get_public_page`의 anon 공개는 **Phase 12 T1 설계**다
>   (비로그인 공개 페이지 열람). `vector`·`pg_trgm`의 public 스키마 설치는 Supabase 기본값이고
>   옮기면 타입·인덱스·연산자 참조를 전부 갱신해야 해 **위험 대비 이득 없음**. 유출 비밀번호
>   보호는 OAuth 전용이라 **해당 없음**. **미사용 인덱스 7건은 건드리지 않는다** — 트래픽이 거의
>   없는 DB에서 "미사용"은 아직 안 쓴 것이지 불필요하다는 뜻이 아니다.
> - **성능**: 남은 9개 테이블 RLS 정책을 `(select auth.uid())`로 통일(embeddings·pages는
>   20260724150000에서 이미 적용) + 외래키 인덱스 4건. **정책 목록은 손으로 옮기지 않고
>   마이그레이션에서 스크립트로 추출**해 생성했다(HD-003).
> - **재발 방지**: Phase 22 schemaGuard에 규칙 추가 — SECURITY DEFINER 함수는 **`anon`을 지목한
>   회수**를 동반해야 한다. `FROM public`만으로는 부족하다는 걸 테스트로 못박았고, 의도적 공개는
>   allowlist에 근거와 함께 둔다. 검사가 5개 함수를 전부 인식하는지 직접 확인했다(누락 0).
> - 검증: api 308 tests(+6) / turbo test·lint·build 18/18 GREEN.
> - **[사용자 조치 필요 · 미적용]** DDL은 실행 전 확인이 규칙이라 **적용하지 않았다.**
>   마이그레이션 2건 + Phase 20 반복 컬럼 1건이 대기 중 — manual-verification 17번.

> ## ⏭ Phase 23 완료 (2026-07-26 `/loop-eng` — 오리에게 마감일·반복 말하기)
> **착수 근거**: 피드백 C절 "오리 대화로 모든 기능 제어"가 대형이라 미착수였는데, 그중 가장
> 값싸고 값 큰 조각이 남아 있었다. 오리에게 "내일까지 장보기 추가해줘"라고 하면
> `createTodo` 도구가 **제목만** 받아 날짜가 조용히 버려졌다. Phase 20에서 만든 반복도
> 오리는 쓸 방법이 없었다.
> - **T1**: 도구가 `dueDate`(YYYY-MM-DD)·`recurrence`를 받는다. **형식이 어긋나면 조용히 버리지
>   않고 오류로 돌려준다** — 버리면 사용자는 마감일이 걸린 줄 안다.
>   반복은 core `parseRecurrence`를 통과한 것만 저장하고 정규화해서 넣는다(모델이
>   `FREQ=BIWEEKLY` 같은 없는 규칙을 지어낸다). 시각은 아예 안 받는다 — 모델이 타임스탬프를
>   만들면 시각·타임존을 지어내고 그건 실제로 터졌던 버그다(피드백 iter5, '내일'이 11일 뒤로).
> - **저장 규약을 여기서 못박았다 — 마감일은 `T00:00:00.000Z`(UTC 자정).** 할 일 화면은 오늘
>   필터를 `dueDate.slice(0, 10) === todayIso()`로 판정한다. KST 자정으로 저장하면 UTC로는 전날
>   15:00이라 잘라낸 날짜가 하루 앞선다. **지금까지 마감일을 쓰는 곳이 없어 안 드러났을 뿐**이고
>   오리가 첫 기록자가 되므로 규약을 정하고 테스트로 잠갔다.
> - **T2**: 승인 카드에 마감일·반복 노출. 반복은 `describeRecurrence`로 한국어로 푼다
>   (`FREQ=WEEKLY;BYDAY=TU`를 그대로 띄우면 판단에 도움이 안 된다). **풀이가 안 되는 값은
>   원문을 보여준다** — 모델이 이상한 규칙을 냈다는 사실 자체가 승인 판단 근거다.
>   안전에 직결되는 표시라 컴포넌트에서 `lib/approvalLabel.ts`로 분리해 테스트로 잠갔다.
> - **모델 판단의 한계를 인정하는 설계**: "다음 주 화요일"이 며칠인지는 모델이 정한다. 서버는
>   형식과 실재하는 날짜인지까지만 보증하고, **정확성 판단은 사용자가 승인 카드를 보고** 한다.
> - 부수(접근성): 메모 수정 입력창에 접근 가능한 이름이 없어 스크린리더가 이름 없는 입력란으로
>   읽던 것 수정. 정적 스윕에서 나온 나머지 후보는 전부 오탐으로 확인(파일 선택은 라벨 안에 있음).
> - 검증: api 302 tests(+8) · web 181 tests(+12) / turbo test·lint·build 18/18 GREEN.
> - **[사용자 확인]** 실제 대화 검증은 로그인 + Gemini 필요, 반복 저장은 마이그레이션 선행 —
>   manual-verification 16번.
> **다음: Phase 23 소진 → SCOPE로 신규 로드맵 발굴.**

> ## ⏭ Phase 22 완료 (2026-07-26 `/loop-eng` — 스키마 안전 계약 정적 검사)
> **착수 근거**: Supabase 어드바이저가 액세스 토큰이 없어 **세 사이클 연속 미실행**이다.
> 그중 마이그레이션 파일만 읽어도 결정적으로 판정되는 항목은 코드로 가져왔다 — "괜찮을 것"이라고
> 적는 대신 확인 가능한 만큼만 확인한다.
> - **잠근 규칙 4가지**: ① 모든 테이블 RLS 활성(19/19 통과) ② RLS 켠 테이블에 정책 1건 이상
>   (정책 없이 켜면 본인 데이터도 조용히 빈 목록) ③ 마이그레이션마다 롤백 스크립트 존재
>   ④ user_id 가진 모든 테이블이 계정 파기로 소멸.
> - **③은 이미 한 번 샜던 규칙이다** — CLAUDE.md 5절에 적혀 있었는데 2026-07-24 배치 5건이
>   아무도 확인하지 않아 빠졌고 Phase 20에서 손으로 보충했다. 손으로 돌린 검사는 또 샌다.
> - **연쇄 삭제를 계산에 넣었다**: `page_links`는 파기 목록에 없지만 `pages` cascade로 사라진다
>   — 목록만 보면 오탐이고, 오탐 나는 검사는 곧 무시된다. 단 **auth.users 연쇄는 불인정**
>   (파기는 계정을 남기고 데이터만 지우므로 그 cascade는 발동하지 않는다. 인정하면 전부 통과).
> - **검사가 통과를 가장하지 않게**: 경로를 cwd가 아닌 파일 기준으로(cwd 의존 시 0개 읽고
>   전부 통과), "실제로 읽었는가"를 먼저 단언, 판정 로직을 입출력과 분리해 **규칙 위반 가짜
>   입력에 실제로 실패하는지 11건으로 확인**. 실저장소에서도 롤백 파일을 치워 실패를 확인했다.
> - 부수: 지난 사이클 `recurrenceOptions.test.ts`가 저장소 관례(`lib/__tests__/`)를 벗어나
>   있어 옮겼다.
> - 검증: api 294 tests(+17) / turbo test·lint·build 18/18 GREEN → 배포(3527f3f).
> - **감사 결과 요약(이번 사이클 손으로 확인)**: RLS 누락 0 · 정책 0건 테이블 0 · 파기 누락 0 ·
>   롤백 누락 0. **성능 계열(인덱스)은 실제 쿼리 통계가 필요해 여전히 어드바이저 몫**이다.
> **다음: Phase 22 소진 → SCOPE로 신규 로드맵 발굴.**

> ## ⏭ Phase 21 전 Task 완료 (2026-07-26 `/loop-eng` — 파괴적 동작 안전망 일관성)
> **착수 근거**: 제품이 스스로 모순돼 있었다. 페이지는 지워도 휴지통에 남는데(is_trashed +
> TrashView + 복원·영구삭제가 이미 완성), 할 일·메모·습관은 hover로 뜨는 작은 아이콘 한 번에
> 확인도 undo도 없이 영구 소멸했다. 사용자는 그 경계를 알 방법이 없다.
> - **T1 계약**: `restoreTodo`/`restoreMemo` — 지운 행을 **같은 id로** 되살린다. 새 id면 할 일
>   순서(localStorage id 배열)와 RAG 임베딩(sourceId)이 끊긴다. user_id는 인자를 무시하고
>   로그인 사용자로 채운다(남의 데이터 생성 차단, 테스트로 잠금). 중복 되돌리기는 멱등 성공.
> - **T2 배선**: 공용 `UndoNotice`(위젯 안 인라인 — 전역 토스트 체계를 새로 들이지 않았다).
>   `role="status"`, 8초 자동 소멸, **마우스 올림·포커스 중엔 타이머 정지**(키보드로 탭 이동하는
>   중에 버튼이 사라지면 되돌릴 방법 자체가 없어진다). 연달아 지우면 key가 바뀌며 최신 것으로 교체.
>   되돌리기 실패는 조용히 넘기지 않고 알린다(복구된 줄 알면 안 된다).
> - **T3은 착수 후 설계를 바꿨다** — 습관에 되돌리기를 붙이면 **안 된다**. `habit_checks`가
>   `on delete cascade`라 습관을 지우면 체크 기록이 전부 함께 사라지고, 같은 id로 습관만
>   되살려도 스트릭은 빈 채로 온다. 되돌리기를 달면 사용자가 복구됐다고 믿고 기록을 잃는
>   **안전망처럼 보이는 함정**이 된다. → 되돌리기 대신 **삭제 전 확인**(사라질 기록 건수를
>   숫자로 밝힘, 기존 ConfirmDialog 재사용). 되돌릴 수 있으면 안 묻고, 못 되돌리면 묻는다.
> - **설계 결정(계획서에 근거 기록)**: 할 일·메모까지 soft delete로 확장하지 않았다(마이그레이션
>   2개 + 모든 조회 필터 + 타입별 휴지통 + 보관기간 청소가 따라오고, 조회 한 곳만 빠뜨려도 지운
>   항목이 검색·RAG에 되살아난다). "몇 초 뒤 진짜 삭제" 지연 방식도 기각(탭 닫으면 삭제 유실).
> - 검증: api 277 tests(+10) / turbo test·lint·build 18/18 GREEN.
>   e2e `undo-delete.spec.ts` 4건 추가(세션 있을 때 자동 실행) — 로그인 없이 도는 12건 통과, 31건 스킵.
> - **[사용자 확인]** 육안 검증은 로그인 필요 — manual-verification 15번.
> **다음: Phase 21 소진 → SCOPE로 신규 로드맵 발굴.**

> ## ⏭ Phase 20 전 Task 완료 (2026-07-26 `/loop-eng` — T2·T3 마감)
> **T2 계약 + T3 배선 완료.** 반복 할 일을 완료하면 사라지지 않고 다음 회차로 옮겨간다.
> - **완료 경로 한 곳에서만 처리** — 위젯 토글·일괄 완료·오리 에이전트가 전부 `updateTodo`를
>   지나므로 거기 붙였다. 경로마다 따로 붙이면 반드시 하나가 빠진다.
> - **완료가 아닌 갱신은 쿼리 수가 그대로다**(제목 수정·완료 해제는 반복 조회를 타지 않음).
>   회귀 테스트로 잠금 — "반복 없는 할 일의 동작은 한 글자도 안 바뀐다"가 계획서 수용 기준이었다.
> - **반복 조회 실패는 삼킨다**: 부가 기능 때문에 완료가 이 기능 붙이기 전보다 덜 안정적이 되면
>   안 된다. 실패해도 평소대로 완료되고, 진짜 실패면 뒤이은 update 에러가 그대로 올라간다.
> - **KST 경계**: 서버는 UTC로 도는데 그냥 쓰면 KST 00:00~09:00에 회차가 하루 어긋난다
>   (Phase 19 습관 체크와 같은 함정). 마감 시각은 보존하고(매주 화 오전 9시 → 다음 주도 오전 9시),
>   밀린 할 일은 마감일이 아니라 오늘 기준으로 따라잡는다.
> - **DB CHECK로 문법을 잠그지 않았다** — 파서가 이미 판정하는데 DB에도 두면 규칙이 갈라진다.
> - 화면: 행에 반복 선택 + 배지(설정된 항목은 상시 노출 — 왜 안 사라지는지 알 수 있어야 한다).
>   완료 시 낙관적 갱신값 대신 서버 응답으로 맞춘다(반복이면 서버가 "완료"가 아니라 "옮긴 상태"를 줌).
> - **리뷰가 잡은 별건**: 마이그레이션 5건에 down 스크립트가 없었다(CLAUDE.md 5절 위반) —
>   embeddings_rls_initplan·page_cover_url·page_links·atomic_xp_award·realtime_publication.
>   전건 작성해 채웠다. 이제 마이그레이션 전건이 down을 동반한다(스크립트로 재검사).
> - 검증: core 512(+12) · api 267(+9) · web 169(+8) tests / turbo test·lint·build 18/18 GREEN → 배포(de5c221).
>   **core 계약 변경이라 전 패키지 tsc가 office-tasks 픽스처 누락을 잡았다**(과거 교훈 재확인).
> - **[사용자 조치 필요]** 마이그레이션 미적용 → 반복 기능은 아직 실동작하지 않는다.
>   `supabase db push` 후 실기 검증. 절차·롤백 경로: manual-verification 14번.
> **다음: Phase 20 소진 → SCOPE로 신규 로드맵 발굴.**
>
> ## ⏭ Phase 20 착수 — T1 완료 (2026-07-26 `/loop-eng` — MUST 잔여 소진)
> Phase 19 소진 → SCOPE. **추측으로 신규 기능을 지어내기 전에, 이미 MUST로 확정해 둔 것 중 안 한 걸
> 먼저 찾았다.** 근거 소스 두 개를 코드로 전수 대조:
> - `feedback-2026-07-25.md` B절(사용자가 남긴 코드-완결 가능 항목) → **전 항목 이미 구현됨**을
>   코드로 확인(위젯 접기·통계 탭·설정 2열+연동 통합+잔디 이동·캘린더 월 그리드·오피스 에셋).
>   재구현 방지 표는 phase_20.md에 기록.
> - `FEATURES.md` MUST 19건 → 코드에 흔적 0건인 항목이 **딱 하나** 남음: **할 일 반복 규칙**
>   (`recurrence`/`rrule`/`반복 규칙` 전 저장소 0건, `todos` 테이블도 id·title·is_done·due_date뿐).
> - **T1 완료** — core `recurrence.ts`(매일 / 매주 요일 / 매월 날짜, 58 tests). 저장 문자열은 RRULE
>   어휘를 빌리되 파서는 3종만 — `rrule` 패키지는 쓰지도 않을 BYSETPOS·EXDATE·타임존까지 들여오는
>   대형 의존이라 미도입(어휘가 호환이라 나중에 승격 가능).
>   설계 핵심 3가지: ① 파싱 실패는 throw가 아니라 null(DB에 깨진 값이 있어도 반복만 꺼질 뿐 할 일
>   목록 전체가 죽으면 안 된다) ② 결과는 **항상 기준일보다 뒤**(같은 날 반환 시 완료해도 제자리 =
>   무한 루프. 한 달치 날짜 x 6규칙 단조증가 테스트로 잠금) ③ 매월 31일이 2월을 만나면 회차를
>   건너뛰지 않고 말일로 자른다(윤년 29일 포함) — 건너뛰면 반복 할 일이 사라진 것처럼 보인다.
> - **인스턴스를 미리 만들지 않는다**: 이 프로젝트는 무료 원칙상 서버 스케줄러가 없다. 미래 회차를
>   미리 생성하면 행 폭발 + 정리 스케줄러가 필요해진다. 대신 **완료 시 다음 회차로 굴린다**(행 1개
>   유지) — Todoist 기본 동작과 같은 모델. T3에서 배선.
> - 검증: core 500 tests(+58) / 전 패키지 turbo test·lint(17/17)·build(6/6) GREEN → origin/main 배포(df80ca9).
> - **남은 것**: T2 마이그레이션(`recurrence` 컬럼 + down) · T3 완료 시 롤오버 + 설정 UI.
> - **[사용자 조치 필요]** Supabase 어드바이저가 이번 세션에서도 `Unauthorized`로 차단 —
>   MCP 액세스 토큰 필요. 추측으로 "RLS 괜찮을 것"이라 쓰지 않았다. manual-verification 13번.
>
> ## ⏭ Phase 19 착수 — VOC 주도 SCOPE (2026-07-26 `/loop-eng`)
> Phase 18 소진 → 신규 로드맵 발굴. **마케팅 프레임워크 대신 `docs/feedback-2026-07-25.md`의 실제
> 사용자 피드백을 근거로 삼았다** — 추측 후보보다 사용자가 말로 요구한 미완 항목이 우선한다.
> 착수 전 코드로 중복 확인(이번 세션에 재구현 2회 위반 이력): 앱 액션 5종 존재·습관 체크만 없음,
> 뉴스 주제 필터 0건 확인. 계획: docs/plans/phase_19.md.
> - **T1 오리 대화 습관 체크** — 피드백 iter11이 "습관 체크 … 후속"으로 남긴 미완. 제목 매칭은 기존
>   `findTodoByTitle`(제네릭) 재사용, 다중 일치·미발견 시 아무것도 바꾸지 않고 되묻는다.
>   이미 체크된 습관은 에러가 아니라 **멱등 성공**으로 답한다(유일 제약 23505 흡수).
>   **서버 UTC 함정**: `new Date()`로 날짜를 만들면 KST 새벽에 어제로 기록된다 → core `kstDateString`
>   추가(+5 tests). 승인 카드 라벨도 추가.
> - **T2 뉴스 주제별 추천 피드** — 피드백 C절 "주제별 큐레이션". core `news-feeds.ts`(개발/AI/엔지니어링
>   3주제 9피드) + 뉴스 화면 1클릭 추가 칩(등록된 건 자동 제외). **URL은 추측하지 않고 9개 전부 실제
>   요청해 200 + RSS/Atom 확인 후 등록**(피드백 iter6 "등록했는데 0건" 재발 방지).
>   주식·부동산은 신뢰할 만한 무료 RSS를 자율로 고를 근거가 없어 **의도적으로 비웠다**.
> - 탈락(계획서에 근거 기록): 조회 도구(RAG와 중복), 삭제·수정 액션(오삭제 위험), 뽀모도로(클라 타이머).
> - 검증: core 442 · api 258 · web 158 tests / 전 패키지 tsc / lint / next build GREEN.
> - **[사용자 확인]** 5분 cron이 또 끼어들어 작업 중인 트리에 다른 변경을 섞었다(오리 영상 로고).
>   **cron 삭제함.** 해당 작업은 별도 커밋으로 분리했고, 사용자 제공 mp4 2개는 삭제가 아니라
>   ASCII 파일명으로의 **이름 변경**임을 바이트 크기 대조로 확인했다(1034383·2460380 일치).

> ## ⏭ Phase 18 전 Task 완료 (2026-07-26 `/loop-eng` — T4 주간 다이제스트 마감)
> **T1 공유 카드 · T2 시작 템플릿 · T3(축소) 빈 상태 · T4 주간 다이제스트 · T5 SEO 표면 — 모두 코드 완료.**
> 이번 사이클은 T4 수직 슬라이스(집계 → 본문 → 페이지 생성 → 알림)를 끝냈다.
> - **집계**: api `gatherActivity(supabase, since, until?)` — 기존 스탠드업의 24시간 수집을 기간 인자로
>   일반화(스탠드업은 until 없이 호출해 동작 불변). 지난 주 구간을 **로컬 자정 기준**으로 만든다
>   — 날짜 문자열을 ISO로 그대로 넘기면 UTC 해석으로 하루가 밀린다.
> - **본문**: core `formatWeeklyDigestLines` — **LLM을 쓰지 않는다**. 스탠드업(일간)이 이미 Gemini
>   요약을 담당하고, 주간 다이제스트는 무료 쿼터가 없거나 소진돼도 반드시 떠야 하는 복귀 훅이라
>   수치 요약으로 충분하다. 일정이 많은 주에 요약이 일정 목록으로 뒤덮이지 않게 5건에서 절단.
> - **배선**: `WeeklyDigestTrigger`(화면 없는 배경 컴포넌트, DesktopCollectorSync와 같은 패턴).
>   서버 스케줄러가 없으므로(무료 원칙) **방문이 트리거**. 실패는 조용히 넘긴다 — 사용자가 요청한
>   작업이 아니라 배경 작업이라 에러 토스트는 노이즈다. 주차 키를 성공 시에만 저장해 자연 재시도.
> - **자체 리뷰가 잡은 구멍**: 주차 키가 localStorage(기기별)라 **데스크톱 위젯과 브라우저를 같이 쓰면
>   같은 주 다이제스트가 두 번 생긴다.** 제목에 기간이 박혀 있으므로 생성 전 **서버에서 같은 제목
>   페이지를 확인**해 막았다.
> - 검증: core 426 · api 252 · web 147 tests / 전 패키지 tsc / lint / next build GREEN.
> - **[미검증]** 로그인 + 실제 활동 데이터 + 주 경계 경과가 필요해 육안 확인 불가 —
>   manual-verification.md 11번(재현 절차 포함).
> **다음: Phase 18 소진 → SCOPE로 신규 로드맵(phase_19) 발굴.**
>
> ## ⏭ Phase 18 T5 완료 (2026-07-26 `/loop-eng` — 발견성/SEO 표면)
> `robots.ts` + `sitemap.ts`. 이번 사이클은 로그인 없이 **실서버로 실제 검증이 되는** 작업이라
> curl 응답까지 확인했다.
> - **검증이 또 버그를 잡았다**: `/robots.txt`·`/sitemap.xml`이 proxy PUBLIC_PATHS 누락으로 303
>   리다이렉트 — 크롤러가 robots를 못 읽으니 SEO 정책 자체가 무의미한 상태였다(`/opengraph-image`와
>   같은 부류의 누락). 공개 경로 추가 → 200 확인. 파일 만들고 빌드만 봤으면 그대로 배포됐을 버그.
> - **계획서가 남긴 프라이버시 질문 확정 — 사이트맵에 공개 slug를 싣지 않는다.** Phase 12 T1이
>   열거 방지를 위해 RPC로 한 건씩만 반환하도록 설계했는데, 사이트맵이 전 slug를 나열하면 그 방어를
>   우리 손으로 무력화한다. 사용자는 링크를 골라 공유한 것이지 목록 공개에 동의한 게 아니다.
>   개별 페이지는 공유 링크로 도달·색인되고(robots `/p/` 허용) 목록은 배포하지 않는다.
> - **robots는 deny-by-default** — 사적 경로를 하나씩 막는 방식은 새 라우트를 빠뜨리면 워크스페이스가
>   색인되는 쪽으로 샌다. `Disallow: /` + 공개 표면만 열어 새 라우트는 기본 비공개가 되게 했다.
> - 정책은 테스트로 잠금(8 tests, "사이트맵에 /p/ 없음"은 완화 금지 주석 포함).
> - 검증: core 416 · api 248 · web 140 tests / tsc / lint / next build / 실서버 curl GREEN.
>   증거: `docs/loop-eng/screenshots/2026-07-26/phase18-t5-seo/served-output.md`.
> **Phase 18 남은 것: T4 나머지(주간 집계 → 페이지 생성 → 알림 배선). T1·T2·T5 완료, T3 축소 완료.**
>
> ## ⏭ Phase 18 T3 부분·T4 착수 (2026-07-26 `/loop-eng`)
> - **T3 빈 상태 코치 — 축소 판정**: 전 화면 빈 상태를 전수 조사하니 대부분 **이미 안내 문구가 있었다**
>   (투두·뉴스·통계). 계획서 전제("각 뷰가 막다른 길")가 이미 대체로 해소된 상태라, 공용 EmptyState로
>   전 화면을 갈아끼우는 건 겉모습만 바꾸는 과잉 작업으로 판단하고 **실제 결함 1건만** 고쳤다.
>   → **표 뷰 빈 상태가 거짓말하던 버그**: 표는 필터를 거친 행만 받는데, 필터가 전부 걸러내도
>   "아직 행이 없습니다"가 떴다(행이 20개 있어도 없다고 말함). `dbEmptyMessage`로 원본 개수·필터
>   유무를 보고 사실대로 안내(+5 tests). 캘린더 위젯은 CTA 자리가 마땅치 않아 의도적으로 남김.
> - **T4 주간 다이제스트 — 트리거 로직 완료(UI 미배선)**: core `weekly-digest.ts` — 요약 대상은
>   **지난 주**(이번 주를 요약하면 주 중간 다이제스트가 반쪽), 같은 주 중복 생성 방지, 저장 키 오염·
>   기기 시계 되돌림 방어. 13 tests. 기존 스탠드업(일간·LLM)과 별개 기능임을 확인.
> - 검증: core 416 · api 248 · web 132 tests / 전 패키지 tsc / 변경 lint / next build GREEN.
> **다음: T4 나머지(주간 집계 → 페이지 생성 → 알림 배선) 또는 T5(SEO 표면).**
>
> ## ⏭ Phase 18 T2 완료 + 보류 결정 3건 처리 (2026-07-26 `/loop-eng` — 사용자 "알아서 결정" 위임)
> **인벤토리 위반 자수**: T2 시작 템플릿을 core에 새로 만들다가, 이미 `apps/web/src/lib/pageTemplates.ts`에
> 템플릿 7종(회의록·일일 노트·주간 회고 등)이 있는 걸 발견했다. 내가 만든 core 모듈은 재구현이라
> **삭제하고 기존 것을 확장**했다. 실제로 빠져 있던 건 세 가지였다:
> - **데이터베이스 템플릿**(기존 시스템은 dbSchema 개념 자체가 없었음) — "프로젝트 트래커"(상태·우선순위·
>   마감일 + 칸반), "독서 목록"(상태·지은이·별점) 2종 추가. 열·뷰가 잡힌 채로 바로 열린다.
> - **날짜 제목** — "일일 노트"·"주간 회고"가 같은 제목으로 계속 쌓이던 문제. `templateTitle`로 만든 날짜
>   (주간은 그 주 월요일)를 붙인다. 날짜 계산은 core `toLocalDateString`/`startOfWeek`로 공용화
>   (로컬 포맷이 web·core 3곳에 중복돼 있었음, 4번째 복제 대신 추출).
> - **노출** — 템플릿이 사이드바 `+` 메뉴 안에만 숨어 있었다. 빈 상태를 "아직 페이지가 없습니다." 한 줄에서
>   "템플릿으로 시작하기 →" CTA로 교체(T3 빈 상태 코치의 첫 슬라이스).
> - **계약 확장**: `createPage`가 `dbSchema`를 받는다(rowProps와 동일한 zod 검증 패턴, +3 api tests).
>   덤으로 **기존 버그 수정** — 데이터베이스 페이지 복제 시 열·뷰가 통째로 유실되던 문제(코드 주석이
>   "createPage 계약상 미포함"이라 명시하던 제약)가 해소됐다.
> - 검증: core 403 · api 248 · web 127 tests / 전 패키지 tsc / 변경 lint / next build GREEN.
> - **[미검증]** 템플릿 갤러리·빈 상태는 로그인 뒤 화면이라 로컬에서 실제 렌더를 못 봤다. 앱을 못 띄우는
>   상태에서 마크업만 흉내 낸 스크린샷은 만들지 않았다 — manual-verification.md 10번.
>
> **보류였던 결정 3건 처리(사용자 위임)**:
> - **랜딩 유입 지표를 막던 차단 2건 수정** — `/welcome` CSP nonce 차단(정적 프리렌더라 요청별 nonce를
>   못 심음) → `force-dynamic` 한 줄. 그리고 CSP를 고쳐도 죽어 있던 Vercel Analytics
>   (`/_vercel/insights/script.js`가 미들웨어에 걸려 303→HTML) → matcher에 `_vercel` 제외.
>   CSP 콘솔 오류 23건 → 0건, 하이드레이션 정상. 증거: `screenshots/2026-07-26/phase18-csp-welcome/`.
> - **에셋 zip 3개 배포 제외** — 코드 참조 0건인 원본 아카이브가 `public/`에서 공개 URL로 재배포되고
>   있었다(에셋 팩 라이선스 위반 소지). gitignore + 추적 해제(로컬 파일·git 이력 보존).
> - **OG 카드 한글 제목 = 넣지 않음으로 종결** — 카톡·슬랙·X 모두 og:title을 텍스트로 렌더하므로 이미
>   보인다. 폰트 1.5MB 추가나 미문서화 UA 트릭 런타임 fetch는 얻는 것보다 잃는 게 크다.
> **다음: Phase 18 T3(빈 상태 코치 — 투두·뉴스·DB 뷰로 확대) 또는 T4(오리 주간 다이제스트).**
>
> ## ⏭ Phase 18 T1 완료 (2026-07-26 `/loop-eng` — 공개 페이지 바이럴 루프)
> **공유 링크가 카톡·슬랙·X에서 브랜드 카드로 뜨게 하는 OG 이미지 + 메타데이터 정비.** 배지는 이미
> PublicFooter에 있어(Phase 12 T1) 재구현하지 않음.
> - core `publicPageMetaCopy`(제목 1줄 정규화·70자/설명 200자 코드포인트 상한·빈 제목 폴백, 8 tests)
>   + `resolveSiteUrl`(NEXT_PUBLIC_SITE_URL → VERCEL_PROJECT_PRODUCTION_URL → VERCEL_URL → localhost, 8 tests).
> - web 루트 `opengraph-image.tsx`(1200x630, next/og, 외부 에셋·의존 0 — 절차적 오리 + 워드마크).
>   정적 프리렌더(`○`)라 런타임 비용 없음. 모든 라우트가 물려받음(/welcome·/p/[slug]).
> - **화면검증이 잡은 실제 버그 3건 수정**: ① `/opengraph-image`가 proxy PUBLIC_PATHS에 없어 303 —
>   크롤러가 카드 이미지를 아예 못 받던 상태 ② `metadataBase` 미설정으로 og:image가 `localhost:3000`으로
>   나감(정적 페이지에 빌드 시점 값이 박힘) ③ `/p/[slug]` title에 브랜드를 직접 붙여 layout template과
>   중복("… — Little Dev Duck — Little Dev Duck").
> - **이미지 안 한글 제목은 축소**: satori는 한글 폰트 버퍼가 있어야 하는데 저장소에 한글 폰트가 없어
>   넣으면 두부(□)로 깨진다. 카톡·슬랙·X 모두 og:title을 텍스트로 따로 렌더하므로 한글 제목은 이미 보인다.
>   폰트 자산(~1.5MB) 도입 여부는 사용자 결정 — manual-verification.md 9번.
> - 검증: core 393 tests(+16)·tsc / api 245 · ai 10 · mascot 9 · ui tsc / web tsc · next build · lint 전부 GREEN.
>   스크린샷 5장 + 매니페스트: `docs/loop-eng/screenshots/2026-07-26/phase18-t1-public-og/`.
> - **[사용자 확인 필요 · 우선순위 높음]** `/welcome`의 **모든 스크립트가 CSP nonce로 차단**되는 기존 버그
>   발견(이번 작업과 무관). 정적 프리렌더 HTML엔 요청별 nonce를 넣을 수 없어 하이드레이션·Vercel
>   `<Analytics/>`가 죽는다 — **랜딩 유입 지표 측정 불가**라 Phase 18 목적과 충돌. 수정안 3가지가 전부
>   보안 태세 변경이라 자율 미결정. 상세·재현: manual-verification.md 7번.
> **다음: Phase 18 T2(시작 템플릿 갤러리) 또는 T3(빈 상태 코치).**
>
> ## ⏭ 신규 로드맵 발굴됨 (2026-07-25 `/loop-eng` SCOPE — 마케팅팀 주도)
> **로드맵 소진(Phase 1~17 + 감사 22 + 픽셀오피스 A~I) → 정지 대신 marketing-skills로 신규 로드맵 생성.**
> **Phase 18 — 공유·성장 루프**(docs/plans/phase_18.md): 노션 패리티가 아니라 제품 고유 강점(공개 페이지
> 공유·오리·픽셀오피스)을 AARRR 성장 루프로 전환. 무료 원칙·단일 사용자 모델 준수. T1 공개페이지 바이럴
> 루프(powered-by 배지 + OG 이미지 자동생성) → T2 시작 템플릿 갤러리 → T3 빈 상태 코치 → T4 오리 주간
> 다이제스트 → T5 발견성/SEO. 탈락: 멀티유저 referral·수익화(무료원칙·YAGNI). **다음: T1부터 BUILD.**
>
> ## ⏭ 다음 세션 이어서 하기 (2026-07-25 `/loop-eng` 자율 — 시트 파일명 규약 core 추출)
> **이번 `/loop-eng` 반복 결과(5db76b9): office-characters.ts sheetUrl의 파일명 매핑을 core
> `characterSheetFileName`로 추출 + 디스크 실제 파일명 8개를 계약 테스트로 잠금.** 파일명 불일치는 로더가
> catch로 조용히 폴백해 화면으로만 발견되던 표면(e5168b5 우향프레임 버그와 같은 부류) — 결정론적 회귀 차단.
> 검증: core 377 tests(+3)·tsc / web tsc / core·web(변경파일) lint GREEN. 미테스트 lib 잔여
> (office-draw·sprite-loader·office-sound·realtime·apiHelpers)는 재확인 결과 전부 canvas/DOM/WebAudio/
> Supabase realtime/NextResponse = 순수 로직 아님(추출 대상 소진 재확인). 미커밋 변경 없음(zip 제외).
>
> **직전 `/loop` 반복 결과(baseline 검증)**: test 11/11 패키지 · lint 11/11 · build 6/6, 전부 turbo 캐시 히트.
> **2026-07-24 인계 이후 실제 진행(git log, Status 최상단이 그간 stale했음)**: 픽셀 오피스 스레드 계속 —
> Modern Interiors 통합(39924fc) → 직원 스프라이트 좌향 반전 수정(e5168b5) / 앱-액션 자동 RAG 인덱싱
> (ce81445·9a8f4ce) / web lib 순수함수 테스트 추출(bookmarkedArticles a44ce0c).
> **자율 코드-완결 스코프 재확인 = 소진**: web lib 잔여 미테스트 파일(office-draw·realtime·sprite-loader·
> office-sound·apiHelpers)은 전부 canvas/DOM/env — 순수 로직 아님(순수분은 이미 core로 추출·테스트). core
> office 도메인 11파일 전부 대응 테스트 존재. 활성 오피스 작업은 시각 폴리시(최근 버그 2건 다 육안 발견)라
> 자율 검증 불가.
> **더 진행하려면 사용자 필요(unblock 목록)**: ① OAuth 기기 실기검증(Google Calendar/GitHub/Gmail 어댑터)
> ② Sentry 계정(13 T5) ③ i18n 착수 승인(13 T6, 대규모) ④ Tauri sidecar/hooks·RN 기기(오피스 실이벤트 연동)
> ⑤ 픽셀 오피스 시각 폴리시 육안 검증. **인프라(db push)는 2026-07-24 Supabase MCP로 전건 적용 완료 — 더는 블로커 아님.**
> **미추적 파일**: `apps/web/public/Modern_Interiors_Free_v2.2.zip`(1.1MB 원본 아카이브) — 추출 스프라이트는
> 39924fc에 커밋됨. 직전 커밋이 추출본만 넣은 의도를 존중해 zip은 미커밋 유지. 커밋/gitignore/삭제는 사용자 판단
> (public/에 이미 다른 zip 2개는 추적 중이라 관례 상충 — 자율 미결정).
> **재개**: `/next-step` 또는 `/loop /next-step`. 새 스코프·인프라가 열리면 즉시 재개.

> ## ⏭ 다음 세션 이어서 하기 (2026-07-24 ~08:2x 인계)
> **이번 `/loop` 자율 세션 결과: 33개 커밋(기능 32 + a11y 1)을 6회에 걸쳐 origin/main 배포, CI 6회 전부 green,
> 미푸시 0.** 코드로 완결 가능한 노션-격차 고가치 기능(프로젝트 자체 gap-analysis + FEATURES.md 146항 전수
> 대조)을 사실상 소진.
> **재개 방법**: 새 세션에서 `/next-step` 또는 `/loop /next-step`. (워치독 cron `7dc122ee`는 세션 전용이라
> 세션 종료 시 소멸 — 다음 세션에서 재설정 필요.)
> **다음 세션 최우선(사용자 인프라가 열려야 진행 가능)**:
> 1. `supabase db push` 미적용 4건 — pages_db_view(11)·pages_public_share(12)·delete_all_my_data(13)·news(15).
>    적용 후 DB 뷰/공개공유/계정삭제/뉴스 실기 검증.
> 2. OAuth 기기 실기검증(Google Calendar/GitHub/Gmail 어댑터), Gemini 키가 `/api/ai/write`에도 필요(이미 등록됨).
> 3. 인프라 열리면 코드-완결 가능한 다음 차수: Realtime 멀티서피스 동기화(publication 마이그레이션+subscribeTable),
>    백링크(page_links 테이블), 페이지 커버(cover_url 컬럼) — 전부 마이그레이션 선행.
> 4. 새 의존성 P2(자율 보류): 코드블록 하이라이팅(@blocknote/code-block), 수식/컬럼 — lockfile·CI frozen 위험.
> **이번 세션 신규 기능은 아래 각 Phase "후속" 항목과 git log 참조.**

> **`/loop` 자율 세션(2026-07-24 04:2x~ 시작) 진행 중**: 코드 완결 가능한 노션-격차/이월 기능을 STDD+ponytail로
> 연속 구현·커밋(각 tsc+eslint+테스트 GREEN). **푸시·배포 정책: 6시간 간격.**
> **1차 배포(~06:55 KST)**: 21개 기능 + 리뷰 수정 배치. 검증=리뷰(code+security, CRITICAL 0, HIGH/MEDIUM
> 전건 수정) + 테스트 + web tsc + 전체 eslint + next build GREEN. push 직후 CI red(api 빌드 tsc가 테스트 파일
> 포함 — pages.test 뷰 픽스처 sort/filters 누락) 발견·즉시 수정 → CI green. **교훈: core 계약 변경 시 전 패키지
> tsc 필수**(메모리 기록).
> **2차 배포(~07:35 KST)**: DB 열숨기기·팔레트 최근페이지·보드 select 칩·단축키 도움말 4개.
> **3차 배포(~07:50 KST)**: 뉴스 읽음상태·모두읽음·표 행개수 3개. 전 배포 전 패키지 tsc + 테스트 423 + web
> tsc/eslint/next build 검증, CI(lint-and-test + e2e Playwright) 전부 green. **누적 28개 기능 배포.**
> **자율 한계 도달**: 코드로 완결 가능한 고가치 노션-격차/이월 기능 대부분 소진. 남은 로드맵 항목은 사용자
> 인프라 필요(아래 목록). 과잉 기능은 자제. cron 워치독(1분)이 루프를 살려두며, 사용자가 인프라를 열거나
> 새 요구가 생기면 재개. **[사용자 결정/입력 대기]**: ① `supabase db push`(pages_db_view·pages_public_share·
> delete_all_my_data·news 마이그레이션) ② OAuth 기기 실기검증(Calendar/GitHub/Gmail) ③ Sentry 계정(13 T5)
> ④ i18n 착수 승인(13 T6, 대규모) ⑤ Tauri/RN(기기). 완료 기능은 아래 각 Phase "후속" 및 git log 참조.
> **중간 리뷰(2026-07-24, 20커밋 누적 diff)**: code-reviewer + security-reviewer 병렬 실행. **CRITICAL/배포차단 0건.**
> HIGH 1건(낙관적 업데이트 stale rollback — 실패 응답이 그 사이 성공한 최신 편집을 덮어씀) + MEDIUM 3건
> (에러 타이머 미취소, addFilter MAX_FILTERS 미가드, CSV 수식 인젝션) + 보안 선택 1건(RSS href 스킴) **전부 수정**.
> stale rollback은 함수형 업데이터로 "현재값==내가 설정한 값일 때만 롤백"으로 해소. 전체 테스트 422 GREEN
> (core 196/api 211/ai 10/mascot 5) + web tsc + 전체 eslint GREEN.

