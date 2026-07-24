# Spec: Insights Enhancement — Habit Heatmap + Pomodoro Analytics (2026-07-24 /plan 발굴)

> Status: DRAFT — `/spec-loop` 승인 대기

## 동기

InsightsView가 todos/pages/memos/habits/articles/duckState를 집계하지만
pomodoro_sessions 데이터를 전혀 활용하지 않음. 또한 habit_checks에 날짜별
완료 데이터가 있지만 단순 "연속 일수"만 표시. GitHub 기여 잔디와 동일한
히트맵 패턴을 습관에 적용하면 시각적 동기부여 효과가 높음.
두 기능 모두 기존 데이터+패턴 위에 순수 프론트엔드 추가라 구현 비용 최소.

## 수용 기준 (AC)

### AC-1: core 순수함수 — pomodoroSummary
- [ ] `packages/core/src/domain/dashboard.ts`에 `pomodoroSummary` 추가
- [ ] 입력: PomodoroSession[] (기존 타입)
- [ ] 출력: { totalMinutes, sessionsCount, avgMinutes, topTag, streakDays }
- [ ] 테스트 3건 이상 (빈 배열, 일반, 태그 없음)

### AC-2: core 순수함수 — habitHeatmapData
- [ ] `packages/core/src/domain/dashboard.ts`에 `habitHeatmapData` 추가
- [ ] 입력: HabitCheck[], days: number (기본 90)
- [ ] 출력: Array<{ date: string, count: number }> — 날짜별 완료 건수
- [ ] 테스트 3건 이상 (빈 배열, 경계 날짜, 여러 습관 집계)

### AC-3: api — listHabitChecksInRange
- [ ] `packages/api/src/habits.ts`에 날짜 범위 필터 추가
- [ ] `listHabitChecksInRange(supabase, userId, from, to): Promise<HabitCheck[]>`
- [ ] 기존 listHabitChecks와 병존 (기존 함수 변경 없음)
- [ ] 테스트 추가

### AC-4: UI — InsightsView 뽀모도로 섹션
- [ ] InsightsView의 병렬 데이터 로딩에 `listPomodoroSessions` 추가
- [ ] 통계 타일: 총 집중 시간, 세션 수, 평균, 가장 많이 쓴 태그
- [ ] 기존 위젯 카드 스타일과 동일한 디자인

### AC-5: UI — 습관 히트맵 컴포넌트
- [ ] `apps/web/src/components/HabitHeatmap.tsx` 추가
- [ ] GitHub 기여 잔디와 동일한 7행 x N주 격자 (최근 90일)
- [ ] 색상 5단계 (0, 1, 2, 3, 4+)
- [ ] InsightsView 습관 섹션에 배치
- [ ] aria-label 포함 (접근성)
- [ ] `@media (prefers-reduced-motion)` 고려

## E2E 시나리오

1. InsightsView 진입 시 뽀모도로 통계 타일 4개 표시
2. 습관 히트맵에 최근 90일 데이터 격자 렌더링
3. 데이터 없으면 빈 상태 메시지 표시 ("아직 기록이 없어요")
4. 전 패키지 tsc + eslint + 테스트 GREEN

## 비스코프

- 히트맵 날짜 범위 선택 UI — 후속
- 습관별 개별 히트맵 — 후속
- 뽀모도로 차트/그래프 — 후속
