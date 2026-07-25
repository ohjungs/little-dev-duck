import { describe, expect, it } from "vitest";
import {
  describeRecurrence,
  nextOccurrence,
  parseRecurrence,
  serializeRecurrence,
} from "./recurrence";

describe("parseRecurrence", () => {
  it("매일 규칙을 파싱한다", () => {
    expect(parseRecurrence("FREQ=DAILY")).toEqual({ freq: "daily", interval: 1 });
  });

  it("간격이 있는 매일 규칙을 파싱한다", () => {
    expect(parseRecurrence("FREQ=DAILY;INTERVAL=3")).toEqual({
      freq: "daily",
      interval: 3,
    });
  });

  it("요일이 있는 매주 규칙을 파싱한다", () => {
    expect(parseRecurrence("FREQ=WEEKLY;BYDAY=TU")).toEqual({
      freq: "weekly",
      interval: 1,
      byDay: [2],
    });
  });

  it("여러 요일을 요일 순서로 정규화한다", () => {
    // 입력 순서가 뒤죽박죽이어도 다음 발생일 계산이 순서에 의존하지 않도록 정렬해 둔다.
    expect(parseRecurrence("FREQ=WEEKLY;BYDAY=FR,MO,WE")).toEqual({
      freq: "weekly",
      interval: 1,
      byDay: [1, 3, 5],
    });
  });

  it("중복 요일을 제거한다", () => {
    expect(parseRecurrence("FREQ=WEEKLY;BYDAY=MO,MO")).toEqual({
      freq: "weekly",
      interval: 1,
      byDay: [1],
    });
  });

  it("매월 규칙을 파싱한다", () => {
    expect(parseRecurrence("FREQ=MONTHLY;BYMONTHDAY=15")).toEqual({
      freq: "monthly",
      interval: 1,
      byMonthDay: 15,
    });
  });

  it("키 순서와 대소문자에 의존하지 않는다", () => {
    expect(parseRecurrence("byday=tu;freq=weekly")).toEqual({
      freq: "weekly",
      interval: 1,
      byDay: [2],
    });
  });

  // 아래는 전부 "던지지 않고 null" — DB에 깨진 값이 있어도 할 일 목록 전체가 죽으면 안 된다.
  it.each([
    ["빈 문자열", ""],
    ["공백만", "   "],
    ["FREQ 없음", "INTERVAL=2"],
    ["모르는 FREQ", "FREQ=HOURLY"],
    ["주간인데 요일 없음", "FREQ=WEEKLY"],
    ["주간인데 요일이 잘못됨", "FREQ=WEEKLY;BYDAY=XX"],
    ["월간인데 날짜 없음", "FREQ=MONTHLY"],
    ["월간 날짜 범위 밖", "FREQ=MONTHLY;BYMONTHDAY=32"],
    ["월간 날짜 0", "FREQ=MONTHLY;BYMONTHDAY=0"],
    ["간격 0", "FREQ=DAILY;INTERVAL=0"],
    ["간격 음수", "FREQ=DAILY;INTERVAL=-1"],
    ["간격이 숫자가 아님", "FREQ=DAILY;INTERVAL=매일"],
  ])("%s이면 null을 반환한다", (_label, input) => {
    expect(parseRecurrence(input)).toBeNull();
  });

  it("null 입력도 null을 반환한다", () => {
    expect(parseRecurrence(null)).toBeNull();
  });

  it("비정상적으로 긴 간격은 거부한다", () => {
    // 상한이 없으면 INTERVAL=99999로 사실상 영영 안 돌아오는 할 일이 만들어진다.
    expect(parseRecurrence("FREQ=DAILY;INTERVAL=1000")).toBeNull();
  });
});

