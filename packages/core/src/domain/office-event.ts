import { z } from "zod";

// Phase 16 픽셀 오리 오피스 — 이벤트 계약 + 상태 매핑(순수·테스트 가능).
// 실제 이벤트 소스(Claude Code hooks/Tauri sidecar WebSocket)는 데스크톱 인프라라 이월. 웹 오피스는
// 이 계약을 그대로 쓰되 데모 시뮬레이터가 이벤트를 만든다 — 나중에 실이벤트가 같은 스키마로 꽂힌다.

// 오리 역할(PDCA 배치). boss=대장오리(사용자).
export const OFFICE_ROLES = ["plan", "do", "check", "boss"] as const;
export type OfficeRole = (typeof OFFICE_ROLES)[number];

// 오리 작업 상태(스프라이트/애니메이션 상태). idle=커피, typing=타이핑 등.
export const DUCK_STATES = [
  "idle",
  "typing",
  "reading",
  "server",
  "question",
  "offwork",
] as const;
export type DuckWorkState = (typeof DUCK_STATES)[number];

export const officeEventSchema = z.object({
  agentId: z.string().min(1),
  role: z.enum(OFFICE_ROLES),
  tool: z.string().min(1),
  targetFile: z.string().nullable().optional(),
  status: z.enum(["start", "ok", "error"]),
  ts: z.number(), // epoch ms
});
export type OfficeEvent = z.infer<typeof officeEventSchema>;

// 도구 -> 상태 매핑을 코드 분기가 아닌 데이터로(phase_16 T6). 미지의 도구는 idle로 폴백.
const TOOL_STATE: Record<string, DuckWorkState> = {
  Edit: "typing",
  Write: "typing",
  NotebookEdit: "typing",
  Read: "reading",
  Grep: "reading",
  Glob: "reading",
  Bash: "server",
  Task: "reading",
};

// 이벤트 -> 오리 상태. 에러는 도구와 무관하게 물음표(question)가 우선.
export function eventToState(event: Pick<OfficeEvent, "tool" | "status">): DuckWorkState {
  if (event.status === "error") return "question";
  return TOOL_STATE[event.tool] ?? "idle";
}

// JSONL(한 줄 = 한 이벤트) 파싱. malformed 줄은 크래시 없이 건너뛴다(로그 tail은 깨진 줄이 흔함).
export function parseOfficeEvents(jsonl: string): OfficeEvent[] {
  const out: OfficeEvent[] = [];
  for (const line of jsonl.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const parsed = officeEventSchema.safeParse(JSON.parse(trimmed));
      if (parsed.success) out.push(parsed.data);
    } catch {
      // 깨진 JSON 줄은 무시.
    }
  }
  return out;
}
