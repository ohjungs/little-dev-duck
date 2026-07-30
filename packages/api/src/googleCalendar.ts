import { z } from "zod";
import { LddError, type ToolCall, type ToolDeclaration, type ToolResult } from "@ldd/core";
import type { Adapter } from "./agent";
import { safeBody, upstreamError } from "./gemini";

// Phase 10 T3 첫 어댑터: Google Calendar. 승인 게이트 검증용으로 조회(readonly)/생성(mutating) 2개 도구.
// 액세스 토큰은 Supabase가 로그인 시 캡처한 provider_token을 주입한다(어댑터는 토큰 획득/갱신을 모른다).
const CAL_BASE =
  "https://www.googleapis.com/calendar/v3/calendars/primary/events";

const listDecl: ToolDeclaration = {
  name: "listUpcomingEvents",
  description: "사용자의 다가오는 캘린더 일정을 조회한다.",
  parameters: {
    type: "object",
    properties: {
      maxResults: {
        type: "integer",
        description: "가져올 최대 개수(기본 10, 최대 50)",
      },
    },
  },
  kind: "readonly",
};

const createDecl: ToolDeclaration = {
  name: "createCalendarEvent",
  description:
    "새 캘린더 일정을 만든다. 시작/종료는 ISO 8601(예: 2026-07-23T10:00:00+09:00). " +
    "종료 시각을 모르면 생략해도 된다(시작 시각 기준 1시간짜리 일정으로 자동 처리됨).",
  parameters: {
    type: "object",
    properties: {
      title: { type: "string", description: "일정 제목" },
      start: { type: "string", description: "시작 시각(ISO 8601)" },
      end: { type: "string", description: "종료 시각(ISO 8601, 선택 — 없으면 시작+1시간)" },
    },
    required: ["title", "start"],
  },
  kind: "mutating",
};

// 2026-07-30 : 캘린더 - 일정 수정 (감사 발견)
// 조회·생성만 있어서 "그 회의 3시로 바꿔줘"가 성립하지 않았다. eventId는 listUpcomingEvents가
// 이미 돌려주므로(Gmail trashEmail이 messageId를 받는 것과 같은 패턴) 새 조회 경로가 필요 없다.
//
// **삭제는 넣지 않았다**: Google Calendar API의 events.delete가 되돌릴 수 있는지(휴지통 경유)
// 확인하지 못했고, 이 저장소는 Gmail에서 이미 "영구삭제 금지, 휴지통 이동만"을 원칙으로 세웠다
// (CLAUDE.md 5절). 같은 근거를 캘린더에도 적용해, 되돌리기 보장을 확인한 뒤에만 추가한다.
//
// title은 **표시용 현재 제목**이다(승인 카드가 eventId만으론 어느 일정인지 못 보여준다 —
// Gmail의 subject와 같은 역할). 실제로 바뀌는 값은 newTitle·start·end다.
const updateDecl: ToolDeclaration = {
  name: "updateCalendarEvent",
  description:
    "기존 캘린더 일정의 제목이나 시각을 바꾼다. eventId는 listUpcomingEvents 결과의 id를 쓴다. " +
    "바꾸려는 항목만 넘기면 나머지는 그대로 유지된다. 시각은 ISO 8601. " +
    "일정을 지우는 기능은 제공하지 않는다.",
  parameters: {
    type: "object",
    properties: {
      eventId: {
        type: "string",
        description: "수정할 일정의 id(listUpcomingEvents 결과의 id 값)",
      },
      title: {
        type: "string",
        description:
          "수정할 일정의 현재 제목(listUpcomingEvents에서 본 title을 그대로 포함 — 승인 카드 표시용)",
      },
      newTitle: { type: "string", description: "새 제목(제목을 바꿀 때만)" },
      start: { type: "string", description: "새 시작 시각(ISO 8601, 시각을 바꿀 때만)" },
      end: { type: "string", description: "새 종료 시각(ISO 8601, 선택)" },
    },
    required: ["eventId"],
  },
  kind: "mutating",
};

// LLM 산출 args 재검증(인젝션/할루시네이션 방어, T0-5). 실행 직전 도구별 스키마로 파싱한다.
const listArgs = z.object({ maxResults: z.number().int().min(1).max(50).optional() });
const createArgs = z.object({
  title: z.string().min(1),
  start: z.string().min(1),
  end: z.string().min(1).optional(),
});
const updateArgs = z.object({
  // eventId는 URL 경로에 그대로 삽입된다 — Gmail messageId·GitHub owner/repo와 같은
  // confused-deputy 방어(경로 탈출·쿼리 주입 차단). 반복 일정 인스턴스 id에는 `_`와 대문자가
  // 들어가므로 영숫자와 `-`·`_`까지 허용한다.
  eventId: z
    .string()
    .min(1)
    .max(1024)
    .regex(/^[A-Za-z0-9_-]+$/, "올바른 일정 id 형식이 아닙니다"),
  newTitle: z.string().min(1).optional(),
  start: z.string().min(1).optional(),
  end: z.string().min(1).optional(),
});

const DEFAULT_DURATION_MS = 60 * 60 * 1000;

// 종료 시각이 없거나 시작 이후가 아니면(모델이 start=end로 채우는 실사용 버그 확인, 2026-07-23) 시작+1시간을
// 기본값으로 쓴다 — 프롬프트 안내만으론 모델 준수를 보장 못 해 서버에서 결정론적으로 보정한다.
function resolveEnd(start: string, end: string | undefined): string {
  const startMs = new Date(start).getTime();
  if (end && !Number.isNaN(startMs)) {
    const endMs = new Date(end).getTime();
    if (!Number.isNaN(endMs) && endMs > startMs) return end;
  }
  if (Number.isNaN(startMs)) return end ?? start; // 파싱 불가면 원본 그대로 둬 Google API가 검증하게 한다.
  return new Date(startMs + DEFAULT_DURATION_MS).toISOString();
}

