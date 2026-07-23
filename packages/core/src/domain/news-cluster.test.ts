import { describe, expect, it } from "vitest";
import { clusterArticles, tokenizeForCluster } from "./news-cluster";

describe("tokenizeForCluster", () => {
  it("소문자화하고 구두점을 제거한다", () => {
    expect(tokenizeForCluster("Hello, World! Foo-Bar.")).toEqual([
      "hello",
      "world",
      "foo",
      "bar",
    ]);
  });

  it("한 글자 토큰과 불용어를 제거한다", () => {
    expect(tokenizeForCluster("the a of Samsung earnings")).toEqual([
      "samsung",
      "earnings",
    ]);
  });

  it("한글을 토큰화한다(공백 기준)", () => {
    expect(tokenizeForCluster("삼성전자 4분기 실적 발표")).toEqual([
      "삼성전자",
      "4분기",
      "실적",
      "발표",
    ]);
  });
});

describe("clusterArticles", () => {
  const art = (id: string, title: string, snippet: string | null = null) => ({
    id,
    title,
    snippet,
  });

  it("빈 입력이면 빈 배열", () => {
    expect(clusterArticles([])).toEqual([]);
  });

  it("기사 1건이면 1개 군집(대표 key=그 기사 id)", () => {
    const clusters = clusterArticles([art("a", "삼성전자 실적 발표")]);
    expect(clusters).toHaveLength(1);
    expect(clusters[0].key).toBe("a");
    expect(clusters[0].articles.map((x) => x.id)).toEqual(["a"]);
  });

  it("유사한 제목은 같은 군집으로 묶는다", () => {
    const clusters = clusterArticles(
      [
        art("a", "삼성전자 4분기 실적 발표 호조"),
        art("b", "삼성전자 4분기 실적 시장 기대 상회"),
        art("c", "오늘 서울 날씨 맑음 기온 상승"),
      ],
      { threshold: 0.3 },
    );
    // a·b는 삼성전자/4분기/실적 공유 → 한 군집, c는 별도.
    expect(clusters).toHaveLength(2);
    const first = clusters.find((cl) => cl.articles.some((x) => x.id === "a"));
    expect(first?.articles.map((x) => x.id).sort()).toEqual(["a", "b"]);
  });

  it("임계값이 높으면 약한 유사도는 분리된다", () => {
    const arts = [
      art("a", "삼성전자 4분기 실적 발표"),
      art("b", "삼성전자 새 스마트폰 공개 행사"),
    ];
    expect(clusterArticles(arts, { threshold: 0.9 })).toHaveLength(2);
  });

  it("단일연결(추이성): A~B, B~C면 A·B·C가 한 군집", () => {
    const clusters = clusterArticles(
      [
        art("a", "삼성전자 반도체 실적 개선"),
        art("b", "삼성전자 반도체 투자 확대"),
        art("c", "반도체 투자 정부 지원 확대"),
      ],
      { threshold: 0.3 },
    );
    expect(clusters).toHaveLength(1);
    expect(clusters[0].articles.map((x) => x.id).sort()).toEqual([
      "a",
      "b",
      "c",
    ]);
  });

  it("군집 순서와 군집 내 순서는 최초 등장 순을 따른다", () => {
    const clusters = clusterArticles(
      [
        art("x", "경제 뉴스 코스피 상승"),
        art("y", "삼성전자 실적 발표 호조"),
        art("z", "삼성전자 실적 발표 시장 기대"),
      ],
      { threshold: 0.3 },
    );
    expect(clusters[0].articles[0].id).toBe("x"); // 첫 군집 = 먼저 등장한 x
    const samsung = clusters[1];
    expect(samsung.key).toBe("y"); // 대표 = 군집 내 최초 등장
    expect(samsung.articles.map((a) => a.id)).toEqual(["y", "z"]);
  });

  it("snippet도 유사도에 반영한다", () => {
    const clusters = clusterArticles(
      [
        art("a", "속보", "삼성전자 4분기 반도체 실적 대폭 개선 발표"),
        art("b", "단독", "삼성전자 4분기 반도체 실적 개선 전망"),
      ],
      { threshold: 0.3 },
    );
    expect(clusters).toHaveLength(1);
  });
});
