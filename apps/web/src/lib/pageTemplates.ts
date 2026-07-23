// 새 페이지 생성 시 고르는 내장 템플릿(T6). content는 BlockNote 블록 배열(PartialBlock 호환) — createPage로
// 저장하면 서버가 extractPlainText로 plain_text를 파생한다. 빈 페이지는 content=[](기본).

type Inline = { type: "text"; text: string; styles: Record<string, never> };
type TemplateBlock = {
  type: string;
  props?: Record<string, unknown>;
  content?: Inline[];
};

export type PageTemplate = {
  key: string;
  label: string;
  title: string;
  content: TemplateBlock[];
};

function text(t: string): Inline[] {
  return [{ type: "text", text: t, styles: {} }];
}
function heading(t: string, level: 1 | 2 | 3): TemplateBlock {
  return { type: "heading", props: { level }, content: text(t) };
}
function para(t = ""): TemplateBlock {
  return { type: "paragraph", content: t ? text(t) : [] };
}
function bullet(t: string): TemplateBlock {
  return { type: "bulletListItem", content: text(t) };
}
function check(t: string): TemplateBlock {
  return { type: "checkListItem", props: { checked: false }, content: text(t) };
}

export const PAGE_TEMPLATES: PageTemplate[] = [
  { key: "blank", label: "빈 페이지", title: "", content: [] },
  {
    key: "meeting",
    label: "회의록",
    title: "회의록",
    content: [
      heading("회의록", 1),
      heading("참석자", 2),
      para(),
      heading("안건", 2),
      bullet(""),
      heading("결정사항", 2),
      bullet(""),
      heading("액션 아이템", 2),
      check(""),
    ],
  },
  {
    key: "daily",
    label: "일일 노트",
    title: "일일 노트",
    content: [
      heading("오늘", 1),
      heading("할 일", 2),
      check(""),
      heading("메모", 2),
      para(),
    ],
  },
  {
    key: "todo",
    label: "할 일 목록",
    title: "할 일",
    content: [heading("할 일", 1), check(""), check(""), check("")],
  },
  {
    key: "weekly-retro",
    label: "주간 회고",
    title: "주간 회고",
    content: [
      heading("주간 회고", 1),
      heading("이번 주 한 일", 2),
      bullet(""),
      heading("잘된 점 / 배운 점", 2),
      bullet(""),
      heading("아쉬운 점 / 개선", 2),
      bullet(""),
      heading("다음 주 계획", 2),
      check(""),
    ],
  },
  {
    key: "project",
    label: "프로젝트 계획",
    title: "프로젝트",
    content: [
      heading("프로젝트", 1),
      heading("목표", 2),
      para(),
      heading("범위", 2),
      bullet(""),
      heading("마일스톤", 2),
      check(""),
      heading("리스크", 2),
      bullet(""),
    ],
  },
  {
    key: "dev-note",
    label: "개발 노트",
    title: "개발 노트",
    content: [
      heading("개발 노트", 1),
      heading("오늘 작업", 2),
      check(""),
      heading("막힌 점 / 해결", 2),
      bullet(""),
      heading("배운 점", 2),
      bullet(""),
      heading("다음에 할 일", 2),
      check(""),
    ],
  },
];
