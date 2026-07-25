// 2026-07-26 : 할일 - 반복규칙 - 최소파서
// 저장 문자열은 RFC 5545 RRULE 어휘를 빌린다(FREQ/INTERVAL/BYDAY/BYMONTHDAY). 다만 파서는
// 이 제품이 실제로 쓰는 3종(매일·매주 요일·매월 날짜)만 다룬다 — `rrule` 패키지는 쓰지도 않을
// BYSETPOS·EXDATE·타임존 확장까지 들여오는 대형 의존이다. 표현력이 부족해지면 문자열이 이미
// 호환 어휘라 그때 승격하면 된다.

export type RecurrenceRule =
  | { freq: "daily"; interval: number }
  | { freq: "weekly"; interval: number; byDay: number[] }
  | { freq: "monthly"; interval: number; byMonthDay: number };

// INTERVAL 상한. 없으면 INTERVAL=99999로 사실상 영영 돌아오지 않는 할 일을 만들 수 있다.
const MAX_INTERVAL = 99;

// RRULE 요일 약어 ↔ JS getDay()(0=일요일). 순서가 곧 요일 번호다.
const DAY_CODES = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"] as const;
const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"] as const;

function parseInterval(raw: string | undefined): number | null {
  if (raw === undefined) return 1;
  if (!/^\d+$/.test(raw)) return null;
  const n = Number(raw);
  return n >= 1 && n <= MAX_INTERVAL ? n : null;
}

function parseByDay(raw: string | undefined): number[] | null {
  if (!raw) return null;
  const days = new Set<number>();
  for (const code of raw.split(",")) {
    const index = DAY_CODES.indexOf(code.trim() as (typeof DAY_CODES)[number]);
    if (index < 0) return null;
    days.add(index);
  }
  // 정렬해 두면 다음 발생일 계산이 입력 순서에 의존하지 않는다.
  return days.size > 0 ? [...days].sort((a, b) => a - b) : null;
}

// 파싱 실패는 던지지 않고 null이다. DB에 이미 깨진 값이 들어가 있어도 반복만 조용히 꺼질 뿐,
// 할 일 목록 전체가 죽어서는 안 된다.
export function parseRecurrence(raw: string | null | undefined): RecurrenceRule | null {
  if (!raw || !raw.trim()) return null;

  const parts = new Map<string, string>();
  for (const chunk of raw.split(";")) {
    const eq = chunk.indexOf("=");
    if (eq < 0) continue;
    parts.set(
      chunk.slice(0, eq).trim().toUpperCase(),
      chunk.slice(eq + 1).trim().toUpperCase(),
    );
  }

  const interval = parseInterval(parts.get("INTERVAL"));
  if (interval === null) return null;

  switch (parts.get("FREQ")) {
    case "DAILY":
      return { freq: "daily", interval };
    case "WEEKLY": {
      const byDay = parseByDay(parts.get("BYDAY"));
      return byDay ? { freq: "weekly", interval, byDay } : null;
    }
    case "MONTHLY": {
      const raw = parts.get("BYMONTHDAY");
      if (!raw || !/^\d+$/.test(raw)) return null;
      const byMonthDay = Number(raw);
      return byMonthDay >= 1 && byMonthDay <= 31
        ? { freq: "monthly", interval, byMonthDay }
        : null;
    }
    default:
      return null;
  }
}

export function serializeRecurrence(rule: RecurrenceRule): string {
  const suffix = rule.interval > 1 ? `;INTERVAL=${rule.interval}` : "";
  switch (rule.freq) {
    case "daily":
      return `FREQ=DAILY${suffix}`;
    case "weekly":
      return `FREQ=WEEKLY;BYDAY=${rule.byDay.map((d) => DAY_CODES[d]).join(",")}${suffix}`;
    case "monthly":
      return `FREQ=MONTHLY;BYMONTHDAY=${rule.byMonthDay}${suffix}`;
  }
}

type DateParts = { year: number; month: number; day: number };

