# lessons-learned.md — 장기 기억 (살아있는 교훈만)

경계 규칙: /bug로 기록된 실제 버그와 /review REF-HIGH 이상만 담는다.
보안/운영 발견은 docs/reviews/ 전용. 해결(resolved) 항목은 docs/reviews/archived-lessons.md로 이관.

항목 형식:
- 요약 한 줄
- 최초 발견: YYYY-MM-DD / 마지막 재발견: YYYY-MM-DD / 재발견 횟수: N회
- 상태: active | stale | resolved
- 상세 예제: docs/anti-patterns/<slug>.md

## post-redirect-get 기본 상태코드

- `NextResponse.redirect()`를 상태코드 없이 쓰면 기본값 307이 원 요청 메서드(POST)를 유지해,
  GET만 받는 라우트로 리다이렉트 시 405가 난다. 상태 변경(POST/PUT/DELETE) 핸들러의 리다이렉트는
  항상 303을 명시해야 한다.
- 최초 발견: 2026-07-20 / 마지막 재발견: 2026-07-20 / 재발견 횟수: 1회 (같은 세션 내 2곳: logout, proxy)
- 상태: active
- 상세 예제: docs/anti-patterns/post-redirect-get.md

## nonce 기반 CSP는 정적 프리렌더링 페이지에서 무효

- 미들웨어가 요청마다 nonce를 발급해 `script-src 'nonce-...'`에 싣는데, 그 페이지가 정적 프리렌더링
  (`○`)되면 빌드 시점에 한 번 구워진 스크립트 태그의 nonce가 매 요청 헤더 nonce와 영영 불일치해
  프로덕션에서 모든 스크립트가 CSP에 막힌다(로그인 완전 불능). 실제로 발생: `/login`이 정적이라
  위젯/브라우저에서 로그인이 깨졌고, 콘솔에만 CSP 위반이 대량으로 떴다.
- 교훈: (1) nonce 기반 CSP를 쓰는 페이지는 반드시 동적 렌더링이어야 한다(`export const dynamic =
  "force-dynamic"`). (2) CSP 도입 시 `curl`의 응답 헤더 값만으로는 이 버그를 못 잡는다 — nonce가
  매번 달라지는 것 자체는 정상으로 보이므로, 정적/동적 라우트별로 실제 브라우저(또는 body의 script
  nonce와 헤더 nonce 일치까지)로 검증해야 한다. 실사용자가 위젯에서 발견해줬다.
- 최초 발견: 2026-07-21 / 마지막 재발견: 2026-07-21 / 재발견 횟수: 1회 (nonce 미적용 → self-only가
  RSC 하이드레이션 인라인 차단 → force-dynamic 미적용, 3단계로 드러남)
- 상태: active
- 커밋: 4de6028(nonce 전환), accc4e3(force-dynamic 분리)

## 미적용 마이그레이션의 컬럼을 insert payload에 무조건 실으면 그 테이블 쓰기가 통째로 죽는다

- 2026-07-26 Phase 20에서 `todos.recurrence` 컬럼을 추가하는 마이그레이션과 함께 `createTodo`가
  `recurrence: input.recurrence ?? null`을 **항상** payload에 담도록 바꿔 배포했다. 그런데
  마이그레이션은 DDL이라 사용자 확인 대기 상태였고 실서버 `todos`에는 그 컬럼이 없었다.
  PostgREST는 insert payload에 존재하지 않는 컬럼이 있으면 **요청 전체를 거부**하므로,
  반복을 쓰지 않는 **평범한 할 일 추가까지 실패**하는 상태로 배포됐다.
- 왜 안 잡혔나: 하위호환은 **읽기 경로만** 챙겼다(`fromRow`에서 `row.recurrence ?? null`,
  zod `.default(null)`). 테스트도 가짜 클라이언트라 실제 스키마를 모르고, 오히려
  "반복이 없으면 null로 저장한다"는 **잘못된 동작을 고정하는 단언**이 들어 있었다.
- 교훈:
  1. **마이그레이션이 적용되기 전에 배포되는 코드는 새 컬럼을 쓰지 않아야 한다.**
     값이 있을 때만 키를 넣는다 — `...(x ? { col: x } : {})`. 그러면 미사용 시 payload가
     마이그레이션 이전과 완전히 동일해진다. null을 넣는 것과 키를 빼는 것은 전혀 다르다.
  2. 하위호환 검토는 읽기·쓰기 **양방향**으로 한다. 읽기만 보면 절반이다.
  3. 계약을 바꿀 때 **실제 배포 DB의 스키마를 확인**한다. 마이그레이션 파일이 있다는 것과
     적용됐다는 것은 다르다(`information_schema.columns` 조회로 확인 가능).
- 최초 발견: 2026-07-26 / 재발견 횟수: 0회
- 상태: active
- 커밋: (같은 세션에서 수정 — createTodo·restoreTodo 조건부 삽입 + 회귀 테스트 6건)
