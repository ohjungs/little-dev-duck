// "YYYY-MM-DD" → UTC 자정 기준 epoch day 수. 로컬 타임존 영향 없이 날짜 차이만 계산하기 위한
// 공용 헬퍼. 날짜 문자열은 이미 호출부에서 로컬 기준으로 만들어 넘긴다(저장은 UTC, 계산은 로컬 —
// Phase 7 T0 TZ 정책). 시각(datetime)을 받으면 날짜 부분만 쓴다.
export function epochDay(isoDate: string): number {
  const [year, month, day] = isoDate.slice(0, 10).split("-").map(Number);
  return Math.floor(Date.UTC(year, month - 1, day) / 86_400_000);
}

// Date를 로컬 기준 "YYYY-MM-DD"로. toISOString()은 UTC로 변환해 KST 00:30 같은 자정 직후에
// 날짜를 하루 뒤로 미루므로 쓰지 않는다(Phase 7 T0 TZ 정책: 저장은 UTC, 표시·계산은 로컬).
export function toLocalDateString(date: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

// 2026-07-26 : 날짜 - 서버KST - 하루경계
// 서버(Vercel)는 UTC로 돈다. 서버에서 `new Date()`로 "오늘"을 만들면 KST 00:00~09:00 사이에 하루 전
// 날짜가 나온다 — 오리가 "오늘 습관 체크"를 어제 날짜에 기록하는 식의 버그가 된다.
// 클라이언트는 로컬 타임존이 곧 사용자 시간대라 toLocalDateString을 쓰고, 서버는 이 함수를 쓴다.
// en-CA 로캘이 YYYY-MM-DD를 주므로 문자열 조립 없이 안전하다.
export function kstDateString(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

// 그 날짜가 속한 주의 월요일(로컬 기준). 주간 단위 산출물(회고·다이제스트)이 요일과 무관하게
// 같은 주차 키를 갖게 한다. 일요일은 그 주의 마지막 날로 본다(ISO-8601).
export function startOfWeek(date: Date): Date {
  const day = date.getDay(); // 0=일요일
  const backToMonday = day === 0 ? 6 : day - 1;
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate() - backToMonday,
  );
}
