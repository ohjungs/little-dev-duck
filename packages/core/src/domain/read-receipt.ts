// 2026-07-27 : 메신저 - 읽음 보내기 판정 (Phase 51 T1)
//
// 계획이 짚은 예산 문제가 이 파일의 존재 이유다:
// **무료 티어 Realtime은 월 200만 메시지**인데, 읽음 위치를 스크롤·포커스마다 쏘면
// **읽음 이벤트가 대화보다 많아진다.** 대화 100건을 읽는 동안 읽음이 100번 나가면
// 실제 대화량의 두 배를 태우는 셈이다.
//
// 그래서 "지금 보낼까"를 **순수 함수 하나로** 판정한다. 화면 여기저기서 조건을 흩어 두면
// 어디선가 한 곳이 빠져 예산을 태운다.
//
// **시각을 인자로 받는다.** 안에서 `Date.now()`를 부르면 테스트가 시간에 의존하게 되고,
// 이 저장소는 날짜·시간대 문제로 이미 여러 번 데였다.

/** 읽음을 다시 보내기까지 최소 간격. 이보다 자주 오는 요청은 뒤로 미룬다. */
export const READ_RECEIPT_MIN_INTERVAL_MS = 5000;

export type ReadReceiptState = {
  /** 마지막으로 서버에 보낸 읽음 위치의 seq. 보낸 적 없으면 null. */
  sentSeq: number | null;
  /** 그때의 시각(epoch ms). 보낸 적 없으면 null. */
  sentAt: number | null;
};

/**
 * 지금 읽음을 보낼지 판정한다.
 *
 * 보내는 경우:
 *   - 아직 한 번도 안 보냈고 읽은 것이 있다
 *   - 마지막으로 보낸 것보다 **뒤**를 읽었고, 최소 간격이 지났다
 *
 * 보내지 않는 경우:
 *   - 읽은 위치가 그대로거나 **뒤로 갔다**(위로 스크롤해 옛 메시지를 봤을 때).
 *     되돌리면 안 읽은 수가 되살아난다.
 *   - 최소 간격이 안 지났다 — **미루는 것이지 버리는 것이 아니다.**
 *     간격이 지난 뒤 같은 판정을 다시 하면 그때 보낸다.
 */
export function shouldSendRead(
  state: ReadReceiptState,
  latestSeq: number | null,
  now: number,
  minIntervalMs: number = READ_RECEIPT_MIN_INTERVAL_MS,
): boolean {
  // 읽을 게 없으면 보낼 것도 없다(빈 방에서 포커스만 옮겨도 쏘면 안 된다).
  if (latestSeq === null) return false;
  if (state.sentSeq === null) return true;
  if (latestSeq <= state.sentSeq) return false;
  if (state.sentAt === null) return true;
  return now - state.sentAt >= minIntervalMs;
}

/**
 * 보낸 뒤의 상태. 호출부가 직접 객체를 만들면 한쪽만 갱신하는 실수가 난다
 * (seq만 올리고 시각을 안 올리면 간격 판정이 영영 통과한다).
 */
export function afterSend(latestSeq: number, now: number): ReadReceiptState {
  return { sentSeq: latestSeq, sentAt: now };
}

/**
 * 화면을 떠날 때(창을 닫거나 방을 옮길 때)는 간격을 무시하고 한 번 보낼지 판정한다.
 * **떠나는 순간을 놓치면 다음에 들어왔을 때 안 읽은 수가 남아 있다** — 사용자는
 * 분명히 읽었는데 뱃지가 그대로인 걸 본다.
 */
export function shouldFlushOnLeave(
  state: ReadReceiptState,
  latestSeq: number | null,
): boolean {
  if (latestSeq === null) return false;
  if (state.sentSeq === null) return true;
  return latestSeq > state.sentSeq;
}
