# Phase 20 — 할 일 반복 규칙 (FEATURES MUST 미이행분)

착수 근거: `/loop-eng` SCOPE(5장). Phase 19(VOC 주도) 전 Task 소진 → 신규 로드맵 발굴.

## 발굴 방식 — 추측 대신 "이미 MUST로 확정됐는데 아직 없는 것"을 찾았다

5장은 marketing-skills(AARRR·아이디어 라이브러리) 주도를 기본으로 한다. 그런데 이 저장소에는
그보다 **근거가 강한 소스가 이미 두 개** 있고, 이번 사이클에 둘 다 바닥을 확인했다.

1. `docs/feedback-2026-07-25.md` B절(사용자가 직접 남긴 코드-완결 가능 항목) — **전 항목 구현 완료**를
   코드로 재확인했다(아래 표). Phase 19가 2건을 처리했고 나머지는 그 이전 세션들이 이미 끝냈다.
2. `docs/FEATURES.md`(146항목, MUST 19건) — 전수 대조 결과 **MUST 중 코드에 흔적이 0건인 항목이
   딱 하나 남았다**: 할 일 반복 규칙.

새 아이디어를 지어내기 전에 **이미 상용 필수로 확정해 둔 것 중 안 한 것**을 먼저 하는 게 맞다.
AARRR로 신규 후보를 뽑는 건 이 MUST 잔여가 소진된 뒤에 한다.

## 중복 방지 확인 (재구현 금지 — 이 세션 계열에 2회 위반 이력)

착수 전 실제 코드로 확인한 것:

| 후보(피드백 B절 · FEATURES MUST) | 코드 확인 결과 | 판정 |
|---|---|---|
| 오피스 에셋 통합 | 39924fc에 Modern Interiors 통합 완료 | 이미 완료 |
| 위젯 접기(헤더만 남던 문제) | `DashboardGrid.tsx` `CollapsibleWidget` — 접히면 제목 바만, 펼치면 본체 | 이미 완료 |
| 통계 페이지 탭 구조화 | `InsightsView.tsx` 개요/할일·습관/집중 3탭 + `role="tablist"` | 이미 완료 |
| 설정 페이지 2열 + 연동 통합 + 잔디 이동 | `md:columns-2` 다단 + "외부 연동" 단일 카드(Calendar·GitHub·Gmail) + 잔디 카드 이동됨 | 이미 완료 |
| 캘린더 위젯 월 그리드 + 일정 로딩 | `CalendarWidget.tsx` 월 그리드(`grid-cols-7`)·일정 수 뱃지·선택일 필터 | 이미 완료 |
| 휴지통/soft delete | `pages.ts`에 `deleted_at` 존재 | 부분 존재 → 이번 Phase 밖 |
| 내보내기/백업 | `ExportDataButton.tsx` 존재 | 이미 존재 → 이번 Phase 밖 |
| 스트릭 하루 경계 | `habit.ts`에 streak 로직 존재 | 이미 존재 → 이번 Phase 밖 |
| **할 일 반복 규칙** | `recurrence`/`recurring`/`rrule`/`반복 규칙` **전 저장소 0건**. `todos` 테이블도 id·title·is_done·due_date뿐 | **신규** → T1~T3 |

## 설계 결정 (ponytail 7단계)

- **필요한가**: FEATURES.md가 MUST(상용 필수)로 승격해 둔 항목이고, 개인 워크스페이스에서
  "매주 화 팀 회의" 같은 반복 할 일은 흔하다. 지금은 사용자가 매번 손으로 다시 만들어야 한다.
- **표준을 쓰나**: 반복 규칙의 표준은 RFC 5545 RRULE이다. 그러나 `rrule` 패키지는 이 기능이
  쓰지도 않을 문법(BYSETPOS·EXDATE·타임존 확장)까지 들여오는 대형 의존이다. **저장 문자열은
  RRULE 어휘를 빌리되**(`FREQ=WEEKLY;BYDAY=TU`) 파서는 우리가 쓰는 3종만 다루는 순수함수로 짠다.
  나중에 표현력이 부족해지면 그때 `rrule`로 승격한다(문자열이 이미 호환 어휘라 이행 비용이 낮다).
