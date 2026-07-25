// 새 페이지 생성 시 고르는 내장 템플릿(T6). content는 BlockNote 블록 배열(PartialBlock 호환) — createPage로
// 저장하면 서버가 extractPlainText로 plain_text를 파생한다. 빈 페이지는 content=[](기본).
//
// 2026-07-26 : 활성화 - 템플릿 - 데이터베이스·날짜제목 (Phase 18 T2)
// dbSchema가 있으면 페이지가 곧 데이터베이스(열·뷰가 미리 잡힌 표/보드)로 열린다 — 빈 표에서
// 열부터 만들게 하지 않고 바로 쓸 수 있는 상태로 준다. datedTitle이 있으면 만든 날짜가 제목에 붙어
// 같은 템플릿을 반복해 써도 목록에서 구분된다("일일 노트"가 여러 개 쌓이던 문제).

import { startOfWeek, toLocalDateString, type DbSchema } from "@ldd/core";

type Inline = { type: "text"; text: string; styles: Record<string, never> };
type TemplateBlock = {
  type: string;
  props?: Record<string, unknown>;
  content?: Inline[];
};

export type PageTemplate = {
  key: string;
  label: string;
  description: string;
  icon: string;
  title: string;
  content: TemplateBlock[];
  // 있으면 이 페이지를 데이터베이스로 만든다(createPage가 db_schema로 저장 — zod 검증 후).
  dbSchema?: DbSchema;
  // 제목에 날짜를 붙이는 방식. "day"=만든 날, "week"=그 주 월요일. 없으면 title 고정.
  datedTitle?: "day" | "week";
};

// 템플릿의 실제 제목. 날짜 계산은 core 공용 헬퍼(로컬 기준 — toISOString은 자정 직후 하루 밀림).
export function templateTitle(template: PageTemplate, today: Date): string {
  if (!template.datedTitle) return template.title;
  const date =
    template.datedTitle === "week"
      ? toLocalDateString(startOfWeek(today))
      : toLocalDateString(today);
  return `${template.title} ${date}`;
}

function selectProp(
  id: string,
  name: string,
  options: { id: string; name: string; color: string }[],
) {
  return { id, name, type: "select" as const, options };
}

// 표 + 보드 두 뷰. 보드는 인자로 받은 select 속성으로 그룹한다(존재하지 않는 속성을 가리키면
// 보드가 붕괴하므로 호출부에서 실재하는 id만 넘긴다 — 테스트로 잠금).
function tableAndBoard(groupByPropId: string): DbSchema["views"] {
  return [
    {
      id: "table",
      name: "표",
      type: "table",
      groupByPropId: null,
      sort: null,
      filters: [],
      hiddenPropIds: [],
    },
    {
      id: "board",
      name: "보드",
      type: "board",
      groupByPropId,
      sort: null,
      filters: [],
      hiddenPropIds: [],
    },
  ];
}

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
  {
    key: "blank",
    label: "빈 페이지",
    description: "백지에서 시작",
    icon: "📄",
    title: "",
    content: [],
  },
  {
    key: "meeting",
    label: "회의록",
    description: "참석자·안건·결정사항·액션 아이템",
    icon: "🗓️",
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
    description: "오늘의 할 일과 메모",
    icon: "☀️",
    title: "일일 노트",
    datedTitle: "day",
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
    description: "체크리스트만 빠르게",
    icon: "✅",
    title: "할 일",
    content: [heading("할 일", 1), check(""), check(""), check("")],
  },
  {
    key: "weekly-retro",
    label: "주간 회고",
    description: "한 주를 돌아보고 다음을 계획",
    icon: "🔄",
    title: "주간 회고",
    datedTitle: "week",
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
    description: "목표·범위·마일스톤·리스크",
    icon: "🚀",
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
    description: "작업·막힌 점·배운 점·다음 할 일",
    icon: "🔧",
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
  {
    key: "project-tracker",
    label: "프로젝트 트래커",
    description: "상태·우선순위·마감일 표와 칸반 보드",
    icon: "📊",
    title: "프로젝트 트래커",
    content: [
      para("각 행이 하나의 작업이자 페이지입니다. 행을 열면 안에 자세한 내용을 쓸 수 있어요."),
    ],
    dbSchema: {
      properties: [
        selectProp("status", "상태", [
          { id: "todo", name: "할 일", color: "gray" },
          { id: "doing", name: "진행 중", color: "yellow" },
          { id: "blocked", name: "막힘", color: "red" },
          { id: "done", name: "완료", color: "green" },
        ]),
        selectProp("priority", "우선순위", [
          { id: "high", name: "높음", color: "red" },
          { id: "mid", name: "보통", color: "yellow" },
          { id: "low", name: "낮음", color: "gray" },
        ]),
        { id: "due", name: "마감일", type: "date", options: [] },
      ],
      views: tableAndBoard("status"),
    },
  },
  {
    key: "reading-list",
    label: "독서 목록",
    description: "읽을 책과 진행 상태를 한눈에",
    icon: "📚",
    title: "독서 목록",
    content: [
      para("읽고 싶은 책을 행으로 추가하세요. 행을 열면 독후감을 쓸 수 있어요."),
    ],
    dbSchema: {
      properties: [
        selectProp("status", "상태", [
          { id: "want", name: "읽고 싶음", color: "gray" },
          { id: "reading", name: "읽는 중", color: "yellow" },
          { id: "done", name: "다 읽음", color: "green" },
        ]),
        { id: "author", name: "지은이", type: "text", options: [] },
        { id: "rating", name: "별점", type: "number", options: [] },
      ],
      views: tableAndBoard("status"),
    },
  },
];
