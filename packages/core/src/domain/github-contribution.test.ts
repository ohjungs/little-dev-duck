import { describe, expect, it } from "vitest";
import {
  contributionDaySchema,
  contributionSummarySchema,
  contributionsResponseSchema,
} from "./github-contribution";

describe("contributionDaySchema", () => {
  it("정상값을 통과시킨다", () => {
    expect(
      contributionDaySchema.safeParse({ date: "2026-07-20", count: 3 })
        .success,
    ).toBe(true);
  });

  it("count 0을 허용한다", () => {
    expect(
      contributionDaySchema.safeParse({ date: "2026-07-20", count: 0 })
        .success,
    ).toBe(true);
  });

  it("음수 count를 거부한다", () => {
    expect(
      contributionDaySchema.safeParse({ date: "2026-07-20", count: -1 })
        .success,
    ).toBe(false);
  });

  it("잘못된 형식의 날짜를 거부한다", () => {
    expect(
      contributionDaySchema.safeParse({ date: "not-a-date", count: 1 })
        .success,
    ).toBe(false);
  });
});

describe("contributionSummarySchema", () => {
  it("정상값을 통과시킨다", () => {
    expect(
      contributionSummarySchema.safeParse({
        totalCount: 2,
        days: [
          { date: "2026-07-19", count: 1 },
          { date: "2026-07-20", count: 1 },
        ],
      }).success,
    ).toBe(true);
  });

  it("빈 days 배열을 허용한다", () => {
    expect(
      contributionSummarySchema.safeParse({ totalCount: 0, days: [] })
        .success,
    ).toBe(true);
  });

  it("음수 totalCount를 거부한다", () => {
    expect(
      contributionSummarySchema.safeParse({ totalCount: -1, days: [] })
        .success,
    ).toBe(false);
  });
});

// 2026-07-31 : 기여API - 응답계약 - 판별유니온 잠금
// GET /api/github/contributions의 200 본문 계약이다. 지금까지 이 셰이프는 위젯과 useDuckMood에
// **각자 선언된 로컬 타입**이었고 클라이언트는 `as` 캐스트로 받았다 — 즉 런타임 검증이 0이었다.
// core로 합치면서 여기가 유일한 잠금 지점이 됐으므로, 아래는 계약서의 각 조항과 1:1로 대응한다.
// 렌더 층 단언은 apps/web의 GithubContributionWidget.test.tsx가 따로 진다(여기는 순수 스키마).
describe("contributionsResponseSchema", () => {
  const validSummary = {
    totalCount: 2,
    days: [
      { date: "2026-07-19", count: 1 },
      { date: "2026-07-20", count: 1 },
    ],
  };

  it("linked:true와 정상 summary를 통과시키고 값을 보존한다", () => {
    const parsed = contributionsResponseSchema.parse({
      linked: true,
      summary: validSummary,
    });

    expect(parsed).toEqual({ linked: true, summary: validSummary });
  });

  it("linked:false는 summary 없이 통과한다", () => {
    expect(contributionsResponseSchema.safeParse({ linked: false }).success).toBe(
      true,
    );
  });

  // 계약 C3: 미연동의 summary 표현은 **키 부재**다. null도 {}도 아니다.
  // 파싱 결과에 키가 생기면 `"summary" in data` 류의 소비자 분기가 조용히 뒤집힌다.
  it("linked:false를 파싱한 결과에는 summary 키 자체가 없다", () => {
    const parsed = contributionsResponseSchema.parse({ linked: false });

    expect("summary" in parsed).toBe(false);
  });

  // 계약 [가정](a) 해소: zod가 **불리언 리터럴**을 판별자로 받는가.
  // 문자열 "true"가 통과하면 판별자가 사실상 truthy 검사로 퇴화한 것이라 즉시 잡아야 한다.
  it("판별자는 불리언 리터럴이라 문자열 \"true\"를 거부한다", () => {
    expect(
      contributionsResponseSchema.safeParse({
        linked: "true",
        summary: validSummary,
      }).success,
    ).toBe(false);
  });

  it.each<[string, unknown]>([
    ["linked 키가 아예 없다", {}],
    ["linked:true인데 summary가 없다", { linked: true }],
    // 계약 C3의 반대편: null은 어느 분기에서도 유효한 표현이 아니다.
    ["summary를 null로 표현했다", { linked: true, summary: null }],
    // z.coerce를 쓰지 않기로 확정했으므로 문자열 숫자는 통과하면 안 된다.
    [
      "totalCount가 문자열이다",
      { linked: true, summary: { totalCount: "3", days: [] } },
    ],
    [
      "totalCount가 정수가 아니다",
      { linked: true, summary: { totalCount: 1.5, days: [] } },
    ],
    [
      "days가 배열이 아니다",
      { linked: true, summary: { totalCount: 0, days: {} } },
    ],
    [
      "days의 count가 음수다",
      {
        linked: true,
        summary: { totalCount: 1, days: [{ date: "2026-07-20", count: -1 }] },
      },
    ],
    [
      "days의 date가 YYYY-MM-DD가 아니다",
      {
        linked: true,
        summary: { totalCount: 1, days: [{ date: "2026/07/20", count: 1 }] },
      },
    ],
    ["본문이 배열이다", []],
    ["본문이 null이다", null],
  ])("%s면 거부한다", (_label, body) => {
    expect(contributionsResponseSchema.safeParse(body).success).toBe(false);
  });

  // strict가 아니라 strip으로 확정했다(계약 1절). 서버가 필드를 먼저 배포하고 클라이언트가
  // 뒤따르는 시차 동안 구 클라이언트가 죽으면 안 된다. 통과시키되 **잘라낸다**까지가 계약이다.
  it("모르는 필드는 거부하지 않고 잘라낸다", () => {
    const parsed = contributionsResponseSchema.parse({
      linked: true,
      futureField: "미래에 추가될 값",
      summary: { ...validSummary, futureSummaryField: 42 },
    });

    expect(parsed).toEqual({ linked: true, summary: validSummary });
  });

  it("빈 days를 허용한다(기여 0건 계정)", () => {
    expect(
      contributionsResponseSchema.safeParse({
        linked: true,
        summary: { totalCount: 0, days: [] },
      }).success,
    ).toBe(true);
  });

  // 계약 C5: 성공 본문과 에러 봉투는 **의도적으로 다른 형태**다. 에러 봉투에 linked가 섞이면
  // 클라이언트가 비-2xx 본문을 성공으로 오독할 여지가 생기므로, 반드시 실패함을 못박는다.
  // 문구는 라우트(route.ts)·featureGate의 것을 그대로 옮겼다.
  it.each<[number, string]>([
    [401, "로그인이 필요합니다."],
    [403, "이 기능이 꺼져 있어요. 관리자에게 문의해 주세요."],
    [500, "GITHUB_TOKEN 환경변수가 설정되지 않았습니다."],
    [502, "GitHub 기여 데이터를 불러오지 못했습니다."],
  ])("에러 봉투(%i)는 성공 스키마를 반드시 실패시킨다", (_status, message) => {
    expect(contributionsResponseSchema.safeParse({ error: message }).success).toBe(
      false,
    );
  });
});
