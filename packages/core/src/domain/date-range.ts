// 2026-07-27 : 통계 - 기간 조회 (2차 피드백 3-1, Phase 46 T2)
// 사용자가 "**어떻게 기간별로 조회할 수 있는지**"를 물었다 — 지금 통계는 기간이 고정이다.
//
// **계산을 화면에 두지 않는 이유**: 이 저장소는 주간 경계가 하루 밀려 집계된 버그를 겪었고
// 그 흔적이 eslint 규칙(`toISOString().slice()` 금지)이다. 기간 계산이 화면마다 흩어지면
// 같은 "최근 7일"이 화면마다 다른 날짜를 가리킨다.
//
// **날짜 문자열("YYYY-MM-DD")로만 다룬다.** Date 객체를 주고받으면 시간대가 어디선가 개입한다 —
// 여기서는 문자열 → 숫자(epoch day) → 문자열로만 오간다.

import { epochDay } from "./date-util";

export const DATE_RANGE_PRESETS = [
  "last7",
  "last30",
  "last90",
  "thisMonth",
  "lastMonth",
] as const;
export type DateRangePreset = (typeof DATE_RANGE_PRESETS)[number];

export interface DateRange {
  // 둘 다 포함(inclusive)이다. 화면이 "7월 1일 ~ 7월 7일"이라고 쓰는 것과 같은 뜻이어야 한다.
  from: string;
  to: string;
}

export const DATE_RANGE_LABELS: Record<DateRangePreset, string> = {
  last7: "최근 7일",
  last30: "최근 30일",
  last90: "최근 90일",
  thisMonth: "이번 달",
  lastMonth: "지난 달",
};

// epoch day → "YYYY-MM-DD". `epochDay`의 역함수다(UTC 자정 기준이라 시간대가 개입하지 않는다).
function dayToIso(day: number): string {
  const d = new Date(day * 86_400_000);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}`;
}

/**
 * 프리셋 → 실제 날짜 구간. `today`는 **호출부가 정한 "오늘"**(KST 문자열)을 그대로 받는다 —
 * 서버는 `kstDateString`, 클라이언트는 `toLocalDateString`이 이미 그 값을 만든다.
 * **여기서 "지금"을 다시 구하지 않는다**: 그러면 서버(UTC)와 화면(로컬)이 다른 날을 본다.
 *
 * 계약:
 * - `from`·`to` 둘 다 **포함**이다.
 * - "최근 N일"은 **오늘을 포함해 N일**이다(어제까지 N일이 아니다 — 화면의 "최근 7일"에
 *   오늘이 빠지면 오늘 한 일이 안 보인다).
 */
export function resolveDateRange(
  preset: DateRangePreset,
  today: string,
): DateRange {
  const todayDay = epochDay(today);
  const [year, month] = today.slice(0, 10).split("-").map(Number);

  switch (preset) {
    case "last7":
    case "last30":
    case "last90": {
      const days = preset === "last7" ? 7 : preset === "last30" ? 30 : 90;
      // 오늘 포함이라 N-1을 뺀다. 여기서 N을 빼면 하루가 더 들어간다.
      return { from: dayToIso(todayDay - (days - 1)), to: today };
    }
    case "thisMonth": {
      const first = `${year}-${String(month).padStart(2, "0")}-01`;
      // 이번 달은 **오늘까지**다 — 아직 오지 않은 날을 기간에 넣으면 평균이 낮아 보인다.
      return { from: first, to: today };
    }
    case "lastMonth": {
      const prevMonth = month === 1 ? 12 : month - 1;
      const prevYear = month === 1 ? year - 1 : year;
      const first = `${prevYear}-${String(prevMonth).padStart(2, "0")}-01`;
      // 지난 달 마지막 날 = 이번 달 1일의 하루 전. 달의 길이를 직접 세지 않는다(윤년·2월).
      const thisFirstDay = epochDay(
        `${year}-${String(month).padStart(2, "0")}-01`,
      );
      return { from: first, to: dayToIso(thisFirstDay - 1) };
    }
  }
}

/** 구간에 속한 날짜 수(양 끝 포함). 평균을 낼 때 분모로 쓴다. */
export function dateRangeDays(range: DateRange): number {
  return epochDay(range.to) - epochDay(range.from) + 1;
}

/** 그 날짜가 구간 안인가(양 끝 포함). 문자열 비교로 충분하다 — 같은 형식이라 사전순=시간순. */
export function isWithinRange(date: string, range: DateRange): boolean {
  const d = date.slice(0, 10);
  return d >= range.from && d <= range.to;
}
