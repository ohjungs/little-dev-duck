import { describe, expect, it } from "vitest";
import {
  formatTranscript,
  formatTranscriptMarkdown,
  transcriptJson,
  transcriptFileName,
  quoteSourceLabel,
} from "./transcript";

const ME = "me-user";

const m = (o: {
  seq: number;
  body: string;
  senderType?: "user" | "agent";
  senderUserId?: string | null;
  type?: "text" | "system";
  createdAt?: string;
  deletedAt?: string | null;
}) => ({
  id: `id-${o.seq}`,
  seq: o.seq,
  body: o.body,
  senderType: o.senderType ?? "user",
  senderUserId: o.senderUserId === undefined ? ME : o.senderUserId,
  type: o.type ?? ("text" as const),
  createdAt: o.createdAt ?? "2026-07-29T01:00:00.000Z", // KST 10:00
  deletedAt: o.deletedAt ?? null,
});

describe("formatTranscript (대화 .txt 조립)", () => {
  it("날짜 구분줄과 시각(KST)·발화자·본문을 적는다", () => {
    const text = formatTranscript([m({ seq: 1, body: "안녕" })], ME);
    expect(text).toContain("=== 2026-07-29 ===");
    expect(text).toContain("10:00 나: 안녕");
  });

  it("오리(agent)와 다른 사람을 구분한다", () => {
    const text = formatTranscript(
      [
        m({ seq: 1, body: "꽥", senderType: "agent", senderUserId: null }),
        m({ seq: 2, body: "왔니", senderUserId: "other" }),
      ],
      ME,
    );
    expect(text).toContain("오리: 꽥");
    expect(text).toContain("상대: 왔니");
  });

  it("날짜가 바뀌면 구분줄을 다시 넣는다 (KST 기준)", () => {
    const text = formatTranscript(
      [
        m({ seq: 1, body: "어제 말", createdAt: "2026-07-28T13:00:00.000Z" }),
        // UTC 28일 15:30 = KST 29일 00:30 — UTC로 같은 날처럼 보여도 KST로 나뉜다.
        m({ seq: 2, body: "자정 넘어", createdAt: "2026-07-28T15:30:00.000Z" }),
      ],
      ME,
    );
    expect(text).toContain("=== 2026-07-28 ===");
    expect(text).toContain("=== 2026-07-29 ===");
  });

  it("지운 메시지는 안내 문구로 남는다 (본문을 되살리지 않는다)", () => {
    const text = formatTranscript(
      [m({ seq: 1, body: "비밀", deletedAt: "2026-07-29T02:00:00.000Z" })],
      ME,
    );
    expect(text).toContain("삭제된 메시지입니다");
    expect(text).not.toContain("비밀");
  });

  it("system 영수증은 발화자 없이 적는다", () => {
    const text = formatTranscript(
      [m({ seq: 1, body: '"x" 할 일을 만들었어요', type: "system" })],
      ME,
    );
    expect(text).toContain('(알림) "x" 할 일을 만들었어요');
    expect(text).not.toContain("나: \"x\"");
  });

  it("빈 목록은 빈 문자열", () => {
    expect(formatTranscript([], ME)).toBe("");
  });
});

describe("transcriptFileName", () => {
  it("방 이름과 날짜로 만든다", () => {
    expect(transcriptFileName("오리와의 대화", "2026-07-29")).toBe(
      "대화-오리와의 대화-2026-07-29.txt",
    );
  });

  it("이름이 없으면 기본 이름", () => {
    expect(transcriptFileName(null, "2026-07-29")).toBe("대화-2026-07-29.txt");
  });

  it("파일명에 못 쓰는 문자는 걷어낸다", () => {
    expect(transcriptFileName('a/b\\c:d*e?"<>|', "2026-07-29")).toBe(
      "대화-abcde-2026-07-29.txt",
    );
  });
});

