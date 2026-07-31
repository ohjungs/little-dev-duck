// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { GithubContributionWidget } from "@/components/GithubContributionWidget";

// 2026-07-31 : 테스트 - 잔디위젯 - 계약범위한정
// 이 파일이 지키는 계약은 두 층이다.
// (1) 실패 동치류: 401(미로그인)/403(기능 off)/500(GITHUB_TOKEN 미설정)/502(업스트림 실패)와
//     fetch reject는 화면에서 **하나의 상태**로 수렴한다. 위젯은 res.ok만 보고 에러 바디 문구를
//     띄우지 않으므로(GithubContributionWidget.tsx:57) 바디 문구는 단언하지 않는다.
// (2) 대용량 단일 페이로드 렌더: /api/github/contributions는 페이지네이션이 없고 1년치를 한 번에
//     준다. 그래서 "페이지 이동·무한스크롤"이 아니라 "365건을 한 번에 격자로 접는가"가 관심사다.
// 가시성·스크롤(overflow-x-auto)·포커스 트랩은 jsdom에 레이아웃 엔진이 없어 검증할 수 없다.
// 그 층은 Playwright e2e 몫이다.

// packages/api/src/githubIssues.test.ts의 응답 팩토리를 그대로 이식했다(새 의존성 없이 Response
// 흉내를 내는 최소 형태). 위젯이 쓰는 건 ok/json 둘뿐이다.
function jsonRes(status: number, body: unknown): Response {
  return {
    ok: status < 400,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

function stubFetch(): ReturnType<typeof vi.fn<typeof fetch>> {
  const fetchMock = vi.fn<typeof fetch>();
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

const DAY_MS = 86_400_000;

// 합성 픽스처. 2025-01-01부터 하루씩. UTC 기준이라 실행 환경 타임존에 흔들리지 않는다.
function isoDate(offsetDays: number): string {
  // 이 값은 사용자의 "오늘"이 아니라 API 응답을 흉내 내는 고정 픽스처다. 로컬 타임존 함수를 쓰면
  // 실행 머신에 따라 날짜가 달라져 테스트가 환경 의존이 된다. Date.UTC로 만들었으니 UTC로 되읽는다.
  // eslint-disable-next-line no-restricted-syntax -- 위 사유로 UTC가 맞는 자리
  return new Date(Date.UTC(2025, 0, 1) + offsetDays * DAY_MS)
    .toISOString()
    .slice(0, 10);
}

function makeDays(length: number, countAt: (index: number) => number) {
  return Array.from({ length }, (_, i) => ({
    date: isoDate(i),
    count: countAt(i),
  }));
}

const ERROR_TEXT = "잔디를 불러오지 못했습니다.";
const RETRY_LABEL = "다시 시도";
const UNLINKED_TEXT = "GitHub 계정으로 로그인하면 잔디를 볼 수 있어요.";
const EMPTY_LABEL = "GitHub 기여 잔디: 기여가 아직 없어요.";

describe("GithubContributionWidget", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // NF1: 실패 4종은 하나의 동치류다. 상태코드마다 테스트를 따로 두면 같은 사실을 네 번 단언하게
  // 되므로 파라미터화 1건으로 잠근다.
  it.each([401, 403, 500, 502])(
    "NF1: 실패 응답(%i)이면 에러 문구와 재시도 버튼을 보여준다",
    async (status) => {
      const fetchMock = stubFetch();
      fetchMock.mockResolvedValue(jsonRes(status, { error: "서버가 준 문구" }));

      render(<GithubContributionWidget />);

      expect(await screen.findByText(ERROR_TEXT)).not.toBeNull();
      expect(screen.getByRole("button", { name: RETRY_LABEL })).not.toBeNull();
      // 에러 바디 문구는 화면에 노출하지 않는다(사용자에게 서버 내부 사정을 흘리지 않는다).
      expect(screen.queryByText("서버가 준 문구")).toBeNull();
    },
  );

  it("NF2: fetch 자체가 실패(네트워크 단절)해도 응답 실패와 같은 화면으로 수렴한다", async () => {
    const fetchMock = stubFetch();
    fetchMock.mockRejectedValue(new Error("network down"));

    render(<GithubContributionWidget />);

    expect(await screen.findByText(ERROR_TEXT)).not.toBeNull();
    expect(screen.getByRole("button", { name: RETRY_LABEL })).not.toBeNull();
  });

  it("NF3: 실패 화면과 미연동 안내는 서로 배타다", async () => {
    const failing = stubFetch();
    failing.mockResolvedValue(jsonRes(401, { error: "로그인이 필요합니다." }));

    const failed = render(<GithubContributionWidget />);
    await screen.findByText(ERROR_TEXT);
    // 실패는 "연동 안 했다"가 아니다 — 로그인 안내를 띄우면 원인을 오도한다.
    expect(screen.queryByText(UNLINKED_TEXT)).toBeNull();
    failed.unmount();

    vi.unstubAllGlobals();
    const unlinked = stubFetch();
    unlinked.mockResolvedValue(jsonRes(200, { linked: false }));

    render(<GithubContributionWidget />);
    expect(await screen.findByText(UNLINKED_TEXT)).not.toBeNull();
    // 미연동은 에러가 아니다 — 재시도 버튼을 주면 눌러도 같은 화면이 나온다.
    expect(screen.queryByText(ERROR_TEXT)).toBeNull();
    expect(screen.queryByRole("button", { name: RETRY_LABEL })).toBeNull();
  });

  it("NF4: 실패 후 재시도를 누르면 같은 엔드포인트를 다시 부르고 격자를 그린다", async () => {
    const fetchMock = stubFetch();
    fetchMock
      .mockResolvedValueOnce(jsonRes(502, { error: "업스트림 실패" }))
      .mockResolvedValueOnce(
        jsonRes(200, {
          linked: true,
          summary: { totalCount: 3, days: makeDays(7, () => 1) },
        }),
      );

    render(<GithubContributionWidget />);
    await screen.findByText(ERROR_TEXT);

    fireEvent.click(screen.getByRole("button", { name: RETRY_LABEL }));

    expect(await screen.findByRole("img")).not.toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/github/contributions");
    expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/github/contributions");
  });

  it("LP1: 1년치 365건을 한 번에 받아 주 단위 격자로 접는다", async () => {
    // 페이지네이션이 없는 API라 이 테스트가 곧 "대용량 단일 페이로드" 렌즈다.
    // 2026-07-31 : 테스트 - 픽스처 - 합성데이터전제
    // 여기서 마지막 주가 1칸인 것은 365 = 52*7 + 1인 **합성 데이터** 기준이다. 실제 GitHub는
    // 첫 주를 부분 주로 내려주므로(추정) 실데이터의 부분 주 위치는 다를 수 있다. 주 경계가
    // packages/api/src/github.ts의 flatMap에서 소실되는 문제는 백로그(D-1)이며 이 계약 밖이다.
    const days = makeDays(365, (i) => i % 3);
    const totalCount = days.reduce((sum, d) => sum + d.count, 0);

    const fetchMock = stubFetch();
    fetchMock.mockResolvedValue(
      jsonRes(200, { linked: true, summary: { totalCount, days } }),
    );

    render(<GithubContributionWidget />);

    const grid = await screen.findByRole("img");
    // 2026-07-31 : 테스트 - 결합 - 셀카운트는구현결합
    // div[title] 카운트는 "셀 = title 달린 div"라는 현재 구현에 붙어 있다. 접근성 계약은
    // role="img" + aria-label이고(셀은 leaf 안이라 보조기술에 안 보인다), 셀 마크업이 바뀌면
    // 이 단언은 조정 대상이다. 그래도 유지하는 이유는 "365건이 통째로 렌더되는가"를 이보다
    // 싸게 확인할 방법이 없어서다.
    expect(grid.querySelectorAll("div[title]")).toHaveLength(365);
    expect(grid.children).toHaveLength(53);
    expect(grid.children[52].children).toHaveLength(1);
    // 셀 title 포맷도 함께 잠근다(마우스 사용자용 유일한 정보 경로).
    expect(grid.querySelector("div[title]")?.getAttribute("title")).toBe(
      `${days[0].date}: ${days[0].count}개 기여`,
    );
  });

  it("LP2: 빈 요약이어도 격자를 렌더하고 대체 텍스트로 '기여 없음'을 알린다", async () => {
    const fetchMock = stubFetch();
    fetchMock.mockResolvedValue(
      jsonRes(200, { linked: true, summary: { totalCount: 0, days: [] } }),
    );

    render(<GithubContributionWidget />);

    const grid = await screen.findByRole("img");
    // 문구의 단일 출처는 core contributionGridLabel(순수함수, 별도 테스트됨).
    expect(grid.getAttribute("aria-label")).toBe(EMPTY_LABEL);
  });

  // 2026-07-31 : 테스트 - 응답검증 - 200이어도계약위반이면에러
  // 200 + 계약 위반 본문은 이전에 `as` 캐스트로 통과해 linked를 falsy로 읽고 **미연동 안내**를
  // 띄웠다("GitHub 계정으로 로그인하면..."). 로그인은 멀쩡한데 로그인하라고 하는 원인 오도라
  // 실패 화면으로 수렴시킨다. 새 문구·새 상태는 만들지 않는다(NF 계약 재사용).
  it.each<[string, unknown]>([
    ["linked 키 자체가 없다", {}],
    ["linked:true인데 summary가 없다", { linked: true }],
    // linked:true인데 summary를 null로 표현한 경우. 계약 C3은 "미연동이면 summary 키 자체가
    // 없다"이고 null은 어느 쪽에서도 유효한 표현이 아니다.
    ["summary가 null로 왔다", { linked: true, summary: null }],
    [
      "totalCount가 숫자가 아니라 문자열이다",
      { linked: true, summary: { totalCount: "3", days: [] } },
    ],
    [
      "count가 음수다",
      {
        linked: true,
        summary: {
          totalCount: 1,
          days: [{ date: "2025-01-01", count: -1 }],
        },
      },
    ],
    [
      "date가 YYYY-MM-DD가 아니다",
      {
        linked: true,
        summary: { totalCount: 1, days: [{ date: "2025/01/01", count: 1 }] },
      },
    ],
  ])("TC1: 200이지만 %s면 실패 화면으로 수렴한다", async (_label, body) => {
    const fetchMock = stubFetch();
    fetchMock.mockResolvedValue(jsonRes(200, body));

    render(<GithubContributionWidget />);

    expect(await screen.findByText(ERROR_TEXT)).not.toBeNull();
    expect(screen.getByRole("button", { name: RETRY_LABEL })).not.toBeNull();
    // 원인 오도 금지: 검증 실패는 "연동 안 했다"가 아니다.
    expect(screen.queryByText(UNLINKED_TEXT)).toBeNull();
  });

  // 스키마는 strict가 아니라 strip이다(계약 확정). 서버가 필드를 더해도 배포 시차 동안
  // 구 클라이언트가 죽지 않아야 한다 — 이쪽은 "거부하지 않는가"를 잠근다.
  it("TC1-F: 모르는 필드가 섞여 와도 거부하지 않고 정상 렌더한다", async () => {
    const fetchMock = stubFetch();
    fetchMock.mockResolvedValue(
      jsonRes(200, {
        linked: true,
        futureField: "미래에 추가될 값",
        summary: {
          totalCount: 2,
          days: makeDays(2, () => 1),
          futureSummaryField: 42,
        },
      }),
    );

    render(<GithubContributionWidget />);

    expect(await screen.findByRole("img")).not.toBeNull();
    expect(screen.queryByText(ERROR_TEXT)).toBeNull();
  });

  // 2026-07-31 : 테스트 - streak - core추출전잠금
  // 연속 일수 계산은 아직 위젯 안 IIFE다(core 추출은 백로그 B-1). 추출하기 전에 렌더 층에서
  // 동작을 못박아 두면 나중에 순수함수로 옮길 때 이 테스트가 회귀 그물이 된다.
  // days는 계약대로 **날짜 오름차순**이므로 배열 끝이 가장 최근 날이다.
  it.each<[string, number[], string | null]>([
    ["마지막 날까지 이어지면 그 길이를 센다", [1, 1, 1], "연속 3일"],
    ["마지막 날이 0이어도(오늘 아직 안 함) 직전까지를 센다", [1, 1, 1, 0], "연속 3일"],
    ["중간에 끊기면 마지막 구간만 센다", [1, 1, 0, 1, 1], "연속 2일"],
    ["마지막 이틀이 0이면 연속이 끊긴 것으로 본다", [1, 1, 0, 0], null],
    ["기여가 하나도 없으면 배지를 만들지 않는다", [0, 0, 0], null],
  ])("BG1: %s", async (_label, counts, expected) => {
    const days = counts.map((count, i) => ({ date: isoDate(i), count }));
    const totalCount = counts.reduce((sum, c) => sum + c, 0);

    const fetchMock = stubFetch();
    fetchMock.mockResolvedValue(
      jsonRes(200, { linked: true, summary: { totalCount, days } }),
    );

    render(<GithubContributionWidget />);
    await screen.findByRole("img");

    // 총합 배지는 연속 여부와 무관하게 늘 있다.
    expect(screen.getByText(`최근 1년 ${totalCount}개`)).not.toBeNull();

    if (expected === null) {
      expect(screen.queryByText(/^연속 /)).toBeNull();
    } else {
      expect(screen.getByText(expected)).not.toBeNull();
    }
  });
});