// Google Calendar 이벤트 응답 중 우리가 모델에 되먹일 최소 필드만 추린다.
type GCalEvent = {
  id?: string;
  summary?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
};

function errorResult(call: ToolCall, message: string): ToolResult {
  return { id: call.id, name: call.name, response: { error: message } };
}

// 시각이 있는 일정의 길이(ms). 종일 일정(date만 있음)이나 파싱 불가면 null.
function eventDurationMs(event: GCalEvent): number | null {
  const startMs = new Date(event.start?.dateTime ?? "").getTime();
  const endMs = new Date(event.end?.dateTime ?? "").getTime();
  if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs <= startMs) return null;
  return endMs - startMs;
}

export function createGoogleCalendarAdapter(
  accessToken: string,
  fetchImpl: typeof fetch = fetch,
): Adapter {
  async function gcalFetch(url: string, init?: RequestInit): Promise<unknown> {
    const res = await fetchImpl(url, {
      ...init,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        ...init?.headers,
      },
    });
    if (!res.ok) {
      // access_token은 짧은 수명(~1시간)이고 이 어댑터는 갱신을 모른다(토큰 재발급은 별도 관심사).
      // 401은 "만료/무효"로 구분해 라우트가 일반 502 대신 "재연동 필요" 안내를 줄 수 있게 한다.
      if (res.status === 401) {
        throw new LddError("unauthorized", "Google Calendar 인증이 만료되었습니다");
      }
      throw upstreamError(res.status, await safeBody(res), "google-calendar");
    }
    return res.json();
  }

  return {
    catalog: [listDecl, createDecl, updateDecl],
    async execute(call: ToolCall): Promise<ToolResult> {
      if (call.name === listDecl.name) {
        const parsed = listArgs.safeParse(call.args);
        if (!parsed.success) return errorResult(call, "조회 파라미터가 올바르지 않습니다.");
        const maxResults = parsed.data.maxResults ?? 10;
        const params = new URLSearchParams({
          maxResults: String(maxResults),
          singleEvents: "true",
          orderBy: "startTime",
          timeMin: new Date().toISOString(),
        });
        const data = (await gcalFetch(`${CAL_BASE}?${params}`)) as {
          items?: GCalEvent[];
        };
        const events = (data.items ?? []).map((e) => ({
          id: e.id,
          title: e.summary ?? "(제목 없음)",
          start: e.start?.dateTime ?? e.start?.date,
          end: e.end?.dateTime ?? e.end?.date,
        }));
        return { id: call.id, name: call.name, response: { events } };
      }

      if (call.name === createDecl.name) {
        const parsed = createArgs.safeParse(call.args);
        if (!parsed.success) return errorResult(call, "일정 정보가 올바르지 않습니다.");
        const { title, start, end } = parsed.data;
        const created = (await gcalFetch(CAL_BASE, {
          method: "POST",
          body: JSON.stringify({
            summary: title,
            start: { dateTime: start },
            end: { dateTime: resolveEnd(start, end) },
          }),
        })) as GCalEvent;
        return {
          id: call.id,
          name: call.name,
          response: { created: { id: created.id, title: created.summary ?? title } },
        };
      }

      if (call.name === updateDecl.name) {
        const parsed = updateArgs.safeParse(call.args);
        if (!parsed.success) return errorResult(call, "일정 정보가 올바르지 않습니다.");
        const { eventId, newTitle, start, end } = parsed.data;
        // 빈 PATCH를 보내면 Google은 200을 주고 아무것도 안 바꾼다 — "바꿨다"는 거짓 보고가 된다.
        if (newTitle === undefined && start === undefined) {
          return errorResult(call, "바꿀 제목이나 시작 시각을 알려 주세요.");
        }

        const body: Record<string, unknown> = {};
        if (newTitle !== undefined) body.summary = newTitle;
        if (start !== undefined) {
          body.start = { dateTime: start };
          // 시작만 바꾸면 종료도 함께 보내야 한다 — 새 시작이 기존 종료보다 늦으면 Google이
          // 거부한다. 이때 종료를 "시작+1시간"으로 밀면 2시간 회의가 조용히 1시간이 된다
          // (사용자가 요청하지 않은 데이터 손실). 그래서 원래 길이를 먼저 읽어 그대로 유지한다.
          let durationMs: number | null = null;
          if (end === undefined) {
            const original = (await gcalFetch(`${CAL_BASE}/${eventId}`)) as GCalEvent;
            durationMs = eventDurationMs(original);
          }
          const startMs = new Date(start).getTime();
          body.end =
            end !== undefined
              ? { dateTime: resolveEnd(start, end) }
              : {
                  dateTime: Number.isNaN(startMs)
                    ? start // 파싱 불가면 Google API가 검증하게 둔다(create와 같은 원칙).
                    : new Date(startMs + (durationMs ?? DEFAULT_DURATION_MS)).toISOString(),
                };
        }

        const updated = (await gcalFetch(`${CAL_BASE}/${eventId}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        })) as GCalEvent;
        return {
          id: call.id,
          name: call.name,
          response: {
            updated: { id: updated.id ?? eventId, title: updated.summary ?? newTitle },
          },
        };
      }

      return errorResult(call, "지원하지 않는 도구입니다.");
    },
  };
}
