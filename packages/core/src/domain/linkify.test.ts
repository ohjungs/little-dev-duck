import { describe, expect, it } from "vitest";
import { linkifyParts, pageIdFromHref, collectPageIds } from "./linkify";

describe("linkifyParts (메시지 URL 링크화)", () => {
  it("URL이 없으면 전체가 글", () => {
    expect(linkifyParts("안녕하세요")).toEqual([{ text: "안녕하세요", href: null }]);
  });

  it("가운데 URL을 링크로 분리한다", () => {
    expect(linkifyParts("이거 봐 https://a.com 좋아")).toEqual([
      { text: "이거 봐 ", href: null },
      { text: "https://a.com", href: "https://a.com" },
      { text: " 좋아", href: null },
    ]);
  });

  it("http도 링크가 된다", () => {
    expect(linkifyParts("http://a.com")).toEqual([
      { text: "http://a.com", href: "http://a.com" },
    ]);
  });

  it("URL 뒤에 바로 붙은 한글은 링크에 넣지 않는다", () => {
    expect(linkifyParts("https://a.com입니다")).toEqual([
      { text: "https://a.com", href: "https://a.com" },
      { text: "입니다", href: null },
    ]);
  });

  it("문장 끝 마침표·괄호는 링크에 넣지 않는다", () => {
    expect(linkifyParts("가 봐 https://a.com/b.")).toEqual([
      { text: "가 봐 ", href: null },
      { text: "https://a.com/b", href: "https://a.com/b" },
      { text: ".", href: null },
    ]);
    expect(linkifyParts("(https://a.com)")).toEqual([
      { text: "(", href: null },
      { text: "https://a.com", href: "https://a.com" },
      { text: ")", href: null },
    ]);
  });

  it("괄호가 URL 안에서 짝이 맞으면 잘라내지 않는다 (위키 링크)", () => {
    const url = "https://en.wikipedia.org/wiki/Duck_(bird)";
    expect(linkifyParts(url)).toEqual([{ text: url, href: url }]);
  });

  it("URL 두 개도 각각 링크가 된다", () => {
    const parts = linkifyParts("https://a.com 그리고 https://b.com");
    expect(parts.filter((p) => p.href)).toHaveLength(2);
  });

  it("javascript: 스킴은 절대 링크가 되지 않는다 (인젝션 표면)", () => {
    // 에이전트(LLM) 응답도 이 경로로 렌더된다 — 스킴을 정규식에 고정해 원천 차단.
    expect(linkifyParts("javascript:alert(1)")).toEqual([
      { text: "javascript:alert(1)", href: null },
    ]);
  });

  it("쿼리스트링·해시가 있는 URL이 온전히 잡힌다", () => {
    const url = "https://a.com/path?q=1&r=%20#frag";
    expect(linkifyParts(`${url} 확인`)).toEqual([
      { text: url, href: url },
      { text: " 확인", href: null },
    ]);
  });

  it("빈 문자열은 빈 배열", () => {
    expect(linkifyParts("")).toEqual([]);
  });
});

// 2026-07-29 : 메신저 - 노트 링크 감지 (Phase 59 T1 S-006)
describe("pageIdFromHref / collectPageIds", () => {
  const ID = "12345678-1234-4123-8123-123456789abc";

  it("/pages/<uuid> 경로에서 id를 꺼낸다 — 호스트는 안 본다(도메인이 바뀌어도 동작)", () => {
    expect(pageIdFromHref(`https://web-sepia-one-88.vercel.app/pages/${ID}`)).toBe(ID);
    expect(pageIdFromHref(`https://다른도메인.example/pages/${ID}`)).toBe(ID);
  });

  it("페이지 경로가 아니면 null", () => {
    expect(pageIdFromHref("https://a.com/pages/")).toBeNull();
    expect(pageIdFromHref(`https://a.com/pages/${ID}/edit`)).toBeNull();
    expect(pageIdFromHref("https://a.com/posts/123")).toBeNull();
    expect(pageIdFromHref("깨진url")).toBeNull();
  });

  it("본문에서 페이지 id를 중복 없이 모은다 (감지는 linkifyParts 한 벌 위)", () => {
    const other = "87654321-4321-4321-8321-cba987654321";
    const body = `이것 봐 https://a.com/pages/${ID} 그리고 https://b.com/pages/${ID} 또 https://a.com/pages/${other}`;
    expect(collectPageIds(body).sort()).toEqual([ID, other].sort());
  });

  it("링크 없는 본문은 빈 목록", () => {
    expect(collectPageIds("그냥 글")).toEqual([]);
  });
});
