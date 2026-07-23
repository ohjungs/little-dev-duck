import { describe, expect, it } from "vitest";
import type { Feed } from "@ldd/core";
import { addFeed, collectFeed, normalizeUrl, summarizeArticle } from "./news";

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

function xmlResponse(xml: string) {
  return async () => ({ ok: true, text: async () => xml }) as unknown as Response;
}

const TWO_ITEMS = `<rss><channel>
  <item><title>A</title><link>https://ex.com/a</link></item>
  <item><title>B</title><link>https://ex.com/b</link></item>
</channel></rss>`;

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
