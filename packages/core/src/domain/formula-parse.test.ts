import { describe, expect, it } from "vitest";
import {
  collectRefs,
  formatAst,
  formatFormula,
  isErrorValue,
  type Node,
  parseFormula,
  tokenize,
} from "./formula-parse";
import { formatCellRef } from "./sheet";

// 2026-08-02 : 스프레드시트 - 수식 - 파서 (SPEC T2)
// 파서가 틀리면 그 위에 올라가는 평가기·의존성 그래프·함수 48개가 전부 같은 방향으로 틀린다.
// 그래서 여기서 계산은 하지 않고 **모양만** 본다 — 계산은 T3의 검사가 맡는다.

/** 파싱 성공을 전제로 AST를 꺼낸다. 실패하면 사유를 그대로 드러내며 죽는다. */
function ast(src: string): Node {
  const r = parseFormula(src);
  if (!r.ok) throw new Error(`파싱 실패: ${src} — ${r.message} (pos ${r.pos})`);
  return r.ast;
}

/** 파싱 → 재조립. 왕복이 맞으면 AST가 원문의 구조를 잃지 않았다는 뜻이다. */
function round(src: string): string {
  return formatAst(ast(src));
}

describe("토크나이저", () => {
  it("빈 입력은 토큰 0개", () => {
    const t = tokenize("");
    expect(t.ok && t.tokens).toEqual([]);
  });

  it("공백은 토큰이 되지 않는다", () => {
    const t = tokenize(" 1 + 2 ");
    expect(t.ok && t.tokens.map((x) => x.text)).toEqual(["1", "+", "2"]);
  });

  it("두 글자 연산자를 먼저 읽는다", () => {
    // <=를 <와 =로 쪼개면 조건식이 통째로 뒤집힌다.
    const t = tokenize("A1<=B1");
    expect(t.ok && t.tokens.map((x) => x.text)).toEqual(["A1", "<=", "B1"]);
    const t2 = tokenize("A1<>B1");
    expect(t2.ok && t2.tokens.map((x) => x.text)).toEqual(["A1", "<>", "B1"]);
  });

  it("함수는 여는 괄호가 바로 뒤에 있을 때만 함수다", () => {
    const t = tokenize("SUM(A1)");
    expect(t.ok && t.tokens[0].type).toBe("func");
    const t2 = tokenize("매출");
    expect(t2.ok && t2.tokens[0].type).toBe("name");
  });

  it("함수명은 대문자로 정규화한다", () => {
    const t = tokenize("sum(A1)");
    expect(t.ok && t.tokens[0].text).toBe("SUM");
  });

  it("닫히지 않은 문자열은 위치와 함께 실패한다", () => {
    const t = tokenize('"abc');
    expect(t.ok).toBe(false);
    expect(!t.ok && t.pos).toBe(0);
  });

  it("알 수 없는 문자는 위치와 함께 실패한다", () => {
    const t = tokenize("1 @ 2");
    expect(t.ok).toBe(false);
    expect(!t.ok && t.pos).toBe(2);
  });
});

describe("리터럴", () => {
  it.each([
    ["1", 1],
    ["1.5", 1.5],
    [".5", 0.5],
    ["1e3", 1000],
    ["1E-3", 0.001],
  ])("숫자 %s", (src, value) => {
    expect(ast(src)).toEqual({ kind: "number", value });
  });

  it("1e 뒤에 숫자가 없으면 지수가 아니다", () => {
    // "1e"는 숫자 1 + 이름 e가 아니라... 토크나이저가 1과 e로 가른다.
    const t = tokenize("1e");
    expect(t.ok && t.tokens.map((x) => x.text)).toEqual(["1", "e"]);
  });

  it("문자열의 큰따옴표는 두 번 쓴 것을 하나로 되돌린다", () => {
    expect(ast('"a""b"')).toEqual({ kind: "string", value: 'a"b' });
  });

  it("TRUE/FALSE는 불리언이고 대소문자를 가리지 않는다", () => {
    expect(ast("TRUE")).toEqual({ kind: "boolean", value: true });
    expect(ast("false")).toEqual({ kind: "boolean", value: false });
  });

  it.each(["#DIV/0!", "#VALUE!", "#REF!", "#NAME?", "#N/A", "#NUM!", "#CIRCULAR!"])(
    "오류 리터럴 %s",
    (e) => {
      expect(ast(e)).toEqual({ kind: "error", value: e });
    },
  );

  it("알 수 없는 오류값은 실패한다", () => {
    const r = parseFormula("#NOPE!");
    expect(r.ok).toBe(false);
  });

  it("isErrorValue", () => {
    expect(isErrorValue("#REF!")).toBe(true);
    expect(isErrorValue("#nope")).toBe(false);
    expect(isErrorValue(42)).toBe(false);
  });
});

