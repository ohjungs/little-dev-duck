import { describe, expect, it } from "vitest";
import { pageEmbedText } from "./page-embed";

// 데이터베이스 행(자식 페이지)의 속성값은 row_props 컬럼에 따로 저장되고 plain_text에는 안 들어간다.
// 그래서 지금까지 오리가 "진행 중인 프로젝트 뭐 있어?" 같은 질문에 상태 값을 볼 수 없었다
// (제품 정의: "오리는 RAG 기반으로 사용자의 데이터를 알고 답한다").
// 임베딩 텍스트는 저장 컬럼과 별개로 호출부에서 조립하는 게 이 저장소의 관례다(todoEmbedText).

describe("pageEmbedText", () => {
  it("본문만 있으면 본문 그대로", () => {
    expect(pageEmbedText("회의록 내용", {})).toBe("회의록 내용");
  });

  it("행 속성값을 '이름: 값'으로 덧붙인다", () => {
    expect(pageEmbedText("설명", { 상태: "진행 중", 우선순위: "높음" })).toBe(
      "설명\n상태: 진행 중\n우선순위: 높음",
    );
  });

  it("본문이 비어도 속성값만으로 임베딩된다", () => {
    // 데이터베이스 행은 본문이 비어 있는 경우가 흔하다 — 값만 채워 넣고 쓴다.
    expect(pageEmbedText("", { 상태: "완료" })).toBe("상태: 완료");
  });

  it("빈 값·공백만인 값은 넣지 않는다", () => {
    expect(pageEmbedText("본문", { 상태: "", 메모: "   " })).toBe("본문");
  });

  it("숫자·불리언 값도 텍스트로 넣는다", () => {
    // RowPropValue는 string|number|boolean|null이다 — 배열은 계약에 없어 다루지 않는다.
    // 별점(숫자)·체크박스(불리언) 속성이 실제로 쓰인다(Phase 18 템플릿).
    expect(pageEmbedText("", { 별점: 5, 완료: true })).toBe("별점: 5\n완료: 예");
  });

  it("false는 '아니오'로 넣는다 (값이 없는 것과 구분)", () => {
    expect(pageEmbedText("", { 완료: false })).toBe("완료: 아니오");
  });

  it("속성이 없으면 본문만", () => {
    expect(pageEmbedText("본문", {})).toBe("본문");
  });

  it("둘 다 비면 빈 문자열", () => {
    expect(pageEmbedText("", {})).toBe("");
  });

  it("속성 이름 순서를 입력 순서대로 유지한다", () => {
    const out = pageEmbedText("", { 나중: "b", 먼저: "a" });
    expect(out).toBe("나중: b\n먼저: a");
  });
});
