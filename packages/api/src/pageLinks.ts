import type { SupabaseClient } from "@supabase/supabase-js";

// Supabase PostgREST는 fkey 힌트 조인 결과를 배열로 반환한다. maybeSingle과 달리 !fkey 힌트는
// 행이 1개여도 배열 타입으로 온다 — 방어적으로 배열을 처리한다.
type PageLinkRow = {
  source_page_id: string;
  pages: Array<{ title: string }> | { title: string } | null;
};

// target_page_id를 참조하는 모든 페이지를 반환한다(백링크 목록).
export async function listBacklinks(
  supabase: SupabaseClient,
  targetPageId: string,
): Promise<{ sourcePageId: string; sourceTitle: string }[]> {
  const { data, error } = await supabase
    .from("page_links")
    .select("source_page_id, pages!page_links_source_page_id_fkey(title)")
    .eq("target_page_id", targetPageId);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r: PageLinkRow) => {
    const pagesField = r.pages;
    // PostgREST fkey 조인은 단일 객체 또는 배열 양쪽 모두 올 수 있어 방어적으로 처리한다.
    const title = Array.isArray(pagesField)
      ? (pagesField[0]?.title ?? "제목 없음")
      : (pagesField?.title ?? "제목 없음");
    return {
      sourcePageId: r.source_page_id,
      sourceTitle: title,
    };
  });
}

// source 페이지의 발신 링크 전체를 대체한다(delete-then-insert). 멱등.
// targetPageIds가 빈 배열이면 기존 링크를 모두 삭제한다.
export async function updatePageLinks(
  supabase: SupabaseClient,
  sourcePageId: string,
  targetPageIds: string[],
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("로그인이 필요합니다.");

  // 기존 발신 링크를 모두 제거한 뒤 새 목록으로 교체한다.
  const { error: delError } = await supabase
    .from("page_links")
    .delete()
    .eq("source_page_id", sourcePageId);
  if (delError) throw new Error(delError.message);

  if (targetPageIds.length === 0) return;

  const rows = targetPageIds.map((targetId) => ({
    user_id: user.id,
    source_page_id: sourcePageId,
    target_page_id: targetId,
  }));
  const { error: insError } = await supabase.from("page_links").insert(rows);
  if (insError) throw new Error(insError.message);
}
