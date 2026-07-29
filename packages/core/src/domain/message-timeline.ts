// 2026-07-29 : 메신저 - 대화 타임라인 - 날짜·미읽음 구분선 (Phase 51 T6)
//
// 계획(T6)이 못박은 대로 **날짜 경계는 KST 기준으로 나누고 core 순수 함수로 둔다.**
// 이 저장소는 날짜 경계로 여러 번 데였다 — 화면에서 `new Date().getDate()`로 비교하면
// 사용자의 기기 시간대에 따라 구분선이 다른 자리에 생긴다.
//
// 표시 문구도 여기서 만든다. `Intl`의 로캘 포맷(`ko-KR` full date)은 실행 환경의 ICU 데이터에
// 따라 "2026년 7월 25일 토요일"이 되기도 하고 "(토)"가 되기도 해서 **결과가 환경마다 갈린다.**
// 날짜 문자열에서 직접 조립하면 어디서 돌든 같은 글자가 나온다.

import { epochDay, kstDateString } from "./date-util";

/** 목록 바닥으로부터 이 거리 안이면 "바닥을 보고 있다"고 본다. */
export const NEAR_BOTTOM_PX = 80;

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"] as const;

/**
 * 그 시각이 속한 **KST 날짜**("YYYY-MM-DD").
 * 해석할 수 없으면 빈 문자열 — 던지지 않는다. 값 하나가 이상하다고 대화 전체가 안 그려지면 안 된다.
 */
export function dayKey(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return kstDateString(d);
}

/**
 * 구분선에 적을 문구. 오늘·어제는 날짜보다 그 말이 빨리 읽힌다.
 *
 * **미래 날짜를 "내일"로 부르지 않는다** — 기기 시계가 앞서 있으면 방금 보낸 말이
 * "내일"에 놓인다. 오늘·어제만 특별 취급하고 나머지는 날짜를 그대로 적는다.
 */
export function dayLabel(key: string, todayKey: string): string {
  const diff = epochDay(todayKey) - epochDay(key);
  if (diff === 0) return "오늘";
  if (diff === 1) return "어제";
  const [y, m, d] = key.split("-").map(Number);
  // 1970-01-01(epochDay 0)은 목요일이라 +4를 더해야 일요일 기준이 된다.
  const weekday = WEEKDAYS[(((epochDay(key) + 4) % 7) + 7) % 7];
  return `${y}년 ${m}월 ${d}일 (${weekday})`;
}

/**
 * 이 메시지 앞에 넣을 날짜 구분선 문구. 없으면 null.
 * 첫 메시지 앞에는 항상 넣는다 — 언제 시작된 대화인지가 안 보이면 스크롤 위쪽이 미궁이 된다.
 */
export function dayDivider(
  prevIso: string | null,
  currIso: string,
  todayKey: string,
): string | null {
  const curr = dayKey(currIso);
  if (curr === "") return null;
  if (prevIso === null) return dayLabel(curr, todayKey);
  return dayKey(prevIso) === curr ? null : dayLabel(curr, todayKey);
}

/**
 * 미읽음 구분선을 걸 메시지 id. 다 읽었으면 null.
 *
 * **기준을 `unreadCount`와 똑같이 맞춘다**(seq 비교 · 내 것 제외 · 지운 것 제외 ·
 * 읽음 위치를 못 찾으면 전부 안 읽은 것). 뱃지는 3이라는데 구분선은 다른 자리에 서면
 * 둘 중 하나는 거짓말이 된다.
 */
export function firstUnreadId(
  messages: readonly {
    id: string;
    seq: number;
    senderUserId: string | null;
    deletedAt: string | null;
  }[],
  lastReadMessageId: string | null,
  myUserId: string | null,
): string | null {
  const read = lastReadMessageId
    ? messages.find((m) => m.id === lastReadMessageId)
    : undefined;
  const candidate = messages.find(
    (m) =>
      !m.deletedAt &&
      (myUserId === null || m.senderUserId !== myUserId) &&
      (read === undefined || m.seq > read.seq),
  );
  return candidate?.id ?? null;
}

/**
 * 지금 목록 바닥 근처인가. **새 메시지가 왔다고 무조건 아래로 끌어내리지 않기 위한 판정**이다 —
 * 위쪽 대화를 읽는 중에 화면이 튀면 읽던 자리를 잃는다.
 *
 * DOM을 받지 않고 숫자만 받는다(테스트 가능). 스크롤이 없는 짧은 목록은 항상 바닥이다.
 */
export function isNearBottom(
  scrollTop: number,
  clientHeight: number,
  scrollHeight: number,
  threshold: number = NEAR_BOTTOM_PX,
): boolean {
  return scrollHeight - scrollTop - clientHeight <= threshold;
}