describe("serializeRecurrence", () => {
  it("파싱한 값을 다시 문자열로 되돌린다", () => {
    expect(serializeRecurrence({ freq: "daily", interval: 1 })).toBe("FREQ=DAILY");
  });

  it("간격이 1보다 크면 INTERVAL을 붙인다", () => {
    expect(serializeRecurrence({ freq: "daily", interval: 2 })).toBe(
      "FREQ=DAILY;INTERVAL=2",
    );
  });

  it("주간은 요일을 붙인다", () => {
    expect(
      serializeRecurrence({ freq: "weekly", interval: 1, byDay: [1, 3] }),
    ).toBe("FREQ=WEEKLY;BYDAY=MO,WE");
  });

  it("월간은 날짜를 붙인다", () => {
    expect(
      serializeRecurrence({ freq: "monthly", interval: 1, byMonthDay: 15 }),
    ).toBe("FREQ=MONTHLY;BYMONTHDAY=15");
  });

  it.each([
    "FREQ=DAILY",
    "FREQ=DAILY;INTERVAL=3",
    "FREQ=WEEKLY;BYDAY=MO,WE,FR",
    "FREQ=WEEKLY;BYDAY=TU;INTERVAL=2",
    "FREQ=MONTHLY;BYMONTHDAY=1",
  ])("왕복 변환이 값을 보존한다: %s", (rule) => {
    const parsed = parseRecurrence(rule);
    expect(parsed).not.toBeNull();
    expect(serializeRecurrence(parsed!)).toBe(rule);
  });
});

describe("nextOccurrence", () => {
  it("매일: 하루 뒤", () => {
    expect(nextOccurrence("FREQ=DAILY", "2026-07-26")).toBe("2026-07-27");
  });

  it("매일 간격 3: 사흘 뒤", () => {
    expect(nextOccurrence("FREQ=DAILY;INTERVAL=3", "2026-07-26")).toBe("2026-07-29");
  });

  it("월말을 넘어가면 다음 달로 넘어간다", () => {
    expect(nextOccurrence("FREQ=DAILY", "2026-07-31")).toBe("2026-08-01");
  });

  it("연말을 넘어가면 다음 해로 넘어간다", () => {
    expect(nextOccurrence("FREQ=DAILY", "2026-12-31")).toBe("2027-01-01");
  });

  it("윤년 2월 29일을 정확히 계산한다", () => {
    expect(nextOccurrence("FREQ=DAILY", "2028-02-28")).toBe("2028-02-29");
  });

  it("평년 2월은 28일에서 3월로 넘어간다", () => {
    expect(nextOccurrence("FREQ=DAILY", "2026-02-28")).toBe("2026-03-01");
  });

  it("매주 화요일: 일요일에서 보면 이틀 뒤", () => {
    // 2026-07-26은 일요일.
    expect(nextOccurrence("FREQ=WEEKLY;BYDAY=TU", "2026-07-26")).toBe("2026-07-28");
  });

  it("매주 화요일: 화요일에 완료하면 같은 날이 아니라 다음 주 화요일", () => {
    // 같은 날을 돌려주면 완료해도 제자리라 사용자가 무한히 같은 항목을 본다.
    expect(nextOccurrence("FREQ=WEEKLY;BYDAY=TU", "2026-07-28")).toBe("2026-08-04");
  });

  it("여러 요일이면 그중 가장 가까운 다음 요일", () => {
    // 2026-07-27은 월요일 → 다음은 수요일.
    expect(nextOccurrence("FREQ=WEEKLY;BYDAY=MO,WE,FR", "2026-07-27")).toBe(
      "2026-07-29",
    );
  });

  it("주간 마지막 요일이면 다음 주 첫 요일로 감는다", () => {
    // 2026-07-31은 금요일 → 다음은 다음 주 월요일.
    expect(nextOccurrence("FREQ=WEEKLY;BYDAY=MO,WE,FR", "2026-07-31")).toBe(
      "2026-08-03",
    );
  });

  it("격주는 해당 요일에서 2주 뒤", () => {
    expect(nextOccurrence("FREQ=WEEKLY;BYDAY=TU;INTERVAL=2", "2026-07-28")).toBe(
      "2026-08-11",
    );
  });

  it("매월 15일: 그 달 15일 전이면 이번 달 15일", () => {
    expect(nextOccurrence("FREQ=MONTHLY;BYMONTHDAY=15", "2026-07-10")).toBe(
      "2026-07-15",
    );
  });

  it("매월 15일: 15일 당일이면 다음 달 15일", () => {
    expect(nextOccurrence("FREQ=MONTHLY;BYMONTHDAY=15", "2026-07-15")).toBe(
      "2026-08-15",
    );
  });

  it("매월 31일이 2월을 만나면 건너뛰지 않고 말일로 자른다", () => {
    // 2월 31일은 없다. 회차를 통째로 건너뛰면 반복 할 일이 조용히 사라진 것처럼 보인다.
    expect(nextOccurrence("FREQ=MONTHLY;BYMONTHDAY=31", "2026-01-31")).toBe(
      "2026-02-28",
    );
  });

  it("윤년 2월이면 29일로 자른다", () => {
    expect(nextOccurrence("FREQ=MONTHLY;BYMONTHDAY=31", "2028-01-31")).toBe(
      "2028-02-29",
    );
  });

  it("매월 규칙이 연말을 넘어간다", () => {
    expect(nextOccurrence("FREQ=MONTHLY;BYMONTHDAY=1", "2026-12-01")).toBe(
      "2027-01-01",
    );
  });

  it("규칙이 잘못되면 null (반복만 조용히 꺼진다)", () => {
    expect(nextOccurrence("FREQ=NOPE", "2026-07-26")).toBeNull();
  });

  it("기준 날짜가 잘못되면 null", () => {
    expect(nextOccurrence("FREQ=DAILY", "어제")).toBeNull();
  });

  it("시각이 붙은 ISO 문자열을 받아도 날짜 부분만 쓴다", () => {
    expect(nextOccurrence("FREQ=DAILY", "2026-07-26T15:30:00.000Z")).toBe(
      "2026-07-27",
    );
  });

  it("결과는 항상 기준 날짜보다 뒤다", () => {
    const rules = [
      "FREQ=DAILY",
      "FREQ=DAILY;INTERVAL=7",
      "FREQ=WEEKLY;BYDAY=MO,WE,FR",
      "FREQ=WEEKLY;BYDAY=SU",
      "FREQ=MONTHLY;BYMONTHDAY=1",
      "FREQ=MONTHLY;BYMONTHDAY=31",
    ];
    // 한 달치 날짜 전부에 대해 단조 증가를 확인한다 — 제자리 반환은 무한 루프다.
    for (const rule of rules) {
      for (let day = 1; day <= 28; day += 1) {
        const from = `2026-02-${String(day).padStart(2, "0")}`;
        const next = nextOccurrence(rule, from);
        expect(next).not.toBeNull();
        expect(next! > from).toBe(true);
      }
    }
  });
});

