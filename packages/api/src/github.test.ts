import { describe, expect, it, vi } from "vitest";
import { fetchGithubContributions } from "./github";

function fakeFetch(response: unknown, ok = true, status = 200) {
  return vi.fn().mockResolvedValue({
    ok,
    status,
    json: async () => response,
  });
}

const CALENDAR_RESPONSE = {
  data: {
    user: {
      contributionsCollection: {
        contributionCalendar: {
          totalContributions: 3,
          weeks: [
            {
              contributionDays: [
                { date: "2026-07-19", contributionCount: 1 },
                { date: "2026-07-20", contributionCount: 2 },
              ],
            },
          ],
        },
      },
    },
  },
};

describe("fetchGithubContributions", () => {
  it("정상 응답을 ContributionSummary로 변환한다", async () => {
    const result = await fetchGithubContributions(
      "octocat",
      "token",
      fakeFetch(CALENDAR_RESPONSE),
    );

    expect(result.totalCount).toBe(3);
    expect(result.days).toEqual([
      { date: "2026-07-19", count: 1 },
      { date: "2026-07-20", count: 2 },
    ]);
  });

  it("HTTP 실패면 에러를 던진다", async () => {
    await expect(
      fetchGithubContributions("octocat", "token", fakeFetch({}, false, 502)),
    ).rejects.toThrow();
  });

  it("GraphQL errors 배열이 있으면 에러를 던진다", async () => {
    await expect(
      fetchGithubContributions(
        "octocat",
        "token",
        fakeFetch({ errors: [{ message: "Could not resolve to a User" }] }),
      ),
    ).rejects.toThrow("Could not resolve to a User");
  });

  it("user가 null이면 에러를 던진다", async () => {
    await expect(
      fetchGithubContributions(
        "octocat",
        "token",
        fakeFetch({ data: { user: null } }),
      ),
    ).rejects.toThrow();
  });

  it("잘못된 형태(zod 검증 실패)면 에러를 던진다", async () => {
    const malformed = {
      data: {
        user: {
          contributionsCollection: {
            contributionCalendar: {
              totalContributions: -1,
              weeks: [],
            },
          },
        },
      },
    };
    await expect(
      fetchGithubContributions("octocat", "token", fakeFetch(malformed)),
    ).rejects.toThrow();
  });
});
