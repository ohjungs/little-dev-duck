import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { describe, expect, it } from "vitest";

// 2026-08-01 : 테스트 - pgTAP - 메신저 제거 회귀 파일 <-> 마이그레이션 교차검증 (정적)
//
// supabase/tests/database/70_messenger_removed.sql이 "메신저 제거가 완결됐는지"를 로컬 스택에서
// 검증하려면 먼저 그 파일 자체가 실제 마이그레이션(20260731120000_drop_messenger.sql)이 drop한
// 대상과 정확히 일치해야 한다 — plan(N) 개수가 실제 assertion 개수와 다르거나, drop 대상 테이블/
// 함수 목록이 새 마이그레이션으로 바뀌었는데 70_ 파일이 갱신되지 않으면 pgTAP 자체는 "통과"하지만
// 검증 범위가 조용히 줄어든다(예: plan(14)인데 assertion이 13개면 pgTAP은 그 자체로 실패하지만,
// drop 대상에 테이블이 하나 추가됐는데 70_ 파일에 반영을 빠뜨리면 pgTAP은 계속 통과한다 — 이
// 케이스를 잡는 게 이 파일의 목적이다).
//
// Docker/Supabase CLI가 없는 환경에서는 `supabase test db`(실제 카탈로그 조회)를 실행할 수
// 없으므로, HD-003(결정적 작업은 코드로) 원칙에 따라 마이그레이션 파일 <-> 70_ 파일 사이의
// 교차검증을 정적으로 고정한다. LLM 판단이 아니라 파일 내용을 정규식으로 뽑아 집합 비교만
// 한다 — 두 파일 중 하나가 바뀌면 반드시 여기서 드러난다.

const REPO_ROOT = fileURLToPath(new URL("../../../", import.meta.url));
const MIGRATIONS_DIR = path.join(REPO_ROOT, "supabase", "migrations");
const DROP_MESSENGER_MIGRATION = "20260731120000_drop_messenger.sql";
const REMOVAL_TEST_FILE = path.join(
  REPO_ROOT,
  "supabase",
  "tests",
  "database",
  "70_messenger_removed.sql",
);

function readMigration(name: string): string {
  return readFileSync(path.join(MIGRATIONS_DIR, name), "utf-8");
}

function allMigrationFiles(): { name: string; sql: string }[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .map((name) => ({ name, sql: readMigration(name) }));
}

describe("70_messenger_removed.sql <-> 20260731120000_drop_messenger.sql 교차검증", () => {
  const dropMigration = readMigration(DROP_MESSENGER_MIGRATION);
  const removalTest = readFileSync(REMOVAL_TEST_FILE, "utf-8");

  it("drop된 테이블 목록(migration)과 hasnt_table로 검증하는 테이블 목록(70_)이 정확히 같다", () => {
    const droppedTables = new Set(
      [...dropMigration.matchAll(/drop\s+table\s+if\s+exists\s+public\.(\w+)\s+cascade/gi)].map(
        (m) => m[1],
      ),
    );
    const testedTables = new Set(
      [...removalTest.matchAll(/hasnt_table\(\s*'public'\s*,\s*'(\w+)'/gi)].map((m) => m[1]),
    );

    expect(droppedTables.size).toBeGreaterThan(0);
    expect(testedTables).toEqual(droppedTables);
  });

  it("drop된 함수 목록(migration)과 hasnt_function으로 검증하는 함수 목록(70_)이 정확히 같다", () => {
    const droppedFunctions = new Set(
      [...dropMigration.matchAll(/drop\s+function\s+if\s+exists\s+public\.(\w+)\s*\(/gi)].map(
        (m) => m[1],
      ),
    );
    const testedFunctions = new Set(
      [...removalTest.matchAll(/hasnt_function\(\s*'public'\s*,\s*'(\w+)'/gi)].map((m) => m[1]),
    );

    expect(droppedFunctions.size).toBeGreaterThan(0);
    expect(testedFunctions).toEqual(droppedFunctions);
  });

  it("사라진 테이블에 걸려 있던 트리거 전부를 pg_trigger 부재로 확인한다(create trigger <-> ok() 조회)", () => {
    const droppedTables = new Set(
      [...dropMigration.matchAll(/drop\s+table\s+if\s+exists\s+public\.(\w+)\s+cascade/gi)].map(
        (m) => m[1],
      ),
    );

    // 저장소 전체 마이그레이션에서 "create trigger <name> ... on public.<table>" 중
    // <table>이 drop 대상 테이블에 속하는 것만 추린다.
    const createdTriggersOnDroppedTables = new Set<string>();
    for (const { sql } of allMigrationFiles()) {
      const re = /create\s+trigger\s+(\w+)[\s\S]*?on\s+public\.(\w+)/gi;
      for (const m of sql.matchAll(re)) {
        const [, triggerName, tableName] = m;
        if (droppedTables.has(tableName)) {
          createdTriggersOnDroppedTables.add(triggerName);
        }
      }
    }

    const testedTriggers = new Set(
      [...removalTest.matchAll(/tgname\s*=\s*'(\w+)'/gi)].map((m) => m[1]),
    );

    expect(createdTriggersOnDroppedTables.size).toBeGreaterThan(0);
    expect(testedTriggers).toEqual(createdTriggersOnDroppedTables);
  });

  it("publication에 등록됐던 메신저 테이블 전부가 부재 확인 IN 목록에 들어 있다", () => {
    const droppedTables = new Set(
      [...dropMigration.matchAll(/drop\s+table\s+if\s+exists\s+public\.(\w+)\s+cascade/gi)].map(
        (m) => m[1],
      ),
    );

    const registeredInPublication = new Set<string>();
    for (const { sql } of allMigrationFiles()) {
      const re = /alter\s+publication\s+supabase_realtime\s+add\s+table\s+public\.(\w+)/gi;
      for (const m of sql.matchAll(re)) {
        if (droppedTables.has(m[1])) {
          registeredInPublication.add(m[1]);
        }
      }
    }

    // 최소 1개는 실제로 publication에 등록됐던 적이 있어야 이 검사 자체가 무의미해지지 않는다.
    expect(registeredInPublication.size).toBeGreaterThan(0);

    const publicationCheckSection =
      /pg_publication_tables[\s\S]*?tablename\s+in\s*\(([^)]+)\)/i.exec(removalTest)?.[1] ?? "";
    const testedInList = new Set(
      [...publicationCheckSection.matchAll(/'(\w+)'/g)].map((m) => m[1]),
    );

    for (const table of registeredInPublication) {
      expect(testedInList.has(table)).toBe(true);
    }
  });

  it("plan(N)이 실제 assertion(hasnt_table/hasnt_function/ok) 개수와 정확히 같다", () => {
    const planMatch = /select\s+plan\((\d+)\)/i.exec(removalTest);
    expect(planMatch).not.toBeNull();
    const planned = Number(planMatch?.[1]);

    const assertionCount = [
      ...removalTest.matchAll(/select\s+(hasnt_table|hasnt_function|ok)\s*\(/gi),
    ].length;

    expect(assertionCount).toBe(planned);
  });

  it("begin/rollback으로 감싸 부작용을 남기지 않는다(README.md 새 파일 추가 규칙 1)", () => {
    // 파일 선두는 주석 블록(-- ...)이라 statement만 남기고 비교한다.
    const firstStatement = removalTest
      .split("\n")
      .filter((line) => !line.trim().startsWith("--") && line.trim().length > 0)[0]
      ?.trim();

    expect(firstStatement).toBe("begin;");
    expect(removalTest.trim().endsWith("rollback;")).toBe(true);
  });
});
