import { describe, expect, it } from "vitest";
import { stripComments } from "../stripComments";
import { findUnnamedControls } from "../unnamedControl";
import { findSilentCatches } from "../silentCatch";

describe("stripComments", () => {
  it("줄 맨 앞 주석을 지운다", () => {
    expect(stripComments("// 설명\nconst a = 1;").trim()).toBe("const a = 1;");
  });

  it("블록 주석을 지운다", () => {
    expect(stripComments("/* 설명 */const a = 1;").trim()).toBe("const a = 1;");
  });

  it("여러 줄 블록 주석에서 줄 수가 보존된다", () => {
    // 가드가 오프셋으로 줄 번호를 계산하므로 길이·줄바꿈이 유지돼야 한다.
    const src = "/* 한\n두\n세 */\nconst a = 1;";
    expect(stripComments(src).split("\n")).toHaveLength(4);
    expect(stripComments(src)).toHaveLength(src.length);
  });

  it("문자열 안의 //는 주석이 아니다", () => {
    const src = 'const u = "https://example.com";';
    expect(stripComments(src)).toBe(src);
  });

  it("템플릿 리터럴 안도 건드리지 않는다", () => {
    const src = "const u = `https://x/${a}`;";
    expect(stripComments(src)).toBe(src);
  });

  // 의도적으로 덜 지운다: 코드 뒤 꼬리 주석은 남긴다.
  // 정규식 리터럴(/\/\//)을 주석으로 오인해 뒤를 날리는 사고가 더 위험하기 때문.
  it("코드 뒤 꼬리 주석은 남긴다(과다 제거 방지)", () => {
    const src = "const a = 1; // 꼬리";
    expect(stripComments(src)).toBe(src);
  });

  it("정규식 리터럴을 주석으로 오인하지 않는다", () => {
    const src = "const re = /\\/\\//g;\nconst b = 2;";
    expect(stripComments(src)).toBe(src);
  });

  it("빈 소스에서 죽지 않는다", () => {
    expect(stripComments("")).toBe("");
  });
});

// 이 두 건이 실제로 겪은 헛경보다 — 고쳤는지 여기서 잠근다.
describe("가드가 주석에 속지 않는다", () => {
  it("주석 속 <img src> 문구를 태그로 잡지 않는다", () => {
    // BlockEditor.tsx의 실제 주석 문장이다.
    const src = "// public 버킷이라 <img src>로 읽힌다(경로는 추측 불가한 UUID).\nconst a = 1;";
    expect(findUnnamedControls(src)).toEqual([]);
  });

  it("주석 속 <input> 예시를 잡지 않는다", () => {
    const src = '// 예전엔 <input type="checkbox" /> 였다\nconst a = 1;';
    expect(findUnnamedControls(src)).toEqual([]);
  });

  it("주석 속 catch 블록 설명을 잡지 않는다", () => {
    const src = "// 예전엔 } catch { rollback(); } 였다\nconst y = 2;";
    expect(findSilentCatches(src)).toEqual([]);
  });

  it("진짜 코드는 여전히 잡는다(과다 제거로 놓치지 않는다)", () => {
    expect(findUnnamedControls('<input type="checkbox" checked={x} />')).toHaveLength(1);
    expect(findSilentCatches("try { a(); } catch { rollback(); }")).toHaveLength(1);
  });
});
