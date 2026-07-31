import { existsSync, readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { describe, expect, it } from "vitest";

// 2026-08-01 : 테스트 - pgTAP - 확장 활성화 결정 회귀 검사
// supabase/seed.sql이 pgTAP 확장을 활성화하는 방식(마이그레이션이 아니라 seed.sql, config.toml
// 무변경)은 "로컬/CI 전용, 원격에 절대 반영되지 않아야 한다"는 안전 결정이다. schemaGuard의
// 마이그레이션 정적검사와 성격이 겹치지 않아 별도 파일로 둔다 — schemaGuard는
// supabase/migrations만 읽고 seed.sql은 스캔 대상이 아니다(findMissingRollbacks 등 강제 밖).
// 이 결정이 나중에 실수로 뒤집히면(예: 확장을 migrations로 옮기거나, config.toml이 seed.sql을
// 더 이상 자동으로 집지 않게 되면) 여기서 실패해야 한다.

const REPO_ROOT = fileURLToPath(new URL("../../../", import.meta.url));
const SUPABASE_DIR = path.join(REPO_ROOT, "supabase");
const SEED_PATH = path.join(SUPABASE_DIR, "seed.sql");
const CONFIG_PATH = path.join(SUPABASE_DIR, "config.toml");
const MIGRATIONS_DIR = path.join(SUPABASE_DIR, "migrations");
const CI_WORKFLOW_PATH = path.join(REPO_ROOT, ".github", "workflows", "ci.yml");
const PACKAGE_JSON_PATH = path.join(REPO_ROOT, "package.json");
const HELPERS_SQL_PATH = path.join(SUPABASE_DIR, "tests", "database", "00_helpers.sql");

function readIfExists(p: string): string | null {
  return existsSync(p) ? readFileSync(p, "utf-8") : null;
}

describe("pgTAP 확장 활성화 (supabase/seed.sql)", () => {
  it("seed.sql이 존재하고 pgtap 확장을 idempotent하게(if not exists) 만든다", () => {
    const seed = readIfExists(SEED_PATH);
    expect(seed).not.toBeNull();
    expect(seed).toMatch(/create\s+extension\s+if\s+not\s+exists\s+pgtap/i);
  });

  it("pgtap을 extensions 스키마에 둔다 (public 네임스페이스를 오염시키지 않는다)", () => {
    const seed = readIfExists(SEED_PATH) ?? "";
    expect(seed).toMatch(/create\s+extension\s+if\s+not\s+exists\s+pgtap\s+with\s+schema\s+extensions/i);
  });

  it("어떤 정식 마이그레이션도 pgtap 확장을 만들지 않는다 (원격에 영구히 남기지 않는다는 결정)", () => {
    const migrationFiles = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql"));
    const offenders = migrationFiles.filter((name) => {
      const sql = readFileSync(path.join(MIGRATIONS_DIR, name), "utf-8");
      return /create\s+extension[^;]*pgtap/i.test(sql);
    });
    expect(offenders).toEqual([]);
  });

  it("config.toml이 [db.seed]를 비활성화하거나 seed.sql을 sql_paths에서 빼지 않는다", () => {
    const config = readIfExists(CONFIG_PATH) ?? "";
    // CLI 기본값(enabled = true, sql_paths = ["./seed.sql"])을 그대로 쓰겠다는 결정이므로
    // [db.seed] 섹션 자체가 없어야 한다. 섹션이 생기면 반드시 enabled=false가 아니고
    // seed.sql을 여전히 가리켜야 한다.
    const dbSeedSection = /\[db\.seed\][\s\S]*?(?=\n\[|$)/i.exec(config)?.[0];
    if (!dbSeedSection) {
      expect(dbSeedSection).toBeUndefined();
      return;
    }
    expect(dbSeedSection).not.toMatch(/enabled\s*=\s*false/i);
    expect(dbSeedSection).toMatch(/seed\.sql/i);
  });

  it("package.json의 test:db 스크립트가 supabase test db를 그대로 실행한다", () => {
    const pkg = JSON.parse(readIfExists(PACKAGE_JSON_PATH) ?? "{}");
    expect(pkg.scripts?.["test:db"]).toBe("supabase test db");
  });

  it("CI db-tests job이 seed.sql을 거치는 실제 순서(start -> test db -> stop)로 돌린다", () => {
    const ci = readIfExists(CI_WORKFLOW_PATH) ?? "";
    const jobSection = /db-tests:[\s\S]*?(?=\n {2}\S+:\n|$)/.exec(ci)?.[0] ?? "";
    expect(jobSection).toMatch(/supabase start/);
    expect(jobSection).toMatch(/supabase test db/);
    expect(jobSection).toMatch(/supabase stop/);
    // start가 test db보다, test db가 stop보다 먼저 나와야 순서가 맞다.
    const startAt = jobSection.indexOf("supabase start");
    const testAt = jobSection.indexOf("supabase test db");
    const stopAt = jobSection.indexOf("supabase stop");
    expect(startAt).toBeGreaterThanOrEqual(0);
    expect(startAt).toBeLessThan(testAt);
    expect(testAt).toBeLessThan(stopAt);
  });

  it("00_helpers.sql이 tests 스키마에 USAGE grant를 authenticated/anon/service_role에 내준다 (2026-08-01 리뷰에서 잡힌 42501 회귀 고정)", () => {
    // authenticate_as/authenticate_as_anon은 `set local role`로 실제 role을 낮춘다. 같은
    // 트랜잭션에서 두 번째 이후 tests.* 호출은 이미 낮아진 role로 스키마 한정 호출을 하므로
    // tests 스키마에 USAGE grant가 없으면 `permission denied for schema tests`(42501)로 깨진다.
    // 이 grant 문이 빠지면 10_~60_ 파일 중 role을 두 번 이상 전환하는 파일들이 CI에서 상시
    // 실패하는데, Docker 없는 환경에서는 그 실패가 로컬에서 보이지 않으므로 여기서 정적으로 고정한다.
    const helpers = readIfExists(HELPERS_SQL_PATH);
    expect(helpers).not.toBeNull();
    const grantLine = /grant\s+usage\s+on\s+schema\s+tests\s+to\s+([^;]+);/i.exec(helpers ?? "");
    expect(grantLine).not.toBeNull();
    const grantees = (grantLine?.[1] ?? "").split(",").map((s) => s.trim().toLowerCase());
    expect(grantees).toEqual(expect.arrayContaining(["authenticated", "anon", "service_role"]));
    // create schema 문보다 뒤에 나와야 한다 (스키마가 없는데 권한부터 줄 수는 없다).
    const schemaAt = (helpers ?? "").search(/create\s+schema\s+if\s+not\s+exists\s+tests/i);
    const grantAt = (helpers ?? "").search(/grant\s+usage\s+on\s+schema\s+tests/i);
    expect(schemaAt).toBeGreaterThanOrEqual(0);
    expect(schemaAt).toBeLessThan(grantAt);
  });
});
