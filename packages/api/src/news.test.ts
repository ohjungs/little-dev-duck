import { describe, expect, it } from "vitest";
import type { Feed } from "@ldd/core";
import { addFeed, collectFeed, discoverFeedUrl, normalizeUrl, summarizeArticle } from "./news";

const USER_ID = "55555555-5555-4555-8555-555555555555";
const FEED_ID = "66666666-6666-4666-8666-666666666666";

function baseFeed(overrides: Partial<Feed> = {}): Feed {
  return {
    id: FEED_ID,
    userId: USER_ID,
    url: "https://ex.com/rss",
    title: null,
    folder: null,
    status: "active",
    failCount: 0,
    createdAt: "2026-07-24T00:00:00.000Z",
    ...overrides,
  };
}

type FakeOpts = {
  duplicateLinks?: string[]; // 이 링크(=identity hash)는 23505로 취급
  user?: { id: string } | null;
};

function fakeSupabase(opts: FakeOpts = {}) {
  const state = {
    articleInserts: [] as Record<string, unknown>[],
    feedUpdates: [] as Record<string, unknown>[],
  };
  const supabase = {
    auth: {
      getUser: async () => ({
        data: { user: opts.user === undefined ? { id: USER_ID } : opts.user },
      }),
    },
    from: (table: string) => {
      if (table === "articles") {
        return {
          insert: (payload: Record<string, unknown>) => {
            state.articleInserts.push(payload);
            const dup = opts.duplicateLinks?.includes(String(payload.url_hash));
            return Promise.resolve({ error: dup ? { code: "23505" } : null });
          },
        };
      }
      return {
        update: (payload: Record<string, unknown>) => ({
          eq: async () => {
            state.feedUpdates.push(payload);
            return { error: null };
          },
        }),
      };
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
  return { supabase, state };
}

function xmlResponse(xml: string, url = "https://ex.com/rss") {
  return async () => ({ ok: true, url, text: async () => xml }) as unknown as Response;
}

const TWO_ITEMS = `<rss><channel>
  <item><title>기사 가</title><link>https://ex.com/a</link></item>
  <item><title>기사 나</title><link>https://ex.com/b</link></item>
</channel></rss>`;

describe("discoverFeedUrl", () => {
  it("HTML <link rel=alternate type=rss>에서 절대 URL을 찾는다", () => {
    const html = `<html><head><link rel="alternate" type="application/rss+xml" href="https://news.hada.io/rss/news"></head></html>`;
    expect(discoverFeedUrl(html, "https://news.hada.io/")).toBe(
      "https://news.hada.io/rss/news",
    );
  });
  it("상대 경로 href를 baseUrl 기준으로 절대화한다", () => {
    const html = `<link rel="alternate" type="application/atom+xml" href="/feed.xml">`;
    expect(discoverFeedUrl(html, "https://example.com/blog")).toBe(
      "https://example.com/feed.xml",
    );
  });
  it("속성 순서가 달라도(href 먼저) 찾는다", () => {
    const html = `<link href="/rss" type="application/rss+xml" rel="alternate">`;
    expect(discoverFeedUrl(html, "https://a.com")).toBe("https://a.com/rss");
  });
  it("RSS 링크가 없으면 null", () => {
    expect(discoverFeedUrl("<html><head><title>x</title></head></html>", "https://a.com")).toBeNull();
    expect(discoverFeedUrl(`<link rel="stylesheet" href="/s.css">`, "https://a.com")).toBeNull();
  });
});

describe("normalizeUrl", () => {
  it("추적 파라미터(utm_/fbclid 등)를 제거한다", () => {
    expect(normalizeUrl("https://ex.com/a?utm_source=x&id=7&fbclid=abc")).toBe(
      "https://ex.com/a?id=7",
    );
  });
  it("해시·끝 슬래시 제거 + 호스트 소문자", () => {
    expect(normalizeUrl("https://Ex.COM/path/#frag")).toBe("https://ex.com/path");
  });
  it("남은 쿼리를 정렬해 순서가 달라도 같은 결과", () => {
    expect(normalizeUrl("https://ex.com/a?b=2&a=1")).toBe(
      normalizeUrl("https://ex.com/a?a=1&b=2"),
    );
  });
  it("파싱 불가한 문자열은 trim만 한다", () => {
    expect(normalizeUrl("  not a url  ")).toBe("not a url");
  });
});

describe("collectFeed", () => {
  it("새 기사만 저장하고 중복(url_hash 충돌)은 건너뛴다", async () => {
    const { supabase, state } = fakeSupabase({
      duplicateLinks: ["https://ex.com/b"], // b는 이미 있는 것처럼
    });
    const result = await collectFeed(supabase, baseFeed(), {
      fetchImpl: xmlResponse(TWO_ITEMS),
    });
    expect(result.inserted).toBe(1); // a만 새로
    expect(state.articleInserts).toHaveLength(2); // 둘 다 시도
    expect(result.paused).toBe(false);
  });

  it("수집 실패가 임계에 도달하면 자동 일시정지한다", async () => {
    const { supabase, state } = fakeSupabase();
    const failingFetch = async () => {
      throw new Error("network");
    };
    const result = await collectFeed(
      supabase,
      baseFeed({ failCount: 4 }), // 임계 5 → 이번 실패로 5
      { fetchImpl: failingFetch as unknown as typeof fetch },
    );
    expect(result.paused).toBe(true);
    expect(state.feedUpdates[0]).toMatchObject({ fail_count: 5, status: "paused" });
  });

  it("첫 실패는 일시정지하지 않고 fail_count만 올린다", async () => {
    const { supabase, state } = fakeSupabase();
    const failingFetch = async () => {
      throw new Error("network");
    };
    const result = await collectFeed(supabase, baseFeed({ failCount: 0 }), {
      fetchImpl: failingFetch as unknown as typeof fetch,
    });
    expect(result.paused).toBe(false);
    expect(state.feedUpdates[0]).toMatchObject({ fail_count: 1, status: "active" });
  });

  it("로그인 안 하면 예외를 던진다", async () => {
    const { supabase } = fakeSupabase({ user: null });
    await expect(
      collectFeed(supabase, baseFeed(), {
        fetchImpl: xmlResponse(TWO_ITEMS),
      }),
    ).rejects.toThrow("로그인이 필요합니다.");
  });

  it("자동발견 URL이 사설/내부 대역이면 fetch하지 않는다(SSRF 방어)", async () => {
    const { supabase } = fakeSupabase();
    // 등록된 사이트 홈이 HTML만 반환하고, 그 안의 RSS 링크가 내부 메타데이터 주소를 가리키는 경우.
    const html = `<html><head><link rel="alternate" type="application/rss+xml" href="http://169.254.169.254/latest/meta-data/"></head></html>`;
    const requested: string[] = [];
    const countingFetch = (async (url: string) => {
      requested.push(url);
      return { ok: true, url, text: async () => html } as unknown as Response;
    }) as unknown as typeof fetch;
    const result = await collectFeed(supabase, baseFeed(), { fetchImpl: countingFetch });
    // 2026-07-26: 호출 "횟수"가 아니라 **어디로 나갔는지**를 단언한다. 관용 경로 폴백이 붙으면서
    // 정상 후보 요청 수는 늘어나는데(그건 의도), 안전 속성은 "사설 대역으로는 한 번도 안 나간다"다.
    // 횟수로 잠그면 폴백을 늘릴 때마다 안전과 무관하게 테스트가 깨지고, 숫자만 고치다 보면
    // 정작 사설 요청이 새어도 통과하게 된다.
    expect(requested.some((u) => u.includes("169.254.169.254"))).toBe(false);
    expect(requested.every((u) => u.startsWith("https://ex.com"))).toBe(true);
    expect(result.inserted).toBe(0);
  });

  it("사이트가 RSS를 광고하지 않아도 관용 경로(/rss.xml 등)로 찾아낸다", async () => {
    const { supabase, state } = fakeSupabase();
    const html = `<html><head><title>피드 링크가 없는 사이트</title></head><body>hi</body></html>`;
    const requested: string[] = [];
    const pathFetch = (async (url: string) => {
      requested.push(url);
      // /feed 만 진짜 피드다 — 그 앞의 후보(/rss.xml)는 HTML을 돌려준다.
      const body = url.endsWith("/feed") ? TWO_ITEMS : html;
      return { ok: true, url, text: async () => body } as unknown as Response;
    }) as unknown as typeof fetch;
    const result = await collectFeed(supabase, baseFeed(), { fetchImpl: pathFetch });
    expect(result.inserted).toBe(2);
    // 다음 수집부터 곧장 가도록 feeds.url을 발견한 주소로 갱신한다.
    expect(state.feedUpdates.some((u) => u.url === "https://ex.com/feed")).toBe(true);
  });

  it("관용 경로를 다 두드려도 없으면 조용히 0건이다(예외 아님)", async () => {
    const { supabase } = fakeSupabase();
    const html = `<html><head></head><body>no feed anywhere</body></html>`;
    const htmlFetch = (async (url: string) =>
      ({ ok: true, url, text: async () => html }) as unknown as Response) as unknown as typeof fetch;
    const result = await collectFeed(supabase, baseFeed(), { fetchImpl: htmlFetch });
    expect(result.inserted).toBe(0);
    expect(result.paused).toBe(false);
  });

  // 2026-07-30 : 뉴스 - 벨로그 전체피드 스팸 필터 (사용자 실사용 피드백)
  // 실사용 계정에서 velog.io 전체 피드(v2.velog.io/rss/)에 중국어 성매매 광고·해외 약 판매
  // 스팸이 실제로 섞여 들어온 걸 확인했다. 한글 비중 낮은 항목은 저장 자체를 건너뛴다.
  it("한글 비중이 낮은 스팸성 항목은 저장하지 않는다", async () => {
    const { supabase, state } = fakeSupabase();
    const spamXml = `<rss><channel>
      <item><title>厦门市外围(上门服务)优质mm上门</title><link>https://ex.com/spam1</link></item>
      <item><title>Order Soma Pills Now Fast Delivery</title><link>https://ex.com/spam2</link></item>
      <item><title>결제 API에 멱등성 키를 적용해 중복 결제 방지하기</title><link>https://ex.com/ok</link></item>
    </channel></rss>`;
    const result = await collectFeed(supabase, baseFeed(), {
      fetchImpl: xmlResponse(spamXml),
    });
    expect(result.inserted).toBe(1);
    expect(state.articleInserts).toHaveLength(1);
    expect(state.articleInserts[0]).toMatchObject({ link: "https://ex.com/ok" });
  });
});

function addFeedSupabase(captured: { url?: string }) {
  return {
    auth: { getUser: async () => ({ data: { user: { id: USER_ID } } }) },
    from: () => ({
      insert: (payload: { url: string; title: string | null; folder: string | null }) => {
        captured.url = payload.url;
        return {
          select: () => ({
            single: async () => ({
              data: {
                id: FEED_ID,
                user_id: USER_ID,
                url: payload.url,
                title: payload.title,
                folder: payload.folder,
                status: "active",
                fail_count: 0,
                created_at: "2026-07-24T00:00:00.000Z",
              },
              error: null,
            }),
          }),
        };
      },
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

describe("addFeed", () => {
  it("유효한 URL은 trim해서 등록한다", async () => {
    const captured: { url?: string } = {};
    const feed = await addFeed(addFeedSupabase(captured), {
      url: "  https://ex.com/rss  ",
    });
    expect(captured.url).toBe("https://ex.com/rss");
    expect(feed.id).toBe(FEED_ID);
  });

  it("내부/사설 주소(SSRF)는 거부한다", async () => {
    await expect(
      addFeed(addFeedSupabase({}), { url: "http://localhost:3000/feed" }),
    ).rejects.toThrow("내부/사설");
    await expect(
      addFeed(addFeedSupabase({}), { url: "http://169.254.169.254/latest" }),
    ).rejects.toThrow("내부/사설");
  });

  it("URL 형식이 아니면 거부한다", async () => {
    await expect(
      addFeed(addFeedSupabase({}), { url: "그냥 텍스트" }),
    ).rejects.toThrow("올바른 URL");
  });

  // 2026-07-26 : 뉴스 - 피드등록 - velog
  // 사용자가 velog 주소를 넣었을 때 "등록은 됐는데 0건"이 되지 않아야 한다.
  it("velog 사용자 주소는 실제 피드 주소로 바꿔 저장한다", async () => {
    const captured: { url?: string } = {};
    await addFeed(addFeedSupabase(captured), { url: "https://velog.io/@velopert" });
    expect(captured.url).toBe("https://v2.velog.io/rss/@velopert");
  });

  // 2026-07-27 정정 (2차 피드백 4-1, Phase 42 T3)
  // 이 검사는 전에 **"아이디 없는 velog는 저장하지 않고 거부한다"**를 잠그고 있었다.
  // 그 근거였던 "velog에 전체 피드가 없다"가 **틀린 실측**이었다 — `https://v2.velog.io/rss/`가
  // 실제로 200에 20건을 준다(2026-07-27 재실측). 거부는 해결이 아니었고, 사용자가 같은 항목을
  // 2차 피드백에 다시 올렸다. 이제 전체 피드로 **저장된다.**
  it("아이디 없는 velog 주소는 전체 글 피드로 바꿔 저장한다", async () => {
    const captured: { url?: string } = {};
    await addFeed(addFeedSupabase(captured), { url: "https://velog.io" });
    expect(captured.url).toBe("https://v2.velog.io/rss/");
  });
});

describe("summarizeArticle", () => {
  it("Gemini 응답 텍스트를 요약으로 돌려준다", async () => {
    const fetchImpl = async () =>
      ({
        ok: true,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: "- 한 줄\n- 두 줄\n- 세 줄" }] } }],
        }),
      }) as unknown as Response;
    const out = await summarizeArticle(
      "key",
      { title: "T", snippet: "본문 요약" },
      fetchImpl as unknown as typeof fetch,
    );
    expect(out).toBe("- 한 줄\n- 두 줄\n- 세 줄");
  });

  it("Gemini 에러 응답이면 예외를 던진다", async () => {
    const fetchImpl = async () =>
      ({ ok: false, status: 429, text: async () => "quota" }) as unknown as Response;
    await expect(
      summarizeArticle("key", { title: "T", snippet: null }, fetchImpl as unknown as typeof fetch),
    ).rejects.toThrow();
  });
});

