import { describe, expect, it } from "vitest";
import { normalizeUrl, parseRssItems } from "./news";

describe("normalizeUrl", () => {
  it("추적 파라미터(utm_/fbclid 등)를 제거한다", () => {
    expect(
      normalizeUrl("https://ex.com/a?utm_source=x&id=7&fbclid=abc"),
    ).toBe("https://ex.com/a?id=7");
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

describe("parseRssItems", () => {
  it("RSS 2.0 item에서 제목/링크/발행일/요약을 뽑는다", () => {
    const xml = `<rss><channel>
      <item>
        <title>테스트 기사</title>
        <link>https://ex.com/article?utm_source=rss</link>
        <pubDate>Mon, 21 Jul 2026 09:00:00 GMT</pubDate>
        <description><![CDATA[<p>본문 <b>미리보기</b></p>]]></description>
      </item>
    </channel></rss>`;
    const items = parseRssItems(xml);
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe("테스트 기사");
    expect(items[0].link).toBe("https://ex.com/article?utm_source=rss");
    expect(items[0].publishedAt).toBe("2026-07-21T09:00:00.000Z");
    // 요약은 HTML 태그가 제거된 텍스트만.
    expect(items[0].snippet).toBe("본문 미리보기");
  });

  it("Atom entry(link href, summary)도 파싱한다", () => {
    const xml = `<feed>
      <entry>
        <title>Atom 글</title>
        <link href="https://ex.com/atom" rel="alternate"/>
        <updated>2026-07-20T12:00:00Z</updated>
        <summary>요약문</summary>
      </entry>
    </feed>`;
    const items = parseRssItems(xml);
    expect(items).toHaveLength(1);
    expect(items[0].link).toBe("https://ex.com/atom");
    expect(items[0].snippet).toBe("요약문");
  });

  it("제목이나 링크가 없는 item은 건너뛴다", () => {
    const xml = `<rss><channel>
      <item><title>링크 없음</title></item>
      <item><link>https://ex.com/no-title</link></item>
    </channel></rss>`;
    expect(parseRssItems(xml)).toHaveLength(0);
  });

  it("요약 스니펫은 500자를 넘지 않는다(본문 전문 미저장)", () => {
    const long = "가".repeat(1000);
    const xml = `<rss><channel><item>
      <title>긴 글</title><link>https://ex.com/l</link>
      <description>${long}</description>
    </item></channel></rss>`;
    const items = parseRssItems(xml);
    expect(items[0].snippet?.length).toBe(500);
  });
});
