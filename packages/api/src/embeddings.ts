import type { SupabaseClient } from "@supabase/supabase-js";
import {
  LddError,
  chunkText,
  retrievedChunkSchema,
  type EmbeddingSource,
  type RetrievedChunk,
} from "@ldd/core";
import { geminiEmbed } from "./gemini";

// pgvector는 PostgREST 경유 시 문자열 리터럴 '[a,b,c]'로 넘기는 게 안전(vector 컬럼/파라미터로 캐스팅).
// ponytail 보정 지점: 배열 직렬화가 환경에 따라 실패하면 여기만 조정.
function toVector(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}


// 한 소스의 모든 임베딩 삭제(내용이 비워지거나 원본 삭제 시).
export async function deleteSourceEmbeddings(
  supabase: SupabaseClient,
  userId: string,
  sourceType: EmbeddingSource,
  sourceId: string,
): Promise<void> {
  const { error } = await supabase
    .from("embeddings")
    .delete()
    .eq("user_id", userId)
    .eq("source_type", sourceType)
    .eq("source_id", sourceId);
  if (error) throw new LddError("internal", error.message);
}

// 재인덱싱으로 청크 수가 줄었을 때 남는 꼬리 행 삭제(chunk_index >= keepCount).
async function deleteStaleChunks(
  supabase: SupabaseClient,
  userId: string,
  sourceType: EmbeddingSource,
  sourceId: string,
  keepCount: number,
): Promise<void> {
  const { error } = await supabase
    .from("embeddings")
    .delete()
    .eq("user_id", userId)
    .eq("source_type", sourceType)
    .eq("source_id", sourceId)
    .gte("chunk_index", keepCount);
  if (error) throw new LddError("internal", error.message);
}

export type IndexSourceInput = {
  userId: string;
  sourceType: EmbeddingSource;
  sourceId: string;
  text: string;
};

// 텍스트를 청크→임베딩→upsert. 저장 시 인덱싱의 핵심(슬라이스 B/C가 호출). 빈 텍스트면 기존 임베딩 삭제.
// 반환: 저장된 청크 수. **임베딩(실패 가능 지점: 쿼터·네트워크)을 먼저 성공시킨 뒤에만 기존 인덱스를
// 갱신**한다 — geminiEmbed가 던지면 기존 임베딩은 그대로 보존돼 재인덱싱 실패로 검색이 유실되지 않는다.
// 2026-07-26 : RAG - 색인실패 - 빠진것만복구
// 저장 시 색인은 fire-and-forget이라 실패해도 조용히 넘어간다(무료 티어 쿼터 소진 시 반드시
// 일어난다). 어떤 항목이 이미 색인됐는지 알아야 **빠진 것만** 다시 시도할 수 있다.
// 벡터가 아니라 식별자만 읽으므로 가볍다(RLS로 본인 것만 조회된다).
//
// **페이지를 넘겨 끝까지 읽는다.** 처음엔 한 번에 5000행만 읽었는데, 행은 소스가 아니라
// **청크**다 — chunkText가 1200자마다 자르므로 긴 페이지 하나가 수십 행이 된다. 상한에 걸리면
// 이미 색인된 소스가 목록에서 빠지고, 호출부가 그걸 "미색인"으로 보고 **매 세션 재색인**해
// 쿼터를 계속 태운다. unique(user_id, source_type, source_id, chunk_index) 순서로 넘기면
// 페이지가 겹치거나 빠지지 않는다.
const ID_PAGE_SIZE = 1000;

export async function listIndexedSourceIds(
  supabase: SupabaseClient,
  maxRows = 100_000,
): Promise<{ sourceType: string; sourceId: string }[]> {
  const out: { sourceType: string; sourceId: string }[] = [];
  for (let from = 0; from < maxRows; from += ID_PAGE_SIZE) {
    const size = Math.min(ID_PAGE_SIZE, maxRows - from);
    const { data, error } = await supabase
      .from("embeddings")
      .select("source_type, source_id")
      .order("source_type", { ascending: true })
      .order("source_id", { ascending: true })
      .order("chunk_index", { ascending: true })
      .range(from, from + size - 1);
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as { source_type: string; source_id: string }[];
    for (const r of rows) out.push({ sourceType: r.source_type, sourceId: r.source_id });
    // 요청한 만큼 못 받았으면 마지막 페이지다.
    if (rows.length < size) break;
  }
  // 한 소스가 여러 청크를 가지므로 중복이 나온다 — 호출부가 Set으로 쓰기 좋게 그대로 준다.
  return out;
}

export async function indexSource(
  supabase: SupabaseClient,
  apiKey: string,
  input: IndexSourceInput,
  fetchImpl: typeof fetch = fetch,
): Promise<number> {
  const chunks = chunkText(input.text);
  // 내용이 비면 기존 임베딩만 삭제(원본 삭제/비움).
  if (chunks.length === 0) {
    await deleteSourceEmbeddings(supabase, input.userId, input.sourceType, input.sourceId);
    return 0;
  }

  const vectors = await geminiEmbed(chunks, apiKey, fetchImpl);
  // N번 개별 왕복 대신 단일 배치 upsert(N RTT → 1 RTT).
  const rows = chunks.map((chunk, i) => ({
    user_id: input.userId,
    source_type: input.sourceType,
    source_id: input.sourceId,
    chunk_index: i,
    content: chunk,
    embedding: toVector(vectors[i]),
    updated_at: new Date().toISOString(),
  }));
  const { error: batchError } = await supabase
    .from("embeddings")
    .upsert(rows, { onConflict: "user_id,source_type,source_id,chunk_index" });
  if (batchError) throw new LddError("internal", batchError.message);
  // 이전보다 청크 수가 줄었으면 꼬리(chunk_index >= 새 청크 수) 잔여 행 삭제(upsert 성공 후에만).
  await deleteStaleChunks(
    supabase,
    input.userId,
    input.sourceType,
    input.sourceId,
    chunks.length,
  );
  return chunks.length;
}

type MatchRow = {
  source_type: string;
  source_id: string;
  content: string;
  similarity: number;
};

// RAG 검색: match_embeddings RPC(본인 데이터만, RLS). 반환은 유사도 내림차순.
export async function searchEmbeddings(
  supabase: SupabaseClient,
  queryEmbedding: number[],
  matchCount = 5,
): Promise<RetrievedChunk[]> {
  const { data, error } = await supabase.rpc("match_embeddings", {
    query_embedding: toVector(queryEmbedding),
    match_count: matchCount,
  });
  if (error) throw new LddError("internal", error.message);

  // 손상된 행(앱 계층 우회로 들어온 잘못된 source_type 등)은 조용히 건너뛴다 — 한 행이 채팅 전체를
  // 깨뜨리지 않도록(parse 대신 safeParse).
  return ((data ?? []) as MatchRow[]).flatMap((row) => {
    const parsed = retrievedChunkSchema.safeParse({
      sourceType: row.source_type,
      sourceId: row.source_id,
      content: row.content,
      similarity: row.similarity,
    });
    return parsed.success ? [parsed.data] : [];
  });
}
