import {
  type CellRange,
  type CellRef,
  formatCellRef,
  lettersToCol,
  MAX_ROWS,
  // 주소 파싱은 sheet.ts 한 곳에만 둔다 — 규칙이 두 벌이 되면 한쪽만 고쳐지는 날이 온다.
  parseCellRef as parseRefToken,
  quoteSheetName,
} from "./sheet";

// 2026-08-02 : 스프레드시트 - 수식 - 토크나이저·파서 (SPEC-2026-08-02-spreadsheet-a1 T2)
//
// `=SUM(A1:A2)*2 & "원"` 같은 문자열을 AST로 바꾼다. **여기서 계산하지 않는다** —
// 평가는 T3의 일이다. 둘을 섞으면 "파싱이 틀렸나 계산이 틀렸나"를 못 가른다.
//
// 의존성 없이 직접 만드는 이유(스펙 D-2): 기성 수식 엔진은 번들이 크고 라이선스가 까다로우며,
// 무엇보다 **엑셀과 다르게 동작할 지점을 우리가 고를 수 없다**. 순환 참조 표시(D-4)처럼
// 일부러 다르게 가는 결정이 이 제품에 이미 있다.
//
// 파싱 실패는 예외로 던지지 않는다. 사용자가 셀에 치는 문자열이라 **실패가 정상 흐름**이고,
// 어디서 왜 틀렸는지(position)를 화면이 알려줘야 한다.

// ── 오류값 ─────────────────────────────────────────────────────────────────
// 표기는 엑셀과 같게 한다(사용자가 검색해서 찾을 수 있어야 한다).
// #CIRCULAR!만 우리 것이다 — 엑셀은 순환에 0을 넣고 경고창을 띄우는데, 0은 계산에 섞여
// **틀린 결과를 조용히 만든다**(스펙 D-4).
export const ERROR_VALUES = [
  "#DIV/0!",
  "#VALUE!",
  "#REF!",
  "#NAME?",
  "#N/A",
  "#NUM!",
  "#CIRCULAR!",
] as const;
export type ErrorValue = (typeof ERROR_VALUES)[number];

const ERROR_SET = new Set<string>(ERROR_VALUES);

export function isErrorValue(v: unknown): v is ErrorValue {
  return typeof v === "string" && ERROR_SET.has(v);
}

// ── 토큰 ───────────────────────────────────────────────────────────────────
export type TokenType =
  | "number"
  | "string"
  | "boolean"
  | "error"
  | "ref"
  | "name"
  | "func"
  | "op"
  | "lparen"
  | "rparen"
  | "comma"
  | "colon";

export interface Token {
  type: TokenType;
  /** 원문 그대로의 조각. 오류 위치 표시와 재조립에 쓴다. */
  text: string;
  /** 입력 문자열에서의 시작 위치(0-based). */
  pos: number;
}

// ── AST ────────────────────────────────────────────────────────────────────
export type Node =
  | { kind: "number"; value: number }
  | { kind: "string"; value: string }
  | { kind: "boolean"; value: boolean }
  | { kind: "error"; value: ErrorValue }
  | { kind: "ref"; ref: CellRef }
  | { kind: "range"; range: CellRange }
  | { kind: "name"; name: string }
  | { kind: "unary"; op: "-" | "+"; operand: Node }
  | { kind: "percent"; operand: Node }
  | { kind: "binary"; op: BinaryOp; left: Node; right: Node }
  | { kind: "call"; name: string; args: Node[] };

export const BINARY_OPS = [
  "^",
  "*",
  "/",
  "+",
  "-",
  "&",
  "=",
  "<>",
  "<",
  ">",
  "<=",
  ">=",
] as const;
export type BinaryOp = (typeof BINARY_OPS)[number];

export type ParseResult =
  | { ok: true; ast: Node }
  | { ok: false; message: string; pos: number };

// ── 토크나이저 ─────────────────────────────────────────────────────────────
// 참조·시트이름·함수명이 전부 "글자로 시작하는 덩어리"라 한 곳에서 읽고 나중에 가른다.
// 여기서 A1이 참조인지 이름인지 판정하는 이유: 파서까지 미루면 `Sheet1!A1`처럼 한 덩어리로
// 읽어야 하는 것을 세 토큰으로 쪼갠 뒤 다시 붙여야 한다.