// "YYYY-MM-DD"(뒤에 시각이 붙어 있어도 날짜 부분만) → 연·월·일. 달력에 없는 날짜(2월 30일 등)는
// null이다. Date 생성자는 이런 값을 조용히 다음 달로 굴려버리므로 직접 검사한다.
function parseDateParts(iso: string): DateParts | null {
  const head = iso.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(head)) return null;
  const [year, month, day] = head.split("-").map(Number);
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > daysInMonth(year, month)) return null;
  return { year, month, day };
}

function daysInMonth(year: number, month: number): number {
  // month는 1-12. Date.UTC의 day=0은 "그 달의 0일" = 전달 말일이라, month를 그대로 넘기면
  // 해당 월의 말일이 나온다(윤년 포함).
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function toIso(parts: DateParts): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${parts.year}-${p(parts.month)}-${p(parts.day)}`;
}

// 날짜 산술은 전부 UTC로 한다. 로컬 타임존에서 Date를 더하면 서머타임 전환일에 하루가
// 밀리거나 겹칠 수 있는데, 여기서 다루는 건 시각 없는 "날짜"뿐이라 UTC가 맞다.
function addDays(parts: DateParts, days: number): DateParts {
  const d = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

function dayOfWeek(parts: DateParts): number {
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).getUTCDay();
}

function addMonths(parts: DateParts, months: number, targetDay: number): DateParts {
  const total = (parts.year * 12 + (parts.month - 1)) + months;
  const year = Math.floor(total / 12);
  const month = (total % 12) + 1;
  // 31일 규칙이 2월을 만나면 회차를 건너뛰지 않고 말일로 자른다. 건너뛰면 반복 할 일이
  // 조용히 사라진 것처럼 보인다.
  return { year, month, day: Math.min(targetDay, daysInMonth(year, month)) };
}

// 기준 날짜 **다음**의 발생일. 같은 날을 돌려주면 완료해도 제자리라 사용자가 같은 항목을
// 무한히 다시 보게 된다 — 결과는 항상 from보다 뒤여야 한다.
export function nextOccurrence(
  rule: string | RecurrenceRule | null | undefined,
  from: string,
): string | null {
  const parsed = typeof rule === "string" || rule == null ? parseRecurrence(rule) : rule;
  if (!parsed) return null;

  const start = parseDateParts(from);
  if (!start) return null;

  switch (parsed.freq) {
    case "daily":
      return toIso(addDays(start, parsed.interval));

    case "weekly": {
      const current = dayOfWeek(start);
      const later = parsed.byDay.find((d) => d > current);
      if (later !== undefined) {
        // 같은 주 안에 남은 요일이 있으면 간격과 무관하게 그 요일이 다음 회차다.
        return toIso(addDays(start, later - current));
      }
      // 이번 주가 끝났으면 interval 주 뒤 주의 첫 요일로 감는다(주 시작 = 일요일).
      const toNextWeek = 7 - current;
      return toIso(
        addDays(start, toNextWeek + (parsed.interval - 1) * 7 + parsed.byDay[0]),
      );
    }

    case "monthly": {
      const thisMonth = Math.min(
        parsed.byMonthDay,
        daysInMonth(start.year, start.month),
      );
      if (thisMonth > start.day) {
        return toIso({ year: start.year, month: start.month, day: thisMonth });
      }
      return toIso(addMonths(start, parsed.interval, parsed.byMonthDay));
    }
  }
}

// 목록·승인 카드에 보여줄 한국어 요약.
export function describeRecurrence(
  rule: string | RecurrenceRule | null | undefined,
): string | null {
  const parsed = typeof rule === "string" || rule == null ? parseRecurrence(rule) : rule;
  if (!parsed) return null;

  switch (parsed.freq) {
    case "daily":
      return parsed.interval === 1 ? "매일" : `${parsed.interval}일마다`;
    case "weekly": {
      const days = parsed.byDay.map((d) => DAY_LABELS[d]).join(", ");
      return parsed.interval === 1
        ? `매주 ${days}`
        : `${parsed.interval}주마다 ${days}`;
    }
    case "monthly":
      return parsed.interval === 1
        ? `매월 ${parsed.byMonthDay}일`
        : `${parsed.interval}개월마다 ${parsed.byMonthDay}일`;
  }
}
