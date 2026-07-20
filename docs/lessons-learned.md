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
