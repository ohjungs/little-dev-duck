import { describe, expect, it } from "vitest";
import { deptColor, deptLabel, npcStatusLabel, schedulePhaseLabel } from "./office-label";
import { DEPT_REGISTRY } from "./office-department";

// 2026-07-26 : 사무실 - 표시이름 - 재구현제거
// 부서 색·이름은 core의 DEPT_REGISTRY에 이미 있었는데, 화면 세 곳(OfficeDashboard·
// OfficeManagementPanel·OfficeTalkPanel)이 **각자 하드코딩한 표를 갖고 있었다.**
// 지금은 값이 같지만, 부서를 레지스트리에 추가하면 화면 세 곳이 조용히 빠진다 —
// DAY_CODES와 같은 부류다(같은 세션에서 이미 한 번 겪었다).
// 상태 이름(업무 중·점심 시간…)은 타입만 core에 있고 한글 이름은 화면에만 있어 제자리가 없었다.

describe("deptColor / deptLabel", () => {
  // 이 테스트가 이 변경의 요점이다: 레지스트리에 부서를 추가하면 자동으로 덮인다.
  it("레지스트리에 있는 부서는 전부 색과 이름이 나온다", () => {
    for (const [id, dept] of Object.entries(DEPT_REGISTRY)) {
      expect(deptColor(id), id).toBe(dept.color);
      expect(deptLabel(id), id).toBe(dept.label);
    }
  });

  it("모르는 부서는 화면이 깨지지 않게 폴백한다", () => {
    // 기존 컴포넌트 동작을 그대로 보존한다 — 색은 회색, 이름은 받은 값 그대로.
    expect(deptColor("없는부서")).toBe("#888");
    expect(deptLabel("없는부서")).toBe("없는부서");
  });

  it("빈 문자열에서도 죽지 않는다", () => {
    expect(deptColor("")).toBe("#888");
    expect(deptLabel("")).toBe("");
  });
});

describe("schedulePhaseLabel", () => {
  it("알려진 상태를 한국어로 준다", () => {
    expect(schedulePhaseLabel("working")).toBe("업무 중");
    expect(schedulePhaseLabel("lunch")).toBe("점심 시간");
    expect(schedulePhaseLabel("break")).toBe("휴식 중");
    expect(schedulePhaseLabel("commuting")).toBe("출근 중");
    expect(schedulePhaseLabel("leaving")).toBe("퇴근 중");
  });

  it("모르는 상태는 받은 값을 그대로 돌려준다", () => {
    expect(schedulePhaseLabel("낮잠")).toBe("낮잠");
  });
});

// 2026-07-26 : 오피스 - 상태표시 - 쉬는중 (피드백 5-3)
describe("npcStatusLabel", () => {
  it("근무 시간에 맡은 일이 없으면 '쉬는 중'", () => {
    expect(npcStatusLabel("working", false)).toBe("쉬는 중");
  });

  it("근무 시간에 맡은 일이 있으면 '업무 중'", () => {
    expect(npcStatusLabel("working", true)).toBe("업무 중");
  });

  it("근무 시간이 아니면 업무 유무와 무관하게 종전 라벨", () => {
    expect(npcStatusLabel("lunch", false)).toBe("점심 시간");
    expect(npcStatusLabel("offwork", false)).toBe("퇴근");
    expect(npcStatusLabel("commuting", true)).toBe("출근 중");
  });
});
