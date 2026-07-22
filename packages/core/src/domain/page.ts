import { z } from "zod";

// Phase 9 워크스페이스 코어. 페이지 = 계층 문서. content는 BlockNote 문서(jsonb) — 구조는 BlockNote가
// 소유하므로 core는 느슨하게(z.unknown) 받고, 텍스트 추출만 extractPlainText가 계약으로 담당한다.
export const pageSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  parentId: z.string().uuid().nullable(),
  title: z.string().max(200),
  content: z.unknown(),
  plainText: z.string(),
  icon: z.string().max(16).nullable(),
  isTrashed: z.boolean(),
  trashedAt: z.string().datetime({ offset: true }).nullable(),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
});
export type Page = z.infer<typeof pageSchema>;

// 페이지 버전 스냅샷(T5). 그 시점 title+content를 통짜 보관 — 불변 레코드라 update 없음.
export const pageVersionSchema = z.object({
  id: z.string().uuid(),
  pageId: z.string().uuid(),
  userId: z.string().uuid(),
  title: z.string().max(200),
  content: z.unknown(),
  createdAt: z.string().datetime({ offset: true }),
});
export type PageVersion = z.infer<typeof pageVersionSchema>;

// 인라인 콘텐츠(text 노드 배열, 또는 링크 등 중첩 content)에서 text 문자열만 이어붙인다.
function inlineText(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  const parts: string[] = [];
  for (const item of content) {
    if (item == null || typeof item !== "object") continue;
    const it = item as Record<string, unknown>;
    if (typeof it.text === "string") parts.push(it.text);
    else if (it.content !== undefined) parts.push(inlineText(it.content));
  }
  return parts.join("");
}

// 블록 배열을 순회하며 블록별 한 줄씩 out에 쌓는다(children 재귀).
function walkBlocks(node: unknown, out: string[]): void {
  if (!Array.isArray(node)) return;
  for (const block of node) {
    if (block == null || typeof block !== "object") continue;
    const b = block as Record<string, unknown>;
    const line = inlineText(b.content);
    if (line) out.push(line);
    if (Array.isArray(b.children)) walkBlocks(b.children, out);
  }
}

// BlockNote 문서(블록 배열)에서 순수 텍스트 추출. RAG 인덱싱(reindexSource) + 전역 검색(plain_text) 공용.
// BlockNote 구조: 블록[] 각 { type, content?, children? }. content=인라인[](text 노드에 .text) 또는
// 중첩. children=하위 블록[]. core는 @blocknote 의존 없이 방어적으로 순회한다.
// ponytail: 블록 타입별 정교한 처리(테이블 셀·이미지 캡션 등)는 검색/RAG 목적엔 과설계 —
// 재귀로 text만 긁으면 충분. 필요해지면 여기만 확장.
export function extractPlainText(content: unknown): string {
  const out: string[] = [];
  walkBlocks(content, out);
  return out.join("\n").trim();
}
