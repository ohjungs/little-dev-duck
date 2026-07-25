import { describe, expect, it } from "vitest";
import { dueDateInputValue, dueDateLabel } from "../dueDateLabel";

// 마감일은 UTC 자정으로 저장된다(Phase 23 규약). 로컬 변환에 태우면 시간대에 따라 하루가
// 밀리므로, 표시도 입력값도 문자열 앞 10자리를 그대로 쓴다.
const TODAY = "2026-07-26";

describe("dueDateInputValue", () => {
  it("저장 형식에서 날짜 부분만 꺼낸다", () => {
    expect(dueDateInputValue("2026-07-28T00:00:00.000Z")).toBe("2026-07-28");
  });

  it("마감일이 없으면 빈 문자열", () => {
    expect(dueDateInputValue(null)).toBe("");
  });

  it("깨진 값이면 빈 문자열 (input이 이상한 값을 붙들지 않게)", () => {
    expect(dueDateInputValue("어제")).toBe("");
  });
});

describe("dueDateLabel", () => {
  it("오늘이면 '오늘'", () => {
    expect(dueDateLabel("2026-07-26T00:00:00.000Z", TODAY)).toBe("오늘");
  });

  it("내일이면 '내일'", () => {
    expect(dueDateLabel("2026-07-27T00:00:00.000Z", TODAY)).toBe("내일");
  });

  it("어제면 '어제'", () => {
    expect(dueDateLabel("2026-07-25T00:00:00.000Z", TODAY)).toBe("어제");
  });

  it("그 밖의 올해 날짜는 월/일", () => {
    expect(dueDateLabel("2026-08-04T00:00:00.000Z", TODAY)).toBe("8월 4일");
  });

  it("해가 다르면 연도까지 보여준다", () => {
    expect(dueDateLabel("2027-01-02T00:00:00.000Z", TODAY)).toBe("2027년 1월 2일");
  });

  it("마감일이 없으면 null", () => {
    expect(dueDateLabel(null, TODAY)).toBeNull();
  });

  it("깨진 값은 감추지 않고 원문을 보여준다", () => {
    // 이상한 값이 들어왔다는 걸 사용자가 봐야 한다.
    expect(dueDateLabel("내일쯤", TODAY)).toBe("내일쯤");
  });

  it("UTC 자정 저장값을 로컬 변환에 태워 하루 밀리지 않는다", () => {
    // toLocaleDateString을 태우면 KST에서 2026-07-26T00:00Z가 7월 26일 09:00으로 나와
        // 괜찮아 보이지만, 음수 오프셋 지역에서는 7월 25일이 된다. 문자열을 그대로 쓴다.
    expect(dueDateLabel("2026-07-26T00:00:00.000Z", "2026-07-26")).toBe("오늘");
    expect(dueDateLabel("2026-12-31T00:00:00.000Z", "2026-12-31")).toBe("오늘");
    expect(dueDateLabel("2027-01-01T00:00:00.000Z", "2026-12-31")).toBe("내일");
  });

  it("월말·연말 경계에서도 어제/내일이 맞다", () => {
    expect(dueDateLabel("2026-02-28T00:00:00.000Z", "2026-03-01")).toBe("어제");
    expect(dueDateLabel("2028-02-29T00:00:00.000Z", "2028-03-01")).toBe("어제");
  });
});