const DIGIT = /[0-9]/;
const NAME_START = /[A-Za-z_\\가-힣]/;
const NAME_CHAR = /[A-Za-z0-9_.\\가-힣]/;

interface TokenizeOk {
  ok: true;
  tokens: Token[];
}
interface TokenizeErr {
  ok: false;
  message: string;
  pos: number;
}

export function tokenize(input: string): TokenizeOk | TokenizeErr {
  const tokens: Token[] = [];
  let i = 0;
  const n = input.length;

  const err = (message: string, pos: number): TokenizeErr => ({
    ok: false,
    message,
    pos,
  });

  while (i < n) {
    const ch = input[i];

    if (ch === " " || ch === "\t" || ch === "\n" || ch === "\r") {
      i += 1;
      continue;
    }

    // 문자열: "..." — 안의 큰따옴표는 두 번 써서 이스케이프한다(엑셀 규칙).
    if (ch === '"') {
      const start = i;
      i += 1;
      let value = "";
      let closed = false;
      while (i < n) {
        if (input[i] === '"') {
          if (input[i + 1] === '"') {
            value += '"';
            i += 2;
            continue;
          }
          i += 1;
          closed = true;
          break;
        }
        value += input[i];
        i += 1;
      }
      if (!closed) return err("문자열의 따옴표가 닫히지 않았습니다.", start);
      tokens.push({ type: "string", text: value, pos: start });
      continue;
    }

    // 오류 리터럴: #REF! 등. 수식 안에 직접 쓸 수 있어야 IFERROR 테스트가 가능하다.
    if (ch === "#") {
      const start = i;
      const rest = input.slice(i);
      const found = ERROR_VALUES.find((e) => rest.startsWith(e));
      if (!found) return err("알 수 없는 오류값입니다.", start);
      i += found.length;
      tokens.push({ type: "error", text: found, pos: start });
      continue;
    }

    // 숫자: 1, 1.5, .5, 1e3, 1E-3. 부호는 단항 연산자가 맡는다(여기서 먹으면 A1-1이 깨진다).
    if (DIGIT.test(ch) || (ch === "." && DIGIT.test(input[i + 1] ?? ""))) {
      const start = i;
      while (i < n && DIGIT.test(input[i])) i += 1;
      if (input[i] === ".") {
        i += 1;
        while (i < n && DIGIT.test(input[i])) i += 1;
      }
      if (input[i] === "e" || input[i] === "E") {
        const save = i;
        i += 1;
        if (input[i] === "+" || input[i] === "-") i += 1;
        if (!DIGIT.test(input[i] ?? "")) i = save; // 1e 뒤에 숫자가 없으면 지수가 아니다
        else while (i < n && DIGIT.test(input[i])) i += 1;
      }
      tokens.push({ type: "number", text: input.slice(start, i), pos: start });
      continue;
    }

    // 작은따옴표로 감싼 시트 이름: 'my sheet'!A1
    if (ch === "'") {
      const start = i;
      i += 1;
      let name = "";
      let closed = false;
      while (i < n) {
        if (input[i] === "'") {
          if (input[i + 1] === "'") {
            name += "'";
            i += 2;
            continue;
          }
          i += 1;
          closed = true;
          break;
        }
        name += input[i];
        i += 1;
      }
      if (!closed) return err("시트 이름의 따옴표가 닫히지 않았습니다.", start);
      if (input[i] !== "!") return err("시트 이름 뒤에는 !가 와야 합니다.", i);
      i += 1;
      const cellStart = i;
      while (i < n && (NAME_CHAR.test(input[i]) || input[i] === "$")) i += 1;
      const cellText = input.slice(cellStart, i);
      tokens.push({
        type: "ref",
        text: `${quoteSheetName(name)}!${cellText}`,
        pos: start,
      });
      continue;
    }

    // 이름 덩어리: 참조(A1·$A$1·Sheet1!A1)·함수명·이름정의·TRUE/FALSE가 여기서 갈린다.
    if (NAME_START.test(ch) || ch === "$") {
      const start = i;
      while (i < n && (NAME_CHAR.test(input[i]) || input[i] === "$")) i += 1;
      // Sheet1!A1 — ! 뒤까지 한 덩어리로 읽는다.
      if (input[i] === "!") {
        i += 1;
        while (i < n && (NAME_CHAR.test(input[i]) || input[i] === "$")) i += 1;
        tokens.push({ type: "ref", text: input.slice(start, i), pos: start });
        continue;
      }
      const text = input.slice(start, i);
      const upper = text.toUpperCase();
      // 여는 괄호가 바로 뒤면 함수 호출이다(엑셀도 공백을 허용하지 않는다).
      if (input[i] === "(") {
        tokens.push({ type: "func", text: upper, pos: start });
        continue;
      }
      if (upper === "TRUE" || upper === "FALSE") {
        tokens.push({ type: "boolean", text: upper, pos: start });
        continue;
      }
      tokens.push({
        type: looksLikeRef(text) ? "ref" : "name",
        text,
        pos: start,
      });
      continue;
    }

    if (ch === "(") {
      tokens.push({ type: "lparen", text: ch, pos: i });
      i += 1;
      continue;
    }
    if (ch === ")") {
      tokens.push({ type: "rparen", text: ch, pos: i });
      i += 1;
      continue;
    }
    if (ch === ",") {
      tokens.push({ type: "comma", text: ch, pos: i });
      i += 1;
      continue;
    }
    if (ch === ":") {
      tokens.push({ type: "colon", text: ch, pos: i });
      i += 1;
      continue;
    }

    // 두 글자 연산자를 먼저 본다 — <=를 <와 =로 쪼개면 조건식이 통째로 뒤집힌다.
    const two = input.slice(i, i + 2);
    if (two === "<=" || two === ">=" || two === "<>") {
      tokens.push({ type: "op", text: two, pos: i });
      i += 2;
      continue;
    }
    if ("+-*/^&=<>%".includes(ch)) {
      tokens.push({ type: "op", text: ch, pos: i });
      i += 1;
      continue;
    }

    return err(`알 수 없는 문자입니다: ${ch}`, i);
  }

  return { ok: true, tokens };
}

