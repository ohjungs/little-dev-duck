// 2026-07-26 : 캘린더 - 일정시각 - 로컬자정
// 캘린더 일정은 **로컬 자정** 기준으로 저장한다. 화면이 `new Date(startAt).getHours()`로
// 시각을 표시하고 0시 0분이면 "종일"로 보고 시각을 숨기기 때문이다 — 저장이 로컬 기준이어야
// 그 판정과 짝이 맞는다.
//
// 할 일 마감일과 규약이 다른 건 **의도**다. 할 일은 화면이 `dueDate.slice(0, 10)` 문자열로
// 오늘을 판정해서 UTC 자정이 맞고(Phase 23), 캘린더는 getHours()로 읽어서 로컬 자정이 맞다.
// 읽는 방식이 다르면 저장 규약도 달라야 한다.
//
// 원래 버그: `new Date("2026-07-28").toISOString()`은 날짜만 있는 ISO를 **UTC로 해석**한다.
// 한국에서 되읽으면 9시가 되어, 사용자가 고른 적 없는 "오전 9:00"이 모든 일정에 붙었다.

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_RE = /^(\d{1,2}):(\d{2})$/;

function parseTime(time: string): { hour: number; minute: number } | null {
  const m = TIME_RE.exec(time);
  if (!m) return null;
  const hour = Number(m[1]);
  const minute = Number(m[2]);
  if (hour > 23 || minute > 59) return null;
  return { hour, minute };
}

// 날짜(YYYY-MM-DD) + 선택 시각(HH:MM) → 저장용 ISO. 형식이 어긋나면 null이다 —
// 조용히 자정으로 떨어뜨리면 사용자가 고른 시각이 소리 없이 사라진다.
export function eventStartAt(date: string, time: string): string | null {
  const d = DATE_RE.exec(date);
  if (!d) return null;
  const [year, month, day] = [Number(d[1]), Number(d[2]), Number(d[3])];

  let hour = 0;
  let minute = 0;
  if (time !== "") {
    const parsed = parseTime(time);
    if (!parsed) return null;
    ({ hour, minute } = parsed);
  }

  // 문자열이 아니라 숫자 인자로 만든다 — 문자열 파싱은 날짜만 있으면 UTC로 해석되는 게
  // 표준이라, 그 함정을 아예 피한다. 숫자 인자 생성자는 항상 로컬 기준이다.
  const at = new Date(year, month - 1, day, hour, minute, 0, 0);
  // 달력에 없는 날짜(2026-02-30)는 Date가 조용히 다음 달로 굴린다 — 되돌려 대조해 걸러낸다.
  if (at.getFullYear() !== year || at.getMonth() !== month - 1 || at.getDate() !== day) {
    return null;
  }
  return at.toISOString();
}

// 종료가 시작보다 이르거나 같으면 true. 문자열로 비교하면 "9:00" > "14:00"이 참이 되므로
// 분 단위 숫자로 비교한다.
export function isEndBeforeStart(start: string, end: string): boolean {
  if (end === "") return false;
  const s = parseTime(start);
  const e = parseTime(end);
  if (!s || !e) return false;
  return e.hour * 60 + e.minute <= s.hour * 60 + s.minute;
}
