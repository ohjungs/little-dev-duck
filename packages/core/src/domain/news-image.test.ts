import { describe, expect, it } from "vitest";
import { extractImageUrl, parseRssItems, safeImageUrl } from "./news";

// 2026-07-31 : 뉴스 - 카드 이미지 - 추출·검증 잠금 (사용자 결정 B-6)
//
// 이 값은 **남의 서버가 준 문자열이 곧장 `<img src>`로 가는** 경로다. 두 가지를 지킨다:
//  (1) https만 통과 — data:는 임의 콘텐츠를 심는 통로이고, http:는 https 페이지에서
//      혼합 콘텐츠로 차단돼 깨진 이미지만 남는다.
//  (2) 대표 이미지의 우선순위 — 명시적으로 "대표"라고 알려 준 것(enclosure·media:*)을
//      본문 첫 <img>보다 먼저 믿는다. 본문 첫 이미지는 광고 배너·추적 픽셀일 때가 많다.

describe("이미지 URL 검증", () => {
  it("https만 통과시킨다", () => {
    expect(safeImageUrl("https://cdn.example.com/a.jpg")).toBe(
      "https://cdn.example.com/a.jpg",
    );
    // http는 https 페이지에서 어차피 차단된다 — 저장해 봐야 깨진 이미지다.
    expect(safeImageUrl("http://cdn.example.com/a.jpg")).toBeNull();
    expect(safeImageUrl("data:image/png;base64,AAAA")).toBeNull();
    expect(safeImageUrl("javascript:alert(1)")).toBeNull();
    // 상대 경로는 기준 URL을 신뢰할 수 없어 버린다.
    expect(safeImageUrl("/images/a.jpg")).toBeNull();
    expect(safeImageUrl("//cdn.example.com/a.jpg")).toBeNull();
  });

  it("속성을 벗어날 수 있는 글자가 있으면 버린다", () => {
    expect(safeImageUrl('https://x.com/a.jpg" onerror="alert(1)')).toBeNull();
    expect(safeImageUrl("https://x.com/a .jpg")).toBeNull();
    expect(safeImageUrl("https://x.com/<img>")).toBeNull();
  });

  it("빈 값·공백은 없음으로 본다", () => {
    expect(safeImageUrl(null)).toBeNull();
    expect(safeImageUrl(undefined)).toBeNull();
    expect(safeImageUrl("   ")).toBeNull();
    // 앞뒤 공백은 흔한 피드 오염이라 잘라 내고 판정한다.
    expect(safeImageUrl("  https://x.com/a.jpg  ")).toBe("https://x.com/a.jpg");
  });
});

describe("대표 이미지 추출", () => {
  it("enclosure를 가장 먼저 본다", () => {
    const block = `<item>
      <description>&lt;img src="https://x.com/body.jpg"&gt;</description>
      <media:thumbnail url="https://x.com/thumb.jpg"/>
      <enclosure url="https://x.com/main.jpg" type="image/jpeg" length="1"/>
    </item>`;
    expect(extractImageUrl(block)).toBe("https://x.com/main.jpg");
  });

  it("enclosure가 이미지가 아니면 건너뛴다", () => {
    // 팟캐스트 피드는 enclosure에 오디오를 넣는다 — 그걸 이미지로 쓰면 카드가 깨진다.
    const block = `<item>
      <enclosure url="https://x.com/ep.mp3" type="audio/mpeg"/>
      <media:thumbnail url="https://x.com/thumb.jpg"/>
    </item>`;
    expect(extractImageUrl(block)).toBe("https://x.com/thumb.jpg");
  });

  it("media:content는 이미지라고 밝힌 것만 쓴다", () => {
    const video = `<item><media:content url="https://x.com/v.mp4" type="video/mp4"/></item>`;
    expect(extractImageUrl(video)).toBeNull();

    const medium = `<item><media:content url="https://x.com/p.jpg" medium="image"/></item>`;
    expect(extractImageUrl(medium)).toBe("https://x.com/p.jpg");

    // 영상이 먼저 나와도 뒤의 이미지를 찾아낸다(둘 다 싣는 피드가 있다).
    const both = `<item>
      <media:content url="https://x.com/v.mp4" type="video/mp4"/>
      <media:content url="https://x.com/p.jpg" type="image/jpeg"/>
    </item>`;
    expect(extractImageUrl(both)).toBe("https://x.com/p.jpg");
  });

  it("셋 다 없으면 본문 첫 img를 마지막 수단으로 쓴다", () => {
    const block = `<item><content:encoded>&lt;p&gt;글&lt;/p&gt;&lt;img src="https://x.com/in.jpg" /&gt;</content:encoded></item>`;
    expect(extractImageUrl(block)).toBe("https://x.com/in.jpg");
  });

  it("이미지가 없으면 null이다 (카드는 글자만 나온다)", () => {
    expect(extractImageUrl("<item><title>제목</title></item>")).toBeNull();
  });

  it("안전하지 않은 값은 다음 후보로 넘어간다", () => {
    // enclosure가 http라 버려지고, 그 다음 후보인 thumbnail이 채택돼야 한다 —
    // 여기서 멈추면 http 피드에서 이미지가 통째로 사라진다.
    const block = `<item>
      <enclosure url="http://x.com/insecure.jpg" type="image/jpeg"/>
      <media:thumbnail url="https://x.com/ok.jpg"/>
    </item>`;
    expect(extractImageUrl(block)).toBe("https://x.com/ok.jpg");
  });
});

describe("파서가 이미지를 함께 돌려준다", () => {
  it("항목마다 imageUrl이 붙는다", () => {
    const xml = `<rss><channel>
      <item><title>있음</title><link>https://x.com/1</link>
        <enclosure url="https://x.com/1.jpg" type="image/png"/></item>
      <item><title>없음</title><link>https://x.com/2</link></item>
    </channel></rss>`;
    const items = parseRssItems(xml);
    expect(items.map((i) => i.imageUrl)).toEqual(["https://x.com/1.jpg", null]);
    // 기존 필드가 그대로인지도 함께 본다 — 이미지 추가가 파싱을 흔들면 안 된다.
    expect(items.map((i) => i.title)).toEqual(["있음", "없음"]);
  });
});
