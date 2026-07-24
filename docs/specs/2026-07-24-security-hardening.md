# Spec: Security Hardening Batch (2026-07-24 /plan 발굴)

> Status: DRAFT — `/spec-loop` 승인 대기

## 동기

5인 감사 교차검증(2026-07-24)에서 MUST 등급 보안/정합성 이슈 6건 확인.
단일사용자 앱이지만 correctness·defense-in-depth·성능 측면에서 즉시 수정 필요.

## 수용 기준 (AC)

### AC-1: GEMINI_API_KEY 가드 통합
- [ ] `requireGeminiKey()` 헬퍼를 `apps/web/src/lib/apiHelpers.ts`에 추가
- [ ] 5개 API route (embed, agent, write, reindex-all, news/collect)가 이 헬퍼를 사용
- [ ] 기존 5곳의 인라인 가드 제거
- [ ] 테스트: 헬퍼 단위 테스트 (키 있음 → 반환, 없음 → NextResponse 500)

### AC-2: SSRF 가드 강화
- [ ] `packages/api/src/news.ts` PRIVATE_HOST regex에 `::ffff:` IPv6-mapped 패턴 추가
- [ ] `collectFeed`에서 fetch 후 응답 URL 재검증 (redirect chain 방어)
- [ ] 테스트: IPv6-mapped, decimal-encoded IP 차단 검증

### AC-3: deleteFeed/setFeedStatus user_id 필터
- [ ] `deleteFeed`, `setFeedStatus`에 `.eq('user_id', userId)` 추가
- [ ] 함수 시그니처에 `userId` 파라미터 추가 (또는 내부에서 requireUserId)
- [ ] 기존 테스트 업데이트

### AC-4: Gemini systemInstruction 분리
- [ ] `packages/api/src/agent.ts` — INJECTION_GUARD, buildDateContext, TOOL_PREFERENCE_GUARD를
      Gemini API의 `systemInstruction.parts[0].text`로 이동
- [ ] user contents에서 해당 텍스트 제거
- [ ] 기존 agent 테스트 통과 확인

### AC-5: Embeddings RLS initplan 수정
- [ ] 마이그레이션: `ALTER POLICY` 4건 — `auth.uid()` → `(select auth.uid())`
- [ ] Supabase MCP로 적용 확인

### AC-6: sortRows/filterRows 테스트 추가
- [ ] `packages/core/src/domain/database-view.test.ts`에 sortRows 테스트 5건 이상
- [ ] filterRows 테스트: 각 FILTER_OPS 연산자별 최소 1건
- [ ] 전체 core 테스트 GREEN

## E2E 시나리오

1. 전 패키지 tsc + eslint + 테스트 GREEN
2. `next build` GREEN
3. SSRF 단위 테스트: `http://[::ffff:127.0.0.1]/feed` → 차단
4. agent 테스트: systemInstruction 필드 존재 확인

## 비스코프

- 새 기능 추가 없음
- UI 변경 없음
- OAuth 흐름 변경 없음
