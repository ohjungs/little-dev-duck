import { describe, it, expect } from "vitest";
import {
  TEMPLATE_FILE_VERSION,
  IMPORTABLE_BLOCK_TYPES,
  buildTemplateFile,
  parseTemplateFile,
} from "./template-file";

const valid = () => ({
  formatVersion: TEMPLATE_FILE_VERSION,
  title: "회의록",
  icon: "📝",
  content: [
    { type: "heading", props: { level: 2 }, content: [{ type: "text", text: "안건" }] },
    { type: "bulletListItem", content: [{ type: "text", text: "첫 항목" }] },
  ],
  dbSchema: null,
});

describe("buildTemplateFile", () => {
  it("우리가 만든 파일은 우리가 다시 읽는다 (라운드트립)", () => {
    const file = buildTemplateFile({ title: "회의록", icon: "📝", content: [], dbSchema: null });
    const r = parseTemplateFile(JSON.parse(JSON.stringify(file)));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.template.title).toBe("회의록");
  });

  it("버전을 담는다", () => {
    expect(buildTemplateFile({ title: "t", icon: null, content: [], dbSchema: null }).formatVersion)
      .toBe(TEMPLATE_FILE_VERSION);
  });
});

describe("parseTemplateFile", () => {
  it("정상 파일을 받아들인다", () => {
    const r = parseTemplateFile(valid());
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.template.content).toHaveLength(2);
  });

  it("템플릿 파일이 아니면 그렇게 말한다", () => {
    for (const bad of [null, 3, "문자열", [], { hello: 1 }]) {
      const r = parseTemplateFile(bad);
      expect(r.ok, JSON.stringify(bad)).toBe(false);
    }
  });

  it("더 새로운 형식은 추측해서 읽지 않는다", () => {
    const r = parseTemplateFile({ ...valid(), formatVersion: TEMPLATE_FILE_VERSION + 1 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain("새로운");
  });

  it("제목이 없으면 거부한다", () => {
    const rest: Record<string, unknown> = valid();
    delete rest.title;
    expect(parseTemplateFile(rest).ok).toBe(false);
  });

  // 보안: 외부 파일의 블록이 그대로 렌더된다. 모르는 타입은 통과시키지 않는다.
  it("허용 목록에 없는 블록 타입은 거부한다", () => {
    const r = parseTemplateFile({
      ...valid(),
      content: [{ type: "script", content: [] }],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain("script");
  });

  it("이미지·파일 블록은 일부러 막는다 (원격 주소를 불러오게 된다)", () => {
    for (const type of ["image", "video", "file", "audio"]) {
      const r = parseTemplateFile({ ...valid(), content: [{ type, props: {} }] });
      expect(r.ok, type).toBe(false);
    }
  });

  it("허용 목록의 블록은 전부 통과한다", () => {
    const content = IMPORTABLE_BLOCK_TYPES.map((type) => ({ type, content: [] }));
    expect(parseTemplateFile({ ...valid(), content }).ok).toBe(true);
  });

  it("중첩된 자식 블록도 검사한다", () => {
    // 겉만 보고 통과시키면 안쪽에 무엇이든 넣을 수 있다.
    const r = parseTemplateFile({
      ...valid(),
      content: [{ type: "paragraph", children: [{ type: "script" }] }],
    });
    expect(r.ok).toBe(false);
  });

  it("블록이 객체가 아니면 거부한다", () => {
    expect(parseTemplateFile({ ...valid(), content: ["문자열"] }).ok).toBe(false);
    expect(parseTemplateFile({ ...valid(), content: [null] }).ok).toBe(false);
  });

  it("본문이 배열이 아니면 거부한다", () => {
    expect(parseTemplateFile({ ...valid(), content: { a: 1 } }).ok).toBe(false);
  });

  it("빈 본문도 유효하다 (제목만 있는 템플릿)", () => {
    expect(parseTemplateFile({ ...valid(), content: [] }).ok).toBe(true);
  });

  it("깨진 dbSchema는 거부한다", () => {
    // 저장 시점에 막지 않으면 읽기 경로가 기본값으로 강등해 데이터가 조용히 사라진다.
    const r = parseTemplateFile({ ...valid(), dbSchema: { properties: [], views: [] } });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain("데이터베이스");
  });

  it("아이콘이 없어도 된다", () => {
    const rest: Record<string, unknown> = valid();
    delete rest.icon;
    const r = parseTemplateFile(rest);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.template.icon).toBeNull();
  });

  it("아주 큰 파일은 거부한다 (붙여넣기 사고·악의적 파일 방어)", () => {
    const many = Array.from({ length: 5001 }, () => ({ type: "paragraph", content: [] }));
    const r = parseTemplateFile({ ...valid(), content: many });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain("너무");
  });
});
