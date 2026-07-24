import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ToolCall, ToolDeclaration, ToolResult } from "@ldd/core";
import type { Adapter } from "./agent";
import { createTodo, listTodos, updateTodo } from "./todos";
import { createMemo } from "./memos";
import { createPage } from "./pages";
import { createCalendarEvent } from "./calendar";

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

const todoArgs = z.object({ title: z.string().min(1).max(500) });
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

function errorResult(call: ToolCall, message: string): ToolResult {
  return { id: call.id, name: call.name, response: { error: message } };
}

export function createAppActionsAdapter(supabase: SupabaseClient): Adapter {
  return {
    catalog: [createTodoDecl, completeTodoDecl, createMemoDecl, createPageDecl, addEventDecl],
    async execute(call: ToolCall): Promise<ToolResult> {
      if (call.name === createTodoDecl.name) {
        const parsed = todoArgs.safeParse(call.args);
        if (!parsed.success) return errorResult(call, "할 일 정보가 올바르지 않습니다.");
        const todo = await createTodo(supabase, { title: parsed.data.title });
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
        return {
          id: call.id,
          name: call.name,
          response: { created: { id: event.id, title: event.title, startAt: event.startAt } },
        };
      }

      return errorResult(call, "지원하지 않는 도구입니다.");
    },
  };
}
