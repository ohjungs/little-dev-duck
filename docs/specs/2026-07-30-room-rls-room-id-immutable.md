---
id: SPEC-2026-07-30-room-rls-room-id-immutable
title: room_members/messages RLS room_id 불변조건 추가 (멤버십·메시지 위조 차단)
status: draft
created: 2026-07-30
approved:
e2e_runner: playwright
e2e_command: "cd apps/web && npx playwright test"
runner_setup_needed: true
source_task: room_members/messages RLS room_id 불변조건 추가 (멤버십·메시지 위조 차단)
---

## 1. 목표·배경

`supabase/migrations/20260727030000_messenger_rooms.sql`이 정의한 `room_members_update_self`와
`messages_update_sender` 정책은 **행의 소유자 검사만** 한다(`user_id = auth.uid()` /
`sender_user_id = auth.uid()`). 두 정책 모두 `room_id` 컬럼은 USING/WITH CHECK 어디서도
제약하지 않는다 — 자기 소유 행이기만 하면 **어느 컬럼이든** 바꿀 수 있다는 뜻이고, 여기엔
`room_id`도 포함된다.

이게 왜 위험한가:
- **멤버십 위조(P9)**: 로그인한 사용자가 자기 `room_members` 행 하나를 골라 PATCH로
  `room_id`만 다른 방의 id로 바꾸면, 초대·`room_members_insert_self` 정책을 전혀 거치지 않고
  그 방의 멤버가 된다. 이후 `is_room_member(room_id)`가 참이 되므로 그 방의 메시지도 읽힌다 —
  "남의 대화가 보인다"는 이 스키마가 가장 경계한 실패 모양(20260727030000 머리말 참조)이 다른
  경로로 재현된다.
- **메시지 위조(P10)**: 사용자가 자기 메시지 하나의 `room_id`를 다른 방 id로 바꾸면, 그 방의
  멤버 여부와 무관하게(INSERT 시점에만 `is_room_member`가 걸리고 UPDATE 정책엔 그 조건이 없다)
  메시지가 다른 대화로 옮겨진다 — 대화 기록이 사후에 조작될 수 있다.

정적으로 확인함(2026-07-30): 이 저장소의 어떤 호출부도 `room_members`·`messages`의 `update()`에
`room_id`를 실어 보내지 않는다(`packages/api/src/rooms.ts` 전수 확인 — `room_id`는 전부
`.eq("room_id", ...)` 필터 또는 INSERT 시점 값이다). 즉 **정상 경로는 room_id를 절대 바꾸지
않는다** — 이 필드를 잠가도 기존 기능은 아무것도 잃지 않는다.

Postgres RLS의 USING/WITH CHECK는 각각 갱신 전/후 행에 대해 독립적으로 평가되므로 "이전 값과
같아야 한다"를 정책 하나로 표현할 수 없다(OLD·NEW를 동시에 비교할 수 없음). 이 저장소는 이미
같은 이유로 `touch_room_on_message` 같은 트리거 함수를 쓰고 있다(20260727060000) — 이번 수정도
같은 방식을 따른다: `room_members`·`messages`에 각각 BEFORE UPDATE 트리거를 달아, `room_id`가
바뀌는 UPDATE를 예외로 거부한다.

## 2. 수용 기준 (Acceptance Criteria)

- **AC-1**: `room_members` 행에 대해 `room_id`를 바꾸려는 UPDATE는 거부된다(트랜잭션 에러). 같은
  행의 `last_read_message_id`·`muted_until`·`pinned_at` 등 다른 컬럼 갱신은 그대로 허용된다.
- **AC-2**: `messages` 행에 대해 `room_id`를 바꾸려는 UPDATE는 거부된다(트랜잭션 에러). 같은 행의
  `body`(수정)·`deleted_at`(소프트 삭제)·`edited_at` 갱신은 그대로 허용된다.
