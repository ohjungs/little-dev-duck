// 2026-07-29 : 메신저 - 대화 내보내기 텍스트 조립 (Phase 55 T2 Q-001)
//
// 방 대화를 사람이 읽는 .txt로 만든다. **날짜·시각은 KST** — 이 저장소의 날짜 경계 원칙
// 그대로다(dayKey 재사용). 새 백업 체계를 만드는 것이 아니다(백업 v4는 그대로) —
// 이건 "이 방을 파일로 들고 나가기"라는 별개의 작은 문이다.

import { dayKey } from "./message-timeline";
import { messageBody, type Message } from "./room";

/** 그 시각의 KST 시:분. 해석 불가면 "--:--" — 줄 하나 때문에 내보내기가 죽으면 안 된다. */
function kstTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "--:--";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(d);
}

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
      lines.push(`${kstTime(m.createdAt)} (알림) ${body}`);
    } else {
      lines.push(`${kstTime(m.createdAt)} ${senderLabel(m, myUserId)}: ${body}`);
    }
  }

  return lines.join("\n");
}

/** 내려받을 파일 이름. OS가 거부하는 문자는 걷어낸다 — 저장 대화상자가 안 뜨面 원인을 모른다. */
export function transcriptFileName(roomTitle: string | null, dateKey: string): string {
  const safe = (roomTitle ?? "").replace(/[/\\:*?"<>|]/g, "").trim();
  return safe === "" ? `대화-${dateKey}.txt` : `대화-${safe}-${dateKey}.txt`;
}

