import { describe, expect, it } from "vitest";
import { buildDiagnostics } from "../diagnostics";

// 2026-07-29 : 설정 - 진단 내보내기 (Phase 56 T2 T-027)
// "왜 안 되지"를 물을 때 첨부하는 꾸러미. **localStorage 값은 담지 않는다** —
// 초안·개인 데이터가 들어 있을 수 있다. 키 이름만으로도 "설정이 뭐가 있는지"는 안다.

describe("buildDiagnostics", () => {
  const input = {
    exportedAt: "2026-07-29T05:00:00.000Z",
    userAgent: "TestBrowser/1.0",
    lddKeys: ["ldd-send-key", "ldd:favorites"],
    notifyHistory: [{ at: "t", title: "새 메시지", outcome: "quiet" as const }],
    actionLog: [{ id: "a1", kind: "todo.create", summary: "{}" }],
  };

  it("키 이름 목록만 담고 localStorage 값 필드는 없다", () => {
    const d = buildDiagnostics(input);
    expect(d.localStorageKeys).toEqual(["ldd-send-key", "ldd:favorites"]);
    expect(JSON.stringify(d)).not.toContain("localStorageValues");
  });

  it("알림 기록·활동 로그·환경 정보를 그대로 담는다", () => {
    const d = buildDiagnostics(input);
    expect(d.userAgent).toBe("TestBrowser/1.0");
    expect(d.notifyHistory).toHaveLength(1);
    expect(d.actionLog).toHaveLength(1);
    expect(d.exportedAt).toBe(input.exportedAt);
  });

  it("무엇이 담기고 무엇이 안 담기는지 파일 스스로 말한다 (note)", () => {
    const d = buildDiagnostics(input);
    expect(d.note).toContain("값은 담지 않");
  });
});
