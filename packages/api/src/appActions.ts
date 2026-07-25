import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { kstDateString, parseRecurrence, serializeRecurrence } from "@ldd/core";
import type { EmbeddingSource, ToolCall, ToolDeclaration, ToolResult } from "@ldd/core";
import type { Adapter } from "./agent";
import { createTodo, listTodos, updateTodo } from "./todos";
import { createMemo } from "./memos";
import { createPage } from "./pages";
import { createCalendarEvent } from "./calendar";
import { checkHabit, listHabits } from "./habits";
import { indexSource } from "./embeddings";

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
      createMemoDecl,
      createPageDecl,
      addEventDecl,
      checkHabitDecl,
    ],
    async execute(call: ToolCall): Promise<ToolResult> {
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
        await reindex("todo", todo.id, `${todo.title} (미완료)`);
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
        await reindex("todo", updated.id, `${updated.title} (완료)`);
        return {
          id: call.id,
          name: call.name,
          response: { completed: { id: updated.id, title: updated.title } },
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
        await reindex("calendar_event", event.id, event.title);
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
