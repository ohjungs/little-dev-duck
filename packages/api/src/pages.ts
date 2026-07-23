import type { SupabaseClient } from "@supabase/supabase-js";
import {
  pageSchema,
  extractPlainText,
  type Page,
  type DbSchema,
  type RowProps,
} from "@ldd/core";

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
  // Phase 11: 마이그레이션 전(또는 목 테스트)에는 없을 수 있어 optional. fromRow가 null/{} 기본값 보정.
  db_schema?: unknown;
  row_props?: unknown;
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
    dbSchema: row.db_schema ?? null,
    rowProps: row.row_props ?? {},
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

// 제목/본문 부분일치 검색(휴지통 제외). Cmd+K 팔레트용. plain_text는 저장 시 서버가 파생했고
// 마이그레이션의 pg_trgm GIN이 ilike를 가속한다. PostgREST or() 필터는 콤마/괄호/따옴표/역슬래시가
// 구문 예약문자라 사용자 입력을 그대로 넣으면 필터 인젝션이 되므로, ilike 와일드카드(%,_)까지 포함해
// 예약문자를 공백으로 치환·정규화한다(개인 워크스페이스 검색엔 리터럴 %/_ 검색 수요가 없음 — ponytail).
export async function searchPages(
  supabase: SupabaseClient,
  query: string,
  limit = 20,
): Promise<Page[]> {
  const safe = query
    .replace(/[,()"\\%_]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!safe) return [];
  const { data, error } = await supabase
    .from("pages")
    .select("*")
    .eq("is_trashed", false)
    .or(`title.ilike.%${safe}%,plain_text.ilike.%${safe}%`)
    .order("updated_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data as PageRow[]).map(fromRow);
}

// 데이터베이스의 행 목록 = 그 페이지의 자식(휴지통 제외). 표/보드 뷰가 렌더할 행.
export async function listChildPages(
  supabase: SupabaseClient,
  parentId: string,
): Promise<Page[]> {
  const { data, error } = await supabase
    .from("pages")
    .select("*")
    .eq("parent_id", parentId)
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
  // Phase 11: 보드에서 "+ 새 행"이 그룹값을 프리셋해 행(자식 페이지)을 만들 때 사용.
  rowProps?: RowProps;
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
      ...(input.rowProps !== undefined ? { row_props: input.rowProps } : {}),
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
  // Phase 11: dbSchema=이 페이지를 데이터베이스로 만들거나 열/뷰를 편집, rowProps=행의 속성값 갱신.
  dbSchema: DbSchema | null;
  rowProps: RowProps;
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
      ...(patch.dbSchema !== undefined ? { db_schema: patch.dbSchema } : {}),
      ...(patch.rowProps !== undefined ? { row_props: patch.rowProps } : {}),
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
