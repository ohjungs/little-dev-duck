import { describe, expect, it } from "vitest";
import { parseRssItems } from "./news";

// normalizeUrl은 `new URL`(플랫폼 전역) 의존이라 api로 옮김 — 테스트도 api/news.test.ts에 있다.

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

describe("실측으로 발견한 요약 추출 문제 (2026-07-26)", () => {
  // 추천 피드 9개를 실제로 받아 파싱해 본 결과 GeekNews만 요약이 30/30 전부 비어 있었다.
  // 원인: GeekNews(Atom)는 <content>를 쓰는데 파서가 description/summary만 봤다.
  // 요약이 없으면 화면에 본문 미리보기가 안 뜨고, Gemini 3줄 요약도 제목만으로 만들어진다.
  it("Atom <content>를 요약으로 쓴다", () => {
    const xml = `<feed><entry>
      <title><![CDATA[제목]]></title>
      <link rel='alternate' href='https://ex.com/a' />
      <content type='html'><![CDATA[<ul><li>본문 <strong>강조</strong> 내용</li></ul>]]></content>
    </entry></feed>`;
    expect(parseRssItems(xml)[0].snippet).toBe("본문 강조 내용");
  });

  it("RSS <content:encoded>도 요약으로 쓴다", () => {
    const xml = `<rss><channel><item>
      <title>제목</title><link>https://ex.com/a</link>
      <content:encoded><![CDATA[<p>본문 내용</p>]]></content:encoded>
    </item></channel></rss>`;
    expect(parseRssItems(xml)[0].snippet).toBe("본문 내용");
  });

  it("description/summary가 있으면 그쪽이 우선이다 (회귀 금지)", () => {
    // Atom 규격상 summary가 발췌, content가 전문이다. 발췌가 있으면 그걸 쓴다.
    const xml = `<feed><entry>
      <title>제목</title><link rel='alternate' href='https://ex.com/a' />
      <summary>짧은 발췌</summary>
      <content>아주 긴 전문</content>
    </entry></feed>`;
    expect(parseRssItems(xml)[0].snippet).toBe("짧은 발췌");
  });

  it("둘 다 없으면 종전대로 null", () => {
    const xml = `<rss><channel><item>
      <title>제목</title><link>https://ex.com/a</link>
    </item></channel></rss>`;
    expect(parseRssItems(xml)[0].snippet).toBeNull();
  });
});

describe("이중 인코딩된 엔티티가 화면에 그대로 보이던 문제 (2026-07-26)", () => {
  // 실측: DEV Community 요약에 `—&gt;`가 그대로 나왔다. 피드가 HTML을 한 번 이스케이프하고
  // XML로 또 이스케이프하기 때문이다(`--&amp;gt;`). 한 번만 풀면 `&gt;`가 남는다.
  // 태그를 걷어낸 뒤 남은 엔티티를 한 번 더 푼다 — 그게 HTML 본문의 엔티티다.
  it("이중 인코딩된 엔티티를 풀어 준다", () => {
    const xml = `<rss><channel><item>
      <title>제목</title><link>https://ex.com/a</link>
      <description>화살표 --&amp;gt; 표시</description>
    </item></channel></rss>`;
    expect(parseRssItems(xml)[0].snippet).toBe("화살표 --> 표시");
  });

  it("한 번만 인코딩된 것도 그대로 잘 푼다 (회귀 금지)", () => {
    const xml = `<rss><channel><item>
      <title>제목</title><link>https://ex.com/a</link>
      <description>A &amp; B</description>
    </item></channel></rss>`;
    expect(parseRssItems(xml)[0].snippet).toBe("A & B");
  });

  it("태그 안의 내용은 걷어내고 텍스트만 남긴다 (회귀 금지)", () => {
    const xml = `<rss><channel><item>
      <title>제목</title><link>https://ex.com/a</link>
      <description>&lt;p&gt;문단 &lt;b&gt;굵게&lt;/b&gt;&lt;/p&gt;</description>
    </item></channel></rss>`;
    expect(parseRssItems(xml)[0].snippet).toBe("문단 굵게");
  });
});
