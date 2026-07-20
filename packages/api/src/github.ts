import {
  contributionSummarySchema,
  type ContributionSummary,
} from "@ldd/core";

const GITHUB_GRAPHQL_ENDPOINT = "https://api.github.com/graphql";

const CONTRIBUTIONS_QUERY = `
  query ($login: String!) {
    user(login: $login) {
      contributionsCollection {
        contributionCalendar {
          totalContributions
          weeks {
            contributionDays {
              date
              contributionCount
            }
          }
        }
      }
    }
  }
`;

type GithubContributionsResponse = {
  data?: {
    user: {
      contributionsCollection: {
        contributionCalendar: {
          totalContributions: number;
          weeks: {
            contributionDays: { date: string; contributionCount: number }[];
          }[];
        };
      };
    } | null;
  };
  errors?: { message: string }[];
};

export async function fetchGithubContributions(
  login: string,
  token: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ContributionSummary> {
  const response = await fetchImpl(GITHUB_GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: CONTRIBUTIONS_QUERY, variables: { login } }),
  });

  if (!response.ok) {
    throw new Error(`GitHub API 요청 실패: ${response.status}`);
  }

  const json = (await response.json()) as GithubContributionsResponse;

  if (json.errors?.length) {
    throw new Error(json.errors[0].message);
  }

  const calendar = json.data?.user?.contributionsCollection.contributionCalendar;
  if (!calendar) {
    throw new Error("GitHub 사용자 정보를 찾을 수 없습니다.");
  }

  const days = calendar.weeks.flatMap((week) =>
    week.contributionDays.map((day) => ({
      date: day.date,
      count: day.contributionCount,
    })),
  );

  return contributionSummarySchema.parse({
    totalCount: calendar.totalContributions,
    days,
  });
}
