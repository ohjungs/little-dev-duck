import type { SupabaseClient } from "@supabase/supabase-js";
import { pageSchema, extractPlainText, type Page } from "@ldd/core";

type PageRow = {
  id: string;
  user_id: string;
  parent_id: string | null;
  title: string;
  content: unknown;
  plain_text: string;
  icon: string | null;
  is_trashed: boolean;
  trashed_at: string | null;
  created_at: string;
  updated_at: string;
};

function fromRow(row: PageRow): Page {
  return pageSchema.parse({
    id: row.id,
    userId: row.user_id,
    parentId: row.parent_id,
    title: row.title,
    content: row.content,
    plainText: row.plain_text,
    icon: row.icon,
    isTrashed: row.is_trashed,
    trashedAt: row.trashed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

// 휴지통 제외 전체. 트리는 UI가 parentId로 조립(서버 트리 불필요 — ponytail).
export async function listPages(supabase: SupabaseClient): Promise<Page[]> {
  const { data, error } = await supabase
    .from("pages")
    .select("*")
    .eq("is_trashed", false)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data as PageRow[]).map(fromRow);
}

// 휴지통 뷰.
export async function listTrashedPages(supabase: SupabaseClient): Promise<Page[]> {
  const { data, error } = await supabase
    .from("pages")
    .select("*")
    .eq("is_trashed", true)
    .order("trashed_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data as PageRow[]).map(fromRow);
}

export async function getPage(
  supabase: SupabaseClient,
  id: string,
): Promise<Page | null> {
  const { data, error } = await supabase
    .from("pages")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? fromRow(data as PageRow) : null;
}

export type CreatePageInput = {
  title?: string;
  parentId?: string | null;
  content?: unknown;
  icon?: string | null;
};

export async function createPage(
  supabase: SupabaseClient,
  input: CreatePageInput = {},
): Promise<Page> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("로그인이 필요합니다.");

  const content = input.content ?? [];
  const { data, error } = await supabase
    .from("pages")
    .insert({
      user_id: user.id,
      parent_id: input.parentId ?? null,
      title: input.title ?? "",
      content,
      // plain_text는 저장 시 서버가 파생(검색/RAG 공용). 클라이언트 신뢰 안 함.
      plain_text: extractPlainText(content),
      icon: input.icon ?? null,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return fromRow(data as PageRow);
}

export type UpdatePageInput = Partial<{
  title: string;
  content: unknown;
  parentId: string | null;
  icon: string | null;
}>;

export async function updatePage(
  supabase: SupabaseClient,
  id: string,
  patch: UpdatePageInput,
): Promise<Page> {
  const { data, error } = await supabase
    .from("pages")
    .update({
      ...(patch.title !== undefined ? { title: patch.title } : {}),
      // content가 바뀌면 plain_text도 함께 재파생(둘의 정합 유지).
      ...(patch.content !== undefined
        ? { content: patch.content, plain_text: extractPlainText(patch.content) }
        : {}),
      ...(patch.parentId !== undefined ? { parent_id: patch.parentId } : {}),
      ...(patch.icon !== undefined ? { icon: patch.icon } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return fromRow(data as PageRow);
}

// soft delete: is_trashed + trashed_at(30일 보관). 단일 페이지만 — 하위 subtree 처리는 T5.
export async function softDeletePage(
  supabase: SupabaseClient,
  id: string,
): Promise<void> {
  const { error } = await supabase
    .from("pages")
    .update({ is_trashed: true, trashed_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function restorePage(
  supabase: SupabaseClient,
  id: string,
): Promise<void> {
  const { error } = await supabase
    .from("pages")
    .update({ is_trashed: false, trashed_at: null })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

// 영구 삭제(휴지통 비우기). 자식은 DB cascade로 함께 삭제.
export async function purgePage(
  supabase: SupabaseClient,
  id: string,
): Promise<void> {
  const { error } = await supabase.from("pages").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