describe("참조와 범위", () => {
  it("A1은 참조, 매출은 이름", () => {
    expect(ast("A1").kind).toBe("ref");
    expect(ast("매출")).toEqual({ kind: "name", name: "매출" });
  });

  it("격자 밖 모양은 참조가 아니라 이름으로 넘긴다", () => {
    // XFE1은 마지막 열 XFD를 넘는다. 참조로 읽으면 파싱이 실패하는데, 이름으로 넘기면
    // 평가기가 #NAME?을 준다 — 엑셀과 같은 결과이고 사용자가 원인을 알 수 있다.
    expect(ast("XFE1").kind).toBe("name");
    expect(ast("XFD1").kind).toBe("ref");
  });

  it("시트 간 참조", () => {
    const n = ast("Sheet2!A1");
    expect(n.kind === "ref" && n.ref.sheet).toBe("Sheet2");
  });

  it("따옴표로 감싼 시트 이름", () => {
    const n = ast("'내 시트'!B2");
    expect(n.kind === "ref" && n.ref.sheet).toBe("내 시트");
    expect(n.kind === "ref" && formatCellRef(n.ref)).toBe("'내 시트'!B2");
  });

  it("범위", () => {
    const n = ast("A1:B10");
    expect(n.kind).toBe("range");
    expect(n.kind === "range" && n.range.start.r).toBe(0);
    expect(n.kind === "range" && n.range.end.r).toBe(9);
  });

  it("시트 범위는 시작 시트를 끝에도 전파한다", () => {
    const n = ast("Sheet2!A1:B2");
    expect(n.kind === "range" && n.range.end.sheet).toBe("Sheet2");
  });

  it("범위의 양 끝 시트가 다르면 실패한다", () => {
    expect(parseFormula("Sheet1!A1:Sheet2!B2").ok).toBe(false);
  });

  it("범위의 끝이 없으면 실패한다", () => {
    expect(parseFormula("A1:").ok).toBe(false);
  });

  it("열 전체 범위(A:A)는 아직 지원하지 않는다", () => {
    // 지원하려면 CellRange가 열린 범위를 표현해야 한다 — T8에서 다룬다.
    // 지금은 조용히 이상하게 읽히는 것보다 실패하는 쪽이 낫다.
    expect(parseFormula("SUM(A:A)").ok).toBe(false);
  });
});

describe("연산자 우선순위", () => {
  it("곱셈이 덧셈보다 먼저 묶인다", () => {
    expect(round("1+2*3")).toBe("1+2*3");
    const n = ast("1+2*3");
    expect(n.kind === "binary" && n.op).toBe("+");
  });

  it("괄호가 우선순위를 뒤집는다", () => {
    const n = ast("(1+2)*3");
    expect(n.kind === "binary" && n.op).toBe("*");
    expect(round("(1+2)*3")).toBe("(1+2)*3");
  });

  it("^는 왼쪽 결합이다 — 엑셀과 같게", () => {
    // 수학 관례는 오른쪽 결합이지만 엑셀은 (2^3)^2 = 64다.
    // 여기서 관례를 따르면 우리 결과가 엑셀과 갈라진다.
    const n = ast("2^3^2");
    expect(n.kind === "binary" && n.op).toBe("^");
    expect(n.kind === "binary" && n.left.kind === "binary" && n.left.op).toBe("^");
  });

  it("비교가 가장 약하다", () => {
    const n = ast("1+2=3");
    expect(n.kind === "binary" && n.op).toBe("=");
  });

  it("문자열 결합은 비교보다 강하고 덧셈보다 약하다", () => {
    const n = ast('"a"&1+2');
    expect(n.kind === "binary" && n.op).toBe("&");
    const n2 = ast('"a"&"b"="ab"');
    expect(n2.kind === "binary" && n2.op).toBe("=");
  });

  it("단항 부호", () => {
    expect(ast("-1")).toEqual({
      kind: "unary",
      op: "-",
      operand: { kind: "number", value: 1 },
    });
    expect(round("-A1")).toBe("-A1");
    expect(round("1--2")).toBe("1--2");
  });

  it("퍼센트는 단항 부호보다 강하게 묶인다", () => {
    // -50%는 -(50%)여야 한다.
    const n = ast("-50%");
    expect(n.kind).toBe("unary");
    expect(n.kind === "unary" && n.operand.kind).toBe("percent");
  });
});

