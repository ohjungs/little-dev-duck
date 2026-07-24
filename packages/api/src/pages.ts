import type { SupabaseClient } from "@supabase/supabase-js";
import {
  pageSchema,
  dbSchemaSchema,
  rowPropsSchema,
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
  content?: unknown;
  plain_text: string;
  icon: string | null;
  is_trashed: boolean;
  trashed_at: string | null;
  created_at: string;
  updated_at: string;
  // Phase 11: 마이그레이션 전(또는 목 테스트)에는 없을 수 있어 optional. fromRow가 null/{} 기본값 보정.
  db_schema?: unknown;
  row_props?: unknown;
  // Phase 12 T1 공개 공유.
  is_public?: boolean;
  public_slug?: string | null;
  // 커버 이미지 URL. 마이그레이션 전 행엔 없을 수 있어 optional.
  cover_url?: string | null;
};

function fromRow(row: PageRow): Page {
  // db_schema/row_props는 pageSchema에서 엄격 파싱된다. 만약 저장소에 어떤 경로로든(콘솔/직접 REST 등)
  // 잘못된 모양이 들어와 있으면, 여기서 통짜로 throw하면 이 행 하나가 listPages 전체(.map)를 죽여
  // 워크스페이스 목록이 아예 안 뜨는 자가-DoS가 된다(보안 리뷰 HIGH). 읽기 경로는 관대하게 —
  // 파싱 실패 시 그 필드만 기본값(null/{})으로 강등해 목록은 항상 뜨게 한다(쓰기 경로에서 검증은 별도).
  const dbSchema = dbSchemaSchema.safeParse(row.db_schema).success
    ? (row.db_schema as DbSchema)
    : null;
  const rowProps = rowPropsSchema.safeParse(row.row_props).success
    ? (row.row_props as RowProps)
    : {};
  return pageSchema.parse({
    id: row.id,
    userId: row.user_id,
    parentId: row.parent_id,
    title: row.title,
    content: row.content ?? null,
    plainText: row.plain_text,
    icon: row.icon,
    isTrashed: row.is_trashed,
    trashedAt: row.trashed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    dbSchema,
    rowProps,
    isPublic: row.is_public ?? false,
    publicSlug: row.public_slug ?? null,
    coverUrl: row.cover_url ?? null,
  });
}

// 휴지통 제외 전체. 트리는 UI가 parentId로 조립(서버 트리 불필요 — ponytail).
// content JSONB는 사이드바 트리에 불필요해 제외 — 페이지 열람 시 getPage로 full fetch.
export async function listPages(supabase: SupabaseClient): Promise<Page[]> {
  const { data, error } = await supabase
    .from("pages")
    .select("id, parent_id, user_id, title, plain_text, icon, is_trashed, trashed_at, created_at, updated_at, db_schema, row_props, is_public, public_slug, cover_url")
    .eq("is_trashed", false)
    .order("created_at", { ascending: true })
    .limit(500);
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
    .select("id, parent_id, user_id, title, plain_text, icon, is_trashed, trashed_at, created_at, updated_at, db_schema, row_props, is_public, public_slug, cover_url")
    .eq("is_trashed", true)
    .order("trashed_at", { ascending: false })
    .limit(500);
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
  // 쓰기 전 검증: 잘못된 모양이 저장되면 읽기 경로가 그 필드를 기본값으로 강등해 데이터가 조용히
  // 유실되므로, 애초에 저장 시점에 막는다(신뢰 경계 — 보안 리뷰 HIGH). 실패 시 zod가 throw.
  if (input.rowProps !== undefined) rowPropsSchema.parse(input.rowProps);
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
  // 쓰기 전 검증(신뢰 경계 — 보안 리뷰 HIGH). null=데이터베이스 해제라 검증 대상 아님.
  if (patch.dbSchema != null) dbSchemaSchema.parse(patch.dbSchema);
  if (patch.rowProps !== undefined) rowPropsSchema.parse(patch.rowProps);
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

// Phase 12 T1 공개 공유. 공개 페이지를 slug로 조회한 read-only 뷰(본문 전체). 비로그인 접근.
export type PublicPage = {
  id: string;
  title: string;
  content: unknown;
  icon: string | null;
  updatedAt: string;
};

// 페이지를 공개로 전환. 추측 불가한 랜덤 slug를 생성해 링크를 발급한다(멱등 — 이미 공개면 기존 slug 재사용).
export async function publishPage(
  supabase: SupabaseClient,
  id: string,
): Promise<{ slug: string }> {
  const page = await getPage(supabase, id);
  if (!page) throw new Error("페이지를 찾을 수 없습니다.");
  if (page.isPublic && page.publicSlug) return { slug: page.publicSlug };
  const slug = crypto.randomUUID().replace(/-/g, "");
  const { error } = await supabase
    .from("pages")
    .update({ is_public: true, public_slug: slug })
    .eq("id", id);
  if (error) throw new Error(error.message);
  return { slug };
}

// 공개 취소. is_public=false로 내리고 slug도 지워 링크를 무효화(다시 공개하면 새 링크가 발급됨).
export async function unpublishPage(
  supabase: SupabaseClient,
  id: string,
): Promise<void> {
  const { error } = await supabase
    .from("pages")
    .update({ is_public: false, public_slug: null })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

// 커버 이미지 URL 갱신. null이면 커버 제거.
export async function updatePageCover(
  supabase: SupabaseClient,
  pageId: string,
  coverUrl: string | null,
): Promise<void> {
  const { error } = await supabase
    .from("pages")
    .update({ cover_url: coverUrl })
    .eq("id", pageId);
  if (error) throw new Error(error.message);
}

// slug로 공개 페이지 조회. 열거 방지를 위해 anon SELECT 정책 대신 security-definer RPC로만 접근한다
// (마이그레이션 20260724120000의 get_public_page — 요청한 slug 한 건만 반환). 없으면 null.
export async function getPublicPage(
  supabase: SupabaseClient,
  slug: string,
): Promise<PublicPage | null> {
  const { data, error } = await supabase.rpc("get_public_page", {
    p_slug: slug,
  });
  if (error) throw new Error(error.message);
  const row = (Array.isArray(data) ? data[0] : data) as
    | {
        id: string;
        title: string;
        content: unknown;
        icon: string | null;
        updated_at: string;
      }
    | undefined;
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    icon: row.icon ?? null,
    updatedAt: row.updated_at,
  };
}