// "A1" 모양인가. 이름 정의(매출)와 가르는 판정이다.
// 열 글자 1~3 + 행 숫자 1~7, 사이에 $가 올 수 있다.
const REF_SHAPE = /^\$?[A-Za-z]{1,3}\$?[0-9]{1,7}$/;

function looksLikeRef(text: string): boolean {
  if (!REF_SHAPE.test(text)) return false;
  // XFE1처럼 모양은 맞지만 격자 밖인 것은 참조가 아니다 — 이름으로 넘겨 #NAME?이 되게 한다.
  const m = /^\$?([A-Za-z]{1,3})\$?([0-9]{1,7})$/.exec(text);
  if (!m) return false;
  if (lettersToCol(m[1]) === null) return false;
  const row = Number(m[2]);
  return row >= 1 && row <= MAX_ROWS;
}

// ── 파서 ───────────────────────────────────────────────────────────────────
// 우선순위 등반. 엑셀 순서(높은 것부터): : → 단항 - → % → ^ → * / → + - → & → 비교.
//
// **^는 왼쪽 결합이다.** 수학 관례(오른쪽 결합)와 다르지만 엑셀이 그렇다:
// 2^3^2가 엑셀에서는 (2^3)^2 = 64다. 여기서 관례를 따르면 우리 결과가 엑셀과 갈라진다.
const PRECEDENCE: Record<BinaryOp, number> = {
  "^": 5,
  "*": 4,
  "/": 4,
  "+": 3,
  "-": 3,
  "&": 2,
  "=": 1,
  "<>": 1,
  "<": 1,
  ">": 1,
  "<=": 1,
  ">=": 1,
};

class Parser {
  private i = 0;

  constructor(private readonly tokens: Token[]) {}

  private peek(): Token | undefined {
    return this.tokens[this.i];
  }

  private next(): Token | undefined {
    return this.tokens[this.i++];
  }

  private endPos(): number {
    const last = this.tokens[this.tokens.length - 1];
    return last ? last.pos + last.text.length : 0;
  }

  parse(): ParseResult {
    if (this.tokens.length === 0) {
      return { ok: false, message: "수식이 비어 있습니다.", pos: 0 };
    }
    const expr = this.parseExpr(0);
    if (!expr.ok) return expr;
    const rest = this.peek();
    if (rest) {
      return {
        ok: false,
        message: `수식이 끝난 뒤에 남은 것이 있습니다: ${rest.text}`,
        pos: rest.pos,
      };
    }
    return expr;
  }

