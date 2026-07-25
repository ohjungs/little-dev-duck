// 2026-07-26 : RAG - 임베딩문구 - 날짜누락
// 오리는 검색된 자료(임베딩 청크)만 근거로 답한다. 그런데 할 일은 "제목 (미완료)", 일정은
// "제목"만 담고 있어서 **언제인지가 자료에 아예 없었다.** "이번 주 마감 뭐 있어?"
// "내일 몇 시에 회의야?"는 답할 근거가 없는 질문이 된다 — 대화창 예시 칩에 걸어 둔 문장이
// 정확히 그거였고, 그때는 라우팅만 확인하고 **답할 재료가 있는지는 확인하지 않았다.**
//
// 오리 프롬프트에는 오늘 날짜가 주입되므로(agent.ts) 절대 날짜만 넣으면 상대 표현을 계산할 수
// 있다. "내일" 같은 상대 표현은 다음 날 거짓이 되므로 임베딩에 넣지 않는다.
//
// core에 둔 이유: apps/web(위젯)과 packages/api(오리가 만든 항목)가 **각자 문구를 만들고
// 있었다.** 그래서 한쪽만 고치면 다른 쪽은 그대로였다. 규약은 한 곳에서만 정의한다.

import { toLocalDateString } from "./date-util";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * 할일 RAG 임베딩 텍스트.
 * dueDate는 **UTC 자정**으로 저장된다(Phase 23 규약) — 로컬 변환에 태우면 하루가 밀리므로
 * 앞 10자리를 그대로 쓴다. dueDateLabel.ts와 같은 규약이다.
 */
export function todoEmbedText(
  title: string,
  isDone: boolean,
  dueDate?: string | null,
): string {
  const base = `${title} (${isDone ? "완료" : "미완료"})`;
  const date = dueDate?.slice(0, 10);
  if (!date || !DATE_RE.test(date)) return base;
  return `${title} (${isDone ? "완료" : "미완료"}, 마감 ${date})`;
}

function localTime(iso: string): { date: string; time: string | null } | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const p = (n: number) => String(n).padStart(2, "0");
  const time =
    d.getHours() === 0 && d.getMinutes() === 0
      ? null // 로컬 자정 = 종일 일정(Phase 27 규약, 화면도 같은 기준으로 시각을 감춘다)
      : `${p(d.getHours())}:${p(d.getMinutes())}`;
  return { date: toLocalDateString(d), time };
}

/**
 * 일정 RAG 임베딩 텍스트.
 * startAt/endAt은 **로컬 자정** 기준으로 저장된다(Phase 27 규약 — 할 일과 반대다).
 * `slice(0, 10)`으로 자르면 UTC 날짜가 나와 KST에서 전날이 된다.
 */
export function calendarEventEmbedText(
  title: string,
  startAt: string,
  endAt?: string | null,
): string {
  const start = localTime(startAt);
  // 시각을 못 읽으면 날짜를 지어내지 않는다 — 틀린 날짜가 자료에 들어가면 오리가 그걸 근거로 답한다.
  if (!start) return title;

  const end = endAt ? localTime(endAt) : null;
  const when = start.time
    ? `${start.date} ${start.time}${end?.time ? `~${end.time}` : ""}`
    : start.date;
  return title ? `${title} (일정 ${when})` : `일정 ${when}`;
}
