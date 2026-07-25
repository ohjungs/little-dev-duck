// 2026-07-26 : 캘린더 - 날짜키 - 로컬기준
// 타임스탬프(ISO)에서 **로컬** 달력 날짜 키("YYYY-MM-DD")를 뽑는다.
//
// 왜 필요한가: 캘린더 일정은 로컬 자정으로 저장된다(Phase 27 — 화면이 getHours()로 시각을
// 읽어 0시면 "종일"로 보고 감추기 때문). 그 타임스탬프를 `iso.slice(0, 10)`으로 자르면
// **UTC 날짜**가 나오고, KST에서는 전날이 된다. 실제로 Phase 27에서 저장 방식만 고치고
// 읽는 쪽을 안 훑어서 D-day 배지와 표시 날짜가 하루 밀리는 회귀를 냈다.
//
// 날짜 문자열 계산(daysUntil 등)에 넘기기 전에 반드시 이걸 통과시킨다.

import { toLocalDateString } from "@ldd/core";

export function localDateKey(iso: string): string {
  const d = new Date(iso);
  // 해석 못 하는 값은 표시가 통째로 깨지는 것보다 원문이 보이는 편이 낫다.
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return toLocalDateString(d);
}