// 2026-07-29 : 메신저 - 대화 내보내기 md·json (Phase 55 T2 Q-002)
describe("formatTranscriptMarkdown", () => {
  it("날짜를 헤딩으로, 발화자를 굵게 적는다", () => {
    const md = formatTranscriptMarkdown([m({ seq: 1, body: "안녕" })], ME);
    expect(md).toContain("## 2026-07-29");
    expect(md).toContain("**10:00 나**: 안녕");
  });

  it("여러 줄 본문을 줄 그대로 보존한다", () => {
    const md = formatTranscriptMarkdown([m({ seq: 1, body: "첫 줄\n둘째 줄" })], ME);
    expect(md).toContain("첫 줄\n둘째 줄");
  });

  it("지운 메시지는 안내 문구로 남는다 (txt와 같은 정책)", () => {
    const md = formatTranscriptMarkdown(
      [m({ seq: 1, body: "비밀", deletedAt: "2026-07-29T02:00:00.000Z" })],
      ME,
    );
    expect(md).toContain("삭제된 메시지입니다");
    expect(md).not.toContain("비밀");
  });

  it("system 영수증은 발화자 없이 (알림)으로 적는다", () => {
    const md = formatTranscriptMarkdown(
      [m({ seq: 1, body: "할 일을 만들었어요", type: "system" })],
      ME,
    );
    expect(md).toContain("(알림) 할 일을 만들었어요");
  });

  it("seq 순서로 정렬한다 (도착 순서를 믿지 않는다)", () => {
    const md = formatTranscriptMarkdown(
      [m({ seq: 2, body: "둘째" }), m({ seq: 1, body: "첫째" })],
      ME,
    );
    expect(md.indexOf("첫째")).toBeLessThan(md.indexOf("둘째"));
  });

  it("빈 목록은 빈 문자열", () => {
    expect(formatTranscriptMarkdown([], ME)).toBe("");
  });
});

describe("transcriptJson", () => {
  it("JSON.parse로 되읽히는 구조화 목록이다", () => {
    const parsed = JSON.parse(
      transcriptJson([m({ seq: 1, body: "안녕" })], ME),
    ) as Array<Record<string, unknown>>;
    expect(parsed).toHaveLength(1);
    expect(parsed[0]).toMatchObject({
      seq: 1,
      sender: "나",
      type: "text",
      body: "안녕",
      deleted: false,
      at: "2026-07-29T01:00:00.000Z",
    });
  });

  it("지운 메시지는 본문 대신 안내 문구 + deleted 표시 (원문 미포함)", () => {
    const raw = transcriptJson(
      [m({ seq: 1, body: "비밀", deletedAt: "2026-07-29T02:00:00.000Z" })],
      ME,
    );
    expect(raw).not.toContain("비밀");
    const parsed = JSON.parse(raw) as Array<{ deleted: boolean }>;
    expect(parsed[0].deleted).toBe(true);
  });

  it("seq 순서로 정렬한다", () => {
    const parsed = JSON.parse(
      transcriptJson([m({ seq: 5, body: "b" }), m({ seq: 2, body: "a" })], ME),
    ) as Array<{ seq: number }>;
    expect(parsed.map((p) => p.seq)).toEqual([2, 5]);
  });

  it("오리·상대 라벨이 txt와 같은 판정을 쓴다", () => {
    const parsed = JSON.parse(
      transcriptJson(
        [
          m({ seq: 1, body: "꽥", senderType: "agent", senderUserId: null }),
          m({ seq: 2, body: "왔니", senderUserId: "other" }),
        ],
        ME,
      ),
    ) as Array<{ sender: string }>;
    expect(parsed.map((p) => p.sender)).toEqual(["오리", "상대"]);
  });
});

describe("transcriptFileName — 확장자", () => {
  it("md·json 확장자를 받는다", () => {
    expect(transcriptFileName(null, "2026-07-29", "md")).toBe("대화-2026-07-29.md");
    expect(transcriptFileName("방", "2026-07-29", "json")).toBe("대화-방-2026-07-29.json");
  });
});

// 2026-07-29 : 메신저 - 노트에서 채팅 인용 (Phase 59 T1 S-008)
describe("quoteSourceLabel (인용 출처 라벨)", () => {
  it("발화자·KST 날짜·시각을 적는다 — transcript와 같은 판정 한 벌", () => {
    expect(quoteSourceLabel(m({ seq: 1, body: "안녕" }), ME)).toBe("나 · 2026-07-29 10:00");
  });

  it("오리(agent)는 오리로 적는다", () => {
    expect(
      quoteSourceLabel(m({ seq: 1, body: "꽥", senderType: "agent", senderUserId: null }), ME),
    ).toBe("오리 · 2026-07-29 10:00");
  });

  it("시스템 메시지는 알림으로 적는다 (transcriptJson과 같은 라벨)", () => {
    expect(quoteSourceLabel(m({ seq: 1, body: "변환했어요", type: "system" }), ME)).toBe(
      "알림 · 2026-07-29 10:00",
    );
  });
});
