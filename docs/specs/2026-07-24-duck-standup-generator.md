# Spec: Duck Standup Generator (2026-07-24 /plan 발굴)

> Status: DRAFT — `/spec-loop` 승인 대기

## 동기

기존 activity_daily, todos, habits, pomodoro_sessions, calendar_events 테이블에
24시간 분량의 활동 데이터가 이미 축적됨. 오리 AI 페르소나가 사용자의 하루를
요약해 스탠드업 노트(어제 한 일 / 오늘 할 일 / 막힌 것)를 자동 생성하면
노션/다른 도구에 없는 고유 차별점이 됨. Gemini 요약 패턴(summarizeArticle)과
createPage API가 이미 존재하므로 구현 비용이 낮음.

## 수용 기준 (AC)

### AC-1: core 순수함수 — gatherStandupData
- [ ] `packages/core/src/domain/standup.ts` 추가
- [ ] `StandupInput` 타입: { todos, habits, pomodoros, calendarEvents, activityDaily }
- [ ] `formatStandupPrompt(input: StandupInput, today: string): string` — Gemini 프롬프트 생성
- [ ] 테스트 3건 이상 (빈 데이터, 일반 데이터, 전부 비어있을 때 스킵 메시지)

### AC-2: api 함수 — generateStandup
- [ ] `packages/api/src/standup.ts` 추가
- [ ] `generateStandup(supabase, geminiKey): Promise<{ content: string } | null>`
- [ ] 내부: 24시간 활동 조회 → formatStandupPrompt → geminiGenerate → 결과 반환
- [ ] null 반환 = 활동 없음 (페이지 생성 안 함)
- [ ] 테스트: mock supabase + mock gemini 응답

### AC-3: API Route
- [ ] `apps/web/src/app/api/ai/standup/route.ts` POST
- [ ] auth 필수, rate limit (3/hour)
- [ ] 성공 시 createPage로 스탠드업 노트 자동 생성, 페이지 ID 반환

### AC-4: UI — InsightsView 스탠드업 버튼
- [ ] InsightsView에 "오늘의 스탠드업 생성" 버튼 추가
- [ ] 클릭 → POST /api/ai/standup → 성공 시 생성된 페이지로 이동
- [ ] 로딩/에러 상태 표시
- [ ] 이미 오늘 생성한 경우 중복 방지 (24시간 내 재생성 경고)

## E2E 시나리오

1. 사용자가 InsightsView에서 "스탠드업 생성" 클릭
2. 24시간 활동 데이터 수집 → Gemini 요약 → 페이지 자동 생성
3. 생성된 페이지로 리다이렉트, 오리 페르소나 톤의 스탠드업 노트 확인
4. 활동 없으면 "기록이 없어서 스탠드업을 만들 수 없어요" 안내

## 비스코프

- 자동 스케줄링 (cron) — 후속
- 슬랙/이메일 전송 — 후속
- 스탠드업 템플릿 커스터마이징 — 후속
