import type { SupabaseClient } from "@supabase/supabase-js";
import { memoSchema, type Memo } from "@ldd/core";

type MemoRow = {
  id: string;
  user_id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
};

function fromRow(row: MemoRow): Memo {
  return memoSchema.parse({
    id: row.id,
    userId: row.user_id,
    title: row.title,
    content: row.content,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

// 스티커 메모는 제목 입력을 받지 않는다 — DB의 title 컬럼(not null)은 검색·목록 표시용으로
// content 첫 줄에서 자동 유도해 채운다.
function deriveTitle(content: string): string {
  const firstLine = content.trim().split("\n")[0]?.trim() ?? "";
  return (firstLine || "메모").slice(0, 200);
}

export async function listMemos(supabase: SupabaseClient): Promise<Memo[]> {
  const { data, error } = await supabase
    .from("memos")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data as MemoRow[]).map(fromRow);
}

export type CreateMemoInput = {
  content: string;
};

export async function createMemo(
  supabase: SupabaseClient,
  input: CreateMemoInput,
): Promise<Memo> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("로그인이 필요합니다.");

  const { data, error } = await supabase
    .from("memos")
    .insert({
      user_id: user.id,
      title: deriveTitle(input.content),
      content: input.content,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return fromRow(data as MemoRow);
}

export type UpdateMemoInput = Partial<{
  content: string;
}>;

export async function updateMemo(
  supabase: SupabaseClient,
  id: string,
  patch: UpdateMemoInput,
): Promise<Memo> {
  const { data, error } = await supabase
    .from("memos")
    .update({
      ...patch,
      ...(patch.content !== undefined
        ? { title: deriveTitle(patch.content) }
        : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return fromRow(data as MemoRow);
}

export async function deleteMemo(
  supabase: SupabaseClient,
  id: string,
): Promise<void> {
  const { error } = await supabase.from("memos").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
