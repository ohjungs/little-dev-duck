// 2026-07-29 : 메신저 - 검색 필터 (Phase 55 T1 L-006~L-008)
//
// 필터 판단을 순수함수로 둔다. 특히 기간은 **KST 날짜 경계**가 계약이다(이 저장소의
// 날짜 원칙 — dayKey·kstDateString과 같은 기준). KST는 DST가 없어 +09:00 고정으로
// 결정적으로 계산할 수 있다. api는 여기서 나온 ISO 경계를 쿼리에 그대로 얹기만 한다.

export type MessageSearchFilter = {
  // 보낸 사람: 사람(user) 또는 오리(agent). 지정 없으면 전체.
  sender?: "user" | "agent";
  // KST 기준 yyyy-mm-dd. from은 그 날 시작부터, to는 그 날 **끝까지 포함**.
  from?: string;
  to?: string;
  // 사진이 붙은 메시지만.
  withImage?: boolean;
};

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

/** yyyy-mm-dd가 실존 날짜인지. "2026-13-99"는 Date가 조용히 다른 달로 굴려버리므로 되짚어 확인한다. */
function parseDayUtc(key: string | undefined): Date | null {
  if (!key || !DATE_KEY.test(key)) return null;
  const d = new Date(`${key}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return null;
  // eslint-disable-next-line no-restricted-syntax -- UTC 자정으로 만든 Date를 같은 UTC 기준으로 되짚어 실존 날짜인지 검증하는 자리다(시간대 변환 아님)
  return d.toISOString().slice(0, 10) === key ? d : null;
}

/**
 * KST 날짜 구간을 ISO 경계로 바꾼다. `toIso`는 **다음날 시작(배타 상한)** — `lt`로 걸면
 * 그 날 23:59:59.999까지 포함된다. 형식이 틀린 쪽은 null(그 경계만 무시) —
 * 잘못된 입력 하나로 검색 전체가 죽으면 안 된다.
 */
export function kstDayRange(
  from: string | undefined,
  to: string | undefined,
): { fromIso: string | null; toIso: string | null } {
  const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
  const fromDay = parseDayUtc(from);
  const toDay = parseDayUtc(to);
  const DAY_MS = 24 * 60 * 60 * 1000;
  return {
    fromIso: fromDay ? new Date(fromDay.getTime() - KST_OFFSET_MS).toISOString() : null,
    // 다음날 00:00 KST = 그 날 15:00 UTC.
    toIso: toDay ? new Date(toDay.getTime() + DAY_MS - KST_OFFSET_MS).toISOString() : null,
  };
}
