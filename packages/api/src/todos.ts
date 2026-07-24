import type { SupabaseClient } from "@supabase/supabase-js";
import { todoSchema, type Todo } from "@ldd/core";

type TodoRow = {
  id: string;
  user_id: string;
  title: string;
  is_done: boolean;
  due_date: string | null;
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
}>;

export async function updateTodo(
  supabase: SupabaseClient,
  id: string,
  patch: UpdateTodoInput,
): Promise<Todo> {
  const { data, error } = await supabase
    .from("todos")
    .update({
      ...(patch.title !== undefined ? { title: patch.title } : {}),
      ...(patch.isDone !== undefined ? { is_done: patch.isDone } : {}),
      ...(patch.dueDate !== undefined ? { due_date: patch.dueDate } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return fromRow(data as TodoRow);
}

export async function deleteTodo(
  supabase: SupabaseClient,
  id: string,
): Promise<void> {
  const { error } = await supabase.from("todos").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
