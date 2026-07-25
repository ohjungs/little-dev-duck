# 리뷰 스냅샷 — 보안·스키마 감사 (2026-07-26)

immutable. `/loop 5m /loop-eng` 자율 세션(Phase 20~24) 중 실시. 이 스냅샷은 **무엇을 확인했고,
무엇이 나왔고, 무엇을 고치지 않기로 했는지**를 남긴다 — "괜찮아 보였다"가 아니라 "이 항목을 이
방법으로 확인했다"가 남아야 다음 사람이 중복 조사를 안 한다.

배포차단(SEC- 등급) 판정: **없음.** 다만 아래 S1은 실사용 전 적용 권고.

## 감사 경위 — 막힌 줄 알았던 점검이 열렸다

`manual-verification.md` 13번에 "Supabase 어드바이저는 액세스 토큰이 없어 미실행"이라고
**세 사이클 연속** 적었다. 이번에 등록된 Supabase 연결이 **두 개**임을 확인하고 다른 쪽으로
시도하니 인증돼 있었다.

> 교훈: "도구가 막혔다"는 결론도 **한 경로만 시도한 결과**일 수 있다. 막혔다고 기록하기 전에
> 대안 경로를 확인한다.

## 확정 결함 (1건) — 적용 대기

### S1 `public.award_xp` 인증 없는 타 사용자 데이터 변경

세 조건이 겹쳐 성립했다.

1. `SECURITY DEFINER` — 호출자가 아니라 정의자 권한으로 실행돼 **RLS를 우회**한다.
2. 본문이 `UPDATE duck_state ... WHERE user_id = p_user_id` — **인자로 받은 user_id를 검증 없이
   신뢰**한다. 호출자가 그 사용자인지 확인하지 않는다.
3. 실제 권한이 `anon=X` — **로그인 없이** `/rest/v1/rpc/award_xp`로 호출된다.

즉 누구나 임의 사용자의 XP·레벨·먹이를 바꿀 수 있었다. 피해 범위는 마스코트 수치라 크지
않으나, **인증 없이 남의 행을 쓰는 원시 기능**이 열려 있다는 사실 자체가 결함이다.

**근본 원인(재발 방지용)**: 원 마이그레이션(20260724180000)은
`REVOKE ALL ON FUNCTION ... FROM public; GRANT EXECUTE ... TO authenticated;`로 막았다고
**의도했다.** 그러나 Supabase는 public 스키마 함수에 `anon`·`authenticated` **개별** 권한을
기본 부여하며, 의사 롤 `public`을 회수해도 **`anon`에 직접 부여된 권한은 남는다.**
의도와 실제가 어긋났고, 그 차이를 확인해 줄 검사가 없었다.

**수정**: `20260726110000_harden_security_definer` — 호출자와 `p_user_id`가 다르면 예외를
던지고(조용히 무시하면 호출부가 성공으로 오인한다), 롤을 명시해 회수(`FROM PUBLIC, anon`).
시그니처는 유지 — `applyXpAward`가 이미 `p_user_id`를 넘겨서 인자를 빼면 앱이 깨진다.

**상태**: 마이그레이션·롤백 작성 완료, **미적용**(DDL은 실행 전 사용자 확인이 규칙).

## 하드닝 (2건) — 실제 악용 경로는 확인되지 않음

- **H1 트리거 함수의 REST 노출**: `handle_new_user()`·`cleanup_page_embeddings()`가
  `anon`·`PUBLIC`에 실행 권한이 있었다. 둘 다 트리거 전용이라 RPC로 직접 부르면 Postgres가
  거부한다(트리거 문맥 밖에서 `old`/`new`를 못 씀) — **악용 경로는 확인되지 않았다.** 그래도
  노출할 이유가 없어 회수. 트리거 자체는 테이블 소유자 권한으로 돌아 영향 없다.
- **H2 `match_embeddings` search_path 미설정**: 어드바이저가 지적했으나 이 함수는
  **`SECURITY INVOKER`**(정의자 권한 아님)라 호출자 권한으로 돌고 embeddings의 RLS가 그대로
  적용된다. 위험도 낮음 — 강화 차원으로 `search_path = public` 지정.

## 고치지 않기로 한 것 (근거 기록)

지적을 전부 따르지 않았다. 따르지 않은 이유를 남긴다.

