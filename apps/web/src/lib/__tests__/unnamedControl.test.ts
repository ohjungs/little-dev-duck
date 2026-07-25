import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { findUnnamedControls } from "../unnamedControl";

// 규칙 자체가 맞는지 먼저 잠근다 — 특히 오탐 쪽. 이 검사의 첫 버전은 30건을 뱉었는데
// 거의 전부 `onChange={(e) =>`의 `>`에서 태그를 잘못 끊은 오탐이었다.
describe("findUnnamedControls", () => {
  it("이름 없는 입력을 잡는다", () => {
    expect(findUnnamedControls(`<input type="checkbox" checked={x} />`)).toHaveLength(1);
  });

  it("aria-label이 있으면 통과", () => {
    expect(findUnnamedControls(`<input aria-label="이름" />`)).toHaveLength(0);
  });

  it("placeholder·id·title도 이름으로 인정한다", () => {
    expect(findUnnamedControls(`<input placeholder="검색" />`)).toHaveLength(0);
    expect(findUnnamedControls(`<input id="q" />`)).toHaveLength(0);
    expect(findUnnamedControls(`<input title="검색" />`)).toHaveLength(0);
  });

  it("label로 감싸면 통과한다", () => {
    const src = `<label className="x">\n  <input type="checkbox" checked={a} />\n  설명\n</label>`;
    expect(findUnnamedControls(src)).toHaveLength(0);
  });

  it("닫힌 label 뒤의 입력은 감싸진 것으로 보지 않는다", () => {
    const src = `<label><input aria-label="a" /></label>\n<input type="checkbox" checked={b} />`;
    expect(findUnnamedControls(src)).toHaveLength(1);
  });

  // 첫 버전이 무너진 지점. 화살표 함수의 `>`를 태그 끝으로 오인하면
  // 뒤에 오는 aria-label을 못 보고 멀쩡한 입력을 잡는다.
  it("속성값 안의 화살표 함수를 태그 끝으로 오인하지 않는다", () => {
    const src = `<input type="checkbox" onChange={(e) => apply(e)} aria-label="켜기" />`;
    expect(findUnnamedControls(src)).toHaveLength(0);
  });

  it("중첩 객체가 들어간 속성도 끝을 정확히 찾는다", () => {
    const src = `<input onChange={(e) => apply({ ...s, on: e.target.checked })} aria-label="켜기" />`;
    expect(findUnnamedControls(src)).toHaveLength(0);
  });

  it("type=hidden은 사용자에게 보이지 않으므로 제외한다", () => {
    expect(findUnnamedControls(`<input type="hidden" value={t} />`)).toHaveLength(0);
  });

  it("빈 소스·컨트롤 없는 소스에서 죽지 않는다", () => {
    expect(findUnnamedControls("")).toEqual([]);
    expect(findUnnamedControls("const a = 1;")).toEqual([]);
  });
});

const COMPONENTS = path.join(__dirname, "..", "..", "components");

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    if (name === "__tests__") continue;
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (name.endsWith(".tsx")) out.push(full);
  }
  return out;
}

describe("화면 전체", () => {
  it("모든 폼 컨트롤에 접근 이름이 있다", () => {
    const offenders: string[] = [];
    for (const file of walk(COMPONENTS)) {
      for (const hit of findUnnamedControls(readFileSync(file, "utf-8"))) {
        offenders.push(`${path.basename(file)}:${hit.line}  ${hit.snippet}`);
      }
    }
    // 실패하면 aria-label을 붙이거나 <label>로 감싼다. 무엇을 조작하는지 알려주는 이름이어야
    // 한다 — "체크박스"만 들리면 어느 항목인지 알 수 없다.
    expect(offenders).toEqual([]);
  });
});
