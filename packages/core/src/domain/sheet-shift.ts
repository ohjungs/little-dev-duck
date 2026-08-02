import { formatFormula, parseFormula, type Node } from "./formula-parse";
import { normalizeRange, shiftCellRef } from "./sheet";

// 2026-08-02 : 스프레드시트 - 참조 이동 (SPEC-2026-08-02-spreadsheet-a1 T6 / AC-5)
//
// 수식을 다른 칸으로 옮길 때 **상대참조만** 따라 움직인다. 복사·붙여넣기와 채우기 핸들이
// 이 함수 하나를 쓴다 — 두 곳이 각자 구현하면 한쪽만 고쳐지고, 그 어긋남은 "붙여넣은 수식이
// 조용히 엉뚱한 칸을 가리키는" 형태로 나타난다(값은 그럴듯하게 나오므로 알아채기 어렵다).
//
// 격자 밖으로 나가는 참조는 #REF!다. 0행 0열로 접으면 멀쩡해 보이는 틀린 수식이 남는다.

function shiftNode(node: Node, dr: number, dc: number): Node {
  switch (node.kind) {
    case "ref": {
      const moved = shiftCellRef(node.ref, dr, dc);
      return moved === null ? { kind: "error", value: "#REF!" } : { kind: "ref", ref: moved };
    }
    case "range": {
      // 정규화하고 옮긴다 — 어느 모서리에서 끌어 만든 범위든 결과가 같아야 한다.
      const n = normalizeRange(node.range);
      const start = shiftCellRef(n.start, dr, dc);
      const end = shiftCellRef(n.end, dr, dc);
      if (start === null || end === null) return { kind: "error", value: "#REF!" };
      return { kind: "range", range: { start, end } };
    }
    case "unary":
      return { ...node, operand: shiftNode(node.operand, dr, dc) };
    case "percent":
      return { ...node, operand: shiftNode(node.operand, dr, dc) };
    case "binary":
      return {
        ...node,
        left: shiftNode(node.left, dr, dc),
        right: shiftNode(node.right, dr, dc),
      };
    case "call":
      return { ...node, args: node.args.map((a) => shiftNode(a, dr, dc)) };
    default:
      // 숫자·문자열·불리언·오류·이름 정의는 좌표가 없다. 이름 정의(`매출`)를 옮기지 않는 것은
      // 엑셀과 같다 — 이름은 자기 대상을 스스로 들고 있다.
      return node;
  }
}

/**
 * 수식 원문('=' 포함)의 참조를 (dr, dc)만큼 옮겨 다시 원문으로 만든다.
 *
 * 읽을 수 없는 수식은 **원문 그대로** 돌려준다. 고칠 수 있으려면 사용자가 쓴 글자가 남아야
 * 한다(엔진도 같은 원칙이다 — recalc.ts는 파싱 실패를 값 쪽 오류로만 표시하고 원문을 보존한다).
 */
export function shiftFormulaRefs(formula: string, dr: number, dc: number): string {
  // 제자리 붙여넣기까지 재조립을 거치면 공백·괄호 모양이 바뀐다. 옮길 것이 없으면 손대지 않는다.
  if (dr === 0 && dc === 0) return formula;
  const parsed = parseFormula(formula);
  if (!parsed.ok) return formula;
  return formatFormula(shiftNode(parsed.ast, dr, dc));
}
