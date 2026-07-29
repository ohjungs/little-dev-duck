import { describe, expect, it } from "vitest";
import {
  NEAR_BOTTOM_PX,
  dayDivider,
  dayKey,
  dayLabel,
  firstUnreadId,
  isNearBottom,
} from "./message-timeline";

// KST 기준 판정을 확인하려면 UTC와 날짜가 갈리는 시각을 써야 한다.
// 2026-07-25T15:30:00Z = KST 2026-07-26 00:30 → **KST로는 26일**이다.
const UTC_LATE = "2026-07-25T15:30:00.000Z";
const UTC_EARLY = "2026-07-25T02:00:00.000Z"; // KST 11:00 → 25일

describe("dayKey (KST 기준 날짜)", () => {
  it("UTC 자정 근처를 KST 날짜로 넘긴다", () => {
    expect(dayKey(UTC_LATE)).toBe("2026-07-26");
  });

  it("같은 UTC 날짜라도 이른 시각은 KST로도 같은 날이다", () => {
    expect(dayKey(UTC_EARLY)).toBe("2026-07-25");
  });

  it("해석할 수 없는 값이면 빈 문자열 (구분선을 그리지 않게)", () => {
    expect(dayKey("나쁜값")).toBe("");
  });
});

describe("dayLabel", () => {
  it("오늘은 '오늘'", () => {
    expect(dayLabel("2026-07-26", "2026-07-26")).toBe("오늘");
  });

  it("하루 전은 '어제'", () => {
    expect(dayLabel("2026-07-25", "2026-07-26")).toBe("어제");
  });

  it("그 이전은 요일까지 적는다 (2026-07-25는 토요일)", () => {
    expect(dayLabel("2026-07-25", "2026-07-27")).toBe("2026년 7월 25일 (토)");
  });

  it("미래 날짜도 날짜로 적는다 (시계가 어긋난 기기에서 '어제'가 되면 안 된다)", () => {
    expect(dayLabel("2026-07-27", "2026-07-26")).toBe("2026년 7월 27일 (월)");
  });

  it("월·일에 0을 붙이지 않는다", () => {
    expect(dayLabel("2026-01-05", "2026-07-26")).toBe("2026년 1월 5일 (월)");
  });

  it("오늘 날짜를 아직 모르면 날짜를 그대로 적는다 (화면 첫 렌더가 이 경로다)", () => {
    // 현재 시각은 렌더 중에 읽을 수 없어 todayKey가 비어 있는 순간이 있다.
    // 그때 '오늘'이라고 잘못 부르는 대신 날짜를 적는다 — 틀린 말이 되지 않는다.
    expect(dayLabel("2026-07-25", "")).toBe("2026년 7월 25일 (토)");
  });
});

describe("dayDivider", () => {
  const today = "2026-07-26";

  it("첫 메시지 앞에는 항상 구분선을 넣는다", () => {
    expect(dayDivider(null, UTC_EARLY, today)).toBe("어제");
  });

  it("같은 날이면 넣지 않는다", () => {
    expect(dayDivider(UTC_EARLY, "2026-07-25T09:00:00.000Z", today)).toBeNull();
  });

  it("날이 바뀌면 넣는다", () => {
    expect(dayDivider(UTC_EARLY, UTC_LATE, today)).toBe("오늘");
  });

  it("UTC로는 같은 날이어도 KST로 갈리면 넣는다", () => {
    // 둘 다 2026-07-25 UTC지만 KST로는 25일과 26일이다.
    expect(dayDivider(UTC_EARLY, UTC_LATE, today)).not.toBeNull();
  });

  it("해석할 수 없는 시각에는 구분선을 그리지 않는다", () => {
    expect(dayDivider(UTC_EARLY, "나쁜값", today)).toBeNull();
  });
});

describe("firstUnreadId", () => {
  const ME = "me";
  const msgs = [
    { id: "a", seq: 1, senderUserId: "other", deletedAt: null },
    { id: "b", seq: 2, senderUserId: ME, deletedAt: null },
    { id: "c", seq: 3, senderUserId: "other", deletedAt: null },
    { id: "d", seq: 4, senderUserId: "other", deletedAt: null },
  ];

  it("읽음 위치 다음의 첫 남의 메시지", () => {
    expect(firstUnreadId(msgs, "b", ME)).toBe("c");
  });

  it("한 번도 안 읽었으면 가장 오래된 남의 메시지", () => {
    expect(firstUnreadId(msgs, null, ME)).toBe("a");
  });

  it("다 읽었으면 null (구분선이 안 뜬다)", () => {
    expect(firstUnreadId(msgs, "d", ME)).toBeNull();
  });

  it("내가 쓴 것은 안 읽은 것으로 치지 않는다", () => {
    // c·d를 지우면 b(내 것)만 남아 구분선이 뜨면 안 된다.
    const onlyMine = msgs.slice(0, 2);
    expect(firstUnreadId(onlyMine, "a", ME)).toBeNull();
  });

  it("지워진 메시지에는 구분선을 걸지 않는다", () => {
    const withDeleted = [
      { id: "a", seq: 1, senderUserId: "other", deletedAt: "2026-07-26T00:00:00.000Z" },
      { id: "c", seq: 3, senderUserId: "other", deletedAt: null },
    ];
    expect(firstUnreadId(withDeleted, null, ME)).toBe("c");
  });

  it("읽음 위치가 목록에 없으면 전부 안 읽은 것으로 본다 (unreadCount와 같은 기준)", () => {
    expect(firstUnreadId(msgs, "없는id", ME)).toBe("a");
  });
});

describe("isNearBottom", () => {
  it("바닥에 있으면 참", () => {
    expect(isNearBottom(400, 200, 600)).toBe(true);
  });

  it("경계 안이면 참", () => {
    expect(isNearBottom(400 - NEAR_BOTTOM_PX, 200, 600)).toBe(true);
  });

  it("위로 많이 올라가 있으면 거짓 (읽는 중인 사람을 끌어내리지 않는다)", () => {
    expect(isNearBottom(0, 200, 2000)).toBe(false);
  });

  it("스크롤이 없는 짧은 목록은 참", () => {
    expect(isNearBottom(0, 200, 200)).toBe(true);
  });
});
