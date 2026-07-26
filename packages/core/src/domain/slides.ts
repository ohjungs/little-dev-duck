// 2026-07-26 : 페이지 - 발표 - 슬라이드분할 (Phase 34 T1)
// 사용자 요구는 "페이지 안에 파워포인트 기능"이었다. 고정 캔버스 편집기(텍스트 상자를 드래그로
// 놓는 것)는 BlockNote 위에 얹을 수 없어 **사실상 새 에디터**다 — 이 제품 규모에 과하다.
// `pptxgenjs`·`reveal.js`도 들이지 않는다: 둘 다 우리 블록 모델과 **별도의 문서 모델**을 요구한다.
//
// 대신 **본문을 슬라이드로 보여준다**. 1단계 제목(h1)이 장 경계다 —
//  · 사용자가 이미 쓰는 문법이라 새로 배울 게 없고,
//  · 문서와 슬라이드가 **한 원본**이라 어긋나지 않는다(별도 저장 모델을 만드는 순간 이 근거가 사라진다).
//
// 2·3단계 제목으로는 나누지 않는다. 나누면 회의록 템플릿(h2가 5개)이 슬라이드 5장으로 흩어진다.
//
// 순수함수다. 렌더도 저장도 하지 않는다.

export type Slide = {
  // 이 장을 여는 1단계 제목의 글. 표지(제목 앞 서문)나 제목 없는 문서에서는 빈 문자열.
  title: string;
  // 원본 블록을 **그대로** 담는다(복제하지 않는다). 발표는 표시일 뿐 편집이 아니다.
  blocks: unknown[];
};

// 제목만 수천 개인 문서로 브라우저가 멎지 않게 한다. 넘으면 앞에서부터 남긴다 —
// 뒤를 남기면 사용자가 보려던 시작 부분이 잘린다.
export const MAX_SLIDES = 200;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

// props.level이 없거나 숫자가 아니면 1단계로 보지 않는다 — 그렇게 치면 문서가 조각조각 갈린다.
function isSlideBreak(block: unknown): boolean {
  if (!isRecord(block) || block.type !== "heading") return false;
  const props = block.props;
  return isRecord(props) && props.level === 1;
}

// 제목 텍스트만 필요하다. page.ts의 extractPlainText는 블록 전체를 줄 단위로 긁어 목적이 다르다
// (여기서는 한 블록의 인라인 텍스트만 이어 붙인다).
function headingText(block: unknown): string {
  if (!isRecord(block) || !Array.isArray(block.content)) return "";
  const parts: string[] = [];
  for (const item of block.content) {
    if (isRecord(item) && typeof item.text === "string") parts.push(item.text);
  }
  return parts.join("");
}

// content는 jsonb라 무엇이든 들어올 수 있다. **발표 버튼 때문에 페이지가 죽으면 안 된다** —
// 배열이 아니거나 블록이 아닌 값이 섞여도 건너뛰고 계속한다.
export function splitIntoSlides(content: unknown): Slide[] {
  if (!Array.isArray(content)) return [];

  const slides: Slide[] = [];
  let current: Slide | null = null;

  for (const block of content) {
    if (!isRecord(block)) continue;
    if (isSlideBreak(block)) {
      if (slides.length >= MAX_SLIDES) break;
      current = { title: headingText(block), blocks: [block] };
      slides.push(current);
      continue;
    }
    if (current === null) {
      // 1단계 제목보다 앞선 내용. 버리면 사용자가 쓴 글이 발표에서 사라진다 → 표지로 만든다.
      current = { title: "", blocks: [] };
      slides.push(current);
    }
    current.blocks.push(block);
  }

  return slides;
}

// 화면·스크린리더에 읽힐 이름. 제목이 없을 때 "제목 없음"만 읽으면 어디인지 알 수 없어
// 몇 번째 장인지로 대신한다.
export function slideTitle(slide: Slide, index: number, total: number): string {
  const t = slide.title.trim();
  return t !== "" ? t : `${index + 1} / ${total}번째 장`;
}
