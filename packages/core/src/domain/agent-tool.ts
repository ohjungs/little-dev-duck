import { z } from "zod";

// Phase 10 에이전트 액션 계약. Gemini generateContent function calling 규격(2026-07 공식 문서 실측)에
// 맞춘 도구 선언/호출/결과 타입과, 승인 게이트를 판정하는 순수 분류 로직을 core에 고정한다.
// 보안 표면이 큰 Phase라(외부 액션·인젝션·파괴성) 판정 기준을 한 곳(core)에 두어 우회 경로를 없앤다.

// 도구 종류 — 승인 게이트의 유일한 판정 근거. readonly=조회(자동 실행), mutating=외부 변경(사용자
// 승인 후에만 실행, CLAUDE.md 5절 안전 규칙). 분류는 도구 카탈로그가 선언하고 서버가 강제한다.
export const toolKindSchema = z.enum(["readonly", "mutating"]);
export type ToolKind = z.infer<typeof toolKindSchema>;

// Gemini functionDeclaration.parameters는 JSON Schema 전체가 아니라 OpenAPI 3.0 Schema 서브셋이다
// (실측: type/properties/required/enum/items/description만; oneOf/$ref 등 고급 키워드 미지원).
// 도구는 코드(어댑터 카탈로그)가 선언하는 신뢰 입력이지만, 계약을 명시해 잘못된 선언을 빌드 타임에 잡는다.
export const jsonSchemaTypeSchema = z.enum([
  "string",
  "number",
  "integer",
  "boolean",
  "array",
  "object",
]);
export type JsonSchemaType = z.infer<typeof jsonSchemaTypeSchema>;

// object/array 중첩을 위해 재귀. z.lazy로 자기 참조를 푼다.
export type ToolParameterSchema = {
  type: JsonSchemaType;
  description?: string;
  enum?: (string | number)[];
  items?: ToolParameterSchema;
  properties?: Record<string, ToolParameterSchema>;
  required?: string[];
};
export const toolParameterSchema: z.ZodType<ToolParameterSchema> = z.lazy(() =>
  z.object({
    type: jsonSchemaTypeSchema,
    description: z.string().optional(),
    enum: z.array(z.union([z.string(), z.number()])).optional(),
    items: toolParameterSchema.optional(),
    properties: z.record(z.string(), toolParameterSchema).optional(),
    required: z.array(z.string()).optional(),
  }),
);

// 도구 선언 = Gemini functionDeclaration(name/description/parameters) + 승인 판정용 kind.
// name은 Gemini 함수명 규칙(영문 시작 + 영숫자/밑줄)을 따른다.
export const toolDeclarationSchema = z.object({
  name: z
    .string()
    .min(1)
    .regex(/^[a-zA-Z][a-zA-Z0-9_]*$/, "영문으로 시작하는 영숫자/밑줄만 허용"),
  description: z.string().min(1),
  parameters: toolParameterSchema,
  kind: toolKindSchema,
});
export type ToolDeclaration = z.infer<typeof toolDeclarationSchema>;

// LLM이 반환하는 함수 호출(candidates[].content.parts[].functionCall = {name, args, id}).
// id는 병렬 호출 매칭용으로 신설됐고 단일 호출 시 없을 수 있어 optional.
// args는 LLM 산출이라 신뢰 불가 — 실행 직전 각 어댑터가 자기 파라미터 스키마로 재검증한다(인젝션 방어).
export const toolCallSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  args: z.record(z.string(), z.unknown()),
});
export type ToolCall = z.infer<typeof toolCallSchema>;

// 도구 실행 결과 → LLM 재주입(functionResponse = {name, response, id}). 이 part를 담는 content의
// role은 Gemini 규격상 "user"다(오류 최다 지점 — api 층 상수 한 곳에서만 지정).
export const toolResultSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  response: z.record(z.string(), z.unknown()),
});
export type ToolResult = z.infer<typeof toolResultSchema>;

// 에이전트 루프 무한 호출 방지 상한. (LLM tool_call → 실행 → 재호출) 왕복의 최대 횟수.
export const AGENT_MAX_ITERATIONS = 5;

// mutating 도구만 사용자 승인을 요구한다.
export function requiresApproval(kind: ToolKind): boolean {
  return kind === "mutating";
}

// LLM이 반환한 tool_call들을 카탈로그 분류로 나눈다: readonly=자동 실행, mutating=승인 대기.
// 카탈로그에 없는 이름은 실행하지 않고 unknown으로 격리한다 — LLM 할루시네이션/프롬프트 인젝션이
// 임의 도구 실행으로 직결되지 못하게 하는 방어선(phase_10.md T0-5).
export function partitionToolCalls(
  calls: ToolCall[],
  catalog: ToolDeclaration[],
): { auto: ToolCall[]; approval: ToolCall[]; unknown: ToolCall[] } {
  const byName = new Map(catalog.map((decl) => [decl.name, decl]));
  const auto: ToolCall[] = [];
  const approval: ToolCall[] = [];
  const unknown: ToolCall[] = [];
  for (const call of calls) {
    const decl = byName.get(call.name);
    if (!decl) unknown.push(call);
    else if (requiresApproval(decl.kind)) approval.push(call);
    else auto.push(call);
  }
  return { auto, approval, unknown };
}
