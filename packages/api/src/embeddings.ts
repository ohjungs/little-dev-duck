import type { SupabaseClient } from "@supabase/supabase-js";
import {
  LddError,
  chunkText,
  retrievedChunkSchema,
  type EmbeddingChunk,
  type EmbeddingSource,
  type RetrievedChunk,
} from "@ldd/core";
import { geminiEmbed } from "./gemini";

// pgvector는 PostgREST 경유 시 문자열 리터럴 '[a,b,c]'로 넘기는 게 안전(vector 컬럼/파라미터로 캐스팅).
// ponytail 보정 지점: 배열 직렬화가 환경에 따라 실패하면 여기만 조정.
function toVector(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}

// 청크 1개 upsert. unique(user,source_type,source_id,chunk_index)로 재임베딩 시 덮어쓴다.
export async function upsertEmbedding(
  supabase: SupabaseClient,
  chunk: EmbeddingChunk,
  embedding: number[],
): Promise<void> {
  const { error } = await supabase.from("embeddings").upsert(
    {
      user_id: chunk.userId,
      source_type: chunk.sourceType,
      source_id: chunk.sourceId,
      chunk_index: chunk.chunkIndex,
      content: chunk.content,
      embedding: toVector(embedding),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,source_type,source_id,chunk_index" },
  );
  if (error) throw new LddError("internal", error.message);
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
  for (let i = 0; i < chunks.length; i += 1) {
    await upsertEmbedding(
      supabase,
      {
        userId: input.userId,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        chunkIndex: i,
        content: chunks[i],
      },
      vectors[i],
    );
  }
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
