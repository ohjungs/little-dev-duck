import type { SupabaseClient } from "@supabase/supabase-js";
import { pageVersionSchema, type PageVersion } from "@ldd/core";

type PageVersionRow = {
  id: string;
  page_id: string;
  user_id: string;
  title: string;
  content: unknown;
  created_at: string;
};

function fromRow(row: PageVersionRow): PageVersion {
  return pageVersionSchema.parse({
    id: row.id,
    pageId: row.page_id,
    userId: row.user_id,
    title: row.title,
    content: row.content,
    createdAt: row.created_at,
  });
}

export type CreatePageVersionInput = {
  pageId: string;
};

// 현재 페이지 상태를 버전 스냅샷으로 저장(T5). 스냅샷 title/content는 클라 입력이 아니라 실제 저장된
// 페이지에서 뜬다 — RLS SELECT가 본인 소유 페이지만 반환하므로 소유권도 함께 강제되고(타인/부재 페이지는
// 행이 없어 예외), 스냅샷 무결성이 클라 신뢰에서 벗어난다. user_id는 세션에서 주입.
export async function createPageVersion(
  supabase: SupabaseClient,
  input: CreatePageVersionInput,
): Promise<PageVersion> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("로그인이 필요합니다.");

  const { data: pageRow, error: pageError } = await supabase
    .from("pages")
    .select("title, content")
    .eq("id", input.pageId)
    .single();
  if (pageError) throw new Error(pageError.message);
  const snapshot = pageRow as { title: string; content: unknown };

  const { count } = await supabase
    .from("page_versions")
    .select("id", { count: "exact", head: true })
    .eq("page_id", input.pageId);

  if (count && count >= 50) {
    const { data: oldest } = await supabase
      .from("page_versions")
      .select("id")
      .eq("page_id", input.pageId)
      .order("created_at", { ascending: true })
      .limit(count - 49);
    if (oldest && oldest.length > 0) {
      await supabase
        .from("page_versions")
        .delete()
        .in("id", oldest.map((v) => v.id));
    }
  }

  const { data, error } = await supabase
    .from("page_versions")
    .insert({
      page_id: input.pageId,
      user_id: user.id,
      title: snapshot.title,
      content: snapshot.content,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return fromRow(data as PageVersionRow);
}

// 특정 페이지의 버전 목록(최신순). 복원은 별도 함수 없이 updatePage로 content/title을 되돌린다.
export async function listPageVersions(
  supabase: SupabaseClient,
  pageId: string,
  limit = 30,
): Promise<PageVersion[]> {
  const { data, error } = await supabase
    .from("page_versions")
    .select("*")
    .eq("page_id", pageId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data as PageVersionRow[]).map(fromRow);
}
