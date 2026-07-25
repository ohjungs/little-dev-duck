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
  <item><title>A</title><link>https://ex.com/a</link></item>
  <item><title>B</title><link>https://ex.com/b</link></item>
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
    let calls = 0;
    const countingFetch = (async (url: string) => {
      calls += 1;
      return { ok: true, url, text: async () => html } as unknown as Response;
    }) as unknown as typeof fetch;
    const result = await collectFeed(supabase, baseFeed(), { fetchImpl: countingFetch });
    // 원 피드 1회만 fetch — 사설 대역 발견 URL은 fetch 전 차단돼 두 번째 요청이 나가지 않는다.
    expect(calls).toBe(1);
    expect(result.inserted).toBe(0);
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
      (_, i) => `<item><title>T${i}</title><link>https://ex.com/${i}</link></item>`,
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
    expect(state.articleInserts[0].title).toBe("T0");
    expect(state.articleInserts.at(-1)!.title).toBe("T49");
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
