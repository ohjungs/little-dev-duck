import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// 2026-07-31 : 접근성 - 포커스 가시성 - 클래스 잠금 (게이트 차단 건)
//
// **왜 렌더 테스트가 아니라 정적 검사인가.**
// jsdom에는 Tailwind가 컴파일되지 않는다. `getComputedStyle(el).opacity`는 클래스가
// opacity-0이든 아니든 똑같은 값을 돌려준다 — 즉 RTL로는 이 결함을 절대 못 잡는다.
// 다음 사람이 같은 시도를 반복하지 않도록 적어 둔다: 여기서 유효한 도구는 **클래스 문자열
// 정적 잠금 하나뿐**이다. RTL로 검증 가능한 건 접근가능 이름·역할·탭 진입 가능성이고,
// 그건 이 파일의 관심사가 아니다.
//
// **왜 파일이 필요한가.**
// 이 저장소에는 이미 올바른 패턴(TodoWidget.tsx의 focus-visible:opacity-100)이 있었는데,
// 나중에 쓰인 세 파일이 그걸 복사하지 않았다. 관례는 전파되지 않는다 — 검사만 전파된다.

const COMPONENTS_DIR = path.join(__dirname, "..");

function tsxFilesUnder(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === "__tests__") continue;
      out.push(...tsxFilesUnder(full));
    } else if (entry.endsWith(".tsx")) {
      out.push(full);
    }
  }
  return out;
}

function read(relative: string): string {
  const source = readFileSync(path.join(COMPONENTS_DIR, relative), "utf8");
  // 경로가 틀리면 빈 문자열을 훑고 "위반 0건"으로 통과한다. 읽었다는 것부터 단언한다.
  expect(source.length, `${relative}를 읽지 못했다`).toBeGreaterThan(0);
  return source;
}

/**
 * className 하나에 딸린 표현식 **전체**를 한 단위로 잘라낸다.
 *
 * 줄 단위나 따옴표 단위로 자르면 오탐이 난다 — cn(...)·삼항·문자열 결합으로 쪼개진
 * 클래스는 opacity-0과 focus-visible:opacity-100이 서로 다른 리터럴에 들어가기 때문이다
 * (TodoWidget.tsx가 실제로 그렇다). 그래서 `"`는 닫는 따옴표까지, `{`는 중괄호 균형까지를
 * 한 단위로 본다.
 */
export function classNameExpressions(source: string): string[] {
  const out: string[] = [];
  const marker = /className\s*=\s*/g;
  let m: RegExpExecArray | null;
  while ((m = marker.exec(source)) !== null) {
    let i = m.index + m[0].length;
    const opener = source[i];

    if (opener === '"' || opener === "'") {
      const end = source.indexOf(opener, i + 1);
      if (end === -1) continue;
      out.push(source.slice(i + 1, end));
      marker.lastIndex = end + 1;
      continue;
    }

    if (opener !== "{") continue;

    // 중괄호 균형. 문자열/템플릿 리터럴 안의 괄호는 세지 않는다.
    let depth = 0;
    let quote: string | null = null;
    const start = i;
    for (; i < source.length; i += 1) {
      const c = source[i];
      if (quote) {
        if (c === "\\") i += 1;
        else if (c === quote) quote = null;
        continue;
      }
      if (c === '"' || c === "'" || c === "`") {
        quote = c;
        continue;
      }
      if (c === "{") depth += 1;
      else if (c === "}") {
        depth -= 1;
        if (depth === 0) break;
      }
    }
    if (depth !== 0) continue;
    out.push(source.slice(start + 1, i));
    marker.lastIndex = i + 1;
  }
  return out;
}

