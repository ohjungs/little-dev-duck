# Supabase 스키마 v1

Phase 1 T4 산출물. 적용 전 사용자 확인이 필요하다 (CLAUDE.md 5장 안전 규칙).

**적용 현황(2026-07-21 기준)**: 기존 6개 마이그레이션은 프로덕션(`iupprzfmlyfrdcctdupn`)에 적용 완료.
profiles/todos/memos/duck_state/트리거는 Phase 1~2 진행 중, `activity_daily`는 Phase 5 T4 검증 중
사용자 명시 승인 하에 `supabase db push`로 적용. **Phase 7 신규 4개(habits, habit_checks,
pomodoro_sessions, calendar_events)는 아직 미적용 — 사용자 `supabase db push` 필요.** 적용 전까지는
습관/뽀모도로/캘린더 위젯과 게임화 표시가 테이블 부재로 에러 상태로 뜬다(테이블이 없으므로 교차
사용자 노출 위험은 없음 — RLS는 각 마이그레이션에 정책까지 원자적으로 포함). 적용 후 아래 검증
체크리스트를 신규 4테이블로도 수행할 것. `supabase migration list --linked`로 동기화 확인.

## 사전 준비 (사용자 수행)

1. https://supabase.com 에서 무료 프로젝트 생성 (리전은 가까운 곳 선택)
2. [Supabase CLI](https://supabase.com/docs/guides/cli) 설치 후 `supabase login`
3. 저장소 루트에서 `supabase link --project-ref <project-ref>`

## 적용 (up)

```bash
supabase db push
```

`migrations/` 아래 6개 파일이 타임스탬프 순서로 실행된다: profiles -> todos -> memos -> duck_state ->
profiles_trigger -> activity_daily. 전 테이블 RLS가 `ENABLE ROW LEVEL SECURITY` +
`user_id(또는 id) = auth.uid()` 정책으로 적용되고, `profiles_trigger`는 신규 가입(auth.users insert)
시 profiles 1행을 자동 생성한다 (OAuth provider의 full_name/name -> 없으면 이메일 로컬파트를
display_name으로 사용). `activity_daily`는 Phase 5 T3 산출물 — `source`(github|claude_code)별
일별 활동 집계 테이블, `(user_id, date, source)` unique로 upsert 대상이 된다(Phase 5 T2 Rust
수집기가 채울 예정, 이 마이그레이션 자체는 Rust 툴체인과 무관하게 독립 적용 가능).

## 롤백 (down)

Supabase CLI는 down 마이그레이션을 자동 실행하지 않는다. `rollback/`의 SQL을
Supabase 대시보드 SQL Editor 또는 `psql`로 **역순**(activity_daily -> duck_state -> memos -> todos ->
profiles) 실행한다.

```bash
psql "$SUPABASE_DB_URL" -f supabase/rollback/20260721010300_calendar_events_down.sql
psql "$SUPABASE_DB_URL" -f supabase/rollback/20260721010200_pomodoro_sessions_down.sql
psql "$SUPABASE_DB_URL" -f supabase/rollback/20260721010100_habit_checks_down.sql
psql "$SUPABASE_DB_URL" -f supabase/rollback/20260721010000_habits_down.sql
psql "$SUPABASE_DB_URL" -f supabase/rollback/20260721000000_activity_daily_down.sql
psql "$SUPABASE_DB_URL" -f supabase/rollback/20260720100400_profiles_trigger_down.sql
psql "$SUPABASE_DB_URL" -f supabase/rollback/20260720100300_duck_state_down.sql
psql "$SUPABASE_DB_URL" -f supabase/rollback/20260720100200_memos_down.sql
psql "$SUPABASE_DB_URL" -f supabase/rollback/20260720100100_todos_down.sql
psql "$SUPABASE_DB_URL" -f supabase/rollback/20260720100000_profiles_down.sql
```

## 검증 체크리스트 (STDD, 실제 프로젝트에서 사용자 실행)

1. **RLS 격리**: 계정 A로 로그인해 todo 1건 생성 -> 계정 B 세션에서 동일 테이블 select -> 0건이어야 한다.
   (memos, duck_state, activity_daily, **habits, habit_checks, pomodoro_sessions, calendar_events**도 동일하게 확인)
2. **멱등성**: down 전체 실행 -> `supabase db push`로 재-up -> 에러 없이 동일 스키마로 복구되는지 확인.
3. **제약 조건**: title 빈 문자열/201자 이상 insert 시도 -> DB 에러로 거부되는지 확인 (packages/core의 zod 제약과 일치).

## 스코프 밖 (다음 Task/Phase)

- `duck_state` 초기 행 생성 — Phase 7에서 `packages/api`의 `getDuckState`가 미존재 시 기본 행 insert로 처리
- 서버 권위 XP(SECURITY DEFINER RPC + `duck_state` xp/level/feed 컬럼 UPDATE grant 회수) — 리더보드/
  소셜 기능 도입 전 선결(Phase 7 리뷰 M-3, 현재는 클라이언트 신뢰 XP)
- 공개 공유용 `is_public` 컬럼 — Phase 12에서 필요 시 추가 마이그레이션