describe("한 번에 저장하는 기사 수 상한 (실측으로 발견)", () => {
  // 2026-07-26 실측: 추천 피드 9개를 실제로 받아 우리 파서로 돌려 봤더니
  // Vercel 2.9MB/1378건, OpenAI 636KB/1050건이 나왔다. collectFeed는 파싱된 항목을
  // **개수 제한 없이 한 건씩 순차 insert**하므로, 추천 칩 한 번 누르면 1378번 왕복한다.
  // 서버리스 실행시간 안에 끝나지 않고 DB도 두들긴다.
  function manyItems(n: number): string {
    const items = Array.from(
      { length: n },
      (_, i) => `<item><title>기사${i}</title><link>https://ex.com/${i}</link></item>`,
    ).join("");
    return `<rss><channel>${items}</channel></rss>`;
  }

  it("항목이 아무리 많아도 상한까지만 저장한다", async () => {
    const { supabase, state } = fakeSupabase();
    const result = await collectFeed(supabase, baseFeed(), {
      fetchImpl: xmlResponse(manyItems(1378)),
    });
    expect(state.articleInserts.length).toBeLessThanOrEqual(50);
    expect(result.inserted).toBeLessThanOrEqual(50);
  });

  it("상한 이하인 피드는 전부 저장한다 (회귀 금지)", async () => {
    const { supabase, state } = fakeSupabase();
    await collectFeed(supabase, baseFeed(), { fetchImpl: xmlResponse(manyItems(12)) });
    expect(state.articleInserts).toHaveLength(12);
  });

  it("문서 순서(최신 우선)를 지켜 앞에서부터 자른다", async () => {
    // RSS는 관례상 최신이 앞이다. 뒤에서 자르면 오래된 것만 남는다.
    const { supabase, state } = fakeSupabase();
    await collectFeed(supabase, baseFeed(), { fetchImpl: xmlResponse(manyItems(100)) });
    expect(state.articleInserts[0].title).toBe("기사0");
    expect(state.articleInserts.at(-1)!.title).toBe("기사49");
  });

  it("응답이 지나치게 크면 받지 않고 실패로 센다", async () => {
    // 피드 URL은 사용자가 자유롭게 넣는다. 크기를 안 보면 서버가 통째로 버퍼링한다.
    const { supabase, state } = fakeSupabase();
    const hugeHeader = async () =>
      ({
        ok: true,
        url: "https://ex.com/rss",
        headers: { get: (k: string) => (k.toLowerCase() === "content-length" ? "9999999" : null) },
        text: async () => "<rss></rss>",
      }) as unknown as Response;
    const result = await collectFeed(supabase, baseFeed(), { fetchImpl: hugeHeader });
    expect(result.inserted).toBe(0);
    expect(state.articleInserts).toHaveLength(0);
    // 가져오기 실패와 같은 취급 — 연속 실패가 쌓이면 자동 일시정지된다.
    expect(state.feedUpdates.at(-1)!.fail_count).toBe(1);
  });

  it("Content-Length가 없으면 막지 않는다 (정상 피드 회귀 금지)", async () => {
    const { supabase, state } = fakeSupabase();
    const noHeader = async () =>
      ({
        ok: true,
        url: "https://ex.com/rss",
        headers: { get: () => null },
        text: async () => TWO_ITEMS,
      }) as unknown as Response;
    await collectFeed(supabase, baseFeed(), { fetchImpl: noHeader });
    expect(state.articleInserts).toHaveLength(2);
  });
});
