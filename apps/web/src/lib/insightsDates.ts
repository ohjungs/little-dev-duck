// 2026-07-26 : 통계 - 주간경계·스트릭 - 로컬날짜
// 통계 화면의 날짜 계산을 순수함수로 분리한다. 원래는 컴포넌트 안에서 로컬 Date를 만들고
// `toISOString().slice(0, 10)`으로 날짜를 뽑았는데, **그건 UTC 날짜다.**
//
// - 주간 경계: `thisMonday.setHours(0,0,0,0)`(로컬 자정) → `toISOString()`은 UTC로 전날
//   15:00이라, 잘라낸 날짜가 **일요일**이 된다. KST에선 "이번 주" 창이 통째로 하루 밀렸다.
// - 스트릭: 오늘을 UTC로 잘라 얻는데, 비교 대상인 `checkedDate`는 로컬(KST) 날짜다.
//   KST 00:00~09:00 사이엔 "오늘" 키가 어제 것이 돼 스트릭이 어긋났다.
//
// 같은 저장소의 `HabitWidget`(수동 로컬 포맷)과 `HabitHeatmap`(`+ "T00:00:00"`)은 이미 이
// 함정을 피하고 있었다 — 통계 화면만 빠져 있었다.
//
// 그래서 이 파일은 **Date를 쓰지 않고 날짜 문자열로만** 계산한다. 실행 시간대와 무관해진다.

import { epochDay } from "@ldd/core";

// epoch day 수 → "YYYY-MM-DD". UTC 기준으로 만들고 UTC 기준으로 읽으므로 왕복이 정확하다
// (문자열 → epochDay도 UTC 자정 기준이다).
function fromEpochDay(day: number): string {
  const d = new Date(day * 86_400_000);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}`;
}

// 날짜 문자열을 일 단위로 옮긴다. Date를 거치지 않아 실행 시간대와 무관하다.
export function shiftDate(date: string, days: number): string {
  return fromEpochDay(epochDay(date) + days);
}

// 1970-01-01은 목요일. epochDay % 7 == 0 → 목요일이므로 월요일까지의 역산은 (day + 3) % 7.
function daysSinceMonday(date: string): number {
  return (((epochDay(date) + 3) % 7) + 7) % 7;
}

export type WeekBounds = {
  thisStart: string;
  thisEnd: string;
  lastStart: string;
  lastEnd: string;
};

// 이번 주(월요일~오늘)와 지난 주(월~일) 범위. today는 로컬 기준 "YYYY-MM-DD"(todayIso()).
export function weekBounds(today: string): WeekBounds {
  const thisStart = shiftDate(today, -daysSinceMonday(today));
  return {
    thisStart,
    thisEnd: today,
    lastStart: shiftDate(thisStart, -7),
    lastEnd: shiftDate(thisStart, -1),
  };
}

// 오늘부터 거슬러 올라가며 활동이 있는 연속 일수. 오늘이 비어 있으면 아직 하루가 끝나지
// 않은 것으로 보고 어제부터 이어서 센다(원 코드의 의도를 그대로 보존).
export function activeStreak(activeDates: Set<string>, today: string): number {
  let streak = 0;
  for (let i = 0; i < 365; i += 1) {
    const date = shiftDate(today, -i);
    if (activeDates.has(date)) {
      streak += 1;
    } else if (i === 0) {
      continue;
    } else {
      break;
    }
  }
  return streak;
}
