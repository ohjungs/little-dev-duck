import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  calendarEventEmbedText,
  kstDateString,
  parseRecurrence,
  serializeRecurrence,
  selectEventsForDuck,
  selectTodosForDuck,
  summarizeHabitsForDuck,
  todoEmbedText,
  DUCK_HABIT_RANGE_DAYS,
  findResumablePomodoro,
} from "@ldd/core";
import type { EmbeddingSource, ToolCall, ToolDeclaration, ToolResult } from "@ldd/core";
import type { Adapter } from "./agent";
import { createTodo, deleteTodo, listTodos, updateTodo } from "./todos";
import { listEventsForDuck, listTodosForDuck } from "./duckQueries";
import { createMemo, deleteMemo, listMemos, updateMemo } from "./memos";
import { createPage } from "./pages";
import { createCalendarEvent } from "./calendar";
import { checkHabit, listHabits, listHabitChecksInRange } from "./habits";
import { indexSource } from "./embeddings";
import { completePomodoro, listPomodoroSessions, startPomodoro } from "./pomodoro";

// LLM이 준 날짜/시각 문자열을 offset 포함 ISO(내부 캘린더 스키마 요구)로 보정한다. 순수함수 — 테스트 대상.
// 지원: 완전 ISO(offset/Z 포함) 그대로, 'YYYY-MM-DD'→KST 자정, offset 없는 'YYYY-MM-DDTHH:mm(:ss)'→KST.
export function coerceEventStart(raw: string): string | null {
  const s = raw.trim();
  if (/[+-]\d{2}:?\d{2}$|Z$/.test(s)) {
    return Number.isNaN(new Date(s).getTime()) ? null : s;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return `${s}T00:00:00+09:00`;
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(s)) {
    const withSec = s.length === 16 ? `${s}:00` : s;
    return `${withSec}+09:00`;
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

// 제목으로 할 일 1건을 찾는다: 정확 일치(대소문자 무시) 우선, 없으면 부분일치. 다중 일치는 "ambiguous",
// 없으면 null. 순수함수라 테스트 대상 — completeTodo가 어느 항목을 완료할지 결정론적으로 고른다.
export function findTodoByTitle<T extends { title: string }>(
  todos: T[],
  query: string,
): T | "ambiguous" | null {
  const q = query.trim().toLowerCase();
  if (q.length === 0) return null;
  const exact = todos.filter((t) => t.title.toLowerCase() === q);
  if (exact.length === 1) return exact[0]!;
  if (exact.length > 1) return "ambiguous";
  const partial = todos.filter((t) => t.title.toLowerCase().includes(q));
  if (partial.length === 1) return partial[0]!;
  if (partial.length > 1) return "ambiguous";
  return null;
}

// 앱 내부 액션 어댑터 — 외부 토큰 없이 오리가 사용자의 워크스페이스에 직접 쓰는 도구들.
// "오리야 할일 추가해줘", "메모 남겨줘"처럼 대화로 앱 기능을 제어하기 위함. 모두 mutating이라 승인 게이트를
// 거친다(파괴적 자동 실행 금지). 조회는 RAG(Phase 8)가 이미 담당하므로 여기선 생성 액션만 둔다.

const createTodoDecl: ToolDeclaration = {
  name: "createTodo",
  description: "사용자의 할 일 목록에 새 할 일을 추가한다. 사용자가 '할 일 추가', '~하기 추가해줘' 등으로 요청할 때 사용.",
  parameters: {
    type: "object",
    properties: {
      title: { type: "string", description: "할 일 내용(간결하게)" },
      // 시각까지 받지 않는다. 모델이 타임스탬프를 만들면 시각·타임존을 지어내고, 그건
      // 실제로 터졌던 버그다(요청한 '내일'이 11일 뒤 일정으로 생성됨).
      dueDate: {
        type: "string",
        description:
          "마감 날짜(YYYY-MM-DD). 사용자가 날짜를 말했을 때만 채운다. 시각은 넣지 않는다.",
      },
      recurrence: {
        type: "string",
        description:
          "반복 주기. 매일=FREQ=DAILY, N일마다=FREQ=DAILY;INTERVAL=N, 매주 특정 요일=FREQ=WEEKLY;BYDAY=MO(SU,MO,TU,WE,TH,FR,SA 중), 매월 특정일=FREQ=MONTHLY;BYMONTHDAY=15. 이 형식 외에는 쓰지 않는다.",
      },
    },
    required: ["title"],
  },
  kind: "mutating",
};

const createMemoDecl: ToolDeclaration = {
  name: "createMemo",
  description: "사용자의 메모(스티커 노트)를 새로 만든다. 사용자가 '메모해줘', '적어둬' 등으로 요청할 때 사용.",
  parameters: {
    type: "object",
    properties: {
      content: { type: "string", description: "메모 본문" },
    },
    required: ["content"],
  },
  kind: "mutating",
};

const createPageDecl: ToolDeclaration = {
  name: "createPage",
  description: "워크스페이스에 새 페이지(문서)를 만든다. 사용자가 '페이지 만들어줘', '문서 작성해줘' 등으로 요청할 때 사용.",
  parameters: {
    type: "object",
    properties: {
      title: { type: "string", description: "페이지 제목" },
      body: { type: "string", description: "페이지 본문(선택 — 없으면 빈 페이지)" },
    },
    required: ["title"],
  },
  kind: "mutating",
};

const completeTodoDecl: ToolDeclaration = {
  name: "completeTodo",
  description: "이미 있는 할 일을 완료 처리한다. 사용자가 '~ 완료했어', '~ 끝냈어'라고 할 때 그 할 일을 제목으로 찾아 완료. 새 할 일 추가가 아님.",
  parameters: {
    type: "object",
    properties: {
      title: { type: "string", description: "완료할 할 일의 제목(또는 일부)" },
    },
    required: ["title"],
  },
  kind: "mutating",
};

const addEventDecl: ToolDeclaration = {
  name: "addCalendarEvent",
  description:
    "앱 내 캘린더에 일정을 추가한다(Google 캘린더 연동과 별개인 앱 자체 캘린더). 시각은 offset 포함 " +
    "ISO 8601(예: 2026-07-26T10:00:00+09:00)이 가장 정확하며, 날짜만(YYYY-MM-DD) 줘도 된다.",
  parameters: {
    type: "object",
    properties: {
      title: { type: "string", description: "일정 제목" },
      startAt: { type: "string", description: "시작 시각/날짜(ISO 8601 또는 YYYY-MM-DD)" },
    },
    required: ["title", "startAt"],
  },
  kind: "mutating",
};

const listTodosDecl: ToolDeclaration = {
  name: "listTodos",
  description:
    "사용자의 할 일 목록을 조회한다. '이번 주 마감 뭐 있어?', '남은 할 일 뭐야?', '오늘 뭐 해야 해?'처럼 " +
    "할 일을 묻는 질문에 쓴다. 추측하지 말고 반드시 이 도구로 확인한 뒤 답한다. " +
    "dueWithinDays를 주면 기한이 지난 것도 함께 준다(가장 급한 항목이므로).",
  parameters: {
    type: "object",
    properties: {
      status: {
        type: "string",
        enum: ["all", "done", "notDone"],
        description: "완료 상태 필터. 기본은 전체",
      },
      dueWithinDays: {
        type: "number",
        description: "오늘부터 며칠 이내 마감만 볼지(이번 주=7). 생략하면 마감 무관 전체",
      },
    },
    required: [],
  },
  kind: "readonly",
};

const listEventsDecl: ToolDeclaration = {
  name: "listCalendarEvents",
  description:
    "앱 자체 캘린더의 일정을 조회한다(Google 캘린더 연동과 별개). '내일 일정 뭐 있어?', " +
    "'이번 주 일정 알려줘'처럼 일정을 묻는 질문에 쓴다. 추측하지 말고 반드시 이 도구로 확인한 뒤 답한다. " +
    "기본은 오늘부터 앞으로의 일정이며, 지난 일정을 물으면 includePast를 켠다.",
  parameters: {
    type: "object",
    properties: {
      withinDays: {
        type: "number",
        description: "오늘부터 며칠 이내까지 볼지(이번 주=7). 생략하면 앞으로 전부",
      },
      includePast: {
        type: "boolean",
        description: "지난 일정도 포함할지. 기본은 제외",
      },
    },
    required: [],
  },
  kind: "readonly",
};

const listHabitsDecl: ToolDeclaration = {
  name: "listHabits",
  description:
    "사용자의 습관과 최근 수행 현황을 조회한다. '이번 주 운동 며칠 했어?', '요즘 습관 잘 지키고 있어?', " +
    "'오늘 뭐 체크해야 해?'처럼 습관을 묻는 질문에 쓴다. 횟수를 세는 질문이므로 추측하지 말고 " +
    "반드시 이 도구로 확인한 뒤 답한다. 각 습관의 오늘 체크 여부·연속일수·기간 내 횟수를 돌려준다.",
  parameters: {
    type: "object",
    properties: {
      rangeDays: {
        type: "number",
        description: "며칠치를 셀지(이번 주=7). 생략하면 7일",
      },
    },
    required: [],
  },
  kind: "readonly",
};

const checkHabitDecl: ToolDeclaration = {
  name: "checkHabit",
  description:
    "이미 등록된 습관을 오늘 수행한 것으로 체크한다. 사용자가 '운동 체크해줘', '오늘 독서 했어'처럼 " +
    "말할 때 그 습관을 제목으로 찾아 체크. 새 습관을 만드는 게 아니다.",
  parameters: {
    type: "object",
    properties: {
      title: { type: "string", description: "체크할 습관의 제목(또는 일부)" },
    },
    required: ["title"],
  },
  kind: "mutating",
};

// 2026-07-26 : 오리 - 수정·삭제 도구 (피드백 1-4)
// "기존에 있는 모든 기능을 오리랑 대화하며 자연스럽게 ... 사용가능했으면".
// 지금까지 오리는 **만들고 완료만** 할 수 있었다 — 고치거나 지우지 못했다.
//
// **삭제 도구를 내는 근거**: Phase 19에서 "오삭제 위험"으로 삭제를 의도적으로 뺐다. 그 판단은
// 지금도 유효하지만 조건이 달라졌다 — 이 경로는 **승인 카드가 실행 전에 무엇이 지워지는지
// 보여준다.** 위젯의 hover 아이콘 삭제(Phase 21이 고친 것)와 달리 사용자가 대상을 확인하고
// 누른다. 게다가 할 일·메모는 restoreTodo/restoreMemo로 같은 id 복구가 가능하다.
//
// **습관·페이지 삭제 도구는 만들지 않는다.** 습관은 habit_checks가 cascade라 되살려도 기록이
// 빈 채로 오고(Phase 21에서 확인), 페이지는 이번 요구 범위 밖이다. 되돌릴 수 없는 것에는
// 대화 삭제를 붙이지 않는다.
const editTodoDecl: ToolDeclaration = {
  name: "editTodo",
  description:
    "이미 있는 할 일의 제목이나 마감일을 고친다. 사용자가 '~를 ~로 바꿔줘', '~ 마감 내일로' 등으로 " +
    "요청할 때 사용. 새 할 일 추가가 아니다.",
  parameters: {
    type: "object",
    properties: {
      title: { type: "string", description: "고칠 할 일의 지금 제목(또는 일부)" },
      newTitle: { type: "string", description: "새 제목. 제목을 안 바꾸면 비운다" },
      dueDate: {
        type: "string",
        description: "새 마감 날짜(YYYY-MM-DD). 마감일을 없애려면 빈 문자열을 준다",
      },
    },
    required: ["title"],
  },
  kind: "mutating",
};

const deleteTodoDecl: ToolDeclaration = {
  name: "deleteTodo",
  description:
    "이미 있는 할 일을 지운다. 사용자가 '~ 지워줘', '~ 삭제해'라고 할 때 그 할 일을 제목으로 찾아 삭제. " +
    "완료 처리가 아니다(완료는 completeTodo).",
  parameters: {
    type: "object",
    properties: { title: { type: "string", description: "지울 할 일의 제목(또는 일부)" } },
    required: ["title"],
  },
  kind: "mutating",
};

const editMemoDecl: ToolDeclaration = {
  name: "editMemo",
  description:
    "이미 있는 메모의 내용을 고쳐 쓴다. 사용자가 '~ 메모 이렇게 바꿔줘'라고 할 때 사용. " +
    "새 메모 작성이 아니다. 내용은 **통째로 대체**된다.",
  parameters: {
    type: "object",
    properties: {
      title: { type: "string", description: "고칠 메모의 제목(첫 줄, 또는 일부)" },
      content: { type: "string", description: "새 본문 전체" },
    },
    required: ["title", "content"],
  },
  kind: "mutating",
};

const deleteMemoDecl: ToolDeclaration = {
  name: "deleteMemo",
  description: "이미 있는 메모를 지운다. 제목(첫 줄, 또는 일부)으로 찾아 삭제.",
  parameters: {
    type: "object",
    properties: { title: { type: "string", description: "지울 메모의 제목(또는 일부)" } },
    required: ["title"],
  },
  kind: "mutating",
};

// 2026-07-26 : 오리 - 뽀모도로 (피드백 1-4)
// **타이머 자체는 화면이 돌린다.** 서버 도구가 하는 일은 세션 행을 만들고 끝내는 것뿐이고,
// 카운트다운·집중 모드·완료음은 위젯의 몫이다(도구가 브라우저 타이머를 만들 수는 없다).
// 화면이 바로 알아채도록 승인 실행 뒤 같은 탭 이벤트로 알린다(web lib/appActionSignal).
const startPomodoroDecl: ToolDeclaration = {
  name: "startPomodoro",
  description:
    "집중 타이머(뽀모도로)를 시작한다. 사용자가 '25분 집중 시작해줘', '뽀모도로 시작'처럼 말할 때 사용. " +
    "분을 말하지 않으면 25분으로 한다.",
  parameters: {
    type: "object",
    properties: {
      durationMinutes: { type: "number", description: "집중할 분(1~180). 생략하면 25" },
      tag: { type: "string", description: "무엇에 집중하는지(선택)" },
    },
    required: [],
  },
  kind: "mutating",
};

const stopPomodoroDecl: ToolDeclaration = {
  name: "stopPomodoro",
  description:
    "진행 중인 집중 타이머를 지금 끝낸다. 사용자가 '집중 그만', '타이머 중지'라고 할 때 사용.",
  parameters: { type: "object", properties: {}, required: [] },
  kind: "mutating",
};

// 위젯의 기본값과 같은 25분. 위젯 상수를 가져오면 api가 화면에 의존하므로 값만 맞춘다.
const DEFAULT_POMODORO_MINUTES = 25;

const startPomodoroArgs = z.object({
  // 모델이 문자열로 줄 때가 있어 강제 변환한다. DB CHECK(1~180)와 같은 범위를 여기서도 건다 —
  // 범위를 넘기면 insert가 통째로 거부돼 사용자는 이유 없는 실패를 본다.
  durationMinutes: z.coerce.number().int().min(1).max(180).optional(),
  tag: z.string().max(50).optional(),
});

const editTodoArgs = z.object({
  title: z.string().min(1).max(500),
  newTitle: z.string().min(1).max(200).optional(),
  dueDate: z.string().optional(),
});
const byTitleArgs = z.object({ title: z.string().min(1).max(500) });
const editMemoArgs = z.object({
  title: z.string().min(1).max(500),
  content: z.string().min(1).max(10000),
});

const todoArgs = z.object({
  title: z.string().min(1).max(500),
  dueDate: z.string().optional(),
  recurrence: z.string().optional(),
});

// 'YYYY-MM-DD' → 저장용 ISO. **UTC 자정으로 맞춘다.** 할 일 화면은 오늘 필터를
// `dueDate.slice(0, 10) === todayIso()`(문자열 앞 10자리)로 판정하는데, KST 자정으로
// 저장하면 UTC로는 전날 15:00이라 잘라낸 날짜가 하루 앞선다. 달력에 없는 날짜(2026-02-30)는
// Date 생성자가 조용히 다음 달로 굴려버리므로 되돌려 대조해 걸러낸다.
export function coerceTodoDueDate(raw: string): string | null {
  const s = raw.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const iso = `${s}T00:00:00.000Z`;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  // 여기선 UTC 날짜가 맞다. 방금 UTC로 만든 값(`${s}T00:00:00.000Z`)을 되읽어 입력과 같은지
  // 대조하는 **왕복 검사**라, 로컬로 바꾸면 검사 자체가 성립하지 않는다(달력에 없는 날짜를
  // 걸러내는 게 목적이다).
  // eslint-disable-next-line no-restricted-syntax -- 위 사유(UTC 왕복 검사)
  return d.toISOString().slice(0, 10) === s ? iso : null;
}
const habitArgs = z.object({ title: z.string().min(1).max(100) });
const listHabitsArgs = z.object({
  rangeDays: z.number().int().min(1).max(365).optional(),
});

const listEventsArgs = z.object({
  withinDays: z.number().int().min(0).max(3650).optional(),
  includePast: z.boolean().optional(),
});

const listTodosArgs = z.object({
  status: z.enum(["all", "done", "notDone"]).optional(),
  dueWithinDays: z.number().int().min(-3650).max(3650).optional(),
});

const completeArgs = z.object({ title: z.string().min(1).max(500) });
const memoArgs = z.object({ content: z.string().min(1).max(2000) });
const eventArgs = z.object({ title: z.string().min(1).max(300), startAt: z.string().min(1) });
const pageArgs = z.object({
  title: z.string().min(1).max(200),
  body: z.string().max(5000).optional(),
});

// 본문 텍스트를 BlockNote 단락 블록으로 감싼다(서버가 plain_text 파생 → 검색·RAG 자동 편입).
function bodyToContent(body: string | undefined): unknown {
  if (!body) return [];
  return [{ type: "paragraph", content: [{ type: "text", text: body, styles: {} }] }];
}

// Postgres 유일 제약 위반(23505). supabase-js는 코드를 메시지에 담아 Error로 던지므로 문자열로 본다.
export function isDuplicateCheck(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  return msg.includes("23505") || msg.includes("duplicate key");
}

function errorResult(call: ToolCall, message: string): ToolResult {
  return { id: call.id, name: call.name, response: { error: message } };
}

// apiKey를 주면 생성/변경한 항목을 그 자리에서 RAG 임베딩에 반영한다(오리가 방금 만든 걸 바로 알도록 —
// 제품 정의: "오리는 RAG 기반으로 사용자 데이터를 알고 답한다"). best-effort(fire-and-forget) — 실패해도
// 액션 자체는 성공 처리하고, apiKey가 없으면 조용히 건너뛴다(자동 백필이 다음 로드에 커버).
export function createAppActionsAdapter(
  supabase: SupabaseClient,
  apiKey?: string,
): Adapter {
  // 응답 반환 전에 await한다 — Vercel 서버리스는 응답 후 fire-and-forget async를 끊을 수 있어
  // void 백그라운드로 두면 인덱싱이 실행 안 될 수 있다. 대신 타임아웃 가드(4초)로 요청이 매달리지
  // 않게 하고, 실패/타임아웃 시 조용히 넘긴다(항목은 이미 저장, 자동 백필이 다음 로드에 커버).
  const REINDEX_TIMEOUT_MS = 4000;
  const reindex = async (
    sourceType: EmbeddingSource,
    sourceId: string,
    text: string,
  ): Promise<void> => {
    if (!apiKey) return;
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      await Promise.race([
        indexSource(supabase, apiKey, { userId: user.id, sourceType, sourceId, text }),
        new Promise<void>((resolve) => setTimeout(resolve, REINDEX_TIMEOUT_MS)),
      ]);
    } catch {
      // 임베딩 실패는 무시 — 항목은 이미 저장됐고 다음 백필에서 인덱싱된다.
    }
  };

  return {
    catalog: [
      createTodoDecl,
      completeTodoDecl,
      startPomodoroDecl,
      stopPomodoroDecl,
      editTodoDecl,
      deleteTodoDecl,
      createMemoDecl,
      editMemoDecl,
      deleteMemoDecl,
      createPageDecl,
      addEventDecl,
      checkHabitDecl,
      listTodosDecl,
      listEventsDecl,
      listHabitsDecl,
    ],
    async execute(call: ToolCall): Promise<ToolResult> {
      if (call.name === listHabitsDecl.name) {
        const parsed = listHabitsArgs.safeParse(call.args);
        if (!parsed.success) return errorResult(call, "조회 조건이 올바르지 않습니다.");
        const today = kstDateString(new Date());
        const rangeDays = parsed.data.rangeDays ?? DUCK_HABIT_RANGE_DAYS;
        // 체크는 기간보다 넉넉히 가져온다 — 연속일수는 기간 밖 이력까지 봐야 정확하다.
        // today는 KST 날짜 문자열이고, 여기서는 그 문자열에 날짜만 빼는 순수 계산이다.
        // UTC로 파싱해 UTC로 빼고 날짜 부분만 쓰므로 시간대가 개입할 여지가 없다
        // (로컬 변환을 한 번도 거치지 않는다). 그래서 UTC 절단이 맞는 자리다.
        const from = new Date(`${today}T00:00:00Z`);
        from.setUTCDate(from.getUTCDate() - Math.max(rangeDays, 90));
        const [habits, checks] = await Promise.all([
          listHabits(supabase),
          // eslint-disable-next-line no-restricted-syntax -- 위 주석 참조: 날짜 문자열 순수 계산
          listHabitChecksInRange(supabase, from.toISOString().slice(0, 10), today),
        ]);
        return {
          id: call.id,
          name: call.name,
          response: { habits: summarizeHabitsForDuck(habits, checks, today, rangeDays) },
        };
      }

      if (call.name === listEventsDecl.name) {
        const parsed = listEventsArgs.safeParse(call.args);
        if (!parsed.success) return errorResult(call, "조회 조건이 올바르지 않습니다.");
        const today = kstDateString(new Date());
        // 같은 이유로 DB에서 거른다. listCalendarEvents는 start_at 오름차순 500이라
        // 과거 일정이 창을 채우면 다가올 일정이 아예 안 들어온다.
        const selected = selectEventsForDuck(
          await listEventsForDuck(supabase, parsed.data, today),
          parsed.data,
          today,
        );
        return {
          id: call.id,
          name: call.name,
          // 오리에게 되돌아가는 값이라 필요한 필드만(컨텍스트·쿼터 절약).
          response: {
            events: selected.map((e) => ({
              title: e.title,
              startAt: e.startAt,
              endAt: e.endAt ?? null,
            })),
          },
        };
      }

      if (call.name === listTodosDecl.name) {
        const parsed = listTodosArgs.safeParse(call.args);
        if (!parsed.success) return errorResult(call, "조회 조건이 올바르지 않습니다.");
        // 서버는 UTC로 돌아 new Date()로 "오늘"을 만들면 KST 새벽에 어제가 된다.
        const today = kstDateString(new Date());
        // 조건을 DB로 내려 받는다. listTodos는 최신 500개 창이라 오래된 항목이 빠진다
        // (duckQueries.ts 참조). core 선별기는 정렬·상한만 맡는다.
        const selected = selectTodosForDuck(
          await listTodosForDuck(supabase, parsed.data, today),
          parsed.data,
          today,
        );
        return {
          id: call.id,
          name: call.name,
          // 오리에게 되돌아가는 값이라 필요한 필드만 담는다(컨텍스트·쿼터 절약).
          response: {
            todos: selected.map((t) => ({
              title: t.title,
              isDone: t.isDone,
              dueDate: t.dueDate?.slice(0, 10) ?? null,
            })),
          },
        };
      }

      if (call.name === createTodoDecl.name) {
        const parsed = todoArgs.safeParse(call.args);
        if (!parsed.success) return errorResult(call, "할 일 정보가 올바르지 않습니다.");

        // 형식이 어긋나면 조용히 버리지 않고 오류로 돌려준다 — 버리면 사용자는 마감일·반복이
        // 걸린 줄 알고 넘어간다.
        let dueDate: string | null = null;
        if (parsed.data.dueDate !== undefined) {
          dueDate = coerceTodoDueDate(parsed.data.dueDate);
          if (!dueDate) {
            return errorResult(call, "마감일은 YYYY-MM-DD 형식의 실제 날짜여야 합니다.");
          }
        }

        let recurrence: string | null = null;
        if (parsed.data.recurrence !== undefined) {
          // 모델이 FREQ=BIWEEKLY 같은 없는 규칙을 지어낼 수 있다. 파서를 통과한 것만 저장한다.
          const rule = parseRecurrence(parsed.data.recurrence);
          if (!rule) return errorResult(call, "반복 주기를 이해하지 못했습니다.");
          // 파서가 정규화한 형태로 되돌려 저장한다(요일 순서·대소문자 편차 제거).
          recurrence = serializeRecurrence(rule);
        }

        const todo = await createTodo(supabase, {
          title: parsed.data.title,
          dueDate,
          recurrence,
        });
        await reindex("todo", todo.id, todoEmbedText(todo.title, todo.isDone, todo.dueDate));
        return {
          id: call.id,
          name: call.name,
          response: { created: { id: todo.id, title: todo.title } },
        };
      }

      if (call.name === completeTodoDecl.name) {
        const parsed = completeArgs.safeParse(call.args);
        if (!parsed.success) return errorResult(call, "할 일 정보가 올바르지 않습니다.");
        const open = (await listTodos(supabase)).filter((t) => !t.isDone);
        const found = findTodoByTitle(open, parsed.data.title);
        if (found === "ambiguous") {
          return errorResult(call, "완료할 할 일이 여러 개 일치해요. 더 정확한 제목으로 알려주세요.");
        }
        if (!found) return errorResult(call, "완료할 할 일을 찾지 못했어요.");
        const updated = await updateTodo(supabase, found.id, { isDone: true });
        await reindex("todo", updated.id, todoEmbedText(updated.title, updated.isDone, updated.dueDate));
        return {
          id: call.id,
          name: call.name,
          response: { completed: { id: updated.id, title: updated.title } },
        };
      }

      if (call.name === startPomodoroDecl.name) {
        const parsed = startPomodoroArgs.safeParse(call.args);
        if (!parsed.success) {
          return errorResult(call, "집중 시간은 1~180분 사이 숫자로 알려주세요.");
        }
        // 이미 돌고 있는데 또 시작하면 두 세션이 동시에 열려 어느 쪽이 끝날지 알 수 없다.
        const running = findResumablePomodoro(await listPomodoroSessions(supabase), Date.now());
        if (running) {
          return errorResult(call, "이미 집중 타이머가 돌고 있어요. 먼저 끝내고 시작할까요?");
        }
        const session = await startPomodoro(supabase, {
          durationMinutes: parsed.data.durationMinutes ?? DEFAULT_POMODORO_MINUTES,
          tag: parsed.data.tag ?? null,
        });
        return {
          id: call.id,
          name: call.name,
          response: {
            started: { id: session.id, durationMinutes: session.durationMinutes },
          },
        };
      }

      if (call.name === stopPomodoroDecl.name) {
        const running = findResumablePomodoro(await listPomodoroSessions(supabase), Date.now());
        // 돌고 있지 않은데 "끝냈다"고 하면 사용자는 뭔가 된 줄 안다.
        if (!running) return errorResult(call, "지금 돌고 있는 집중 타이머가 없어요.");
        // completePomodoro는 completed_at이 null일 때만 갱신하므로 중복 호출이 안전하다(XP 이중지급 없음).
        const done = await completePomodoro(supabase, running.id);
        return {
          id: call.id,
          name: call.name,
          response: { stopped: { id: done.id, durationMinutes: done.durationMinutes } },
        };
      }

      if (call.name === editTodoDecl.name) {
        const parsed = editTodoArgs.safeParse(call.args);
        if (!parsed.success) return errorResult(call, "할 일 정보가 올바르지 않습니다.");
        const { newTitle, dueDate } = parsed.data;
        // 바꿀 게 없는데 실행하면 사용자는 뭔가 된 줄 안다. 조용히 성공시키지 않는다.
        if (newTitle === undefined && dueDate === undefined) {
          return errorResult(call, "무엇을 바꿀지 알려주세요(제목 또는 마감일).");
        }
        const found = findTodoByTitle(await listTodos(supabase), parsed.data.title);
        if (found === "ambiguous") {
          return errorResult(call, "고칠 할 일이 여러 개 일치해요. 더 정확한 제목으로 알려주세요.");
        }
        if (!found) return errorResult(call, "고칠 할 일을 찾지 못했어요.");
        // 빈 문자열 = 마감일 제거. 값이 있으면 형식을 검사하고, 어긋나면 **조용히 버리지 않는다**
        // (버리면 사용자는 마감일이 걸린 줄 안다 — Phase 23에서 정한 규칙).
        let due: string | null | undefined;
        if (dueDate !== undefined) {
          if (dueDate.trim() === "") due = null;
          else {
            const coerced = coerceTodoDueDate(dueDate);
            if (!coerced) return errorResult(call, "마감 날짜 형식이 올바르지 않아요(YYYY-MM-DD).");
            due = coerced;
          }
        }
        const updated = await updateTodo(supabase, found.id, {
          ...(newTitle !== undefined ? { title: newTitle } : {}),
          ...(due !== undefined ? { dueDate: due } : {}),
        });
        await reindex("todo", updated.id, todoEmbedText(updated.title, updated.isDone, updated.dueDate));
        return {
          id: call.id,
          name: call.name,
          response: { updated: { id: updated.id, title: updated.title } },
        };
      }

      if (call.name === deleteTodoDecl.name) {
        const parsed = byTitleArgs.safeParse(call.args);
        if (!parsed.success) return errorResult(call, "할 일 정보가 올바르지 않습니다.");
        const found = findTodoByTitle(await listTodos(supabase), parsed.data.title);
        if (found === "ambiguous") {
          // 지우는 일에서 "아마 이거겠지"는 위험하다. 애매하면 아무것도 하지 않는다.
          return errorResult(call, "지울 할 일이 여러 개 일치해요. 더 정확한 제목으로 알려주세요.");
        }
        if (!found) return errorResult(call, "지울 할 일을 찾지 못했어요.");
        await deleteTodo(supabase, found.id);
        // 지운 항목은 검색·RAG에서도 빠져야 한다. 빈 텍스트로 색인을 비운다(위젯 삭제와 같은 방식).
        await reindex("todo", found.id, "");
        return {
          id: call.id,
          name: call.name,
          response: { deleted: { id: found.id, title: found.title } },
        };
      }

      if (call.name === editMemoDecl.name) {
        const parsed = editMemoArgs.safeParse(call.args);
        if (!parsed.success) return errorResult(call, "메모 정보가 올바르지 않습니다.");
        const found = findTodoByTitle(await listMemos(supabase), parsed.data.title);
        if (found === "ambiguous") {
          return errorResult(call, "고칠 메모가 여러 개 일치해요. 더 정확한 제목으로 알려주세요.");
        }
        if (!found) return errorResult(call, "고칠 메모를 찾지 못했어요.");
        const updated = await updateMemo(supabase, found.id, { content: parsed.data.content });
        await reindex("memo", updated.id, parsed.data.content);
        return {
          id: call.id,
          name: call.name,
          response: { updated: { id: updated.id, title: updated.title } },
        };
      }

      if (call.name === deleteMemoDecl.name) {
        const parsed = byTitleArgs.safeParse(call.args);
        if (!parsed.success) return errorResult(call, "메모 정보가 올바르지 않습니다.");
        const found = findTodoByTitle(await listMemos(supabase), parsed.data.title);
        if (found === "ambiguous") {
          return errorResult(call, "지울 메모가 여러 개 일치해요. 더 정확한 제목으로 알려주세요.");
        }
        if (!found) return errorResult(call, "지울 메모를 찾지 못했어요.");
        await deleteMemo(supabase, found.id);
        await reindex("memo", found.id, "");
        return {
          id: call.id,
          name: call.name,
          response: { deleted: { id: found.id, title: found.title } },
        };
      }

      if (call.name === createMemoDecl.name) {
        const parsed = memoArgs.safeParse(call.args);
        if (!parsed.success) return errorResult(call, "메모 내용이 올바르지 않습니다.");
        const memo = await createMemo(supabase, { content: parsed.data.content });
        await reindex("memo", memo.id, parsed.data.content);
        return {
          id: call.id,
          name: call.name,
          response: { created: { id: memo.id, title: memo.title } },
        };
      }

      if (call.name === createPageDecl.name) {
        const parsed = pageArgs.safeParse(call.args);
        if (!parsed.success) return errorResult(call, "페이지 정보가 올바르지 않습니다.");
        const page = await createPage(supabase, {
          title: parsed.data.title,
          content: bodyToContent(parsed.data.body),
        });
        await reindex("page", page.id, parsed.data.body ?? parsed.data.title);
        return {
          id: call.id,
          name: call.name,
          response: { created: { id: page.id, title: page.title } },
        };
      }

      if (call.name === addEventDecl.name) {
        const parsed = eventArgs.safeParse(call.args);
        if (!parsed.success) return errorResult(call, "일정 정보가 올바르지 않습니다.");
        const startAt = coerceEventStart(parsed.data.startAt);
        if (!startAt) return errorResult(call, "일정 시각을 이해하지 못했어요.");
        const event = await createCalendarEvent(supabase, {
          title: parsed.data.title,
          startAt,
          endAt: null,
        });
        await reindex("calendar_event", event.id, calendarEventEmbedText(event.title, event.startAt, event.endAt));
        return {
          id: call.id,
          name: call.name,
          response: { created: { id: event.id, title: event.title, startAt: event.startAt } },
        };
      }

      if (call.name === checkHabitDecl.name) {
        const parsed = habitArgs.safeParse(call.args);
        if (!parsed.success) return errorResult(call, "습관 정보가 올바르지 않습니다.");
        const found = findTodoByTitle(await listHabits(supabase), parsed.data.title);
        if (found === "ambiguous") {
          return errorResult(
            call,
            "체크할 습관이 여러 개 일치해요. 더 정확한 제목으로 알려주세요.",
          );
        }
        if (!found) return errorResult(call, "그런 습관을 찾지 못했어요.");
        // 서버는 UTC라 new Date()로 날짜를 만들면 KST 새벽에 어제로 기록된다.
        const today = kstDateString(new Date());
        try {
          await checkHabit(supabase, found.id, today);
        } catch (e) {
          // (habit_id, checked_date) 유일 제약 — 이미 오늘 체크됨. 에러가 아니라 멱등 성공으로 답한다.
          if (isDuplicateCheck(e)) {
            return {
              id: call.id,
              name: call.name,
              response: { alreadyChecked: { title: found.title, date: today } },
            };
          }
          throw e;
        }
        return {
          id: call.id,
          name: call.name,
          response: { checked: { id: found.id, title: found.title, date: today } },
        };
      }

      return errorResult(call, "지원하지 않는 도구입니다.");
    },
  };
}