  private parseExpr(minPrec: number): ParseResult {
    let left = this.parseUnary();
    if (!left.ok) return left;

    for (;;) {
      const tok = this.peek();
      if (!tok || tok.type !== "op") break;
      const op = tok.text as BinaryOp;
      const prec = PRECEDENCE[op];
      if (prec === undefined || prec < minPrec) break;
      this.next();
      // 전부 왼쪽 결합이므로 오른쪽은 한 단계 높은 우선순위로 읽는다(^ 포함 — 위 주석 참조).
      const right = this.parseExpr(prec + 1);
      if (!right.ok) return right;
      left = {
        ok: true,
        ast: { kind: "binary", op, left: left.ast, right: right.ast },
      };
    }
    return left;
  }

  private parseUnary(): ParseResult {
    const tok = this.peek();
    if (tok && tok.type === "op" && (tok.text === "-" || tok.text === "+")) {
      this.next();
      const operand = this.parseUnary();
      if (!operand.ok) return operand;
      return {
        ok: true,
        ast: { kind: "unary", op: tok.text as "-" | "+", operand: operand.ast },
      };
    }
    return this.parsePostfix();
  }

  // 50% 같은 후위 퍼센트. 단항보다 강하게 묶여야 -50%가 -(0.5)가 된다.
  private parsePostfix(): ParseResult {
    const base = this.parsePrimary();
    if (!base.ok) return base;
    let node = base.ast;
    for (;;) {
      const tok = this.peek();
      if (tok && tok.type === "op" && tok.text === "%") {
        this.next();
        node = { kind: "percent", operand: node };
        continue;
      }
      break;
    }
    return { ok: true, ast: node };
  }

  private parsePrimary(): ParseResult {
    const tok = this.next();
    if (!tok) {
      return { ok: false, message: "수식이 갑자기 끝났습니다.", pos: this.endPos() };
    }

    switch (tok.type) {
      case "number":
        return { ok: true, ast: { kind: "number", value: Number(tok.text) } };
      case "string":
        return { ok: true, ast: { kind: "string", value: tok.text } };
      case "boolean":
        return { ok: true, ast: { kind: "boolean", value: tok.text === "TRUE" } };
      case "error":
        return { ok: true, ast: { kind: "error", value: tok.text as ErrorValue } };
      case "ref":
        return this.parseRefOrRange(tok);
      case "name":
        return { ok: true, ast: { kind: "name", name: tok.text } };
      case "func":
        return this.parseCall(tok);
      case "lparen": {
        const inner = this.parseExpr(0);
        if (!inner.ok) return inner;
        const close = this.next();
        if (!close || close.type !== "rparen") {
          return {
            ok: false,
            message: "괄호가 닫히지 않았습니다.",
            pos: close ? close.pos : this.endPos(),
          };
        }
        return inner;
      }
      default:
        return {
          ok: false,
          message: `여기에 올 수 없는 토큰입니다: ${tok.text}`,
          pos: tok.pos,
        };
    }
  }

  private parseRefOrRange(tok: Token): ParseResult {
    const start = parseRefToken(tok.text);
    if (!start) {
      return { ok: false, message: `참조를 읽을 수 없습니다: ${tok.text}`, pos: tok.pos };
    }
    if (this.peek()?.type !== "colon") {
      return { ok: true, ast: { kind: "ref", ref: start } };
    }
    this.next();
    const endTok = this.next();
    if (!endTok || endTok.type !== "ref") {
      return {
        ok: false,
        message: "범위의 끝 참조가 없습니다.",
        pos: endTok ? endTok.pos : this.endPos(),
      };
    }
    const end = parseRefToken(endTok.text);
    if (!end) {
      return {
        ok: false,
        message: `참조를 읽을 수 없습니다: ${endTok.text}`,
        pos: endTok.pos,
      };
    }
    if (end.sheet !== null && end.sheet !== start.sheet) {
      return {
        ok: false,
        message: "범위의 양 끝은 같은 시트여야 합니다.",
        pos: endTok.pos,
      };
    }
    return {
      ok: true,
      ast: {
        kind: "range",
        range: { start, end: { ...end, sheet: start.sheet } },
      },
    };
  }

