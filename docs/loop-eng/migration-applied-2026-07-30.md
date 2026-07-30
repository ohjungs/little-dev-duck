# 보안 마이그레이션 2건 적용·실측 검증 기록 (2026-07-30)

사용자 승인("Supabase 너가 푸시하고 배포하면 되잖아")을 받아 claude.ai Supabase MCP
`apply_migration`으로 **실서버에 직접 적용**했다. 프로젝트: `iupprzfmlyfrdcctdupn`(little-dev-duck).

## 적용한 것

| 마이그레이션 | 무엇을 막나 |
|---|---|
| `profiles_admin_column_guard` | 일반 사용자가 REST로 `{"role":"admin"}`을 보내 스스로 관리자가 되는 것 |
| `room_id_immutable` | 자기 멤버십·메시지의 `room_id`를 바꿔 초대 없이 남의 방에 들어가는 것 |

로컬 파일: `supabase/migrations/20260730160000_profiles_admin_column_guard.sql`,
`20260730170000_room_id_immutable.sql` (롤백은 `supabase/rollback/`에 짝으로 있음).

## 트리거 존재·활성 확인

`pg_trigger` 조회 결과 3개 전부 존재하고 `tgenabled='O'`(활성):
`profiles_guard_admin_columns`, `room_members_guard_room_id`, `messages_guard_room_id`.

## 실측 — 정말로 막는가 (실제 UPDATE 시도)

**"적용됐다"와 "작동한다"는 별개**라서 실제로 위조를 시도했다. 데이터를 바꾸지 않도록 각 시도를
예외 블록으로 감싸고, 막히지 않은 경우엔 즉시 원복하도록 했다.

| 시도 | 결과 | 반환된 사유 |
|---|---|---|
| `profiles.role`을 `customer`로 변경 | **차단** | `role/disabled_features는 관리자만 변경할 수 있어요.` |
| `room_members.room_id`를 임의 UUID로 변경 | **차단** | `room_id는 변경할 수 없어요.` |
| `messages.room_id`를 임의 UUID로 변경 | **차단** | `room_id는 변경할 수 없어요.` |
| `messages.edited_at` 재기록(정상 경로) | 통과 | — |
| `room_members.pinned_at` 재기록(정상 경로, 2행) | 통과 | — |

즉 **위조는 막히고 정상 경로는 그대로 동작한다.**

### 검증 중 내가 낸 실수 (기록)

첫 시도에서 `room_members.room_id`가 "막히지 않음"으로 나왔다. 트리거 결함이 아니라
**내 검사가 틀렸다** — `room_members` 한 행의 `user_id`가 **NULL**(오리 멤버)인데
`where user_id = <NULL 변수>`로 비교해 **0행이 매칭**됐다(SQL NULL 비교 함정). 0행이면 트리거가
아예 안 돌아 예외도 없다. `room_id`로만 지목해 재시도하니 정상적으로 차단됐다.
→ TEST20의 "null·undefined 입력" 렌즈가 정확히 여기서 물었다. 검사도 검사가 필요하다.

## 데이터 무결성 (적용 전후)

`profiles 3 · rooms 1 · room_members 2 · messages 10` — 변동 없음.
**고아 행 0건**(`room_members`·`messages` 모두 존재하는 방을 가리킴). 역할: `admin, admin, user`.

> **문서 정정**: 기존 문서들이 "사용자 1명(본인=관리자)"을 전제로 위험도를 낮게 적었는데
> **실제로는 프로필이 3개**이고 그중 하나는 `user` 역할이다. 즉 이번에 막은 권한상승은
> 가정보다 **실제 노출에 가까웠다**.

## 운영상 중요한 부작용 — 관리자 지정 SQL이 이제 막힌다

`PENDING.md`가 안내했던 아래 SQL은 **이제 실패한다**:

```sql
update public.profiles set role = 'admin' where email = '<내 이메일>';
```

이유: SQL 편집기·직접 연결에는 JWT가 없어 `auth.uid()`가 NULL이고, `is_admin()`이 false로
판정해 트리거가 거부한다(실측에서 확인된 그 동작이다). **의도한 설계다** — 하지만 역할을
손으로 고쳐야 할 상황이 오면 막힌다.

**복구 절차**(정말 필요할 때만):

```sql
alter table public.profiles disable trigger profiles_guard_admin_columns;
update public.profiles set role = 'admin' where email = '<내 이메일>';
alter table public.profiles enable trigger profiles_guard_admin_columns;
```

지금은 관리자가 2명이라 급하지 않다. 평상시 역할 변경은 **앱의 관리자 화면**으로 하면 된다
(그 경로는 `auth.uid()`가 있어 정상 동작한다).

## 어드바이저 (적용 후 재실행)

ERROR 0건, WARN 11건 — 전부 이번 변경과 무관한 기존 항목이다.

- `get_public_page`가 anon에 열린 것은 **의도된 설계**(공개 페이지 통로, `PUBLIC_BY_DESIGN` 등재).
- **내 새 트리거 함수 2개는 목록에 아예 없다** — SECURITY DEFINER로 만들지 않았기 때문이다
  (최소 권한 선택이 노출 표면을 늘리지 않았음을 어드바이저가 확인해 준 셈).
- 유출 비밀번호 보호 비활성은 대시보드 토글(사용자 조치, PENDING 유지).

### 다음 세션에 볼 만한 새 발견 (이번 사이클에서 착수 안 함)

`touch_room_on_message()`는 **트리거 함수인데 SECURITY DEFINER이고 `authenticated`에 RPC로
노출**돼 있다(`/rest/v1/rpc/touch_room_on_message`). 그 마이그레이션은 `public`·`anon`만
회수했다. 실제 위험은 낮다 — 트리거 함수를 직접 호출하면 Postgres가 거부한다. 그래도
`revoke execute ... from authenticated` 한 줄로 노출 표면을 줄일 수 있다.
같은 관점으로 `schemaGuard`의 `findUnrevokedDefiners`가 **트리거 함수는 authenticated까지
회수해야 한다**는 규칙을 못 잡고 있는지도 함께 볼 것.