- **AC-3**: `room_id` 불변 가드(함수 + 트리거)가 `room_members`·`messages` 양쪽 마이그레이션에
  존재하고, 짝이 되는 롤백 스크립트가 그 함수·트리거를 정확히 제거한다.
- **AC-4**: 정적 스키마 검사(`packages/api/src/schemaGuard.ts` 계열)가 두 테이블의 `room_id` 불변
  가드 존재 여부를 결정적으로 판정한다 — 가드가 마이그레이션에서 빠지면 검사가 실패해야 한다
  (거짓 통과 방지, 메타 검증 포함).
- **AC-5**: 기존 동작 무회귀 — `packages/api/src/rooms.test.ts`(가짜 클라이언트 단위 테스트)와
  `packages/api/src/schemaGuard.test.ts`(정적 검사) 전 항목이 이번 변경 이후에도 그대로 GREEN이다.

## 3. E2E 시나리오 (Given/When/Then)

> 이 변경은 UI가 없는 DB 계층 보안 수정이다. 브라우저 화면 흐름으로는 재현되지 않는 공격이라(정상
> 화면 어디에도 `room_id`를 바꾸는 조작이 없다), 여기서 "E2E"는 실제 배포된 Supabase 프로젝트의
> PostgREST 엔드포인트에 인증된 요청을 직접 보내 검증한다. 기존 `e2e/authState.ts`가 관리하는
> **단일 로그인 세션**만으로 재현 가능하다 — 공격자가 "자기 소유 행의 room_id를 바꾸는" 것이므로
> 계정이 하나만 있어도 성립한다(§6 리스크 참조: 이 실행 방식은 새 스캐폴딩이 필요하다).

### E2E-1 (covers: AC-1)
- Given: 로그인된 테스트 계정이 자신이 멤버인 방 A의 `room_members` 행(자기 자신의 멤버십)을
  가지고 있다.
- When: 그 행의 `room_id`를 다른 방 B의 id로 바꾸는 PATCH를 Supabase REST(`/rest/v1/room_members`)
  에 직접 보낸다(세션의 access token으로 인증).
- Then: 요청이 거부되고(에러 응답 또는 0행 갱신), DB에 남은 행의 `room_id`는 여전히 방 A다. 이어서
  같은 행의 `pinned_at`만 바꾸는 PATCH는 정상 성공한다(다른 컬럼 갱신은 안 막혔음을 함께 확인).

### E2E-2 (covers: AC-2)
- Given: 같은 테스트 계정이 방 A에 보낸 메시지 하나를 가지고 있다.
- When: 그 메시지의 `room_id`를 방 B로 바꾸는 PATCH를 `/rest/v1/messages`에 직접 보낸다.
- Then: 요청이 거부되고, 메시지의 `room_id`는 방 A로 남는다. 이어서 같은 메시지의 `body`만
  고치는 PATCH(기존 "메시지 수정" 기능)는 정상 성공한다.

### E2E-3 (covers: AC-3, AC-4, AC-5)
- Given: 이번 변경이 반영된 `supabase/migrations/`·`supabase/rollback/`과
  `packages/api/src/schemaGuard.ts`·`schemaGuard.test.ts`.
- When: 저장소 테스트 스위트(`pnpm -F @ldd/api test` 또는 CI의 vitest 전체 실행)를 돌린다.
- Then: `room_members`·`messages` 양쪽에 `room_id` 불변 가드가 있음을 확인하는 신규 검사가
  통과하고, 그 검사가 "가드가 빠진 가짜 마이그레이션 입력"에서는 실패함을 보이는 메타 검증도
  통과하며, 기존 `rooms.test.ts`·`schemaGuard.test.ts`의 모든 케이스가 그대로 GREEN이다.

## 4. 테스트 매트릭스

