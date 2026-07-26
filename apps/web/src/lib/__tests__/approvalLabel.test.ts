import { describe, expect, it } from "vitest";
import { describeCall, formatWhen } from "../approvalLabel";

const call = (name: string, args: Record<string, unknown>) => ({ name, args });

describe("describeCall", () => {
  it("도구 라벨과 제목을 보여준다", () => {
    expect(describeCall(call("createTodo", { title: "장보기" }))).toBe(
      '할 일 추가: "장보기"',
    );
  });

  it("모르는 도구는 이름 그대로 쓴다", () => {
    expect(describeCall(call("mysteryTool", {}))).toBe("mysteryTool");
  });

  it("마감일을 보여준다", () => {
    // 마감일을 감추면 모델이 날짜를 잘못 잡아도 승인 전에 알아챌 수 없다.
    expect(
      describeCall(call("createTodo", { title: "장보기", dueDate: "2026-07-28" })),
    ).toBe('할 일 추가: "장보기", 마감 2026-07-28');
  });

  it("저장 형식(UTC 자정 타임스탬프)이 와도 날짜만 읽는다", () => {
    // 타임존 변환을 태우면 "오전 9시"가 붙거나 날짜가 하루 밀려 보인다.
    expect(
      describeCall(
        call("createTodo", { title: "장보기", dueDate: "2026-07-28T00:00:00.000Z" }),
      ),
    ).toBe('할 일 추가: "장보기", 마감 2026-07-28');
  });

  it("반복은 한국어로 풀어 보여준다", () => {
    expect(
      describeCall(
        call("createTodo", { title: "회의", recurrence: "FREQ=WEEKLY;BYDAY=TU" }),
      ),
    ).toBe('할 일 추가: "회의", 반복 매주 화');
  });

  it("풀이가 안 되는 반복 값은 원문을 보여준다", () => {
    // 모델이 이상한 규칙을 냈다는 사실 자체가 승인 판단 근거다 — 숨기면 안 된다.
    expect(
      describeCall(call("createTodo", { title: "회의", recurrence: "FREQ=BIWEEKLY" })),
    ).toBe('할 일 추가: "회의", 반복 FREQ=BIWEEKLY');
  });

  it("마감일과 반복을 함께 보여준다", () => {
    expect(
      describeCall(
        call("createTodo", {
          title: "회의",
          dueDate: "2026-07-28",
          recurrence: "FREQ=WEEKLY;BYDAY=TU",
        }),
      ),
    ).toBe('할 일 추가: "회의", 마감 2026-07-28, 반복 매주 화');
  });

  it("마감일·반복이 없으면 그 줄이 붙지 않는다 (회귀 금지)", () => {
    expect(describeCall(call("createMemo", { content: "우유" }))).toBe(
      '메모 작성: "우유"',
    );
  });

  it("GitHub 이슈는 저장소를 앞에 붙인다", () => {
    expect(
      describeCall(call("createGithubIssue", { owner: "oh", repo: "ldd", title: "버그" })),
    ).toBe('GitHub 이슈 만들기: oh/ldd, "버그"');
  });

  it("문자열이 아닌 값은 무시한다", () => {
    // 모델이 숫자·객체를 채워 넣어도 표시가 깨지지 않아야 한다.
    expect(
      describeCall(call("createTodo", { title: "장보기", dueDate: 20260728, recurrence: {} })),
    ).toBe('할 일 추가: "장보기"');
  });
});

describe("formatWhen", () => {
  it("문자열이 아니면 null", () => {
    expect(formatWhen(123)).toBeNull();
  });

  it("해석 못 하는 값은 감추지 않고 원문을 돌려준다", () => {
    // 이상한 값이 들어왔다는 걸 사용자가 봐야 한다.
    expect(formatWhen("내일쯤")).toBe("내일쯤");
  });
});

// 2026-07-26 (피드백 1-4): 수정·삭제. 삭제는 되돌리기 UI가 없는 경로라
// **이 카드가 마지막 방어선**이다 — 무엇이 지워지는지, 무엇으로 바뀌는지 보여야 한다.
describe("수정·삭제 승인 카드", () => {
  it("삭제 대상을 제목으로 분명히 보여준다", () => {
    expect(describeCall({ name: "deleteTodo", args: { title: "장보기" } })).toBe(
      '할 일 삭제: "장보기"',
    );
  });

  it("수정은 무엇을 무엇으로 바꾸는지 함께 보여준다", () => {
    // 새 제목이 안 보이면 사용자는 무엇에 동의하는지 모른 채 누른다.
    expect(
      describeCall({ name: "editTodo", args: { title: "장보기", newTitle: "장 보러 가기" } }),
    ).toContain('→ "장 보러 가기"');
  });

  it("마감일을 없애는 경우를 빈칸으로 두지 않는다", () => {
    expect(describeCall({ name: "editTodo", args: { title: "장보기", dueDate: "" } })).toContain(
      "마감 없앰",
    );
  });

  it("메모 수정은 새 본문을 보여준다", () => {
    expect(
      describeCall({ name: "editMemo", args: { title: "회의", content: "새 내용" } }),
    ).toContain("새 내용");
  });

  it("도구 이름이 그대로 노출되지 않는다", () => {
    for (const name of ["editTodo", "deleteTodo", "editMemo", "deleteMemo"]) {
      expect(describeCall({ name, args: { title: "x" } })).not.toContain(name);
    }
  });
});
