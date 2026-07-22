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
  title: string;
  content: unknown;
};

// 현재 페이지 상태를 버전 스냅샷으로 저장(T5). user_id는 세션에서 주입(클라 불신).
export async function createPageVersion(
  supabase: SupabaseClient,
  input: CreatePageVersionInput,
): Promise<PageVersion> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("로그인이 필요합니다.");

  const { data, error } = await supabase
    .from("page_versions")
    .insert({
      page_id: input.pageId,
      user_id: user.id,
      title: input.title,
      content: input.content,
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