// `opacity-100`에는 걸리지 않는다(하이픈 뒤가 '1'이라 애초에 매치되지 않는다).
// 앞쪽 lookbehind가 `:`를 허용하는 건 `hover:opacity-0` 같은 변형도 숨김이기 때문이다.
const HIDDEN = /(?<![\w-])opacity-0(?![\w./-])/;
const REVEALED_ON_HOVER = /(?<![\w-])group-hover(?:\/[\w-]+)?:opacity-100\b/;
// 세 가지 되살림을 인정한다:
//   focus-visible: 자기가 포커스를 받는 컨트롤
//   focus-within:  컨테이너째 숨긴 경우(안쪽 버튼이 포커스를 받는다)
//   group-focus-visible: 자기는 포커스를 못 받는 장식이고 감싼 요소가 포커스를 받는 경우
// 세 번째가 없으면 NewsTopWidget의 장식 아이콘처럼 **고칠 방법이 없는** 항목이 생겨
// 허용목록으로 도망가게 된다. 규칙을 느슨하게 한 게 아니라 되살림 수단을 다 적은 것이다.
const REVEALED_ON_FOCUS =
  /(?<![\w-])(?:group-)?focus-(?:visible|within)(?:\/[\w-]+)?:opacity-100\b/;

/** 마우스로만 꺼낼 수 있고 키보드로는 못 꺼내는 컨트롤인가. */
export function hidesFromKeyboard(expression: string): boolean {
  return (
    HIDDEN.test(expression) &&
    REVEALED_ON_HOVER.test(expression) &&
    !REVEALED_ON_FOCUS.test(expression)
  );
}

// 예외를 두려면 여기에 **사유와 함께** 적는다. 빈 배열로 시작한다 — 지금 저장소에
// 정당한 예외가 하나도 없기 때문이다. 사유 없이 이름만 추가하면 이 검사는 죽는다.
const R1_ALLOWED: { file: string; reason: string }[] = [];

const TARGET_SIZE_FILES = ["PageWorkspace.tsx", path.join("db", "DbTableView.tsx")];
const RING_FILES = [
  path.join("ui", "button.tsx"),
  path.join("ui", "input.tsx"),
  path.join("db", "DbTableView.tsx"),
];

// 22px짜리 아이콘 버튼(p-1 + size-3.5). SC 2.5.8 최소 24px 미달이고, 인접 간격이 gap-1(4px)
// 이라 "간격 예외"도 못 쓴다. p-1.5(26px) 이상만 허용한다.
const UNDERSIZED_TARGET = /rounded p-1(?![.\d])/g;
// 링 색 알파 희석. 토큰이 3:1을 넘겨도 희석하면 배경과 섞여 미달이 된다.
const ALPHA_RING = /ring-(?:ring|primary)\//g;

describe("R1: 호버로만 나타나는 컨트롤은 포커스로도 나타난다 (SC 2.4.7)", () => {
  const files = tsxFilesUnder(COMPONENTS_DIR);

  it("검사 대상 파일을 실제로 찾았다", () => {
    expect(files.length).toBeGreaterThan(10);
  });

  it("합성 불량 입력을 잡아낸다 (공짜 통과 배제)", () => {
    const bad = classNameExpressions(
      '<button className="opacity-0 group-hover:opacity-100" />',
    );
    expect(bad).toEqual(["opacity-0 group-hover:opacity-100"]);
    expect(bad.some(hidesFromKeyboard)).toBe(true);

    // 고친 형태는 통과해야 한다(과잉 차단이 아님을 보인다).
    expect(
      hidesFromKeyboard(
        "opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100",
      ),
    ).toBe(false);

    // 이름 있는 group과 컨테이너 단위 focus-within도 같은 규칙으로 다룬다.
    expect(hidesFromKeyboard("opacity-0 group-hover/title:opacity-100")).toBe(
      true,
    );
    expect(
      hidesFromKeyboard(
        "opacity-0 focus-within:opacity-100 group-hover:opacity-100",
      ),
    ).toBe(false);
  });

  it("표현식을 쪼개지 않는다 (cn·삼항으로 갈린 클래스 오탐 방지)", () => {
    const split = classNameExpressions(
      'className={cn("opacity-0 group-hover:opacity-100", on && "focus-visible:opacity-100")}',
    );
    expect(split).toHaveLength(1);
    expect(split[0]).toContain("focus-visible:opacity-100");
    expect(hidesFromKeyboard(split[0])).toBe(false);
  });

  it("모든 컴포넌트가 키보드로 도달 가능한 컨트롤만 숨긴다", () => {
    const violations: string[] = [];
    for (const file of files) {
      const relative = path.relative(COMPONENTS_DIR, file);
      if (R1_ALLOWED.some((a) => a.file === relative)) continue;
      for (const expression of classNameExpressions(
        readFileSync(file, "utf8"),
      )) {
        if (hidesFromKeyboard(expression)) {
          violations.push(`${relative}: ${expression.replace(/\s+/g, " ")}`);
        }
      }
    }
    expect(
      violations,
      `호버로만 나타나는 컨트롤(키보드 사용자는 영영 못 본다):\n${violations.join("\n")}`,
    ).toEqual([]);
  });
});

