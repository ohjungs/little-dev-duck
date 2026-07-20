# Phase 4 — GitHub 커밋 잔디

작성일 2026-07-20. Phase 3(오리 1단계)의 사용자 클릭 검증은 별도 세션에서 진행 중이라, 이 세션은
로드맵 순서대로 Phase 4에 착수한다(사용자 지시).

## 착수 전 확인 (DECISIONS.md #9-3 해소)

미해결 항목 "GitHub GraphQL contributions 스코프 세부"를 조사로 해소했다.

- GitHub GraphQL `user(login: X) { contributionsCollection { contributionCalendar } }`는
  **공개 프로필 데이터**라 특별한 OAuth 스코프가 필요 없다 — scope 없는(no-scope) 토큰으로도
  조회 가능(GitHub OAuth Apps 문서: "no scope" = 공개 정보 읽기 전용 접근) [확인됨].
- 따라서 로그인 시점의 GitHub `provider_token`을 별도로 캡처·암호화·저장하는 `connections` 테이블은
  이번 Phase에서 만들지 않는다. 대신 서버 전용 환경변수 `GITHUB_TOKEN`(scope 미선택 Personal Access
  Token 1개, 앱 전체가 공유)으로 충분하다 — 사용자별 토큰 발급/저장/암호화 없이 공개 데이터만 조회.
  `connections` 테이블은 실제로 스코프가 필요한 연동(Gmail 등, Phase 10)에서 설계한다(YAGNI).
- 조회 대상 GitHub 로그인명은 Supabase Auth의 `user.identities[].identity_data.user_name`
  (provider === "github", OAuth 연동 시점에 GitHub가 내려준 값)에서 읽는다 [추정 — 실제 필드명은
  최초 GitHub 로그인 시 실측 필요]. `preferred_username`도 폴백으로 확인한다.
  **주의**: 처음에는 `user.user_metadata.user_name`을 썼으나, 코드 리뷰(2026-07-20)에서
  `user_metadata`는 로그인한 본인이 `auth.updateUser()`로 직접 덮어쓸 수 있는 필드라 클라이언트가
  임의 GitHub 사용자명을 주입할 수 있다는 HIGH 지적을 받아 `identities[].identity_data`(OAuth
  프로바이더가 내려준 값, 사용자가 직접 수정 불가)로 교체했다.
- 반복 요청/재시도 버튼 연타로 공유 `GITHUB_TOKEN`의 요율 한도가 소모되는 것을 막기 위해
  로그인명별 30분 인메모리 TTL 캐시를 API Route에 추가했다(Vercel 서버리스라 인스턴스 간 캐시
  공유는 보장되지 않지만, 동일 웜 인스턴스 내 반복 호출은 걸러진다 — 개인 프로젝트 트래픽에는
  충분).

## 완료 정의

- 홈 위젯 대시보드에 로그인 사용자의 GitHub 컨트리뷰션 캘린더(잔디)가 표시된다.
- GitHub 사용자명을 알 수 없는 경우(Google 로그인 등) 빈 상태 안내를 표시한다(에러 아님).
- API/네트워크 실패 시 에러 상태 + 재시도 버튼을 표시한다(Todo/Memo 위젯과 동일한 패턴).

## Task (계약 잠금 -> 구현, 이번 Phase는 규모상 순차 진행)

### T1. packages/core — 컨트리뷰션 도메인 스키마 (계약 잠금)
- [ ] `contributionDaySchema`(date, count), `contributionSummarySchema`(totalCount, days[]) 추가.
- STDD: 정상/경계값(음수 count 거부 등) 케이스.

### T2. packages/api — GitHub GraphQL 클라이언트
- [ ] `fetchGithubContributions(login, token, fetchImpl?)`: GraphQL POST -> 매핑 -> zod 검증.
- STDD: 정상 매핑, GitHub errors 배열 응답, HTTP 실패(4xx/5xx), 사용자 없음(user: null) 케이스.
      todos.test.ts와 동일하게 fetch를 목(mock)으로 주입해 네트워크 없이 테스트.

