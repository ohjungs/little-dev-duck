import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ToolCall, ToolDeclaration, ToolResult } from "@ldd/core";
import type { Adapter } from "./agent";
import { createTodo } from "./todos";
import { createMemo } from "./memos";

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

const todoArgs = z.object({ title: z.string().min(1).max(500) });
const memoArgs = z.object({ content: z.string().min(1).max(2000) });

function errorResult(call: ToolCall, message: string): ToolResult {
  return { id: call.id, name: call.name, response: { error: message } };
}

export function createAppActionsAdapter(supabase: SupabaseClient): Adapter {
  return {
    catalog: [createTodoDecl, createMemoDecl],
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

      return errorResult(call, "지원하지 않는 도구입니다.");
    },
  };
}