describe("describeRecurrence", () => {
  it("매일", () => {
    expect(describeRecurrence("FREQ=DAILY")).toBe("매일");
  });

  it("N일마다", () => {
    expect(describeRecurrence("FREQ=DAILY;INTERVAL=3")).toBe("3일마다");
  });

  it("매주 요일", () => {
    expect(describeRecurrence("FREQ=WEEKLY;BYDAY=TU")).toBe("매주 화");
  });

  it("여러 요일을 나열한다", () => {
    expect(describeRecurrence("FREQ=WEEKLY;BYDAY=MO,WE,FR")).toBe("매주 월, 수, 금");
  });

  it("격주", () => {
    expect(describeRecurrence("FREQ=WEEKLY;BYDAY=TU;INTERVAL=2")).toBe("2주마다 화");
  });

  it("매월 N일", () => {
    expect(describeRecurrence("FREQ=MONTHLY;BYMONTHDAY=15")).toBe("매월 15일");
  });

  it("N개월마다", () => {
    expect(describeRecurrence("FREQ=MONTHLY;BYMONTHDAY=1;INTERVAL=3")).toBe(
      "3개월마다 1일",
    );
  });

  it("규칙이 잘못되면 null", () => {
    expect(describeRecurrence("FREQ=NOPE")).toBeNull();
  });
});
