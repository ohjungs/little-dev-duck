// 2026-07-26 : 정적검사 - 주석오탐 - 공용제거기
// 이 저장소의 정적 가드(silentCatch·unnamedControl)가 **주석 속 문구에 헛경보**를 냈다.
// 실제 사례: BlockEditor의 설명 주석에 있는 "public 버킷이라 <img src>로 읽힌다"를
// 진짜 <img> 태그로 잡았다. 헛경보가 나는 검사는 사람이 무시하게 되므로 검사가 아니게 된다.
//
// **의도적으로 덜 지운다.** 못 지워서 나는 헛경보는 성가신 정도지만, 과하게 지우면 진짜 결함을
// 놓친다(더 위험한 방향). 그래서:
//   - 블록 주석 `/* */`은 지운다(문자열 안은 건드리지 않음).
//   - 줄 주석 `//`은 **줄 앞이 공백뿐일 때만** 지운다. 코드 뒤에 붙은 꼬리 주석은 남긴다 —
//     `const re = /\/\//` 같은 정규식 리터럴을 주석으로 오인해 뒤를 통째로 날리는 사고를 막는다.
//
// 길이를 보존한다(지운 자리에 같은 길이의 공백, 줄바꿈은 유지) — 가드들이 오프셋으로 줄 번호를
// 계산하므로 길이가 바뀌면 엉뚱한 줄을 짚는다.

function blank(text: string): string {
  return text.replace(/[^\n]/g, " ");
}

export function stripComments(source: string): string {
  let out = "";
  let i = 0;
  let quote: string | null = null;

  while (i < source.length) {
    const c = source[i];
    const next = source[i + 1];

    if (quote) {
      // '와 "로 여는 문자열은 줄을 넘지 못한다(JS 문법). 줄바꿈에서 풀어주지 않으면
      // 정규식 리터럴 속 따옴표(예: /["']/) 하나에 스캐너가 문자열 모드로 갇혀
      // **그 뒤 파일 전체의 주석을 못 지운다** — 실제로 이 파일에서 겪었다.
      // 백틱은 여러 줄이 정상이라 그대로 둔다.
      if (c === "\n" && quote !== "`") {
        quote = null;
        out += c;
        i += 1;
        continue;
      }
      out += c;
      if (c === "\\") {
        // 이스케이프된 문자는 따옴표 판정에서 제외한다.
        out += source[i + 1] ?? "";
        i += 2;
        continue;
      }
      if (c === quote) quote = null;
      i += 1;
      continue;
    }

    if (c === '"' || c === "'" || c === "`") {
      quote = c;
      out += c;
      i += 1;
      continue;
    }

    if (c === "/" && next === "*") {
      const end = source.indexOf("*/", i + 2);
      const stop = end === -1 ? source.length : end + 2;
      out += blank(source.slice(i, stop));
      i = stop;
      continue;
    }

    if (c === "/" && next === "/") {
      // 이 줄에서 지금까지 나온 게 공백뿐일 때만 주석으로 본다(위 주석의 이유).
      const lineStart = out.lastIndexOf("\n") + 1;
      if (out.slice(lineStart).trim() === "") {
        const nl = source.indexOf("\n", i);
        const stop = nl === -1 ? source.length : nl;
        out += blank(source.slice(i, stop));
        i = stop;
        continue;
      }
    }

    out += c;
    i += 1;
  }
  return out;
}
