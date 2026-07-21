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

export type IndexSourceInput = {
  userId: string;
  sourceType: EmbeddingSource;
  sourceId: string;
  text: string;
};

// 텍스트를 청크→임베딩→upsert. 저장 시 인덱싱의 핵심(슬라이스 B/C가 호출). 빈 텍스트면 기존 임베딩 삭제.
// 반환: 저장된 청크 수. 재저장 시 이전보다 청크가 줄면 꼬리 청크가 남으므로 먼저 삭제 후 재작성.
export async function indexSource(
  supabase: SupabaseClient,
  apiKey: string,
  input: IndexSourceInput,
  fetchImpl: typeof fetch = fetch,
): Promise<number> {
  const chunks = chunkText(input.text);
  await deleteSourceEmbeddings(supabase, input.userId, input.sourceType, input.sourceId);
  if (chunks.length === 0) return 0;

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

  return ((data ?? []) as MatchRow[]).map((row) =>
    retrievedChunkSchema.parse({
      sourceType: row.source_type,
      sourceId: row.source_id,
      content: row.content,
      similarity: row.similarity,
    }),
  );
}
