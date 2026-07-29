import { describe, expect, it } from "vitest";
import { formatTranscript, transcriptFileName } from "./transcript";

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
