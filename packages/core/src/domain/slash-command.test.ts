import { describe, expect, it } from "vitest";
import {
  SLASH_COMMANDS,
  matchSlashCommands,
  parseSlashCommand,
  slashReceiptText,
} from "./slash-command";

describe("parseSlashCommand", () => {
  it("슬래시로 시작하지 않으면 커맨드가 아니다", () => {
    expect(parseSlashCommand("안녕")).toBeNull();
    expect(parseSlashCommand("경로는 /tmp 입니다")).toBeNull();
  });

  it("/할일 제목 → 할 일", () => {
    expect(parseSlashCommand("/할일 우유 사기")).toEqual({
      ok: true,
      cmd: { kind: "todo", title: "우유 사기" },
    });
  });

  it("/할일 제목 없음 → 오류 (빈 할 일을 조용히 만들지 않는다)", () => {
    const r = parseSlashCommand("/할일");
    expect(r).toMatchObject({ ok: false });
    expect(r && !r.ok ? r.error : "").toContain("제목");
  });

  it("/일정 날짜 제목 → 시각 없는 일정", () => {
    expect(parseSlashCommand("/일정 2026-07-30 치과")).toEqual({
      ok: true,
      cmd: { kind: "event", date: "2026-07-30", time: null, title: "치과" },
    });
  });

  it("/일정 날짜 시각 제목 → 시각 있는 일정", () => {
    expect(parseSlashCommand("/일정 2026-07-30 14:00 치과 예약")).toEqual({
      ok: true,
      cmd: { kind: "event", date: "2026-07-30", time: "14:00", title: "치과 예약" },
    });
  });

  it("달력에 없는 날짜는 거부한다 (2026-02-30)", () => {
    expect(parseSlashCommand("/일정 2026-02-30 치과")).toMatchObject({ ok: false });
    expect(parseSlashCommand("/일정 2026-13-01 치과")).toMatchObject({ ok: false });
  });

  it("윤년 2월 29일은 통과한다", () => {
    expect(parseSlashCommand("/일정 2028-02-29 치과")).toMatchObject({ ok: true });
  });

  it("잘못된 시각은 거부한다 (25:00)", () => {
    expect(parseSlashCommand("/일정 2026-07-30 25:00 치과")).toMatchObject({ ok: false });
  });

  it("시각처럼 보이는 제목은 시각으로 삼키지 않는다 — 14:00만 있고 제목이 없으면 오류", () => {
    // "/일정 2026-07-30 14:00"까지만 치면 제목이 없다. 14:00을 제목으로 넘기지 않는다.
    expect(parseSlashCommand("/일정 2026-07-30 14:00")).toMatchObject({ ok: false });
  });

  it("/일정 날짜 없음 → 오류 (사용법을 알려 준다)", () => {
    const r = parseSlashCommand("/일정 치과");
    expect(r).toMatchObject({ ok: false });
    expect(r && !r.ok ? r.error : "").toContain("YYYY-MM-DD");
  });

  it("모르는 커맨드는 무엇이 있는지 알려 준다", () => {
    const r = parseSlashCommand("/없는것 어쩌구");
    expect(r).toMatchObject({ ok: false });
    expect(r && !r.ok ? r.error : "").toContain("할일");
  });

  it("슬래시만 치면 커맨드 목록을 안내한다", () => {
    expect(parseSlashCommand("/")).toMatchObject({ ok: false });
  });

  it("앞뒤 공백을 정리한다", () => {
    expect(parseSlashCommand("  /할일   우유  ")).toEqual({
      ok: true,
      cmd: { kind: "todo", title: "우유" },
    });
  });
});

describe("matchSlashCommands (자동완성)", () => {
  it("슬래시만 치면 전부 보여 준다 (커맨드가 있는지 모르면 아무도 안 쓴다)", () => {
    expect(matchSlashCommands("/")).toHaveLength(SLASH_COMMANDS.length);
  });

  it("앞글자로 거른다", () => {
    const m = matchSlashCommands("/할");
    expect(m).toHaveLength(1);
    expect(m[0]!.name).toBe("할일");
  });

  it("공백이 나오면(인자 입력 중) 팝업을 접는다", () => {
    expect(matchSlashCommands("/할일 우유")).toHaveLength(0);
  });

  it("슬래시로 시작하지 않으면 비어 있다", () => {
    expect(matchSlashCommands("안녕")).toHaveLength(0);
    expect(matchSlashCommands("")).toHaveLength(0);
  });

  it("일치하는 게 없으면 비어 있다", () => {
    expect(matchSlashCommands("/zzz")).toHaveLength(0);
  });
});

describe("slashReceiptText", () => {
  it("할 일 영수증", () => {
    expect(slashReceiptText({ kind: "todo", title: "우유 사기" })).toBe(
      '"우유 사기" 할 일을 만들었어요',
    );
  });

  it("시각 없는 일정 영수증", () => {
    expect(slashReceiptText({ kind: "event", date: "2026-07-30", time: null, title: "치과" })).toBe(
      '"치과" 일정을 만들었어요 (2026-07-30)',
    );
  });

  it("시각 있는 일정 영수증", () => {
    expect(
      slashReceiptText({ kind: "event", date: "2026-07-30", time: "14:00", title: "치과" }),
    ).toBe('"치과" 일정을 만들었어요 (2026-07-30 14:00)');
  });
});
