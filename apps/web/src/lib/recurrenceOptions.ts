// 2026-07-26 : 할일 - 반복규칙 - 선택지생성
// 할 일 하나에 붙일 반복 주기 선택지. "매주"·"매월"은 그 할 일의 마감일(없으면 오늘)이 무슨
// 요일/며칠인지에 따라 달라지므로 항목마다 다시 만든다.

import { describeRecurrence } from "@ldd/core";

const DAY_CODES = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"] as const;

export type RecurrenceOption = { value: string; label: string };

// 클라이언트에서만 부른다 — 사용자의 로컬 시간대가 곧 사용자가 보는 날짜다.
export function recurrenceOptions(
  dueDate: string | null,
  today: Date,
): RecurrenceOption[] {
  const parsed = dueDate ? new Date(dueDate) : null;
  const basis = parsed && !Number.isNaN(parsed.getTime()) ? parsed : today;

  const weekly = `FREQ=WEEKLY;BYDAY=${DAY_CODES[basis.getDay()]}`;
  const monthly = `FREQ=MONTHLY;BYMONTHDAY=${basis.getDate()}`;

  return [
    { value: "", label: "반복 없음" },
    { value: "FREQ=DAILY", label: "매일" },
    { value: weekly, label: describeRecurrence(weekly) ?? "매주" },
    { value: monthly, label: describeRecurrence(monthly) ?? "매월" },
  ];
}

// 이미 설정된 규칙이 위 선택지에 없을 수도 있다(다른 요일에 만들었거나 손으로 넣은 값).
// 그 경우 현재 값을 선택지에 얹어 준다 — 안 그러면 select가 제 값을 못 찾아 "반복 없음"으로
// 보이고, 사용자가 다른 걸 건드리는 순간 원래 규칙이 조용히 사라진다.
export function withCurrentRecurrence(
  options: RecurrenceOption[],
  current: string | null,
): RecurrenceOption[] {
  if (!current || options.some((o) => o.value === current)) return options;
  const label = describeRecurrence(current);
  if (!label) return options;
  return [...options, { value: current, label }];
}
