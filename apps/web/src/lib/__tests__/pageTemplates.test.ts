import { describe, it, expect } from "vitest";
import { dbSchemaSchema, IMPORTABLE_BLOCK_TYPES } from "@ldd/core";
import { PAGE_TEMPLATES, templateTitle, templateToText } from "../pageTemplates";

describe("PAGE_TEMPLATES", () => {
  it("has at least one template", () => {
    expect(PAGE_TEMPLATES.length).toBeGreaterThan(0);
  });

  it("every template has a non-empty key and label", () => {
    for (const tpl of PAGE_TEMPLATES) {
      expect(typeof tpl.key).toBe("string");
      expect(tpl.key.length).toBeGreaterThan(0);
      expect(typeof tpl.label).toBe("string");
      expect(tpl.label.length).toBeGreaterThan(0);
    }
  });

  it("every template has a content array", () => {
    for (const tpl of PAGE_TEMPLATES) {
      expect(Array.isArray(tpl.content)).toBe(true);
    }
  });

  it("blank template has empty content and empty title", () => {
    const blank = PAGE_TEMPLATES.find((t) => t.key === "blank");
    expect(blank).toBeDefined();
    expect(blank!.content).toHaveLength(0);
    expect(blank!.title).toBe("");
  });

  it("all keys are unique", () => {
    const keys = PAGE_TEMPLATES.map((t) => t.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

// Phase 18 T2: 데이터베이스 템플릿(열·뷰가 미리 잡힌 페이지) + 날짜가 들어가는 제목.
const MONDAY = new Date(2026, 6, 20, 9, 0);

describe("데이터베이스 템플릿", () => {
  const dbTemplates = PAGE_TEMPLATES.filter((t) => t.dbSchema);

  it("데이터베이스 템플릿이 존재한다", () => {
    expect(dbTemplates.length).toBeGreaterThan(0);
  });

  it("dbSchema가 core 스키마 검증을 통과한다(createPage가 저장 전 parse함)", () => {
    for (const t of dbTemplates) {
      expect(() => dbSchemaSchema.parse(t.dbSchema), t.key).not.toThrow();
    }
  });

  it("보드 뷰의 groupByPropId는 실재하는 select 속성을 가리킨다", () => {
    for (const t of dbTemplates) {
      for (const view of t.dbSchema!.views.filter((v) => v.type === "board")) {
        const target = t.dbSchema!.properties.find(
          (p) => p.id === view.groupByPropId,
        );
        expect(target, `${t.key}: 보드 groupBy 대상 없음`).toBeDefined();
        expect(target!.type).toBe("select");
      }
    }
  });

  it("속성 id가 템플릿 안에서 겹치지 않는다", () => {
    for (const t of dbTemplates) {
      const ids = t.dbSchema!.properties.map((p) => p.id);
      expect(new Set(ids).size, t.key).toBe(ids.length);
    }
  });
});

describe("templateTitle", () => {
  it("고정 제목 템플릿은 그대로 돌려준다", () => {
    const meeting = PAGE_TEMPLATES.find((t) => t.key === "meeting")!;
    expect(templateTitle(meeting, MONDAY)).toBe("회의록");
  });

  it("빈 페이지는 빈 제목을 유지한다", () => {
    const blank = PAGE_TEMPLATES.find((t) => t.key === "blank")!;
    expect(templateTitle(blank, MONDAY)).toBe("");
  });

  it("일일 노트 제목에 그날 날짜가 붙는다", () => {
    const daily = PAGE_TEMPLATES.find((t) => t.key === "daily")!;
    expect(templateTitle(daily, MONDAY)).toContain("2026-07-20");
  });

  it("주간 회고는 요일과 무관하게 그 주 월요일로 묶인다", () => {
    const retro = PAGE_TEMPLATES.find((t) => t.key === "weekly-retro")!;
    const wednesday = new Date(2026, 6, 22, 23, 30);
    expect(templateTitle(retro, wednesday)).toBe(
      templateTitle(retro, MONDAY),
    );
    expect(templateTitle(retro, MONDAY)).toContain("2026-07-20");
  });

  it("자정 직후에도 날짜가 하루 밀리지 않는다", () => {
    const daily = PAGE_TEMPLATES.find((t) => t.key === "daily")!;
    expect(templateTitle(daily, new Date(2026, 6, 21, 0, 30))).toContain(
      "2026-07-21",
    );
  });
});

// 2026-07-26 : 활성화 - 템플릿 - 일기·포트폴리오·회고록 (피드백 2-3)
// 사용자가 이름을 직접 댄 템플릿들이다. 지우거나 이름을 바꾸면 요구가 조용히 사라지므로
// 존재 자체를 검사로 잠근다.
describe("사용자가 요청한 템플릿(피드백 2-3)", () => {
  it.each(["회의록", "일기", "포트폴리오", "회고록"])("'%s' 템플릿이 있다", (label) => {
    expect(PAGE_TEMPLATES.some((t) => t.label === label)).toBe(true);
  });

  it("새로 추가한 템플릿들도 본문이 비어 있지 않다(고르면 백지가 아니어야 한다)", () => {
    for (const key of ["diary", "portfolio", "retrospective"]) {
      const t = PAGE_TEMPLATES.find((x) => x.key === key);
      expect(t, `${key} 템플릿이 없다`).toBeDefined();
      expect(t!.content.length).toBeGreaterThan(0);
    }
  });
});

// 2026-07-27 : 템플릿 - 안내 문구 계약 (2차 피드백 2-4, Phase 43 T3)
// 사용자가 "빈페이지말고 실제 노션에서 쓰는 회의록처럼"이라고 했다. 조사해 보니 구조는 있었고
// **모든 칸이 빈 문자열**이었다 — 고르면 제목만 늘어선 뼈대가 나온다.
// 여기서 잠그는 것은 "칸이 채워져 있다"와 **그 채움이 다른 기능을 깨지 않는다**는 두 가지다.
describe("템플릿 내용 계약", () => {
  const filled = PAGE_TEMPLATES.filter((t) => t.key !== "blank");

  it("빈 페이지를 뺀 모든 템플릿에 빈 블록이 없다", () => {
    // 빈 블록이 하나라도 있으면 그 자리는 사용자에게 "뭘 쓰라는 거지"가 된다.
    for (const t of filled) {
      for (const [i, block] of t.content.entries()) {
        const textLen = (block.content ?? []).reduce(
          (n, inline) => n + inline.text.trim().length,
          0,
        );
        expect(textLen, `${t.key}: ${i}번째 블록(${block.type})이 비었다`).toBeGreaterThan(0);
      }
    }
  });

  it("h1이 둘 이상인 템플릿은 없다 (발표 모드가 h1을 장 경계로 삼는다)", () => {
    // Phase 34: h1이 슬라이드 경계다. 회의록에 h1이 여러 개면 **회의록 하나가 여러 장으로
    // 흩어진다.** 섹션 제목을 h2 이하로만 두는 이유이고, 주석으로만 적으면 다음 사람이 어긴다.
    // 상한만 잠근다 — 데이터베이스 템플릿은 표로 열려서 본문에 제목이 없다(아래 검사가 그쪽을 본다).
    for (const t of PAGE_TEMPLATES) {
      const h1 = t.content.filter(
        (b) => b.type === "heading" && b.props?.level === 1,
      );
      expect(h1.length, `${t.key}: h1이 ${h1.length}개`).toBeLessThanOrEqual(1);
    }
  });

  it("글 템플릿에는 h1 제목이 정확히 하나 있다", () => {
    for (const t of filled) {
      if (t.dbSchema) continue; // 표로 열리는 템플릿은 본문 제목을 쓰지 않는다.
      const h1 = t.content.filter(
        (b) => b.type === "heading" && b.props?.level === 1,
      );
      expect(h1.length, `${t.key}: h1이 ${h1.length}개`).toBe(1);
    }
  });

  it("첫 블록이 h1이다 (제목 없이 본문부터 시작하지 않는다)", () => {
    for (const t of filled) {
      // 데이터베이스 템플릿은 본문이 안내 한 줄이라 제목이 표 위에 붙지 않는다 — 예외.
      if (t.dbSchema) continue;
      expect(t.content[0]?.type, t.key).toBe("heading");
      expect(t.content[0]?.props?.level, t.key).toBe(1);
    }
  });

  it("허용된 블록 타입만 쓴다 (내보냈다 가져올 때 깨지지 않게)", () => {
    // Phase 30 T3이 외부 템플릿 파일에 세운 방어다. 우리 내장 템플릿이 그 목록 밖 블록을 쓰면
    // 내보내기 → 가져오기 왕복에서 조용히 사라진다.
    for (const t of PAGE_TEMPLATES) {
      for (const block of t.content) {
        expect(
          (IMPORTABLE_BLOCK_TYPES as readonly string[]).includes(block.type),
          `${t.key}: 허용 목록에 없는 블록 ${block.type}`,
        ).toBe(true);
      }
    }
  });

  it("회의록에 담당자·기한 자리가 있다 (액션 아이템이 실제로 굴러가려면)", () => {
    // 담당자와 기한이 없는 액션 아이템은 아무도 하지 않는다 — 사용자가 이름을 댄 템플릿이라
    // 이 자리는 조용히 사라지면 안 된다.
    const meeting = PAGE_TEMPLATES.find((t) => t.key === "meeting")!;
    const actionItem = meeting.content.find((b) => b.type === "checkListItem");
    const t = (actionItem?.content ?? []).map((i) => i.text).join("");
    expect(t).toContain("담당");
    expect(t).toContain("기한");
  });
});

// 2026-07-27 : 작문 도우미 - 템플릿 이용 (2차 피드백 2-5, Phase 45 T2)
// 작문 도우미에서 템플릿을 꺼낼 때 **새 페이지와 같은 구조**가 나와야 한다.
// 정의를 새로 만들지 않고 PAGE_TEMPLATES를 옮기는 것이 그 계약이다.
describe("templateToText", () => {
  const meeting = PAGE_TEMPLATES.find((t) => t.key === "meeting")!;

  it("제목·목록·체크박스를 마크다운 모양으로 옮긴다", () => {
    const out = templateToText(meeting);
    expect(out).toContain("# 회의록");
    expect(out).toContain("## 참석자");
    expect(out).toContain("- [ ] ");
    expect(out).toContain("> ");
  });

  it("템플릿에 있는 안내 문구가 그대로 실린다", () => {
    // 안내 문구가 빠지면 "빈 페이지 같다"는 그 문제가 여기서 다시 생긴다.
    expect(templateToText(meeting)).toContain("담당");
  });

  it("빈 페이지는 빈 문자열이다", () => {
    const blank = PAGE_TEMPLATES.find((t) => t.key === "blank")!;
    expect(templateToText(blank)).toBe("");
  });

  it("제목 단계는 1~3으로 눌러 담는다", () => {
    // 마크다운은 6단계까지지만 우리 템플릿은 h1·h2만 쓴다. 범위를 벗어난 값이 와도 깨지지 않아야 한다.
    const out = templateToText({
      ...meeting,
      content: [{ type: "heading", props: { level: 9 }, content: [{ type: "text", text: "깊은 제목", styles: {} }] }],
    });
    expect(out).toBe("### 깊은 제목");
  });
});
