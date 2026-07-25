// 2026-07-26 : 접근성 - 입력이름 - 상시검사
// 할 일 완료 체크박스에 접근 이름이 없어서, 스크린리더로 탭하면 "체크박스"라고만 들리고
// **어느 할 일인지 알 수 없었다.** 앱에서 가장 많이 쓰는 조작인데도 그랬다.
//
// 처음 훑을 때 30건이 걸렸는데 거의 전부 오탐이었다 — 정규식이 `onChange={(e) =>`의 `>`에서
// 태그가 끝난 줄 알고 잘랐기 때문이다. 중괄호 깊이와 따옴표를 세어 **진짜 태그 끝**을 찾도록
// 고치니 4건, 그중 셋은 <label>로 감싼 정상이었고 진짜 결함은 1건이었다.
// 파싱을 대충 하면 검사가 아니라 소음이 된다.

import { stripComments } from "./stripComments";

export type UnnamedControl = { line: number; snippet: string };

// 이름을 주는 방법들. <label>로 감싸는 경우는 태그 속성만으로 알 수 없어 별도 처리한다.
const NAMED = /aria-label|aria-labelledby|placeholder|\btitle\s*=|\bid\s*=/;
const HIDDEN = /type\s*=\s*"hidden"/;

/** 태그 시작 위치에서 `{}` 깊이·따옴표를 세어 실제 `>` 위치를 찾는다. 못 찾으면 null. */
function findTagEnd(src: string, from: number): number | null {
  let depth = 0;
  let quote: string | null = null;
  for (let i = from; i < src.length; i += 1) {
    const c = src[i];
    if (quote) {
      if (c === quote) quote = null;
    } else if (c === '"' || c === "'") {
      quote = c;
    } else if (c === "{") {
      depth += 1;
    } else if (c === "}") {
      depth -= 1;
    } else if (c === ">" && depth === 0) {
      return i;
    }
  }
  return null;
}

/** 이 태그를 감싸는 <label>이 바로 앞에 있는지(줄 단위 근사). */
function wrappedInLabel(src: string, tagStart: number): boolean {
  // 태그 앞 600자 안에 닫히지 않은 <label이 있으면 감싸진 것으로 본다.
  const before = src.slice(Math.max(0, tagStart - 600), tagStart);
  const opens = (before.match(/<label\b/g) ?? []).length;
  const closes = (before.match(/<\/label>/g) ?? []).length;
  return opens > closes;
}

/** 접근 이름이 없는 폼 컨트롤을 찾는다. */
export function findUnnamedControls(source: string): UnnamedControl[] {
  // 주석 속 문구를 코드로 오인하지 않는다(길이 보존이라 줄 번호는 그대로).
  source = stripComments(source);

  const found: UnnamedControl[] = [];
  const re = /<(input|select|textarea)\b/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source)) !== null) {
    const end = findTagEnd(source, m.index + m[0].length);
    if (end === null) continue;
    const attrs = source.slice(m.index + m[0].length, end);
    if (HIDDEN.test(attrs)) continue; // 보이지 않는 값 전달용
    if (NAMED.test(attrs)) continue;
    if (wrappedInLabel(source, m.index)) continue;
    found.push({
      line: source.slice(0, m.index).split("\n").length,
      snippet: source.slice(m.index, end + 1).split(/\s+/).join(" ").slice(0, 100),
    });
  }
  return found;
}
