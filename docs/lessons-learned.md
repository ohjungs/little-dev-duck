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