| AC | unit | integration | e2e |
|---|---|---|---|
| AC-1 | — | — | E2E-1 |
| AC-2 | — | — | E2E-2 |
| AC-3 | `schemaGuard.test.ts` 신규: 실제 마이그레이션에서 두 트리거·롤백 존재 확인 | — | E2E-3 |
| AC-4 | `schemaGuard.ts` 신규 판정 함수(가짜 SQL 입력으로 위반 케이스 실제로 잡는지 메타 검증 포함) | — | E2E-3 |
| AC-5 | `rooms.test.ts`(기존 전체) + `schemaGuard.test.ts`(기존 전체) | — | E2E-3 |

## 5. 비범위 (Out of Scope)

- 초대·멤버 추가 흐름 재설계(현재 "자기 자신만 INSERT" 정책은 그대로 둔다).
- `room_members`·`messages`의 다른 컬럼에 대한 추가 불변조건(이번 스펙은 `room_id`만 다룬다).
- UI/화면 변경 없음 — 정상 사용자 흐름에는 아무 영향이 없어야 한다(§1에서 확인한 대로 정상
  경로는 애초에 `room_id`를 갱신하지 않는다).
- 멀티테넌트 초대·권한 모델 확장(이번 수정은 defense-in-depth이지 신규 기능이 아니다).
- 기존 `rooms_select_member`(20260730150000) 등 다른 정책의 재검토.

## 6. 리스크·가정

- **가정**: Postgres RLS의 USING/WITH CHECK는 갱신 전/후 행을 동시에 비교할 수 없어, `room_id`
  불변을 정책만으로 표현할 수 없다(BEFORE UPDATE 트리거가 필요하다는 판단의 근거). 이 저장소는
  이미 같은 이유로 트리거를 쓴 선례가 있다(`touch_room_on_message`, 20260727060000).
- **가정**: 현재 어떤 코드 경로도 `room_members`·`messages`의 UPDATE에 `room_id`를 실어 보내지
  않는다(2026-07-30 `packages/api/src/rooms.ts` 전수 확인). 이 가정이 깨지면(향후 새 기능이
  `room_id`를 정말 바꿔야 하면) 이번 트리거가 그 기능을 막는다 — 그때는 예외 허용 경로를 트리거
  안에 명시적으로 추가해야 한다.
- **runner_setup_needed=true인 이유**: `apps/web/e2e/`에는 아직 Supabase REST에 직접 PATCH를
  보내 RLS를 검증하는 패턴이 없다(기존 스펙은 전부 브라우저 화면 흐름만 검증). E2E-1·E2E-2를
  실행하려면 (a) `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY`로 PostgREST를 직접
  호출하는 Playwright API 요청 헬퍼, (b) `.auth/user.json`(기존 `authState.ts`가 관리하는 세션
  쿠키)에서 access token을 뽑아내는 유틸을 Phase B 1라운드에서 새로 만들어야 한다.
- **리스크**: E2E-1·E2E-2는 실제 배포된 Supabase 프로젝트에 대해 도는 파괴적 시나리오다(실제
  방·멤버십·메시지 행을 만들고 위조를 시도한다). 테스트 전용 방을 만들어 쓰고, 트랜잭션 롤백이
  불가능한 REST 경로이므로 **테스트가 만든 데이터는 테스트 종료 시 직접 정리(cleanup)**해야
  한다 — 정리를 빠뜨리면 테스트 계정에 더미 방·메시지가 계속 쌓인다.
  (CLAUDE.md 5절: 되돌리기 어려운 작업은 확인 후 실행 — 여기서는 "테스트 전용 방"으로 반경을
  한정해 실제 대화 데이터를 건드리지 않는다.)
- **리스크**: 트리거는 `security definer`가 아니라 일반 함수로도 충분하다(RLS 우회가 필요 없다 —
  같은 트랜잭션·같은 사용자 컨텍스트에서 OLD/NEW만 비교하면 된다). 굳이 `security definer`로
  만들면 20260726110000이 세운 `search_path` 고정 관례를 함께 지켜야 한다 — 구현 시 불필요하게
  `security definer`를 쓰지 않는 편을 권장한다.
