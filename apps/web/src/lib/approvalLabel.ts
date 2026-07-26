// 2026-07-26 : 오리 - 승인카드 - 표시문구
// 승인 카드는 사용자가 정확히 무엇을 승인하는지 판단할 수 있어야 한다(CLAUDE.md 5절 안전 규칙).
// 그래서 도구명뿐 아니라 LLM이 채운 실제 파라미터를 전부 드러낸다. 안전에 직결되는 표시라
// 컴포넌트에서 분리해 테스트로 잠근다.
//
// 여기서 만드는 건 **순수 텍스트**다. 호출부가 그대로 렌더하면 React가 이스케이프하므로,
// 승인 카드 자체가 프롬프트 인젝션의 실행 표면이 되지 않는다.

import { describeRecurrence } from "@ldd/core";

// 도구 이름을 사람이 읽을 라벨로. 카탈로그가 늘면 여기만 추가(어댑터 자체는 core에 라벨을 안 둠 —
// Gemini 계약과 UI 표현을 분리).
export const TOOL_LABELS: Record<string, string> = {
  createCalendarEvent: "캘린더 일정 만들기",
  createGithubIssue: "GitHub 이슈 만들기",
  trashEmail: "이메일 휴지통으로 이동",
  createTodo: "할 일 추가",
  completeTodo: "할 일 완료",
  createMemo: "메모 작성",
  // 2026-07-26 (피드백 1-4): 수정·삭제. 삭제는 되돌리기 UI가 없는 경로라 **이 카드가 마지막
  // 방어선**이다 — 무엇이 지워지는지 제목으로 분명히 보여준다.
  editTodo: "할 일 수정",
  deleteTodo: "할 일 삭제",
  editMemo: "메모 수정",
  deleteMemo: "메모 삭제",
  createPage: "페이지 만들기",
  addCalendarEvent: "앱 캘린더에 일정 추가",
  checkHabit: "습관 체크",
};

export function formatWhen(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const date = new Date(value);
  // 해석 못 하는 값이라고 감추지 않는다 — 이상한 값이 들어왔다는 걸 사용자가 봐야 한다.
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("ko-KR", { dateStyle: "medium", timeStyle: "short" });
}

// 마감일은 UTC 자정으로 저장되므로 시각까지 보여줄 게 없다 — 날짜만 그대로 읽어 준다.
// toLocaleString을 태우면 타임존에 따라 "오전 9시"가 붙거나 날짜가 밀려 보인다.
function formatDueDate(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const head = value.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(head) ? head : value;
}

export function describeCall(call: {
  name: string;
  args: Record<string, unknown>;
}): string {
  const label = TOOL_LABELS[call.name] ?? call.name;
  // title(캘린더/GitHub 이슈)과 subject(Gmail — messageId만으론 사람이 어느 메일인지 알 수 없어
  // listRecentEmails에서 본 제목을 표시용으로만 되돌려 받는다)는 둘 다 "이 승인이 무엇에 대한
  // 것인지" 보여주는 같은 역할이라 하나로 합쳐 표시한다.
  const title =
    (typeof call.args.title === "string" ? call.args.title : null) ??
    (typeof call.args.subject === "string" ? call.args.subject : null) ??
    (typeof call.args.content === "string" ? call.args.content : null);
  const start = formatWhen(call.args.start ?? call.args.startAt);
  const end = formatWhen(call.args.end);
  // GitHub 이슈 도구의 owner/repo — 어느 저장소에 만들지도 승인 판단에 필요한 정보.
  const owner = typeof call.args.owner === "string" ? call.args.owner : null;
  const repo = typeof call.args.repo === "string" ? call.args.repo : null;
  const when = start && end ? `${start} ~ ${end}` : start ? start : null;

  // 수정 도구는 "무엇을"뿐 아니라 "무엇으로" 바꾸는지 보여야 판단할 수 있다.
  // 새 제목이 없으면 마감일만 바꾸는 것이고, 그건 아래 due가 드러낸다.
  const newTitle = typeof call.args.newTitle === "string" ? call.args.newTitle : null;
  // title과 content가 **둘 다** 있으면 title은 대상, content는 새 본문이다(editMemo).
  // 위 title 폴백이 content를 가려버려서, 새 본문이 카드에 아예 안 보이던 것을 고친다 —
  // 사용자는 무엇으로 바뀌는지 모른 채 승인하게 된다. 길면 자른다(카드가 화면을 덮으면 못 읽는다).
  const newBody =
    typeof call.args.title === "string" && typeof call.args.content === "string"
      ? call.args.content.length > 60
        ? `${call.args.content.slice(0, 60)}…`
        : call.args.content
      : null;

  const due = formatDueDate(call.args.dueDate);
  // 반복은 한국어로 풀어 보여준다. FREQ=WEEKLY;BYDAY=TU를 그대로 띄우면 승인 판단에 도움이 안 된다.
  // 풀이가 안 되는 값이면 원문을 보여준다 — 모델이 이상한 규칙을 냈다는 사실 자체가 판단 근거다.
  const rawRecurrence =
    typeof call.args.recurrence === "string" ? call.args.recurrence : null;
  const recurrence = rawRecurrence
    ? (describeRecurrence(rawRecurrence) ?? rawRecurrence)
    : null;

  const parts = [
    owner && repo ? `${owner}/${repo}` : null,
    title ? `"${title}"` : null,
    newTitle ? `→ "${newTitle}"` : null,
    newBody ? `→ "${newBody}"` : null,
    when,
    // 빈 문자열은 "마감일 제거"라는 뜻이라 그렇게 말해준다(빈 값으로 보여주면 뭘 하는지 모른다).
    call.args.dueDate === "" ? "마감 없앰" : due ? `마감 ${due}` : null,
    recurrence ? `반복 ${recurrence}` : null,
  ].filter(Boolean);
  return parts.length > 0 ? `${label}: ${parts.join(", ")}` : label;
}