| 지적 | 판정 | 근거 |
|---|---|---|
| `get_public_page`가 `anon`에 열림 | **의도된 설계** | Phase 12 T1. 비로그인 방문자가 공유 링크로 공개 페이지를 읽어야 한다. 열거를 막으려고 일부러 "slug 하나당 한 건"만 돌려주는 함수로 만들었다. 어드바이저는 이 의도를 알 수 없다 |
| `vector`·`pg_trgm`이 public 스키마에 설치됨 | **수용** | Supabase 기본 설치 위치다. 옮기면 컬럼 타입·인덱스·연산자 참조를 전부 갱신해야 하고 얻는 건 네임스페이스 위생뿐 — 위험 대비 이득이 없다 |
| 유출 비밀번호 보호 비활성 | **해당 없음** | Google·GitHub OAuth 전용이라 비밀번호 자체가 없다 |
| 미사용 인덱스 7건 | **건드리지 않음** | 실사용 트래픽이 거의 없는 DB에서 "미사용"은 **아직 안 쓴 것**이지 불필요하다는 뜻이 아니다. 지우면 나중에 필요할 때 느려진다 |

## 성능 지적 — 함께 처리 (적용 대기)

- `auth_rls_initplan` — 9개 테이블(profiles·todos·memos·duck_state·activity_daily·habits·
  habit_checks·pomodoro_sessions·calendar_events)의 정책이 `auth.uid()`를 행마다 재평가.
  `(select auth.uid())`로 통일. **접근 범위는 동일하고 성능만 달라진다.**
  embeddings·pages는 20260724150000에서 이미 적용돼 있었다 — 나머지를 맞춘 것.
- `unindexed_foreign_keys` 4건 — `articles.feed_id`·`page_links.user_id`·
  `page_versions.user_id`·`pages.parent_id`에 인덱스 추가.
- 두 항목 모두 `20260726120000_rls_initplan_rest`. **정책 목록은 손으로 옮기지 않고
  마이그레이션에서 스크립트로 추출**해 생성했다(HD-003).

## 확인했고 이상 없던 것 (중복 조사 방지용)

| 확인 항목 | 방법 | 결과 |
|---|---|---|
| 전 테이블 RLS 활성 | 마이그레이션 정적 파싱 | 19/19 통과 |
| RLS 켜고 정책 0건인 테이블 | 정적 파싱 | 0건 |
| 계정 데이터 파기 누락 | 정적 파싱 + cascade 도달성 계산 | 0건. `page_links`는 목록에 없으나 `pages` 연쇄로 파기됨 |
| 마이그레이션 롤백 스크립트 | 파일 대조 | 0건 누락(Phase 20에서 5건 보충 후) |
| API 라우트 인증 게이트 | **실서버 curl** | `/api/health`·`/api/ai/agent` 등 전부 303으로 차단. `/api/keepalive`만 공개(의도) |
| 인증 없는 에이전트 호출 | **실서버 POST** | 303 차단 |
| 에이전트 입력 검증 | 코드 확인 | 타입·공백·최대 길이 + 사용자별 요청 제한(20회/분) |
| 응답 보안 헤더 | **실서버 curl** | CSP(nonce+strict-dynamic·frame-ancestors none·object-src none)·HSTS·nosniff·Referrer-Policy·Permissions-Policy·X-Frame-Options 전부 존재 |
| 완전히 빈 catch 블록 | 정적 스윕 | 0건 |
| 입력에 접근 가능한 이름 없음(a11y) | 정적 스윕 + 개별 확인 | 실제 1건(메모 수정 입력창, 수정 완료). **나머지 16건은 전부 오탐**(파일 선택은 label 안, 아이콘 버튼은 변수로 텍스트 렌더) |

## 재발 방지 — 검사로 잠근 것

`packages/api/src/schemaGuard.ts`(+ 23 tests). 위 항목 중 **정적으로 판정 가능한 것**을
매 빌드마다 확인한다. Supabase 어드바이저가 못 도는 환경에서도 이 부분은 계속 지켜진다.

- 모든 테이블 RLS 활성 / RLS 켠 테이블에 정책 1건 이상
- 마이그레이션마다 롤백 스크립트 존재
- `user_id`를 가진 모든 테이블이 계정 파기로 소멸(cascade 포함, **auth.users 연쇄는 불인정** —
  파기는 계정을 남기므로 그 cascade는 발동하지 않는다)
- **SECURITY DEFINER 함수는 `anon`을 지목한 회수를 동반**(S1의 근본 원인). `FROM public`만으론
  부족하다는 걸 테스트로 못박았고, 의도적 공개는 allowlist에 근거와 함께 둔다

검사가 통과를 가장하지 않도록: 경로를 cwd가 아닌 파일 기준으로 잡고(cwd 의존 시 0개 파일을
읽고 "전부 통과"가 된다), "실제로 읽었는가"를 먼저 단언하며, 규칙 위반 가짜 입력 11종에
실제로 실패하는지 확인했다. 실저장소에서도 롤백 파일 하나를 치워 실패를 확인했다.