describe("R2: 아이콘 버튼 타깃 크기 (SC 2.5.8)", () => {
  for (const relative of TARGET_SIZE_FILES) {
    it(`${relative}에 22px 아이콘 버튼이 없다`, () => {
      const matches = read(relative).match(UNDERSIZED_TARGET) ?? [];
      expect(
        matches,
        `"rounded p-1"(22px)이 남아 있다 — p-1.5 이상으로 올린다`,
      ).toEqual([]);
    });
  }

  it("검사가 실제로 작동한다 (가짜 입력)", () => {
    expect('className="shrink-0 rounded p-1 text-muted-foreground"').toMatch(
      UNDERSIZED_TARGET,
    );
    // p-1.5는 걸리지 않는다.
    expect(
      /rounded p-1(?![.\d])/.test('className="shrink-0 rounded p-1.5"'),
    ).toBe(false);
  });
});

describe("R3: 포커스링 색은 희석하지 않는다 (SC 1.4.11)", () => {
  for (const relative of RING_FILES) {
    it(`${relative}가 알파 없는 --ring을 쓴다`, () => {
      const source = read(relative);
      expect(
        source.match(ALPHA_RING) ?? [],
        `알파 링이 남아 있다 — /60은 1.84:1, /40은 1.48:1로 3:1 미달이다`,
      ).toEqual([]);
      expect(source).toContain("focus-visible:ring-ring");
    });
  }

  it("검사가 실제로 작동한다 (가짜 입력)", () => {
    expect("focus-visible:ring-ring/60").toMatch(/ring-(?:ring|primary)\//);
    expect("focus:ring-primary/40").toMatch(/ring-(?:ring|primary)\//);
    expect(/ring-(?:ring|primary)\//.test("focus-visible:ring-ring")).toBe(
      false,
    );
  });

  it("지정 파일 밖의 알파 링은 보고만 한다 (스코프 고정)", () => {
    // 이번 라운드 계약은 위 세 파일까지다. 나머지는 고치지 않되 **눈에 보이게** 남긴다 —
    // 조용히 넘어가면 다음 감사에서 같은 항목이 또 "새 발견"으로 올라온다.
    const outside: string[] = [];
    for (const file of tsxFilesUnder(COMPONENTS_DIR)) {
      const relative = path.relative(COMPONENTS_DIR, file);
      if (RING_FILES.includes(relative)) continue;
      const hits = readFileSync(file, "utf8").match(ALPHA_RING);
      if (hits) outside.push(`${relative} (${hits.length}건)`);
    }
    if (outside.length > 0) {
      console.warn(`[후속 백로그] 알파 링이 남은 파일:\n${outside.join("\n")}`);
    }
    // 실패시키지 않는다. 스코프 밖을 고치는 건 계약 위반이다.
    expect(Array.isArray(outside)).toBe(true);
  });
});
