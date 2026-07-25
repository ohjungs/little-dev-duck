import type { SupabaseClient } from "@supabase/supabase-js";
import { rolloverDueDate, todoSchema, type Todo } from "@ldd/core";

type TodoRow = {
  id: string;
  user_id: string;
  title: string;
  is_done: boolean;
  due_date: string | null;
  recurrence?: string | null;
  created_at: string;
  updated_at: string;
};

function fromRow(row: TodoRow): Todo {
  return todoSchema.parse({
    id: row.id,
    userId: row.user_id,
    title: row.title,
    isDone: row.is_done,
    dueDate: row.due_date,
    // 마이그레이션 적용 전 응답에는 이 컬럼이 아예 없다. 스키마 기본값(null)에 맡긴다.
    recurrence: row.recurrence ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

export async function listTodos(supabase: SupabaseClient): Promise<Todo[]> {
  const { data, error } = await supabase
    .from("todos")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) throw new Error(error.message);
  return (data as TodoRow[]).map(fromRow);
}

export type CreateTodoInput = {
  title: string;
  dueDate?: string | null;
  recurrence?: string | null;
};

export async function createTodo(
  supabase: SupabaseClient,
  input: CreateTodoInput,
): Promise<Todo> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("로그인이 필요합니다.");

  const { data, error } = await supabase
    .from("todos")
    .insert({
      user_id: user.id,
      title: input.title,
      due_date: input.dueDate ?? null,
      // 값이 있을 때만 넣는다. 마이그레이션 적용 전 DB에는 recurrence 컬럼이 없고, insert
      // payload에 없는 컬럼을 담으면 PostgREST가 요청 전체를 거부한다 — 반복을 쓰지 않는
      // 평범한 할 일 추가까지 통째로 실패한다. 키를 빼면 이전과 완전히 같은 payload가 된다.
      ...(input.recurrence ? { recurrence: input.recurrence } : {}),
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return fromRow(data as TodoRow);
}

export type UpdateTodoInput = Partial<{
  title: string;
  isDone: boolean;
  dueDate: string | null;
  recurrence: string | null;
}>;

// 반복 할 일을 완료했을 때 옮겨 갈 마감일. 반복이 아니거나 조회에 실패하면 null이고,
// 그때는 호출부가 평소대로 완료 처리한다(반복만 조용히 꺼질 뿐 완료 자체는 막지 않는다).
async function nextRecurringDue(
  supabase: SupabaseClient,
  id: string,
): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from("todos")
      .select("recurrence, due_date")
      .eq("id", id)
      .single();

    if (error || !data) return null;
    const row = data as Pick<TodoRow, "recurrence" | "due_date">;
    return rolloverDueDate(row.recurrence ?? null, row.due_date ?? null, new Date());
  } catch {
    // 반복 확인은 부가 기능이다. 조회가 실패했다고 완료 자체를 막으면 이 기능을 붙이기 전보다
    // 완료가 덜 안정적이 된다. 조용히 포기하고 평소대로 완료 처리하게 둔다(뒤이은 update가
    // 진짜 실패라면 그 에러가 그대로 올라간다).
    return null;
  }
}

export async function updateTodo(
  supabase: SupabaseClient,
  id: string,
  patch: UpdateTodoInput,
): Promise<Todo> {
  // 반복 할 일은 완료해도 닫지 않고 다음 회차로 민다. 여기서 처리하면 위젯·일괄완료·오리
  // 에이전트 등 완료 경로 전부가 같은 규칙을 따른다(경로마다 따로 붙이면 하나씩 빠진다).
  // 완료가 아닌 갱신(제목 수정·완료 해제)은 조회를 타지 않아 쿼리 수가 그대로다.
  let effective = patch;
  if (patch.isDone === true) {
    const rolled = await nextRecurringDue(supabase, id);
    if (rolled !== null) {
      effective = { ...patch, isDone: false, dueDate: rolled };
    }
  }

  const { data, error } = await supabase
    .from("todos")
    .update({
      ...(effective.title !== undefined ? { title: effective.title } : {}),
      ...(effective.isDone !== undefined ? { is_done: effective.isDone } : {}),
      ...(effective.dueDate !== undefined ? { due_date: effective.dueDate } : {}),
      ...(effective.recurrence !== undefined
        ? { recurrence: effective.recurrence }
        : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return fromRow(data as TodoRow);
}

// 방금 지운 할 일을 **같은 id로** 되살린다(삭제 직후 "되돌리기"용).
// 새 id로 다시 만들면 순서(localStorage의 id 배열)와 RAG 임베딩(sourceId)이 끊기므로
// 행을 통째로 그대로 넣는다. 삭제 자체는 이미 진짜로 일어난 뒤다 — 보류 상태를 두지 않는다.
export async function restoreTodo(
  supabase: SupabaseClient,
  todo: Todo,
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("로그인이 필요합니다.");

  const { error } = await supabase
    .from("todos")
    .insert({
      id: todo.id,
      // 인자로 온 userId는 쓰지 않는다. 남의 id를 실어 보내 남의 데이터를 만들 수 없어야 한다
      // (RLS가 막지만 계약에서도 막는다).
      user_id: user.id,
      title: todo.title,
      is_done: todo.isDone,
      due_date: todo.dueDate,
      // createTodo와 같은 이유로 값이 있을 때만 넣는다(마이그레이션 전 DB 호환).
      ...(todo.recurrence ? { recurrence: todo.recurrence } : {}),
      created_at: todo.createdAt,
      updated_at: todo.updatedAt,
    })
    .select()
    .single();

  // 되돌리기를 두 번 누르는 건 흔하다. 이미 살아 있으면 목적은 달성된 것이므로 성공으로 본다.
  if (error && (error as { code?: string }).code !== "23505") {
    throw new Error(error.message);
  }
}

export async function deleteTodo(
  supabase: SupabaseClient,
  id: string,
): Promise<void> {
  const { error } = await supabase.from("todos").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