  private parseCall(tok: Token): ParseResult {
    const open = this.next();
    if (!open || open.type !== "lparen") {
      return { ok: false, message: "함수 뒤에 (가 없습니다.", pos: tok.pos };
    }
    const args: Node[] = [];
    if (this.peek()?.type === "rparen") {
      this.next();
      return { ok: true, ast: { kind: "call", name: tok.text, args } };
    }
    for (;;) {
      const arg = this.parseExpr(0);
      if (!arg.ok) return arg;
      args.push(arg.ast);
      const sep = this.next();
      if (!sep) {
        return { ok: false, message: "함수의 )가 없습니다.", pos: this.endPos() };
      }
      if (sep.type === "rparen") break;
      if (sep.type !== "comma") {
        return {
          ok: false,
          message: `인자 사이에는 쉼표가 와야 합니다: ${sep.text}`,
          pos: sep.pos,
        };
      }
    }
    return { ok: true, ast: { kind: "call", name: tok.text, args } };
  }
}

/** 수식 원문('=' 포함/미포함 모두 허용)을 AST로. 실패는 사유와 위치를 준다. */
export function parseFormula(input: string): ParseResult {
  const body = input.startsWith("=") ? input.slice(1) : input;
  const t = tokenize(body);
  if (!t.ok) return { ok: false, message: t.message, pos: t.pos + 1 };
  const parsed = new Parser(t.tokens).parse();
  // 위치는 원문 기준으로 돌려준다('=' 한 글자만큼 민다).
  if (!parsed.ok && input.startsWith("=")) {
    return { ...parsed, pos: parsed.pos + 1 };
  }
  return parsed;
}

// ── 재조립 ─────────────────────────────────────────────────────────────────
// 복사·붙여넣기와 채우기 핸들이 참조를 옮긴 뒤 다시 문자열로 만들어야 한다(AC-5).
// 괄호는 우선순위를 보고 **필요할 때만** 넣는다 — 전부 감싸면 사용자가 쓴 수식이
// 알아볼 수 없게 부풀고, 안 넣으면 의미가 바뀐다.
export function formatAst(node: Node): string {
  switch (node.kind) {
    case "number":
      return String(node.value);
    case "string":
      return `"${node.value.replace(/"/g, '""')}"`;
    case "boolean":
      return node.value ? "TRUE" : "FALSE";
    case "error":
      return node.value;
    case "name":
      return node.name;
    case "ref":
      return formatCellRef(node.ref);
    case "range": {
      const { start, end } = node.range;
      return `${formatCellRef(start)}:${formatCellRef({ ...end, sheet: null })}`;
    }
    case "unary":
      return `${node.op}${wrap(node.operand, 6)}`;
    case "percent":
      return `${wrap(node.operand, 6)}%`;
    case "call":
      return `${node.name}(${node.args.map(formatAst).join(",")})`;
    case "binary": {
      const prec = PRECEDENCE[node.op];
      return `${wrap(node.left, prec)}${node.op}${wrap(node.right, prec + 1)}`;
    }
  }
}

function wrap(node: Node, minPrec: number): string {
  const text = formatAst(node);
  if (node.kind !== "binary") return text;
  return PRECEDENCE[node.op] < minPrec ? `(${text})` : text;
}

/** '='를 붙인 완성형. 셀에 다시 저장할 때 쓴다. */
export function formatFormula(node: Node): string {
  return `=${formatAst(node)}`;
}

// ── 참조 수집 ──────────────────────────────────────────────────────────────
// 의존성 그래프(T3)가 "이 셀은 무엇을 보는가"를 알아야 한다. 범위는 펼치지 않고
// 범위 그대로 돌려준다 — A1:A10000을 1만 개로 펼치면 그래프가 폭발한다.
export interface FormulaRefs {
  refs: CellRef[];
  ranges: CellRange[];
  names: string[];
}

export function collectRefs(node: Node): FormulaRefs {
  const out: FormulaRefs = { refs: [], ranges: [], names: [] };
  walk(node, out);
  return out;
}

function walk(node: Node, out: FormulaRefs): void {
  switch (node.kind) {
    case "ref":
      out.refs.push(node.ref);
      return;
    case "range":
      out.ranges.push(node.range);
      return;
    case "name":
      out.names.push(node.name);
      return;
    case "unary":
    case "percent":
      walk(node.operand, out);
      return;
    case "binary":
      walk(node.left, out);
      walk(node.right, out);
      return;
    case "call":
      for (const a of node.args) walk(a, out);
      return;
    default:
      return;
  }
}
