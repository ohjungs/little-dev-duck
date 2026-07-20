# Supabase 스키마 v1

Phase 1 T4 산출물. `migrations/`의 SQL은 아직 어떤 프로젝트에도 적용되지 않았다.
적용 전 사용자 확인이 필요하다 (CLAUDE.md 5장 안전 규칙).

## 사전 준비 (사용자 수행)

1. https://supabase.com 에서 무료 프로젝트 생성 (리전은 가까운 곳 선택)
2. [Supabase CLI](https://supabase.com/docs/guides/cli) 설치 후 `supabase login`
3. 저장소 루트에서 `supabase link --project-ref <project-ref>`

## 적용 (up)

```bash
supabase db push
```

`migrations/` 아래 5개 파일이 타임스탬프 순서로 실행된다: profiles -> todos -> memos -> duck_state -> profiles_trigger.
전 테이블 RLS가 `ENABLE ROW LEVEL SECURITY` + `user_id(또는 id) = auth.uid()` 정책으로 적용되고,
`profiles_trigger`는 신규 가입(auth.users insert) 시 profiles 1행을 자동 생성한다 (OAuth provider의
full_name/name -> 없으면 이메일 로컬파트를 display_name으로 사용).

## 롤백 (down)

Supabase CLI는 down 마이그레이션을 자동 실행하지 않는다. `rollback/`의 SQL을
Supabase 대시보드 SQL Editor 또는 `psql`로 **역순**(duck_state -> memos -> todos -> profiles) 실행한다.

```bash
psql "$SUPABASE_DB_URL" -f supabase/rollback/20260720100400_profiles_trigger_down.sql
psql "$SUPABASE_DB_URL" -f supabase/rollback/20260720100300_duck_state_down.sql
psql "$SUPABASE_DB_URL" -f supabase/rollback/20260720100200_memos_down.sql
psql "$SUPABASE_DB_URL" -f supabase/rollback/20260720100100_todos_down.sql
psql "$SUPABASE_DB_URL" -f supabase/rollback/20260720100000_profiles_down.sql
```

## 검증 체크리스트 (STDD, 실제 프로젝트에서 사용자 실행)

1. **RLS 격리**: 계정 A로 로그인해 todo 1건 생성 -> 계정 B 세션에서 동일 테이블 select -> 0건이어야 한다.
   (memos, duck_state도 동일하게 확인)
2. **멱등성**: down 전체 실행 -> `supabase db push`로 재-up -> 에러 없이 동일 스키마로 복구되는지 확인.
3. **제약 조건**: title 빈 문자열/201자 이상 insert 시도 -> DB 에러로 거부되는지 확인 (packages/core의 zod 제약과 일치).

## 스코프 밖 (다음 Task/Phase)

- `duck_state` 초기 행 생성 — Phase 7(게임화)에서 추가
- 공개 공유용 `is_public` 컬럼 — Phase 12에서 필요 시 추가 마이그레이션
