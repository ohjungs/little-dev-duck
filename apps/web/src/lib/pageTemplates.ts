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
          aggregations: {},
    },
    {
      id: "board",
      name: "보드",
      type: "board",
      groupByPropId,
      sort: null,
      filters: [],
      hiddenPropIds: [],
          aggregations: {},
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
// 2026-07-29 : 메신저 - 노트 변환 (Phase 59 T1 S-007)
// 평문(메시지 본문)을 paragraph 블록 배열로. 블록 리터럴을 밖에서 다시 만들지 않도록
// 템플릿의 para 한 벌을 그대로 쓴다. 빈 줄도 빈 paragraph로 보존한다(문단 구분 유지).
export function textToBlocks(text: string): TemplateBlock[] {
  return text.split("\n").map((line) => para(line.trim() === "" ? "" : line));
}

function bullet(t: string): TemplateBlock {
  return { type: "bulletListItem", content: text(t) };
}
function check(t: string): TemplateBlock {
  return { type: "checkListItem", props: { checked: false }, content: text(t) };
}
function quote(t: string): TemplateBlock {
  return { type: "quote", content: text(t) };
}

// 2026-07-27 : 템플릿 - 안내 문구 (2차 피드백 2-4, Phase 43 T3)
// **사용자가 "빈페이지말고 실제 노션에서 쓰는 회의록처럼"이라고 한 이유를 코드에서 찾았다.**
// 구조(h1 + h2 섹션)는 있었는데 **모든 칸이 빈 문자열**이었다 — 템플릿을 골라도 제목만 늘어선
// 뼈대가 나온다. 노션 템플릿이 다른 점은 목록이 아니라 **각 칸에 뭘 쓰면 되는지 적혀 있다**는 것이다.
//
// 그래서 빈 칸을 전부 안내 문구로 채운다. 지우고 쓰면 되고, 지우지 않아도 문서가 성립한다.
// **h1은 템플릿마다 하나뿐이어야 한다** — 발표 모드(Phase 34)가 h1을 장 경계로 삼아서,
// 여러 개면 회의록 하나가 여러 장으로 흩어진다. 테스트로 잠갔다.

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
      // 메타 줄. 회의록에서 가장 먼저 찾는 정보이고, 나중에 검색할 때도 이 줄이 걸린다.
      quote("날짜 · 시간 · 장소를 적어 주세요"),
      heading("참석자", 2),
      bullet("이름 (역할)"),
      heading("안건", 2),
      bullet("무엇을 정하려고 모였는지 한 줄로"),
      heading("논의", 2),
      para("오간 이야기를 적습니다. 결론은 아래 결정사항으로 옮겨 주세요."),
      heading("결정사항", 2),
      bullet("정해진 것 — 정하지 못한 것은 여기 쓰지 않습니다"),
      heading("액션 아이템", 2),
      // 담당자·기한이 없는 액션 아이템은 아무도 하지 않는다 — 자리를 미리 만들어 둔다.
      check("할 일 — 담당: 이름 / 기한: 월-일"),
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
      check("오늘 꼭 끝낼 것 하나"),
      check("할 수 있으면 좋은 것"),
      heading("메모", 2),
      para("생각나는 대로 적어 두는 자리. 정리는 나중에."),
    ],
  },
  {
    key: "todo",
    label: "할 일 목록",
    description: "체크리스트만 빠르게",
    icon: "✅",
    title: "할 일",
    content: [
      heading("할 일", 1),
      check("가장 먼저 할 것"),
      check("그다음"),
      check("여유가 되면"),
    ],
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
      bullet("끝낸 것 — 진행 중인 것과 나눠 적으면 다음 주 계획이 쉬워집니다"),
      heading("잘된 점 / 배운 점", 2),
      bullet("다음에도 그대로 할 것"),
      heading("아쉬운 점 / 개선", 2),
      bullet("무엇이 왜 아쉬웠는지 — 사람이 아니라 방식으로 적습니다"),
      heading("다음 주 계획", 2),
      check("가장 중요한 하나"),
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
      para("무엇이 되면 성공인지 한 문장으로. 측정할 수 있으면 더 좋습니다."),
      heading("범위", 2),
      bullet("할 것"),
      // 범위에서 뺀 것을 안 적으면 나중에 "왜 안 했냐"가 된다.
      bullet("하지 않을 것 — 적어 두면 나중에 다투지 않습니다"),
      heading("마일스톤", 2),
      check("첫 번째 확인 지점 — 언제까지"),
      heading("리스크", 2),
      bullet("막힐 수 있는 것 / 막히면 어떻게 할지"),
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
      check("무엇을 건드렸는지 — 파일·기능 단위로"),
      heading("막힌 점 / 해결", 2),
      bullet("증상 → 원인 → 고친 방법. 원인을 적어야 다음에 안 밟습니다"),
      heading("배운 점", 2),
      bullet("다음의 나에게 남기는 한 줄"),
      heading("다음에 할 일", 2),
      check("이어서 할 것 — 지금 맥락이 있을 때 적어 두면 내일 빨리 붙습니다"),
    ],
  },
  // 2026-07-26 : 활성화 - 템플릿 - 일기·포트폴리오·회고록 (피드백 2-3)
  // 사용자가 이름을 직접 댄 네 가지 중 회의록만 있었다. 일일 노트·주간 회고가 비슷하지만
  // 쓰임이 다르다 — 일일 노트는 할 일 중심이고 일기는 기록 중심이다.
  {
    key: "diary",
    label: "일기",
    description: "오늘 있었던 일과 감정을 남기기",
    icon: "📔",
    title: "일기",
    datedTitle: "day",
    content: [
      heading("일기", 1),
      heading("오늘 있었던 일", 2),
      para("있었던 일을 순서대로. 잘 쓰려고 하지 않아도 됩니다."),
      heading("기억에 남는 순간", 2),
      para("장면 하나만 자세히 적어도 나중에 그날이 통째로 떠오릅니다."),
      heading("지금 드는 생각", 2),
      para("감정을 그대로. 정리하지 않아도 괜찮습니다."),
      heading("내일의 나에게", 2),
      para("한 줄이면 충분합니다."),
    ],
  },
  {
    key: "portfolio",
    label: "포트폴리오",
    description: "프로젝트 하나를 소개하는 문서",
    icon: "💼",
    title: "포트폴리오",
    content: [
      heading("프로젝트 이름", 1),
      para("한 줄 소개 — 무엇을 만들었고 누구를 위한 것인지."),
      heading("맡은 역할", 2),
      bullet("내가 한 것 — 팀이 한 것과 구분해서 적습니다"),
      heading("문제와 배경", 2),
      para("왜 이걸 만들었는지. 문제가 선명할수록 결과가 커 보입니다."),
      heading("해결 방법", 2),
      bullet("어떻게 풀었는지 — 고른 이유까지"),
      heading("결과", 2),
      // 숫자를 적을 자리를 미리 만들어 둔다 — 포트폴리오에서 가장 자주 빠지는 부분이다.
      bullet("수치로 말할 수 있는 것 (예: 응답 시간 2.1s → 0.4s)"),
      heading("사용 기술", 2),
      bullet("쓴 것 — 왜 그것을 골랐는지 한 줄씩"),
      heading("배운 점 / 아쉬운 점", 2),
      bullet("다시 한다면 다르게 할 것"),
      heading("링크", 2),
      bullet("저장소 / 데모 / 발표 자료"),
    ],
  },
  {
    key: "retrospective",
    label: "회고록",
    description: "프로젝트가 끝난 뒤 길게 돌아보기",
    icon: "🪞",
    title: "회고록",
    content: [
      heading("회고록", 1),
      heading("무엇을 했나", 2),
      para("기간과 한 일을 사실만. 평가는 아래에서 합니다."),
      heading("잘된 것 (Keep)", 2),
      bullet("계속할 것 — 왜 잘됐는지까지 적습니다"),
      heading("문제가 된 것 (Problem)", 2),
      bullet("무엇이 어려웠는지 — 사람이 아니라 구조로"),
      heading("다음에 바꿀 것 (Try)", 2),
      check("당장 바꿀 수 있는 것 하나"),
      heading("다시 한다면", 2),
      para("처음으로 돌아간다면 어디서부터 다르게 할지."),
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

// 2026-07-27 : 작문 도우미 - 템플릿 이용 (2차 피드백 2-5, Phase 45 T2)
// 요청이 "템플릿 이용"을 명시했는데 작문 도우미에는 그 입구가 없었다.
// **템플릿 정의를 새로 만들지 않는다** — 위 `PAGE_TEMPLATES`를 그대로 글로 옮긴다.
// 새 페이지를 만들 때와 **같은 구조**가 나와야 사용자가 두 곳에서 다른 걸 보지 않는다.
export function templateToText(template: PageTemplate): string {
  const lines: string[] = [];
  for (const block of template.content) {
    const text = (block.content ?? []).map((i) => i.text).join("");
    if (block.type === "heading") {
      const level = Number(block.props?.level ?? 2);
      lines.push(`${"#".repeat(Math.min(Math.max(level, 1), 3))} ${text}`);
    } else if (block.type === "bulletListItem") {
      lines.push(`- ${text}`);
    } else if (block.type === "checkListItem") {
      lines.push(`- [ ] ${text}`);
    } else if (block.type === "quote") {
      lines.push(`> ${text}`);
    } else {
      lines.push(text);
    }
  }
  return lines.join("\n");
}
