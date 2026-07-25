// 2026-07-26 : 할일 - 반복규칙 - 완료시롤오버
// 반복 할 일을 완료했을 때 옮겨 갈 새 마감일을 계산한다. 반복 회차를 미리 만들어 두지 않고
// 행 하나를 계속 굴리는 모델이라(무료 원칙상 서버 스케줄러가 없다) 이 계산이 곧 "다음 회차"다.

import { epochDay, kstDateString } from "./date-util";
import { nextOccurrence } from "./recurrence";

const DAY_MS = 86_400_000;

// 날짜 경계는 KST로 판정한다. 서버(Vercel)는 UTC로 도는데 `new Date()`의 날짜를 그대로 쓰면
// KST 00:00~09:00 사이에 하루 전으로 계산돼 회차가 통째로 어긋난다(Phase 19에서 습관 체크가
// 같은 함정을 밟았다). 클라이언트가 호출해도 결과가 같도록 양쪽 다 KST 기준으로 통일한다.
function kstDateOf(iso: string): string | null {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return null;
  return kstDateString(parsed);
}

// 반복 할 일 완료 → 새 마감일(ISO). 반복이 아니거나 규칙·마감일이 깨져 있으면 null이고,
// 그때는 호출부가 평소대로 완료 처리하면 된다.
export function rolloverDueDate(
  rule: string | null | undefined,
  currentDue: string | null,
  now: Date,
): string | null {
  const today = kstDateString(now);

  if (currentDue === null) {
    // 마감일 없는 반복 할 일. 다음 회차를 KST 자정으로 세워 준다.
    const next = nextOccurrence(rule, today);
    return next ? new Date(`${next}T00:00:00+09:00`).toISOString() : null;
  }

  const dueDate = kstDateOf(currentDue);
  if (!dueDate) return null;

  // 밀린 할 일은 마감일이 아니라 오늘을 기준으로 잡는다. 3주 지난 주간 할 일을 완료했는데
  // 또 과거 날짜가 나오면 영영 밀린 채로 남는다.
  const base = dueDate > today ? dueDate : today;
  const next = nextOccurrence(rule, base);
  if (!next) return null;

  // 날짜만 옮기고 시각은 원본 그대로 둔다 — "매주 화요일 오전 9시"는 다음 주에도 오전 9시여야
  // 한다. 회차 간격이 항상 정수 일수라 통짜 일수 더하기로 충분하다(KST는 서머타임이 없다).
  const shift = epochDay(next) - epochDay(dueDate);
  return new Date(new Date(currentDue).getTime() + shift * DAY_MS).toISOString();
}
