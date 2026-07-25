# Phase 24 — Supabase 어드바이저 실행 결과 대응

착수 근거: `/loop-eng` SCOPE(5장). Phase 23 소진 + **네 사이클 막혀 있던 점검이 열렸다.**

## 막혀 있던 점검이 실은 다른 연결로 가능했다

`manual-verification.md` 13번에 "Supabase 어드바이저는 액세스 토큰이 없어 미실행"이라고
세 번 적었다. 이번 사이클에 **등록된 Supabase 연결이 두 개**라는 걸 확인하고 다른 쪽으로
시도하니 인증돼 있었다. 보안·성능 어드바이저를 실제로 실행했다.

교훈: "도구가 막혔다"는 결론도 **한 경로만 시도한 결과**일 수 있다. 대안 경로를 먼저 확인한다.

## 실행 결과 (2026-07-26, project `iupprzfmlyfrdcctdupn`)

### 즉시 고쳐야 하는 것 — award_xp 권한 결함

`public.award_xp(p_user_id uuid, ...)`는 다음 세 가지가 겹쳐 있다.

1. `SECURITY DEFINER` — 호출자 권한이 아니라 정의자 권한으로 돌아 **RLS를 우회**한다.
2. 본문이 `UPDATE duck_state ... WHERE user_id = p_user_id` — **인자로 받은 user_id를 그대로
   믿는다. 호출자가 그 사용자인지 확인하지 않는다.**
3. 실제 권한이 `anon=X` — **로그인하지 않아도** `/rest/v1/rpc/award_xp`로 호출된다.

즉 **누구나 임의 사용자의 XP·레벨·먹이를 바꿀 수 있다.** 피해 범위는 마스코트 수치라 크지
않지만, 인증 없이 남의 행을 쓰는 원시 기능이 열려 있다는 사실 자체가 문제다.

- **왜 이렇게 됐나(재발 방지용 기록)**: 마이그레이션은
  `REVOKE ALL ON FUNCTION ... FROM public; GRANT EXECUTE ... TO authenticated;`로 막았다고
  **의도했다**. 그런데 Supabase는 public 스키마에 만든 함수에 `anon`·`authenticated`
  개별 권한을 기본으로 부여한다. `FROM public`(의사 롤)을 회수해도 **`anon`에게 직접 부여된
  권한은 남는다.** 의도와 실제가 어긋났고, 이걸 확인해 줄 검사가 없었다.

### 함께 정리할 것 — 트리거 함수가 API로 노출됨

`handle_new_user()`·`cleanup_page_embeddings()`도 `SECURITY DEFINER`인데 `anon`·`PUBLIC`에
실행 권한이 있다. 둘 다 트리거 함수라 RPC로 직접 부르면 Postgres가 거부하므로(트리거 문맥
밖에서 `old`/`new`를 못 씀) **실제 악용 경로는 확인되지 않았다.** 그래도 노출할 이유가 없다.

`match_embeddings(query_embedding vector, match_count integer)`는 `search_path`가 비어 있다.
다만 이 함수는 `SECURITY INVOKER`(정의자 권한 아님)라 호출자 권한으로 돌고 embeddings의 RLS가
그대로 적용된다 — **위험도는 낮고 강화 차원**이다.

### 의도된 것 — 고치지 않는다

- `get_public_page(p_slug text)`가 `anon`에 열려 있는 건 **Phase 12 T1의 설계다.** 비로그인
  방문자가 공개 페이지를 읽어야 하고, 열거를 막으려고 일부러 "slug 하나당 한 건"만 돌려주는
  함수로 만들었다. 어드바이저는 이걸 알 수 없다.
- `delete_all_my_data()`는 `authenticated`에만 열려 있고 내부에서 `auth.uid()`를 쓴다. 정상.

### 수용하고 기록만 하는 것

- **`vector`·`pg_trgm` 확장이 public 스키마에 있음**: Supabase가 그렇게 설치한 기본값이다.
  pgvector를 다른 스키마로 옮기면 기존 컬럼 타입·인덱스·연산자 참조를 전부 갱신해야 하고,
  얻는 건 네임스페이스 위생뿐이다. **위험 대비 이득이 없어 옮기지 않는다.**
- **유출 비밀번호 보호 비활성**: 이 앱은 Google·GitHub OAuth만 쓴다. 비밀번호 자체가 없어
  **해당 없음**.
- **미사용 인덱스 7건**: 실사용 트래픽이 거의 없는 DB에서 "미사용"은 **아직 안 쓴 것**이지
  불필요하다는 뜻이 아니다. 지우면 나중에 필요할 때 느려진다. **건드리지 않는다.**

### 성능 — 이번 Phase에서 함께 처리

- `auth_rls_initplan` 경고 다수(profiles·todos·memos·duck_state·activity_daily·habits·
  habit_checks·pomodoro_sessions·calendar_events). `auth.uid()`를 `(select auth.uid())`로
  바꾸면 행마다 재평가하지 않는다. **이미 embeddings·pages에 같은 수정을 적용한 전례가 있다**
  (20260724150000). 같은 패턴을 나머지에 적용한다.
- 인덱스 없는 외래키 4건(`articles.feed_id`·`page_links.user_id`·`page_versions.user_id`·
  `pages.parent_id`). 인덱스 추가는 값싸고, 부모 행 삭제 시 자식 스캔을 막아 준다.

## Task

### T1 award_xp 권한 결함 수정 (마이그레이션)
- **수용 기준**: 호출자와 `p_user_id`가 다르면 **예외를 던진다**(조용히 무시하지 않는다 —
  호출부가 성공으로 오인하면 안 된다). `anon`에서 실행 권한 회수.
- **시그니처는 바꾸지 않는다** — `applyXpAward`가 이미 `p_user_id`를 넘기고 있어, 인자를 빼면
  앱이 깨진다. 인자는 두되 **검증**한다.

### T2 노출 정리 + search_path (마이그레이션)
- `handle_new_user`·`cleanup_page_embeddings`에서 `PUBLIC`·`anon` 실행 권한 회수
  (트리거는 테이블 소유자 권한으로 도는 것이라 영향 없다).
- `match_embeddings`에 `search_path = public` 지정.

### T3 이 부류를 정적으로 잡는 검사 (Phase 22 schemaGuard 확장)
- **수용 기준**: 마이그레이션이 만든 `SECURITY DEFINER` 함수는 **`anon`에 대한 명시적 회수**를
  동반해야 한다. 의도적으로 공개하는 함수(`get_public_page`)는 allowlist에 근거와 함께 둔다.
- 이번 결함의 근본 원인은 "의도와 실제 권한이 다른데 아무도 확인하지 않은 것"이다. 사람이
  기억하는 대신 검사가 기억하게 한다.

### T4 성능 지적 반영 (마이그레이션)
- 남은 테이블 RLS 정책을 `(select auth.uid())`로 교체, 외래키 인덱스 4건 추가.

## 적용 정책

**마이그레이션 파일과 롤백 스크립트만 작성하고 적용(DDL)은 하지 않는다.** 되돌리기 어려운
작업은 실행 전 사용자 확인이 규칙이다(CLAUDE.md 5절, `/loop-eng` 7장). 이미 대기 중인
Phase 20 마이그레이션과 함께 사용자가 한 번에 적용하면 된다.

## 검증 정책

T3는 STDD(가짜 입력으로 검사가 실제로 실패하는지 확인 포함). 마이그레이션 자체는 적용 전이라
동작 검증 불가 — 적용 후 어드바이저 재실행으로 확인한다(manual-verification 기록).
