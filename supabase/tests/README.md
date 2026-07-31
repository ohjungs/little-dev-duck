# DB 회귀 테스트 (pgTAP)

RLS 정책·트리거·SECURITY DEFINER 함수가 **실제로 그렇게 동작하는지** 로컬 Supabase 스택에서
검증한다. `packages/api/src/schemaGuard.ts`(정적 검사, "SQL에 그렇게 쓰여 있는지")를 대체하지
않는다 — 상호 보완이다.

## 실행법

```bash
supabase start        # 로컬 스택(Docker) 기동, 최초 1회 이후엔 기동만
pnpm test:db           # = supabase test db (supabase/tests 아래 *.sql을 파일명 순서로 실행)
supabase stop          # 필요 시 종료
```

원격 프로젝트(`iupprzfmlyfrdcctdupn`)에는 어떤 자격증명도 넘기지 않는다 — `supabase test db`는
로컬 컨테이너(`postgresql://postgres:postgres@127.0.0.1:54322/postgres`)에만 연결된다.

CI는 `.github/workflows/ci.yml`의 `db-tests` job이 같은 순서(`supabase start` ->
`supabase test db` -> `supabase stop`)로 매 push/PR마다 자동 실행한다.

## 디렉터리 구조

```
supabase/tests/
  database/
    00_helpers.sql   -- 공용 role-switch 헬퍼. 다른 모든 파일이 여기 의존한다.
    10_...sql         -- 이후 파일은 번호 접두사가 실행 순서 힌트(pg_prove/CLI는 파일명 정렬 순).
    ...
  README.md
```

## pgTAP 확장 활성화

`supabase/seed.sql`(로컬/CI 전용, `supabase db push`로 원격에는 절대 반영되지 않는다)에
`create extension if not exists pgtap with schema extensions;`로 한 줄로 활성화한다.
정식 `supabase/migrations/`에는 넣지 않는다 — 프로덕션 스키마에 테스트 전용 확장을 영구히
남기지 않기 위해서다. `supabase/config.toml`은 `[db.seed]`를 명시하지 않아도 CLI 기본값
(`enabled = true`, `sql_paths = ["./seed.sql"]`)이 이 파일을 자동으로 집는다 — 추가 설정 불필요.

`supabase test db`(=`supabase db reset`과 같은 경로: migrations 적용 -> seed.sql 실행 ->
`supabase/tests` 아래 파일을 파일명 순서로 실행)를 실행하면 이 확장이 매번 새로 활성화된
뒤 pgTAP 테스트가 돈다.

## 헬퍼 계약 (`00_helpers.sql`)

외부 확장(`basejump-supabase_test_helpers`/dbdev)에 의존하지 않는 자체 헬퍼다. 이 4개 함수
시그니처가 나머지 테스트 파일의 **고정 계약**이다 — 이름·인자 순서를 바꾸면 모든 파일이 깨진다.

| 함수 | 역할 |
|---|---|
| `tests.create_user(email, role default 'user')` | `auth.users`에 가짜 사용자를 심는다. **profiles 행을 따로 insert하지 않는다** — `on_auth_user_created` 트리거가 이미 만든다. |
| `tests.create_bare_user(email)` | 위 트리거를 잠시 끄고 `auth.users`만 만든다("가입은 됐지만 profiles가 아직 없는" 상태 — insert RLS 자체를 검증할 때만 쓴다). |
| `tests.authenticate_as(uuid)` | 이후 쿼리를 그 사용자의 RLS 컨텍스트(`role=authenticated` + `request.jwt.claims`)로 전환한다. |
| `tests.authenticate_as_anon()` | `role=anon`으로 전환한다. |
| `tests.clear_authentication()` | 인증 상태를 초기화한다(대부분의 파일은 트랜잭션이 rollback되므로 명시 호출이 필수는 아니다). |

`set_config(..., true)`(LOCAL)를 쓰므로 각 파일의 `begin ... rollback`이 끝나면 인증 상태도
자동으로 원복된다.

## 새 파일 추가 규칙

1. `begin; select plan(N); ... select * from finish(); rollback;`로 감싼다 — **부작용을 남기지
   않는다**(로컬 스택 재사용 전제). `00_helpers.sql`만 예외다(스키마·함수를 커밋해야 이후
   파일들이 쓸 수 있다).
2. 값을 여러 문장에 걸쳐 넘겨야 하면 `\gset`(psql 전용 메타커맨드) 대신
   `set_config('tests.<key>', ..., true)` + `current_setting('tests.<key>')`를 쓴다 — CLI
   러너가 psql을 거치지 않을 수 있어 `\gset`은 이식성이 없다.
3. 새 사용자는 `tests.create_user`로 만든다. 직접 `insert into auth.users`/`insert into
   public.profiles`를 하지 않는다(트리거와 충돌한다).
4. 번호 접두사는 두 자리씩 올린다(다음 파일은 `70_...sql`).
