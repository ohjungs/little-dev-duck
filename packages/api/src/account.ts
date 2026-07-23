import type { SupabaseClient } from "@supabase/supabase-js";

const ATTACHMENTS_BUCKET = "page-attachments";

// Phase 13 T3 1단계: 로그인 사용자의 모든 콘텐츠를 삭제한다.
// (1) 스토리지 첨부(본인 폴더 <userId>/)를 best-effort로 비운다 — DB 행만 지우면 백엔드 바이트가
//     고아로 남으므로 storage API로 실제 제거. 실패해도 핵심(DB) 삭제는 막지 않는다.
// (2) security-definer RPC(delete_all_my_data)로 전 데이터 테이블 행을 원자적으로 삭제.
// 계정(auth.users) 자체 삭제는 Edge Function(service_role)이 필요해 2단계로 이월 — profiles는 남는다.
export async function deleteAllMyData(
  supabase: SupabaseClient,
  userId: string,
): Promise<void> {
  try {
    const { data: files } = await supabase.storage
      .from(ATTACHMENTS_BUCKET)
      .list(userId);
    if (files && files.length > 0) {
      await supabase.storage
        .from(ATTACHMENTS_BUCKET)
        .remove(files.map((f) => `${userId}/${f.name}`));
    }
  } catch {
    // 스토리지 정리 실패는 무시하고 DB 삭제를 진행한다(핵심 데이터 제거가 우선).
  }

  const { error } = await supabase.rpc("delete_all_my_data");
  if (error) throw new Error(error.message);
}
