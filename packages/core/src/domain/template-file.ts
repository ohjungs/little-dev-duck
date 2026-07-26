import { dbSchemaSchema, type DbSchema } from "./database-view";

// 2026-07-26 : 템플릿 - 파일 주고받기 (피드백 2-2)
// "템플릿을 선택 가능했으면 좋겠고, 마켓플레이스에서 가져올수있는 기능".
//
// **저장소를 새로 만들지 않았다.** 진짜 스토어(등록·검색·평점)는 이 제품 규모에 과하고 서버가 필요하다.
// 대신 **파일로 주고받는다**: 내 페이지를 템플릿 파일로 내려받고, 받은 파일로 새 페이지를 만든다.
// 템플릿 목록을 관리할 저장소도, 마이그레이션도, 동기화도 필요 없다 — 사용자의 목적은 템플릿을
// **쓰는** 것이지 라이브러리를 운영하는 게 아니다.
//
// **원격 URL에서 직접 받지 않는다**(1차): SSRF와 임의 콘텐츠 문제가 붙는다. 파일 선택만 받는다.

export const TEMPLATE_FILE_VERSION = 1;

// 가져온 파일의 블록은 **그대로 렌더된다.** 모르는 타입을 통과시키면 그게 실행 표면이 된다.
// 이미지·비디오·파일 블록은 일부러 뺐다 — 원격 주소를 품고 있으면 페이지를 여는 순간 브라우저가
// 그 주소를 부른다(추적 픽셀). 텍스트 계열만 받는다.
export const IMPORTABLE_BLOCK_TYPES = [
  "paragraph",
  "heading",
  "bulletListItem",
  "numberedListItem",
  "checkListItem",
  "codeBlock",
  "quote",
  "table",
] as const;

// 붙여넣기 사고나 악의적 파일로 수만 블록이 들어오면 에디터가 멎는다.
const MAX_BLOCKS = 5000;

export type TemplateFile = {
  formatVersion: number;
  title: string;
  icon: string | null;
  content: unknown[];
  dbSchema: DbSchema | null;
};

export type TemplateParseResult =
  | { ok: true; template: TemplateFile }
  | { ok: false; reason: string };

export function buildTemplateFile(input: {
  title: string;
  icon: string | null;
  content: unknown[];
  dbSchema: DbSchema | null;
}): TemplateFile {
  return {
    formatVersion: TEMPLATE_FILE_VERSION,
    title: input.title,
    icon: input.icon,
    content: [...input.content],
    dbSchema: input.dbSchema,
  };
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** 블록과 그 자식까지 훑어 허용 목록 밖 타입을 찾는다. 겉만 보면 안쪽에 무엇이든 넣을 수 있다. */
function findForbiddenType(blocks: unknown[], depth = 0): string | null {
  // 깊이 상한 — 자기 자신을 품은 구조가 오면 여기서 멈춘다.
  if (depth > 20) return "너무 깊음";
  for (const block of blocks) {
    if (!isRecord(block)) return "(블록이 아님)";
    const type = block.type;
    if (typeof type !== "string") return "(타입 없음)";
    if (!(IMPORTABLE_BLOCK_TYPES as readonly string[]).includes(type)) return type;
    if (Array.isArray(block.children)) {
      const bad = findForbiddenType(block.children, depth + 1);
      if (bad) return bad;
    }
  }
  return null;
}

function countBlocks(blocks: unknown[], depth = 0): number {
  if (depth > 20) return MAX_BLOCKS + 1;
  let n = 0;
  for (const block of blocks) {
    n += 1;
    if (isRecord(block) && Array.isArray(block.children)) n += countBlocks(block.children, depth + 1);
  }
  return n;
}

export function parseTemplateFile(raw: unknown): TemplateParseResult {
  if (!isRecord(raw)) {
    return { ok: false, reason: "템플릿 파일이 아닙니다. JSON 객체가 아닙니다." };
  }

  const version = raw.formatVersion;
  if (typeof version !== "number" || !Number.isInteger(version) || version < 1) {
    return { ok: false, reason: "템플릿 파일이 아닙니다. 형식 버전이 없습니다." };
  }
  // 모르는 형식을 아는 척 읽으면 엉뚱한 페이지가 만들어진다.
  if (version > TEMPLATE_FILE_VERSION) {
    return {
      ok: false,
      reason: `더 새로운 버전(${version})의 템플릿입니다. 이 앱은 ${TEMPLATE_FILE_VERSION}까지 읽습니다.`,
    };
  }

  if (typeof raw.title !== "string" || raw.title.trim().length === 0) {
    return { ok: false, reason: "템플릿에 제목이 없습니다." };
  }
  if (!Array.isArray(raw.content)) {
    return { ok: false, reason: "템플릿 본문이 목록 형태가 아닙니다." };
  }
  if (countBlocks(raw.content) > MAX_BLOCKS) {
    return { ok: false, reason: `템플릿이 너무 큽니다(블록 ${MAX_BLOCKS}개까지).` };
  }

  const forbidden = findForbiddenType(raw.content);
  if (forbidden) {
    return {
      ok: false,
      reason: `이 앱이 다루지 않는 블록이 들어 있습니다: ${forbidden}`,
    };
  }

  // 쓰기 전에 막는다 — 잘못된 모양이 저장되면 읽기 경로가 기본값으로 강등해 조용히 사라진다
  // (createPage가 같은 이유로 저장 시점에 검증한다).
  let dbSchema: DbSchema | null = null;
  if (raw.dbSchema !== null && raw.dbSchema !== undefined) {
    const parsed = dbSchemaSchema.safeParse(raw.dbSchema);
    if (!parsed.success) {
      return { ok: false, reason: "템플릿의 데이터베이스 설정이 올바르지 않습니다." };
    }
    dbSchema = parsed.data;
  }

  return {
    ok: true,
    template: {
      formatVersion: version,
      title: raw.title,
      icon: typeof raw.icon === "string" ? raw.icon : null,
      content: raw.content,
      dbSchema,
    },
  };
}