- **최소 구현 — 인스턴스를 늘리지 않는다**: 반복 할 일마다 미래 인스턴스를 미리 생성하면 행이
  폭발하고 정리 스케줄러가 필요한데, 이 프로젝트는 무료 원칙상 **서버 스케줄러가 없다**.
  대신 **완료 시 다음 회차로 굴린다**(행 1개 유지, `due_date`를 다음 발생일로 옮기고 `is_done`은
  false 유지). Todoist 기본 동작과 같은 모델이고, 스케줄러 없이 성립한다.
- **범위 밖(의도적)**: "매월 마지막 금요일" 같은 서수 규칙. 파서 복잡도의 대부분을 이 한 케이스가
  차지하는데 수요 근거가 없다(YAGNI). 필요해지면 `BYSETPOS`로 확장한다 — 어휘를 RRULE로 맞춰 둔 이유.

## Task

### T1 core — 반복 규칙 파서 + 다음 발생일 계산 (순수함수, STDD)
- **수용 기준**:
  - `FREQ=DAILY[;INTERVAL=n]` / `FREQ=WEEKLY;BYDAY=MO,WE[;INTERVAL=n]` / `FREQ=MONTHLY;BYMONTHDAY=d` 3종을 파싱.
  - 잘못된 문자열은 던지지 않고 `null`을 반환한다(DB에 이미 들어간 값이 깨져도 할 일 목록 전체가
    죽으면 안 된다 — 반복만 조용히 꺼진 것으로 취급).
  - `nextOccurrence(rule, from)`는 **from보다 반드시 뒤**의 날짜를 준다(같은 날 반환 시 완료해도
    제자리라 무한 루프).
  - 월간 31일 규칙이 2월을 만나면 **건너뛰지 않고** 그 달 말일로 잘라 준다(2월 31일은 없으므로).
  - 날짜 경계는 기존 `date-util.ts`(`toLocalDateString`·`kstDateString`)를 재사용한다.
    새 날짜 유틸을 또 만들지 않는다(web·core에 이미 3중복이었던 이력).
- **의존 계약**: core 신규 `recurrence.ts`. 기존 계약 변경 없음.

### T2 계약 — todos에 recurrence 컬럼 + zod 확장
- **수용 기준**: 마이그레이션(`recurrence text` nullable) + **down 스크립트 동반**.
  `todoSchema`에 `recurrence: string | null`을 하위호환 기본값으로 추가(기존 행·기존 호출부 무영향).
- **주의**: DDL 적용(`db push`)은 사용자 확인 사항이다. 이번 사이클은 **마이그레이션 파일 작성까지**만
  하고 적용은 보류한다(Supabase MCP가 이번 세션에서도 Unauthorized — manual-verification 13번).

### T3 배선 — 완료 시 다음 회차로 굴리기 + 설정 UI
- **수용 기준**: 반복이 설정된 할 일을 완료하면 사라지지 않고 다음 발생일로 이동한다.
  반복이 없는 할 일의 동작은 **한 글자도 바뀌지 않는다**(회귀 금지).
  할 일에 반복 주기를 지정·해제하는 UI, 목록에서 반복임을 알아볼 수 있는 표시.

## 검증 정책

각 Task: STDD(core 순수함수 RED→GREEN) + 전 패키지 tsc + 변경 lint + 유닛 GREEN.
UI는 로그인 뒤 화면이라 육안 검증 불가 → 8-1 보류 기록 후 진행.
**T3은 T2 마이그레이션이 적용돼야 실동작한다** — 코드·테스트는 GREEN이어도 실기 검증은 사용자 몫.
