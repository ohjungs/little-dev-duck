import { describe, expect, it } from "vitest";
import {
  NOTIFY_HISTORY_CAP,
  NOTIFY_OUTCOME_LABELS,
  readNotifyHistory,
  recordNotifyHistory,
  clearNotifyHistory,
} from "../notifyHistory";

// 2026-07-29 : 알림 - 히스토리 (Phase 56 T1 M-028)
// "아까 알림이 왜 안 왔지?"의 사후 기록. 기기별 localStorage 링(새 로그 테이블 금지 —
// 계획 M-034의 결). 기록 실패가 알림 자체를 막으면 안 된다.

function fakeStorage(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
  } as Pick<Storage, "getItem" | "setItem">;
}

const entry = (n: number, outcome: "fired" | "quiet" = "fired") => ({
  at: `2026-07-29T0${n % 10}:00:00.000Z`,
  title: `알림 ${n}`,
  outcome,
});

describe("recordNotifyHistory / readNotifyHistory", () => {
  it("최신이 앞에 온다", () => {
    const s = fakeStorage();
    recordNotifyHistory(entry(1), s);
    recordNotifyHistory(entry(2), s);
    expect(readNotifyHistory(s).map((e) => e.title)).toEqual(["알림 2", "알림 1"]);
  });

  it("상한을 넘으면 오래된 것부터 떨어진다", () => {
    const s = fakeStorage();
    for (let i = 0; i < NOTIFY_HISTORY_CAP + 5; i++) recordNotifyHistory(entry(i), s);
    expect(readNotifyHistory(s)).toHaveLength(NOTIFY_HISTORY_CAP);
  });

  it("깨진 저장 값은 빈 목록 (기록이 알림을 막지 않는다)", () => {
    expect(readNotifyHistory(fakeStorage({ "ldd:notify-history": "{깨짐" }))).toEqual([]);
  });

  it("모양이 아닌 항목은 걸러 읽는다", () => {
    const s = fakeStorage({
      "ldd:notify-history": JSON.stringify([entry(1), { 이상한: true }, null]),
    });
    expect(readNotifyHistory(s)).toHaveLength(1);
  });

  it("저장소가 던져도 기록 호출이 죽지 않는다", () => {
    const s = {
      getItem: () => null,
      setItem: () => {
        throw new Error("blocked");
      },
    } as unknown as Pick<Storage, "getItem" | "setItem">;
    expect(() => recordNotifyHistory(entry(1), s)).not.toThrow();
  });

  it("지우기", () => {
    const s = fakeStorage();
    recordNotifyHistory(entry(1), s);
    clearNotifyHistory(s);
    expect(readNotifyHistory(s)).toEqual([]);
  });
});

describe("NOTIFY_OUTCOME_LABELS", () => {
  it("발송과 모든 차단 사유에 한국어 라벨이 있다", () => {
    for (const k of ["fired", "unsupported", "permission", "focus", "quiet", "cap"] as const) {
      expect(NOTIFY_OUTCOME_LABELS[k], k).toBeTruthy();
    }
  });
});
