import { z } from "zod";
import { dbSchemaSchema, rowPropsSchema } from "./database-view";

// Phase 9 워크스페이스 코어. 페이지 = 계층 문서. content는 BlockNote 문서(jsonb) — 구조는 BlockNote가
// 소유하므로 core는 느슨하게(z.unknown) 받고, 텍스트 추출만 extractPlainText가 계약으로 담당한다.
// Phase 11: dbSchema가 설정되면 이 페이지는 데이터베이스(자식 페이지=행), rowProps는 이 페이지가
// 어떤 데이터베이스의 행일 때의 속성값. 기존 페이지·데이터 하위호환 위해 둘 다 기본값을 준다.
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
  dbSchema: dbSchemaSchema.nullable().default(null),
  rowProps: rowPropsSchema.default({}),
  // Phase 12 T1 공개 공유. isPublic=공개 여부, publicSlug=추측 불가한 랜덤 링크. 하위호환 기본값.
  isPublic: z.boolean().default(false),
  publicSlug: z.string().nullable().default(null),
  // 페이지 커버 이미지 URL. null=커버 없음. 마이그레이션 전 행 하위호환 기본값.
  coverUrl: z.string().nullable().default(null),
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

// 테이블 블록의 content는 { type:'tableContent', rows:[{cells:[...]}] } 객체다. 셀은 인라인 배열이거나
// { content } 형태(TableCell)라 방어적으로 둘 다 처리해 셀 텍스트를 공백으로 이어붙인다.
function tableText(obj: Record<string, unknown>): string {
  if (obj.type !== "tableContent" || !Array.isArray(obj.rows)) return "";
  const cellTexts: string[] = [];
  for (const row of obj.rows) {
    const cells = (row as Record<string, unknown> | null)?.cells;
    if (!Array.isArray(cells)) continue;
    for (const cell of cells) {
      if (Array.isArray(cell)) cellTexts.push(inlineText(cell));
      else if (cell != null && typeof cell === "object") {
        cellTexts.push(inlineText((cell as Record<string, unknown>).content));
      }
    }
  }
  return cellTexts.filter(Boolean).join(" ");
}

// 인라인 콘텐츠(text 노드 배열, 링크 등 중첩 content, 또는 테이블 content 객체)에서 text만 이어붙인다.
function inlineText(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    const parts: string[] = [];
    for (const item of content) {
      if (item == null || typeof item !== "object") continue;
      const it = item as Record<string, unknown>;
      if (typeof it.text === "string") parts.push(it.text);
      else if (it.content !== undefined) parts.push(inlineText(it.content));
    }
    return parts.join("");
  }
  if (content != null && typeof content === "object") {
    return tableText(content as Record<string, unknown>);
  }
  return "";
}

// 블록 배열을 순회하며 블록별 한 줄씩 out에 쌓는다. 이미지/파일 등 미디어 블록의 캡션은 props에 있어
// 별도로 긁는다(content 순회로는 안 닿음). children 재귀.
function walkBlocks(node: unknown, out: string[]): void {
  if (!Array.isArray(node)) return;
  for (const block of node) {
    if (block == null || typeof block !== "object") continue;
    const b = block as Record<string, unknown>;
    const line = inlineText(b.content);
    if (line) out.push(line);
    const props = b.props;
    if (props != null && typeof props === "object") {
      const caption = (props as Record<string, unknown>).caption;
      if (typeof caption === "string" && caption) out.push(caption);
    }
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