describe("함수 호출", () => {
  it("인자 없는 호출", () => {
    expect(ast("TODAY()")).toEqual({ kind: "call", name: "TODAY", args: [] });
  });

  it("인자 여럿", () => {
    const n = ast("IF(A1>0,1,-1)");
    expect(n.kind === "call" && n.args).toHaveLength(3);
  });

  it("중첩", () => {
    const n = ast("SUM(A1:A2,MAX(B1,B2))");
    expect(n.kind === "call" && n.args[1].kind).toBe("call");
  });

  it("이름에 점이 들어가는 함수", () => {
    expect(ast("CEILING.MATH(1)").kind).toBe("call");
  });

  it(") 가 없으면 실패한다", () => {
    expect(parseFormula("SUM(A1").ok).toBe(false);
  });

  it("인자 사이에 쉼표가 없으면 실패한다", () => {
    expect(parseFormula("SUM(A1 A2)").ok).toBe(false);
  });
});

describe("실패는 사유와 위치를 준다", () => {
  it.each([
    ["", "수식이 비어 있습니다."],
    ["1+", "수식이 갑자기 끝났습니다."],
    ["(1", "괄호가 닫히지 않았습니다."],
    ["1 2", "수식이 끝난 뒤에 남은 것이 있습니다: 2"],
  ])("%s", (src, message) => {
    const r = parseFormula(src);
    expect(r.ok).toBe(false);
    expect(!r.ok && r.message).toBe(message);
  });

  it("위치는 '=' 를 포함한 원문 기준이다", () => {
    // 화면이 이 값으로 커서를 옮긴다 — 한 글자 어긋나면 엉뚱한 데를 가리킨다.
    const r = parseFormula("=1 @ 2");
    expect(!r.ok && r.pos).toBe(3);
  });
});

describe("재조립 — 필요한 곳에만 괄호", () => {
  it.each([
    "1+2*3",
    "(1+2)*3",
    "1-(2-3)",
    "SUM(A1:A2)",
    "IF(A1>0,1,-1)",
    'A1&"원"',
    "$A$1+B$2",
    "Sheet2!A1:B2",
    "'내 시트'!C3",
    "50%",
    "-A1",
    "#REF!",
    "TRUE",
  ])("%s", (src) => {
    expect(round(src)).toBe(src);
  });

  it("문자열의 따옴표를 다시 이스케이프한다", () => {
    expect(round('"a""b"')).toBe('"a""b"');
  });

  it("formatFormula는 =를 붙인다", () => {
    expect(formatFormula(ast("A1+1"))).toBe("=A1+1");
  });

  it("불필요한 괄호는 넣지 않는다", () => {
    // 전부 감싸면 사용자가 쓴 수식이 알아볼 수 없게 부푼다.
    expect(round("1*2+3")).toBe("1*2+3");
    expect(round("((1))")).toBe("1");
  });
});

describe("참조 수집 (의존성 그래프의 입력)", () => {
  it("셀·범위·이름을 나눠 모은다", () => {
    const r = collectRefs(ast("SUM(A1:A10)+B1*매출"));
    expect(r.refs.map(formatCellRef)).toEqual(["B1"]);
    expect(r.ranges).toHaveLength(1);
    expect(r.names).toEqual(["매출"]);
  });

  it("범위를 펼치지 않는다", () => {
    // A1:A10000을 1만 개로 펼치면 그래프가 폭발한다.
    const r = collectRefs(ast("SUM(A1:A10000)"));
    expect(r.refs).toHaveLength(0);
    expect(r.ranges).toHaveLength(1);
  });

  it("중첩 함수 안까지 들어간다", () => {
    const r = collectRefs(ast("IF(A1>0,MAX(B1,C1),D1)"));
    expect(r.refs.map(formatCellRef).sort()).toEqual(["A1", "B1", "C1", "D1"]);
  });

  it("리터럴만 있으면 아무것도 모으지 않는다", () => {
    const r = collectRefs(ast('1+2&"a"'));
    expect(r).toEqual({ refs: [], ranges: [], names: [] });
  });
});
