// 2026-07-29 : 메신저 - 슬래시 커맨드 (Phase 52 T2)
//
// **판정은 결정적으로 — 코드가 한다**(계획·HD-003). 커맨드 파싱을 LLM에 맡기면
// 쿼터를 태우고 결과가 불안정하다. 파싱은 여기(정규식), 실행은 화면이 기존 생성
// 함수(createTodo·createCalendarEvent)를 부른다 — CommandPalette와 같은 api 함수를
// 공유하므로 동작이 두 입구에서 갈라지지 않는다.
//
// 날짜는 **명시 표기(YYYY-MM-DD)만** 받는다. "내일" 같은 자연어 해석은 LLM(오리)의
// 영역이고, 여기서 어림짐작하면 틀린 날짜가 조용히 저장된다.

export type SlashCommand =
  | { kind: "todo"; title: string }
  | { kind: "event"; date: string; time: string | null; title: string };

export type SlashParse =
  | { ok: true; cmd: SlashCommand }
  | { ok: false; error: string };

/** 자동완성 팝업에 보여 줄 목록. 커맨드가 있는지 모르면 아무도 안 쓴다(계획 F-021). */
export const SLASH_COMMANDS = [
  { name: "할일", usage: "/할일 제목", desc: "이 방에서 바로 할 일 만들기" },
  { name: "일정", usage: "/일정 2026-07-30 14:00 제목", desc: "날짜(시각은 선택)를 적어 일정 만들기" },
] as const;

const USAGE_HINT = SLASH_COMMANDS.map((c) => c.usage).join(" · ");

/** 달력에 실제로 있는 날짜인가. 2026-02-30을 통과시키면 틀린 일정이 조용히 저장된다. */
function isRealDate(date: string): boolean {
  const [y, m, d] = date.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d;
}

/**
 * 입력이 커맨드인지 판정한다. 커맨드가 아니면 null(평범한 메시지로 보낸다).
 * 커맨드인데 틀렸으면 오류 — **보내지 않고 알려 준다.** "/할일"이 그냥 전송되면
 * 사용자는 커맨드가 동작한 줄 알거나, 동작하지 않는 이유를 모른다.
 */
export function parseSlashCommand(raw: string): SlashParse | null {
  const input = raw.trim();
  if (!input.startsWith("/")) return null;

  const [head, ...restParts] = input.split(/\s+/);
  const name = head!.slice(1);
  const rest = restParts.join(" ");

  if (name === "할일") {
    if (rest === "") return { ok: false, error: "할 일 제목을 적어 주세요. 예: /할일 우유 사기" };
    return { ok: true, cmd: { kind: "todo", title: rest } };
  }

  if (name === "일정") {
    const m = rest.match(/^(\d{4}-\d{2}-\d{2})(?:\s+(\d{2}:\d{2}))?\s*(.*)$/);
    if (!m || !m[1]) {
      return { ok: false, error: "날짜를 YYYY-MM-DD로 적어 주세요. 예: /일정 2026-07-30 14:00 치과" };
    }
    const [, date, time, title] = m;
    if (!isRealDate(date)) return { ok: false, error: `달력에 없는 날짜예요: ${date}` };
    if (time) {
      const [hh, mm] = time.split(":").map(Number);
      if (hh > 23 || mm > 59) return { ok: false, error: `시각이 이상해요: ${time}` };
    }
    const t = (title ?? "").trim();
    if (t === "") return { ok: false, error: "일정 제목을 적어 주세요. 예: /일정 2026-07-30 치과" };
    return { ok: true, cmd: { kind: "event", date, time: time ?? null, title: t } };
  }

  return { ok: false, error: `모르는 커맨드예요. 쓸 수 있는 것: ${USAGE_HINT}` };
}

/**
 * 자동완성 후보. **슬래시 뒤 공백이 나오기 전까지만** 보여 준다 —
 * 인자를 입력하는 중에 팝업이 계속 떠 있으면 본문을 가린다.
 */
export function matchSlashCommands(draft: string): typeof SLASH_COMMANDS[number][] {
  const m = draft.match(/^\/(\S*)$/);
  if (!m) return [];
  return SLASH_COMMANDS.filter((c) => c.name.startsWith(m[1]!));
}

/** 실행 영수증(system 메시지) 문구. 무엇이 만들어졌는지 방에 흔적을 남긴다. */
export function slashReceiptText(cmd: SlashCommand): string {
  if (cmd.kind === "todo") return `"${cmd.title}" 할 일을 만들었어요`;
  const when = cmd.time ? `${cmd.date} ${cmd.time}` : cmd.date;
  return `"${cmd.title}" 일정을 만들었어요 (${when})`;
}
