import { describe, expect, it } from "vitest";
import { quotaWindow, quotaWindowMessage } from "./quota";

// Gemini 무료 티어 429 본문 형태. [추정] — 실제 429를 관측하려면 쿼터를 소진해야 해서
// 문서상 응답 스키마(google.rpc.QuotaFailure / RetryInfo)를 근거로 구성했다.
// 이 추정이 빗나가도 quotaWindow는 "unknown"으로 떨어지고, unknown 메시지는 시간을 약속하지
// 않으므로 **지금보다 나빠지지 않는다** — 그게 이 설계의 요점이다.
const DAY_BODY = JSON.stringify({
  error: {
    code: 429,
    message:
      "You exceeded your current quota, please check your plan and billing details. For more information on this error, visit https://ai.google.dev/gemini-api/docs/rate-limits.",
    status: "RESOURCE_EXHAUSTED",
    details: [
      {
        "@type": "type.googleapis.com/google.rpc.QuotaFailure",
        violations: [
          {
            quotaMetric:
              "generativelanguage.googleapis.com/generate_content_free_tier_requests",
            quotaId: "GenerateRequestsPerDayPerProjectPerModel-FreeTier",
            quotaValue: "250",
          },
        ],
      },
    ],
  },
});

const MINUTE_BODY = JSON.stringify({
  error: {
    code: 429,
    message: "You exceeded your current quota.",
    status: "RESOURCE_EXHAUSTED",
    details: [
      {
        "@type": "type.googleapis.com/google.rpc.QuotaFailure",
        violations: [
          {
            quotaId: "GenerateRequestsPerMinutePerProjectPerModel-FreeTier",
            quotaValue: "10",
          },
        ],
      },
      { "@type": "type.googleapis.com/google.rpc.RetryInfo", retryDelay: "29s" },
    ],
  },
});

describe("quotaWindow", () => {
  it("일일 한도 소진을 day로 판별한다", () => {
    expect(quotaWindow(`gemini 429: ${DAY_BODY}`)).toBe("day");
  });

  it("분당 한도 소진을 minute으로 판별한다", () => {
    expect(quotaWindow(`gemini 429: ${MINUTE_BODY}`)).toBe("minute");
  });

  it("토큰/분 한도도 minute으로 본다", () => {
    expect(
      quotaWindow("GenerateContentInputTokensPerModelPerMinute-FreeTier"),
    ).toBe("minute");
  });

  it("분당·일일이 함께 걸리면 day로 본다 — 더 오래 기다려야 하므로", () => {
    expect(
      quotaWindow("...PerMinutePerProjectPerModel... ...PerDayPerProject..."),
    ).toBe("day");
  });

  it("판별할 수 없으면 unknown이다", () => {
    expect(quotaWindow("gemini 429: ")).toBe("unknown");
    expect(quotaWindow("")).toBe("unknown");
    expect(quotaWindow("gemini 429: Too Many Requests")).toBe("unknown");
  });

  it("본문이 200자에서 잘려 판별 정보가 없어도 죽지 않는다", () => {
    const truncated = `gemini 429: ${DAY_BODY}`.slice(0, 200);
    expect(() => quotaWindow(truncated)).not.toThrow();
  });
});

describe("quotaWindowMessage", () => {
  it("일일 한도면 오늘 안에는 안 된다고 말한다", () => {
    const msg = quotaWindowMessage("day");
    expect(msg).toContain("오늘");
    // 여기서 "1분"이라고 하면 사용자는 하루 종일 재시도하게 된다 — 그게 이 수정의 이유다.
    expect(msg).not.toContain("1분");
  });

  it("분당 한도면 잠깐 뒤 다시 시도하라고 말한다", () => {
    expect(quotaWindowMessage("minute")).toContain("분");
  });

  it("unknown이면 지킬 수 없는 시간 약속을 하지 않는다", () => {
    const msg = quotaWindowMessage("unknown");
    expect(msg).not.toContain("1분");
    expect(msg).not.toContain("오늘");
    expect(msg.length).toBeGreaterThan(0);
  });

  it("어떤 경우에도 원문·상태코드·영문이 사용자에게 새지 않는다", () => {
    for (const w of ["day", "minute", "unknown"] as const) {
      const msg = quotaWindowMessage(w);
      expect(msg).not.toContain("429");
      expect(msg).not.toContain("quota");
      expect(msg).not.toMatch(/[A-Za-z]{4,}/);
    }
  });
});
