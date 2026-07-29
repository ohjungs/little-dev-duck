// 2026-07-29 : 메신저 - 대화 내보내기 텍스트 조립 (Phase 55 T2 Q-001)
//
// 방 대화를 사람이 읽는 .txt로 만든다. **날짜·시각은 KST** — 이 저장소의 날짜 경계 원칙
// 그대로다(dayKey 재사용). 새 백업 체계를 만드는 것이 아니다(백업 v4는 그대로) —
// 이건 "이 방을 파일로 들고 나가기"라는 별개의 작은 문이다.

import { dayKey } from "./message-timeline";
import { kstTimeString } from "./date-util";
import { messageBody, type Message } from "./room";

type TranscriptMessage = Pick<
  Message,
  "seq" | "body" | "senderType" | "senderUserId" | "type" | "createdAt" | "deletedAt"
>;

/**
 * 발화자 라벨. 단일 사용자 제품이라 "나/오리"가 자연스럽고,
 * 훗날 다른 사람이 생겨도(그룹) "상대"로 틀리지 않게 적는다.
 */
function senderLabel(m: TranscriptMessage, myUserId: string): string {
  if (m.senderType === "agent") return "오리";
  return m.senderUserId === myUserId ? "나" : "상대";
}

export function formatTranscript(
  messages: readonly TranscriptMessage[],
  myUserId: string,
): string {
  const lines: string[] = [];
  let lastDay = "";

  for (const m of [...messages].sort((a, b) => a.seq - b.seq)) {
    const day = dayKey(m.createdAt);
    if (day !== "" && day !== lastDay) {
      if (lines.length > 0) lines.push("");
      lines.push(`=== ${day} ===`);
      lastDay = day;
    }
    const body = messageBody(m); // 지운 것은 안내 문구로 — 내보내기가 삭제를 되살리면 안 된다
    if (m.type === "system") {
      lines.push(`${kstTimeString(m.createdAt)} (알림) ${body}`);
    } else {
      lines.push(`${kstTimeString(m.createdAt)} ${senderLabel(m, myUserId)}: ${body}`);
    }
  }

  return lines.join("\n");
}

// 2026-07-29 : 메신저 - 대화 내보내기 md·json (Phase 55 T2 Q-002)
// 세 형식이 **같은 정책 한 벌**을 쓴다: seq 정렬 · KST 날짜 경계 · 발화자 판정 ·
// 지운 메시지는 안내 문구(messageBody). 형식마다 판정이 갈라지면 어느 파일이 맞는지 모른다.

export function formatTranscriptMarkdown(
  messages: readonly TranscriptMessage[],
  myUserId: string,
): string {
  const lines: string[] = [];
  let lastDay = "";

  for (const m of [...messages].sort((a, b) => a.seq - b.seq)) {
    const day = dayKey(m.createdAt);
    if (day !== "" && day !== lastDay) {
      if (lines.length > 0) lines.push("");
      lines.push(`## ${day}`, "");
      lastDay = day;
    }
    // 본문은 이스케이프 없이 그대로 담는다 — 파일의 원문 충실이 렌더 모양보다 먼저다.
    const body = messageBody(m);
    if (m.type === "system") {
      lines.push(`**${kstTimeString(m.createdAt)}** (알림) ${body}`, "");
    } else {
      lines.push(`**${kstTimeString(m.createdAt)} ${senderLabel(m, myUserId)}**: ${body}`, "");
    }
  }

  // 마지막 빈 줄은 군더더기다.
  while (lines[lines.length - 1] === "") lines.pop();
  return lines.join("\n");
}

/**
 * 기계가 읽을 구조화 목록. 원본 행을 통째로 쏟지 않는다 — 지운 메시지의 body가
 * 그대로 나가면 삭제를 되살리는 셈이다. 라벨·문구 판정은 txt와 같은 함수를 쓴다.
 */
export function transcriptJson(
  messages: readonly TranscriptMessage[],
  myUserId: string,
): string {
  const items = [...messages]
    .sort((a, b) => a.seq - b.seq)
    .map((m) => ({
      seq: m.seq,
      at: m.createdAt,
      sender: m.type === "system" ? "알림" : senderLabel(m, myUserId),
      type: m.type,
      body: messageBody(m),
      deleted: m.deletedAt !== null,
    }));
  return JSON.stringify(items, null, 2);
}

export type TranscriptFormat = "txt" | "md" | "json";

/** 내려받을 파일 이름. OS가 거부하는 문자는 걷어낸다 — 저장 대화상자가 안 뜨면 원인을 모른다. */
export function transcriptFileName(
  roomTitle: string | null,
  dateKey: string,
  ext: TranscriptFormat = "txt",
): string {
  const safe = (roomTitle ?? "").replace(/[/\\:*?"<>|]/g, "").trim();
  return safe === "" ? `대화-${dateKey}.${ext}` : `대화-${safe}-${dateKey}.${ext}`;
}

