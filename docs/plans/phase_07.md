# Phase 7 — 게임화 + 생산성 모듈 — 초안

작성 2026-07-21, Phase 6 종료(코드) 직후 `/loop /next-step`의 "다음 Phase 계획 초안" 단계로 생성.
**이 문서는 초안이다. T1 이하 구현 착수는 아래 "착수 조건"을 전부 통과한 뒤 별도 승인이 필요하다.**
로드맵 정의(ARCHITECTURE.md 6절): Phase 7 = 게임화(XP/먹이/코스튬) + 생산성 모듈(뽀모도로/습관/
캘린더). 근거: DECISIONS.md 4절(게임화 규칙)·6절(생산성 모듈 포함 목록)·9절 #7(밸런스 수치 실측),
FEATURES.md 그룹 C(습관·집중)·E(마스코트·게임화)·A(캘린더/TZ).

## 착수 조건 — T0 (직렬, 구현 전 필수)

1. **Phase 6 T4 사용자 실기 검증 통과** — 상태 반응/자율 행동/활보 모드 확인(phase_06.md "T4 검증
   상태"). Phase 7 게임화가 Phase 6 오리 상태 위에 얹히므로 선행.
2. **TZ 단일 기준 명문화** (FEATURES A보완 MUST) — 모든 날짜 계산은 사용자 로컬 TZ, 저장은 UTC.
   습관 스트릭·뽀모도로·캘린더가 전부 TZ 민감이라 Phase 7 계약의 토대. Phase 6에서 이미 `lib/today.ts`
   (로컬 날짜)를 도입했으니 이를 정책으로 승격·문서화하고 core로 끌어올릴지 착수 게이트에서 판정.
3. **스트릭 "하루" 경계 규칙 명문화** (FEATURES C보완 MUST) — 예: 새벽 4시 리셋 설정화 여부. 습관
   스트릭·연속 커밋 계산의 결정론적 기준. duck_state XP 스트릭 원천과도 연결.
4. **게임 밸런스 수치를 코드가 아닌 설정 데이터로 분리** 방침 확정 (FEATURES E보완, DECISIONS 9절 #7)
   — XP 획득량/레벨 곡선/먹이 가격을 `packages/core`의 balance 상수 모듈(또는 데이터)로 두어 조정에
   재배포가 필요 없게. 수치 자체는 착수 게이트에서 실측·확정.

**게이트 규칙**: 위 4항목 확정 + Phase 6 T4 통과 후 계약 잠금 → T1 착수.

## 계약 잠금 대상 (병렬 착수 전 확정, CLAUDE.md 3-3)

- **`packages/core` 도메인·순수함수**:
  - `duck_state` 재사용(이미 스키마 존재: `{userId, xp, level, feed, costume, updatedAt}` — Phase 7
    UI/규칙 최초 연결). `deriveLevel(xp)`, `xpForNextLevel(level)` 순수함수 + balance 설정.
  - `habit` 스키마(제목, 빈도 규칙 매일/주N회, 스트릭 계산 입력), `deriveHabitStreak(checks, boundary)`
    순수함수.
  - `pomodoroSession` 스키마(길이, 시작/종료, 태그), 완료 → XP 매핑.
  - `calendarEvent` 스키마(제목, 시작~종료, D-day 파생), `daysUntil(date, today)` 순수함수.
  - XP 원천 통합 규칙: 할일 완료/커밋/습관 스트릭/뽀모도로 → `awardXp` 순수 규칙(부수효과는 api).
- **DB 마이그레이션(각 down 스크립트 동반, CLAUDE.md 5절)**: `habits`, `habit_checks`,
  `pomodoro_sessions`, `calendar_events` + RLS `user_id = auth.uid()`. `duck_state`는 테이블 존재하나
  RLS/컬럼 재확인. (활동은 기존 `activity_daily` 재사용 검토 — 뽀모도로/습관을 별도 테이블로 둘지 vs
  activity_daily 소스 추가로 흡수할지 착수 게이트 판정.)
- **`packages/api` CRUD 계약**: habits/pomodoro/calendar CRUD + `duck_state` read/update +
  `applyXpAward`(트랜잭션적 XP 증가·레벨 재계산). Realtime `subscribeTable` 헬퍼 도입 지점
  (notion-gap-analysis 6.5절 — 웹/위젯 멀티 서피스 동기화용, 소비처 2곳 이상 되는 이 Phase에서).
- **`packages/ui`**: Dialog(먹이 구매/코스튬 확인) 도입 검토(gap-analysis 6.2절 — Phase 9 예정이나
  게임화 확인 모달이 먼저 필요하면 앞당김).

## Task 초안 (착수 조건 통과 + 승인 후 확정)

- **T1 게임화 코어**: `duck_state` 연결 + `deriveLevel`/balance 설정 + XP 원천 훅(할일 완료·커밋·습관·
  뽀모도로 → `applyXpAward`) + 오리 위젯에 레벨/XP/먹이/코스튬 표시. Phase 6 mood와 결합(레벨업 시
  축하 반응). **오리 상태 서버 동기화**(web↔widget 단일 소스, FEATURES E보완 MUST) 여기서 실체화.
- **T2 습관 트래커**: `habits`/`habit_checks` + 체크 위젯 + 잔디 뷰(기존 GitHub 잔디 컴포넌트 재사용
  검토) + 스트릭 계산(T0 하루 경계 규칙) + 비매일 빈도(주 N회) + 소급 입력(FEATURES C보완).
- **T3 뽀모도로**: 타이머 + 오리 동반 집중(집중 중 오리 연출) + 세션 기록 → XP. 집중 세션 태그·통계
  (FEATURES C). 알림(집중 종료)은 Phase 6 말풍선 + 후속 Phase 12 알림 채널과 연결 지점만.
- **T4 캘린더 + D-day**: `calendar_events` + 캘린더 위젯 + D-day 파생. **주의: Phase 11 DB 캘린더 뷰와
  중복 설계 정리 선행**(notion-gap-analysis 2-2 — 여기 캘린더는 생산성 모듈, P11은 DB 뷰). 타임박싱
  (할일 드래그 배정, FEATURES B)은 이 Phase 또는 P11로.
- **T5 검증**: 게임화 밸런스 시나리오(XP 획득→레벨업→코스튬 해금), 습관 스트릭 경계, 뽀모도로 완료
  XP, 캘린더 D-day. 실사용 사용자 검증 병행(Phase 5/6 T4 패턴).

## 하지 않는 것 (현재 판단, 착수 게이트에서 재확인)

- 계절 한정 의상·진화 단계 수집, 스트릭 배지 공유, 다꾸형 스티커(FEATURES E, DEFER) — 콘텐츠 비용 큼.
- 부정 피드백(할일 미루면 컨디션 하락, FEATURES E DEFER) — UX 리스크, 보류.
- 파티·보스전·미니게임·돈 걸기(FEATURES E SKIP) — 제품 정의 밖.
- DB 캘린더 뷰 전체(P11 스코프) — Phase 7은 생산성 캘린더 위젯까지.
- 아침 브리핑/주간 리포트 위저드(FEATURES D DEFER) — P15 뉴스 파이프라인과 함께 검토.

## 규모 주의

Phase 7은 게임화 + 4개 생산성 축(습관·뽀모도로·캘린더 + duck_state 연결)으로 **역대 Phase 중 큰
편**이다. 착수 게이트에서 (a) T1(게임화 코어)만 우선 닫고 생산성 모듈을 T2~T4로 순차 진행할지, (b)
습관·뽀모도로·캘린더를 별도 승인 단위로 쪼갤지 사용자와 범위를 정한다(Phase 6이 T1+T2+T3 전부를
한 번에 승인받은 것과 달리, 규모상 분할 승인이 나을 수 있음).
