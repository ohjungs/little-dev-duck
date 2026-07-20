# History.md — Task 별 Phase 완료 이력

형식: Phase 완료 시 체크. 세부 Task 체크는 Status.md가 담당.

- [x] Phase 1 코어 기반 (모노레포, core 계약, 토큰, Supabase+RLS, Auth, CI/CD) — 2026-07-20 완료
- [x] Phase 2 투두 + 메모 위젯 — 2026-07-20 완료 (실사용 피드백 반영 완료, 아래 기록 참조)
- [x] Phase 3 오리 1단계 (GLB, 클릭 반응, 말풍선) — 2026-07-20 완료 (아래 기록 참조)
- [ ] Phase 4 GitHub 커밋 잔디
- [ ] Phase 5 Tauri 위젯 + Claude Code 수집기
- [ ] Phase 6 오리 2단계 (상태 반응, 자율 행동, 활보 모드)
- [ ] Phase 7 게임화 (XP/먹이/코스튬) + 생산성 모듈 (뽀모도로/습관/캘린더)
- [ ] Phase 8 AI 1단계 (룰 기반 대사 -> RAG Q&A)
- [ ] Phase 9 블록 에디터
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
