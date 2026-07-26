import { describe, expect, it } from "vitest";
import {
  READ_RECEIPT_MIN_INTERVAL_MS,
  afterSend,
  shouldFlushOnLeave,
  shouldSendRead,
} from "./read-receipt";

const NEVER = { sentSeq: null, sentAt: null };

describe("읽음 보내기 판정", () => {
  it("한 번도 안 보냈고 읽은 게 있으면 보낸다", () => {
    expect(shouldSendRead(NEVER, 10, 1000)).toBe(true);
  });

  it("읽을 게 없으면 보내지 않는다 (빈 방에서 포커스만 옮겨도 쏘면 안 된다)", () => {
    expect(shouldSendRead(NEVER, null, 1000)).toBe(false);
  });

  it("같은 위치를 다시 보내지 않는다", () => {
    expect(shouldSendRead({ sentSeq: 10, sentAt: 0 }, 10, 999999)).toBe(false);
  });

  it("뒤로 간 위치는 보내지 않는다 (안 읽은 수가 되살아난다)", () => {
    // 위로 스크롤해 옛 메시지를 봤을 때가 이 경우다.
    expect(shouldSendRead({ sentSeq: 10, sentAt: 0 }, 5, 999999)).toBe(false);
  });

  it("최소 간격 안에는 보내지 않는다 (읽음이 대화보다 많아진다)", () => {
    const state = { sentSeq: 10, sentAt: 1000 };
    expect(shouldSendRead(state, 11, 1000 + READ_RECEIPT_MIN_INTERVAL_MS - 1)).toBe(false);
  });

  it("간격이 지나면 보낸다 — 미루는 것이지 버리는 게 아니다", () => {
    const state = { sentSeq: 10, sentAt: 1000 };
    expect(shouldSendRead(state, 11, 1000 + READ_RECEIPT_MIN_INTERVAL_MS)).toBe(true);
  });

  it("연속 100번 호출해도 실제 전송은 몇 번뿐이다 (예산 계약)", () => {
    // 스크롤 이벤트가 쏟아지는 상황을 흉내 낸다. 이게 이 파일이 있는 이유다.
    let state = { sentSeq: null as number | null, sentAt: null as number | null };
    let sent = 0;
    for (let i = 1; i <= 100; i += 1) {
      const now = 1000 + i * 50; // 50ms 간격으로 100번 = 5초
      if (shouldSendRead(state, i, now)) {
        sent += 1;
        state = afterSend(i, now);
      }
    }
    // 5초 동안 최소 간격 5초 → 처음 1번 + 마지막 즈음 1번 정도.
    expect(sent).toBeLessThanOrEqual(3);
    expect(sent).toBeGreaterThan(0);
  });

  it("시각을 인자로 받는다 (안에서 Date.now를 부르지 않는다)", () => {
    // 같은 인자로 두 번 부르면 같은 답이어야 한다 — 시간에 의존하면 테스트가 흔들린다.
    const state = { sentSeq: 1, sentAt: 0 };
    expect(shouldSendRead(state, 2, 100)).toBe(shouldSendRead(state, 2, 100));
  });
});

describe("보낸 뒤 상태", () => {
  it("seq와 시각을 함께 갱신한다", () => {
    // 한쪽만 갱신하면(시각을 빠뜨리면) 간격 판정이 영영 통과한다.
    expect(afterSend(7, 1234)).toEqual({ sentSeq: 7, sentAt: 1234 });
  });
});

describe("떠날 때 마지막 전송", () => {
  it("아직 안 보낸 게 있으면 간격을 무시하고 보낸다", () => {
    // 떠나는 순간을 놓치면 다음에 들어왔을 때 안 읽은 수가 남아 있다 —
    // 사용자는 분명히 읽었는데 뱃지가 그대로인 걸 본다.
    expect(shouldFlushOnLeave({ sentSeq: 10, sentAt: 999999 }, 11)).toBe(true);
    expect(shouldFlushOnLeave(NEVER, 1)).toBe(true);
  });

  it("보낼 게 없으면 보내지 않는다", () => {
    expect(shouldFlushOnLeave({ sentSeq: 10, sentAt: 0 }, 10)).toBe(false);
    expect(shouldFlushOnLeave(NEVER, null)).toBe(false);
  });
});
