import { describe, it, expect } from "vitest";
import { MAX_SLIDES, splitIntoSlides, slideTitle } from "./slides";

// 2026-07-26 : 페이지 - 발표 - 슬라이드분할 (Phase 34 T1)
// 문서와 슬라이드를 **한 원본**으로 둔다. 별도 저장 모델을 만들면 둘이 어긋나고,
// 그 순간 이 설계의 근거가 사라진다.

const h = (text: string, level: 1 | 2 | 3 = 1) => ({
  type: "heading",
  props: { level },
  content: [{ type: "text", text, styles: {} }],
});
const p = (text = "") => ({
  type: "paragraph",
  content: text ? [{ type: "text", text, styles: {} }] : [],
});

describe("splitIntoSlides — 정상 경로", () => {
  it("1단계 제목마다 새 장이 된다", () => {
    const slides = splitIntoSlides([h("첫째"), p("가"), h("둘째"), p("나")]);
    expect(slides).toHaveLength(2);
    expect(slides[0].blocks).toHaveLength(2);
    expect(slides[1].blocks).toHaveLength(2);
  });

  it("제목 앞 서문은 표지가 된다", () => {
    // 제목보다 앞선 내용을 버리면 사용자가 쓴 글이 발표에서 사라진다.
    const slides = splitIntoSlides([p("들어가며"), h("첫째"), p("가")]);
    expect(slides).toHaveLength(2);
    expect(slides[0].blocks).toHaveLength(1);
    expect(slides[0].title).toBe("");
  });

  it("2·3단계 제목은 장을 나누지 않는다", () => {
    // 나누면 회의록 템플릿(h2가 5개)이 슬라이드 5장으로 흩어진다.
    const slides = splitIntoSlides([h("첫째"), h("소제목", 2), p("가"), h("또", 3)]);
    expect(slides).toHaveLength(1);
    expect(slides[0].blocks).toHaveLength(4);
  });

  it("1단계 제목이 없으면 전체가 한 장이다", () => {
    const slides = splitIntoSlides([p("가"), p("나")]);
    expect(slides).toHaveLength(1);
    expect(slides[0].title).toBe("");
  });

  it("장의 제목을 뽑아 준다", () => {
    const slides = splitIntoSlides([h("여는 인사"), p("가")]);
    expect(slides[0].title).toBe("여는 인사");
  });

  it("제목만 있고 내용이 없는 장도 장이다", () => {
    // 표지만 있는 장을 버리면 사용자가 의도한 구성이 무너진다.
    const slides = splitIntoSlides([h("표지"), h("본문"), p("가")]);
    expect(slides).toHaveLength(2);
    expect(slides[0].blocks).toHaveLength(1);
  });

  it("연속된 1단계 제목은 각각 장이 된다", () => {
    expect(splitIntoSlides([h("가"), h("나"), h("다")])).toHaveLength(3);
  });

  it("블록 내용을 바꾸지 않고 그대로 담는다", () => {
    // 발표는 표시일 뿐 편집이 아니다. 원본을 손대면 저장 경로와 어긋난다.
    const block = h("제목");
    const slides = splitIntoSlides([block, p("가")]);
    expect(slides[0].blocks[0]).toBe(block);
  });
});

describe("splitIntoSlides — 경계·잘못된 입력", () => {
  it("빈 문서는 장이 없다", () => {
    expect(splitIntoSlides([])).toEqual([]);
  });

  it("배열이 아니면 장이 없다", () => {
    // content는 jsonb라 무엇이든 들어올 수 있다. 발표 버튼 때문에 페이지가 죽으면 안 된다.
    for (const bad of [null, undefined, "글", 1, {}]) {
      expect(splitIntoSlides(bad)).toEqual([]);
    }
  });

  it("블록이 아닌 값이 섞여도 건너뛰고 계속한다", () => {
    const slides = splitIntoSlides([null, h("첫째"), "글자", p("가"), 3]);
    expect(slides).toHaveLength(1);
    expect(slides[0].blocks).toHaveLength(2);
  });

  it("level이 없거나 이상하면 1단계로 보지 않는다", () => {
    // props가 없는 heading을 1단계로 치면 문서가 조각조각 갈린다.
    const slides = splitIntoSlides([
      { type: "heading", content: [] },
      { type: "heading", props: { level: "1" }, content: [] },
      p("가"),
    ]);
    expect(slides).toHaveLength(1);
  });

  it("장 수에 상한을 둔다", () => {
    // 제목만 수천 개인 문서로 브라우저가 멎지 않게 한다.
    const many = Array.from({ length: MAX_SLIDES + 50 }, (_, i) => h(`장 ${i}`));
    expect(splitIntoSlides(many)).toHaveLength(MAX_SLIDES);
  });

  it("상한을 넘겨도 앞에서부터 남긴다", () => {
    const many = Array.from({ length: MAX_SLIDES + 5 }, (_, i) => h(`장 ${i}`));
    expect(splitIntoSlides(many)[0].title).toBe("장 0");
  });

  it("한글·이모지·긴 제목을 그대로 담는다", () => {
    const t = "회고 🦆 " + "가".repeat(200);
    expect(splitIntoSlides([h(t)])[0].title).toBe(t);
  });
});

describe("slideTitle — 화면에 보일 이름", () => {
  it("제목이 있으면 그대로 쓴다", () => {
    expect(slideTitle({ title: "여는 인사", blocks: [] }, 0, 3)).toBe("여는 인사");
  });

  it("제목이 없으면 몇 번째 장인지로 대신한다", () => {
    // 스크린리더가 "제목 없음"만 읽으면 어디인지 알 수 없다.
    expect(slideTitle({ title: "", blocks: [] }, 0, 3)).toContain("1");
    expect(slideTitle({ title: "", blocks: [] }, 0, 3)).toContain("3");
  });

  it("공백뿐인 제목도 없는 것으로 본다", () => {
    expect(slideTitle({ title: "   ", blocks: [] }, 1, 2)).toContain("2");
  });
});
