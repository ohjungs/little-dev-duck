import { describe, it, expect } from "vitest";
import { buildBackup, type BackupCollections } from "./backup";
import { parseBackup } from "./backup-parse";
import { planRestore } from "./backup-restore-plan";

// 2026-07-26 : 백업 - 라운드트립 - 무손실 검증 (Phase 29 T3)
// 내보내기 → 파일(JSON 문자열) → 가져오기 판정 → 복원 계획까지 통과시켜 **한 필드도 잃지
// 않는지** 본다. 조각별 테스트는 전부 통과하면서도 사슬 어딘가에서 필드가 조용히 사라질 수 있다.
//
// 특히 잡으려는 부류: 나중에 컬럼을 추가하면서 **도메인 스키마에 넣는 걸 잊는 경우**.
// planRestore는 스키마로 safeParse하므로 스키마에 없는 필드는 말없이 떨어진다 — 그러면
// 사용자는 백업했다고 믿은 값을 복원 때 잃는다. 여기서 값을 하나하나 대조해 그 순간 실패시킨다.
//
// 실제 DB 쓰기는 여기서 하지 않는다(순수 경로만). 쓰기 단계가 의도적으로 바꾸는 것들
// (plain_text 재파생, 공개 상태 미복원, user_id를 로그인 사용자로 교체)은 api 테스트가 잠근다.

const U = (n: number) => `0000000${n}-0000-4000-8000-000000000000`.slice(-36);
const uid = U(9);
const ts = "2026-07-20T01:02:03.000Z";

// 모든 선택 필드까지 값을 채운다 — 기본값으로 비워 두면 "잃어도 티가 안 나는" 필드가 생긴다.
const FULL: BackupCollections = {
  todos: [
    {
      id: U(1),
      userId: uid,
      title: "장보기 🥕 우유·달걀",
      isDone: true,
      dueDate: "2026-07-28T00:00:00.000Z",
      recurrence: "FREQ=WEEKLY;BYDAY=TU",
      createdAt: ts,
      updatedAt: ts,
    },
  ],
  memos: [
    {
      id: U(2),
      userId: uid,
      title: "회의록",
      content: "줄바꿈\n따옴표 \" 백슬래시 \\ 이모지 🦆 한글",
      createdAt: ts,
      updatedAt: ts,
    },
  ],
  habits: [
    {
      id: U(3),
      userId: uid,
      title: "운동",
      frequency: "weekly",
      timesPerWeek: 3,
      createdAt: ts,
      updatedAt: ts,
    },
  ],
  habitChecks: [
    { id: U(4), habitId: U(3), userId: uid, checkedDate: "2026-07-20", createdAt: ts },
  ],
  calendarEvents: [
    {
      id: U(5),
      userId: uid,
      title: "치과",
      startAt: "2026-07-28T09:00:00.000Z",
      endAt: "2026-07-28T10:00:00.000Z",
      createdAt: ts,
      updatedAt: ts,
    },
  ],
  pages: [
    {
      id: U(6),
      userId: uid,
      parentId: null,
      title: "부모 문서",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "안녕하세요 🦆" }] },
        { type: "table", content: { type: "tableContent", rows: [{ cells: [["칸"]] }] } },
      ],
      plainText: "안녕하세요 🦆 칸",
      icon: "📄",
      isTrashed: false,
      trashedAt: null,
      createdAt: ts,
      updatedAt: ts,
      dbSchema: null,
      rowProps: { 색상: "빨강", 개수: 3, 완료: true },
      isPublic: true,
      publicSlug: "abc123",
      coverUrl: "https://example.com/c.png",
    },
    {
      id: U(7),
      userId: uid,
      parentId: U(6),
      title: "자식 문서",
      content: [],
      plainText: "",
      icon: null,
      isTrashed: false,
      trashedAt: null,
      createdAt: ts,
      updatedAt: ts,
      dbSchema: null,
      rowProps: {},
      isPublic: false,
      publicSlug: null,
      coverUrl: null,
    },
  ],
};

// 내보내기 → 파일 → 가져오기 판정 → 복원 계획. 실제 사용자 경로 그대로.
function roundTrip(collections: BackupCollections) {
  const exported = buildBackup(collections, ts, {});
  // 파일로 나갔다가 다시 들어오는 과정을 실제 문자열로 거친다(JSON이 못 담는 값을 여기서 드러낸다).
  const raw: unknown = JSON.parse(JSON.stringify(exported));
  const parsed = parseBackup(raw);
  if (!parsed.ok) throw new Error(`가져오기가 거부함: ${parsed.reason}`);
  return planRestore(parsed.backup);
}

