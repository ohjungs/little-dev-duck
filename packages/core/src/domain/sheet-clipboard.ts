// 2026-08-02 : 스프레드시트 - 클립보드 (SPEC-2026-08-02-spreadsheet-a1 T6 / AC-13)
//
// 엑셀은 범위를 복사할 때 클립보드에 **탭 구분 텍스트**를 함께 싣는다. 그래서 붙여넣기는
// TSV 파싱이고, 우리에서 복사한 것을 엑셀에 붙이는 것은 TSV 조립이다.
//
// 구분자를 인자로 받는 이유: CSV(T9)가 같은 규칙에 쉼표만 다르다. 두 벌로 쓰면 따옴표 규칙이
// 한쪽에서만 고쳐진다 — 이 저장소가 반복해서 겪은 부류다.
//
// 따옴표 규칙은 RFC 4180과 엑셀이 실제로 쓰는 것을 따른다: 셀을 "로 감싸면 그 안의 구분자와
// 줄바꿈은 내용이고, 안쪽의 "는 두 번 써서 이스케이프한다.

/** 구분자 텍스트를 행×열 문자열 표로 읽는다. 실패라는 개념이 없다 — 무엇이든 표가 된다. */
export function parseDelimited(text: string, delimiter: string): string[][] {
  if (text === "") return [];

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  let i = 0;

  const endField = (): void => {
    row.push(field);
    field = "";
  };
  const endRow = (): void => {
    endField();
    rows.push(row);
    row = [];
  };

  while (i < text.length) {
    const ch = text[i];

    if (quoted) {
      if (ch === '"') {
        // 연달아 두 개면 따옴표 한 글자, 하나면 인용 끝.
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        quoted = false;
        i += 1;
        continue;
      }
      field += ch;
      i += 1;
      continue;
    }

    if (ch === '"' && field === "") {
      quoted = true;
      i += 1;
      continue;
    }
    if (ch === delimiter) {
      endField();
      i += 1;
      continue;
    }
    if (ch === "\r" || ch === "\n") {
      endRow();
      // CRLF는 한 번의 줄바꿈이다(윈도 엑셀).
      i += ch === "\r" && text[i + 1] === "\n" ? 2 : 1;
      continue;
    }
    field += ch;
    i += 1;
  }

  // 마지막 줄바꿈으로 끝났으면 빈 행을 만들지 않는다.
  if (field !== "" || row.length > 0) endRow();
  return rows;
}

/** 행×열 문자열 표를 구분자 텍스트로 만든다. 감싸야 하는 셀만 감싼다. */
export function toDelimited(rows: readonly (readonly string[])[], delimiter: string): string {
  const needsQuote = (s: string): boolean =>
    s.includes(delimiter) || s.includes("\n") || s.includes("\r") || s.includes('"');

  return rows
    .map((row) =>
      row
        .map((cell) => (needsQuote(cell) ? `"${cell.replace(/"/g, '""')}"` : cell))
        .join(delimiter),
    )
    .join("\n");
}
