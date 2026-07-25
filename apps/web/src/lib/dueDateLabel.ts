// 2026-07-26 : 할일 - 마감일 - 표시
// 마감일은 UTC 자정(`YYYY-MM-DDT00:00:00.000Z`)으로 저장된다(Phase 23 규약 — 할 일 화면이
// 오늘 필터를 `dueDate.slice(0, 10)`로 판정하기 때문). 그래서 표시도 입력값도 **문자열 앞
// 10자리를 그대로** 쓴다. `toLocaleDateString` 같은 로컬 변환에 태우면 시간대에 따라 하루가
// 밀린다(KST에서는 멀쩡해 보이고 음수 오프셋 지역에서 깨지는 부류라 특히 놓치기 쉽다).

import { epochDay } from "@ldd/core";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function datePart(iso: string | null): string | null {
  if (!iso) return null;
  const head = iso.slice(0, 10);
  return DATE_RE.test(head) ? head : null;
}

// `<input type="date">`의 value. 해석 못 하는 값이면 빈 문자열 — input이 이상한 값을
// 붙들고 있으면 사용자가 고칠 수도 지울 수도 없다.
export function dueDateInputValue(dueDate: string | null): string {
  return datePart(dueDate) ?? "";
}

// 행에 보여줄 문구. today는 로컬 기준 "YYYY-MM-DD"(todayIso()).
export function dueDateLabel(dueDate: string | null, today: string): string | null {
  if (!dueDate) return null;
  const date = datePart(dueDate);
  // 해석 못 하는 값은 감추지 않는다 — 이상한 값이 들어왔다는 걸 사용자가 봐야 한다.
  if (!date) return dueDate;

  const diff = epochDay(date) - epochDay(today);
  if (diff === 0) return "오늘";
  if (diff === 1) return "내일";
  if (diff === -1) return "어제";

  const [year, month, day] = date.split("-").map(Number);
  const sameYear = date.slice(0, 4) === today.slice(0, 4);
  return sameYear ? `${month}월 ${day}일` : `${year}년 ${month}월 ${day}일`;
}