describe("백업 라운드트립", () => {
  it("우리가 내보낸 파일은 우리가 다시 읽을 수 있다", () => {
    const plan = roundTrip(FULL);
    expect(plan.invalid).toBe(0);
    expect(plan.total).toBe(7);
  });

  it("할 일이 필드 하나 없이 그대로 돌아온다", () => {
    expect(roundTrip(FULL).todos[0]).toEqual(FULL.todos[0]);
  });

  it("메모의 줄바꿈·따옴표·이모지가 보존된다", () => {
    expect(roundTrip(FULL).memos[0]).toEqual(FULL.memos[0]);
  });

  it("습관과 체크 기록이 그대로 돌아온다", () => {
    const plan = roundTrip(FULL);
    expect(plan.habits[0]).toEqual(FULL.habits[0]);
    expect(plan.habitChecks[0]).toEqual(FULL.habitChecks[0]);
  });

  it("캘린더 일정이 그대로 돌아온다", () => {
    expect(roundTrip(FULL).calendarEvents[0]).toEqual(FULL.calendarEvents[0]);
  });

  // 백업의 존재 이유. 본문이 조금이라도 달라지면 문서를 잃은 것과 같다.
  it("페이지 본문(중첩 블록·테이블·이모지)이 한 글자도 달라지지 않는다", () => {
    const restored = roundTrip(FULL).pages.find((p) => p.id === U(6));
    expect(restored?.content).toEqual((FULL.pages[0] as { content: unknown }).content);
  });

  it("페이지의 모든 필드가 보존된다 (행 속성·아이콘·커버 포함)", () => {
    const restored = roundTrip(FULL).pages.find((p) => p.id === U(6));
    expect(restored).toEqual(FULL.pages[0]);
  });

  it("부모·자식 관계가 유지되고 부모가 먼저 온다", () => {
    const plan = roundTrip(FULL);
    expect(plan.pages.map((p) => p.id)).toEqual([U(6), U(7)]);
    expect(plan.pages[1].parentId).toBe(U(6));
  });

  // 스키마에 없는 필드는 planRestore가 말없이 떨어뜨린다. 컬럼을 늘리면서 스키마를
  // 갱신하지 않으면 백업이 그 값을 잃는데, 조각별 테스트로는 드러나지 않는다.
  it("컬렉션의 필드 목록이 내보낼 때와 복원할 때 같다", () => {
    const plan = roundTrip(FULL);
    const keysOf = (v: unknown) => Object.keys(v as object).sort();
    const pairs: Array<[string, unknown, unknown]> = [
      ["todos", FULL.todos[0], plan.todos[0]],
      ["memos", FULL.memos[0], plan.memos[0]],
      ["habits", FULL.habits[0], plan.habits[0]],
      ["habitChecks", FULL.habitChecks[0], plan.habitChecks[0]],
      ["calendarEvents", FULL.calendarEvents[0], plan.calendarEvents[0]],
      ["pages", FULL.pages[0], plan.pages.find((p) => p.id === U(6))],
    ];
    for (const [name, before, after] of pairs) {
      expect(keysOf(after), `${name}의 필드가 라운드트립에서 바뀌었다`).toEqual(keysOf(before));
    }
  });

  it("두 번 돌려도 같다 (안정적)", () => {
    const once = roundTrip(FULL);
    const twice = roundTrip({
      todos: once.todos,
      memos: once.memos,
      habits: once.habits,
      habitChecks: once.habitChecks,
      calendarEvents: once.calendarEvents,
      pages: once.pages,
    });
    expect(twice.pages).toEqual(once.pages);
    expect(twice.todos).toEqual(once.todos);
    expect(twice.total).toBe(once.total);
  });

  it("빈 계정을 내보내고 다시 읽어도 깨지지 않는다", () => {
    const plan = roundTrip({
      todos: [],
      memos: [],
      habits: [],
      habitChecks: [],
      calendarEvents: [],
      pages: [],
    });
    expect(plan.total).toBe(0);
    expect(plan.invalid).toBe(0);
  });
});
