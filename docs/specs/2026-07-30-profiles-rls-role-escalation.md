---
id: SPEC-2026-07-30-profiles-rls-role-escalation
title: profiles RLS 권한 상승 차단 (role/disabled_features 컬럼 보호)
status: draft
created: 2026-07-30
approved:
e2e_runner: playwright
e2e_command: "pnpm --filter web e2e"
runner_setup_needed: false
source_task: '{"line":"🛑 security: profiles RLS 권한 상승 차단 (role/disabled_features 컬럼 보호) — supabase/migrations/20260720100000_profiles.sql","area":"security","severity":"S1","effort":"low","title":"profiles RLS 권한 상승 차단 (role/disabled_features 컬럼 보호)","slug":"profiles-rls-role-escalation","priority":1}'
---

## 1. 목표·배경

`public.profiles`의 `profiles_update_own` 정책(`20260720100000_profiles.sql`)은
`using (id = auth.uid()) with check (id = auth.uid())`로 **행 단위**만 검사한다. Postgres RLS는
행 단위 정책이라 이 정책만으로는 "본인 행 안에서 어떤 컬럼까지 바꿀 수 있는지"를 제한하지 못한다.

`20260726130000_user_roles_and_layout.sql`이 `profiles`에 `role`(admin/user/customer)과
`disabled_features`(관리자가 끈 기능 목록) 컬럼을 추가했다. 앱 코드(`updateMyProfile`)와 화면
(`ProfileSettings.tsx`)은 이 두 컬럼을 아예 받지 않도록 짜여 있지만, 이는 **애플리케이션 계층의
방어일 뿐**이다. Supabase REST API(`anon`/`authenticated` 키는 공개값)를 앱 UI 없이 직접 호출하면
`PATCH /rest/v1/profiles?id=eq.<자기id>` 요청 본문에 `{"role":"admin"}` 또는
`{"disabled_features":[]}`를 실어 보낼 수 있고, 현재 정책은 `id = auth.uid()`만 확인하므로 이 요청을
그대로 통과시킨다. 즉 로그인만 한 일반 사용자가 스스로 관리자 권한을 얻거나 자신에게 걸린 기능
제한을 해제할 수 있다 — `packages/api/src/access.ts` 주석이 명시하는 설계 의도("권한의 단일
출처는 RLS")가 실제로는 지켜지지 않는 상태다.

이 스펙은 `role`/`disabled_features` 컬럼 변경을 **DB 레벨**에서 관리자(`is_admin()`)에게만 허용하도록
잠그고, 회귀를 정적 검사로 못박는 것을 목표로 한다. 새 기능 추가나 UI 변경은 범위 밖이다.

## 2. 수용 기준 (Acceptance Criteria)

- **AC-1**: `public.profiles`에 대한 UPDATE 시, `is_admin()`이 거짓인 세션이 `role` 또는
  `disabled_features` 값을 OLD 값과 다르게 바꾸려 하면 DB가 해당 트랜잭션을 예외로 거부한다
  (앱 코드를 거치지 않고 REST API를 직접 호출해도 동일하게 거부된다).
- **AC-2**: `is_admin()`이 참인 세션이 임의 사용자 행의 `role`/`disabled_features`를 바꾸는 기존
  관리자 플로우(`setUserRole`, `setUserDisabledFeatures`, `AdminUserPanel`)는 회귀 없이 그대로
  동작한다.
- **AC-3**: 일반 사용자가 본인 행의 `display_name`/`avatar_url`/`dashboard_layout`을 바꾸는 기존
  플로우(`updateMyProfile`, `saveMyDashboardLayout`, `ProfileSettings`)는 회귀 없이 그대로 동작한다
  (트리거가 이 컬럼들의 변경까지 막지 않는다).
- **AC-4**: 신규 마이그레이션 파일과 짝이 되는 롤백 스크립트가 `supabase/rollback/`에 존재하며,
  `schemaGuard`의 `findMissingRollbacks` 검사가 통과한다.
- **AC-5**: 정적 스키마 검사(`packages/api/src/schemaGuard.ts` 확장)가 `profiles` 마이그레이션
  집합에서 `role`/`disabled_features` 컬럼 변경을 비관리자에게 차단하는 트리거의 부재를 잡아낸다
  — 즉 이 보호가 이후 실수로 제거되거나 새 컬럼에 같은 구멍이 생기면 테스트가 실패한다.

## 3. E2E 시나리오 (Given/When/Then)

### E2E-1 (covers: AC-1)
- Given: 저장된 실 로그인 세션(`apps/web/e2e/.auth/user.json`)이 유효하고, 세션 계정의 현재
  역할이 `admin`이 **아니다**(관리자면 자기 자신에 대한 변경도 정책상 허용되어 시나리오가 성립하지
  않으므로 `test.skip`으로 건너뛴다 — 실패가 아니다, `AUTH_STATE`/`judgeAuthState` 스킵 관례와
  동일).
- When: Playwright API 요청 컨텍스트로 해당 세션의 Supabase 액세스 토큰을 실어
  `PATCH {NEXT_PUBLIC_SUPABASE_URL}/rest/v1/profiles?id=eq.<본인id>`에
  `{"role":"admin"}`을 직접 보낸다(앱 UI를 거치지 않는다).
- Then: 요청이 거부되거나(비-2xx) 거부되지 않더라도 이어지는 `GET`으로 재조회한 `role` 값이
  변경 전과 동일하다(`getMyAccess`로 확인). 둘 중 하나만 성립해도 방어가 유효한 것으로 본다.

### E2E-2 (covers: AC-3)
- Given: 저장된 실 로그인 세션이 유효하다.
- When: 설정 화면에서 표시 이름을 임시 값으로 바꾸고 저장한 뒤, 새로고침하여 반영을 확인하고
  원래 값으로 되돌려 저장한다(테스트가 실 계정 데이터를 오염시키지 않도록 원상복구까지 포함).
- Then: 두 번의 저장 모두 성공하고, 역할 표시 텍스트("역할은 관리자만 바꿀 수 있어요")는 항상
  읽기 전용으로 남아 있다.

### E2E-3 (covers: AC-2)
- Given: 저장된 실 로그인 세션의 계정이 `admin`이고, 관리자 패널(`/admin`)에 자기 자신 외
  최소 1명의 다른 사용자 행이 존재한다(2026-07-26 시점 실 배포에는 사용자가 1명뿐이라 이 조건이
  아직 성립하지 않을 수 있다 — 성립하지 않으면 `test.skip`으로 건너뛴다, 실패 아님).
- When: 관리자 패널에서 그 다른 사용자의 역할 또는 기능 토글을 변경한다.
- Then: 변경이 성공하고 목록을 다시 불러오면 새 값이 반영돼 있다.

### E2E-4 (covers: AC-4, AC-5)
- Given: 신규 마이그레이션·롤백 파일이 저장소에 존재한다.
- When: `pnpm test`(→ `packages/api` `schemaGuard.test.ts` 포함)를 실행한다.
- Then: "모든 마이그레이션에 짝이 되는 롤백 스크립트가 있다" 및 "profiles 권한 컬럼 보호 트리거가
  존재한다"(신규) 두 검사가 모두 GREEN이다. 전 패키지 tsc + eslint + test도 GREEN이다.

## 4. 테스트 매트릭스

| AC | unit | integration | e2e |
|---|---|---|---|
| AC-1 | `schemaGuard.test.ts`: 트리거 없는 가짜 profiles 마이그레이션 입력 → 위반 검출 | 신규 마이그레이션 실 SQL 텍스트에 `before update` 트리거 + `is_admin()` + `role`/`disabled_features` 조건이 함께 존재하는지 파싱 확인 | E2E-1 |
| AC-2 | `access.test.ts`: `setUserRole`/`setUserDisabledFeatures`가 여전히 대상 id로 `update` 호출을 만드는지(가짜 클라이언트) | — | E2E-3 |
| AC-3 | `access.test.ts`: `updateMyProfile`/`saveMyDashboardLayout`가 `role`/`disabled_features` 키를 payload에 절대 포함하지 않는지 | — | E2E-2 |
| AC-4 | `schemaGuard.test.ts`: `findMissingRollbacks`에 신규 파일 쌍 포함 | 실 `supabase/migrations`·`supabase/rollback` 디렉터리 대조 | E2E-4 |
| AC-5 | `schemaGuard.test.ts`: 신규 검사 함수의 메타 검증(트리거 있는/없는 가짜 입력 각각) | 실 마이그레이션 전체에 대해 신규 검사 실행 → 위반 0건 | E2E-4 |

## 5. 비범위 (Out of Scope)

- `role`/`disabled_features` 외 다른 컬럼에 대한 컬럼 단위 보호 일반화(예: `dashboard_layout`을
  관리자가 못 건드리게 막는 것) — 현재 관리자가 개인화 영역을 건드릴 유인이 없어 후순위.
- 관리자 화면·API의 신규 기능 추가(초대, 역할 종류 확장 등).
- 다중 실계정 테스트 인프라(로컬 Supabase 스택, 서비스 롤 키로 임시 테스트 유저 생성 등) 구축 —
  현재 실배포 계정이 1명뿐이라(`AdminUserPanel.tsx`) E2E-3은 조건부 스킵으로 남긴다. 별도 스펙
  후보.
- `20260720100000_profiles.sql`·`20260726130000_user_roles_and_layout.sql` 등 이미 적용된
  마이그레이션 파일 자체의 수정 — 새 마이그레이션을 추가하는 방식으로만 고친다(적용된 DDL을
  손대지 않는다는 이 저장소 관례).

## 6. 리스크·가정

- **가정**: 트리거 기반 컬럼 보호가 Postgres에서 표준적인 컬럼 단위 RLS 대체 패턴이다(RLS 정책
  자체는 행 단위라 컬럼 단위 제한을 표현할 수 없음 — `20260726130000` 마이그레이션 주석에도 동일한
  전제가 남아 있다).
- **가정**: `is_admin()` 함수(SECURITY DEFINER, anon 회수 완료)가 이미 존재하고 신뢰할 수 있다 —
  재사용하며 새로 만들지 않는다.
- **리스크**: E2E-1·E2E-3은 실 배포 Supabase 프로젝트와 실 계정 세션에 의존한다. 세션이 만료됐거나
  계정 역할이 시나리오 전제와 다르면 스킵된다(실패 아님) — CI에서는 인증 세션 시크릿
  (`E2E_AUTH_STATE_B64`)이 등록돼 있지 않으면 두 시나리오 모두 자동 스킵된다(`e2e/README.md` 기존
  관례와 동일).
- **리스크**: 트리거가 `before update for each row`로 걸리므로 대량 업데이트(예: 관리자 일괄 작업)
  시 행마다 함수가 호출된다 — 사용자 수가 적은 현재 규모에서는 성능 영향이 무시할 만하다.
- **리스크**: 트리거 예외 메시지가 PostgREST를 통해 그대로 노출될 수 있다 — 한국어 사용자向 안내
  문구인지, 내부 구현 노출인지 구현 시 확인 필요(치명적이지 않으나 UX 관점 확인 대상).
- **미검증**: 이 스펙 작성 시점에는 실제 배포 계정의 현재 `role` 값과 사용자 수를 Supabase MCP로
  조회하지 않았다 — E2E-1/E2E-3의 스킵 조건이 실행 시점에 어느 쪽으로 갈리는지는 [추정]이다.