### T3. apps/web — API Route
- [ ] `GET /api/github/contributions`: 세션 확인(401) -> GitHub 로그인명 없음(`{linked:false}`,
      200) -> `GITHUB_TOKEN` 미설정(500) -> 조회 실패(502) -> 성공(`{linked:true, summary}`, 200).

### T4. apps/web — 잔디 위젯 UI
- [ ] `GithubContributionWidget`: 로딩/에러/ready(연결 안 됨 | 캘린더 그리드) 상태.
- [ ] 셀 색상은 `--ldd-color-accent`/`--ldd-color-surface` 토큰을 `color-mix()`로 5단계 강도
      매핑(캐릭터 고정 팔레트 자체는 건드리지 않음).
- [ ] 홈 대시보드(`apps/web/src/app/page.tsx`)에 Todo/Memo와 함께 배치.

### T5. 검증
- [x] 전 패키지 `pnpm build && pnpm lint && pnpm test` 통과.
- [x] code-reviewer + security-reviewer 병렬 리뷰 — HIGH 1건(user_metadata 위조 가능성) 수정 완료,
      MEDIUM(서버 로깅 부재, force-dynamic 미명시) 수정 완료. MEDIUM 1건(API Route 자체의
      단위 테스트 부재)은 의도적으로 보류 — apps/web에는 아직 vitest 인프라가 없고(Todo/Memo
      위젯도 동일하게 e2e만 커버), 이 Route 하나를 위해 새 테스트 하네스를 도입하는 것은 이번
      Phase 스코프 대비 과함(YAGNI). apps/web에 vitest가 필요한 두 번째 사례가 생기면 그때 도입.
- [ ] `GITHUB_TOKEN` 미설정 로컬 환경에서도 앱이 죽지 않고 에러 상태로 표시되는지 확인.
- [ ] 실사용 클릭 검증은 GitHub 로그인 계정 + Vercel `GITHUB_TOKEN` 등록이 필요 — 배포 후 사용자
      검증 대기(Phase 2/3와 동일 제약).

## 하지 않는 것 (이번 Phase 제외)

- `activity_daily` 테이블 영속화 — 실시간 GraphQL 조회로 충분(YAGNI). Phase 5가 Claude Code
  집계를 저장해야 할 때 필요하면 그때 테이블을 만들고, 그 시점에 GitHub 쪽도 같이 옮길지 판단한다.
- 오리 상태머신이 커밋 수신에 반응하는 것(Phase 6 스코프).
- 비공개 저장소 기여 특별 처리 — GitHub 프로필 자체의 "Include private contributions" 설정을
  그대로 반영하되, 이를 켜고 끄는 UI는 만들지 않는다.
- Google 로그인 사용자의 GitHub 계정 연결(`linkIdentity`) 플로우 — 빈 상태 안내로 대체.
- 리뷰-학습 루프 2단계 승격(로컬 스케줄러 + headless 일일 배치, DECISIONS.md #9-6) — Phase 4~5가
  승격 후보 시점이라고 문서에 적혀 있지만 별도 인프라 결정(상시 실행 스케줄러, API 비용 자동 소모)이라
  사용자 명시 요청 없이는 착수하지 않는다.

## 사용자 조치 필요 (자동화 불가)

- https://github.com/settings/tokens 에서 **scope 미선택** Classic Personal Access Token 발급
  (공개 데이터 읽기 전용이라 어떤 권한도 체크하지 않아도 됨).
- Vercel 프로젝트 환경변수에 `GITHUB_TOKEN` 등록 + 로컬 `apps/web/.env.local`에도 추가.

## 리스크

- `identities[].identity_data.user_name` 필드명 추정 — 실제 GitHub 로그인 후 다르면 T3에서 폴백
  필드 추가 필요.
- 공유 PAT 1개로 앱 전체 요청을 처리 — GitHub GraphQL 요율 제한(포인트 기반, 시간당 5000)은
  개인 프로젝트 트래픽에서 문제 되지 않고, 30분 TTL 캐시로 반복 호출도 줄어든다.
- 30분 인메모리 캐시는 Vercel 서버리스 인스턴스가 재활용될 때만 유효 — 콜드 스타트마다 캐시가
  비어 있을 수 있음(허용 가능한 수준으로 판단, 개인 프로젝트 트래픽 기준).
