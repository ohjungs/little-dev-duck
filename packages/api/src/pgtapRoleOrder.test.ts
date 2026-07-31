import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { describe, expect, it } from "vitest";

// 2026-08-01 : 테스트 - pgTAP - role 다운그레이드 이후 CREATE 금지 정적 회귀 검사
//
// 이 파일은 2026-08-01 리뷰 라운드에서 발견된 결함(10_profiles_rls.sql이 파일 중간, 이미
// `tests.authenticate_as()`로 role을 authenticated로 낮춘 뒤 `create or replace function
// tests._anon_can_read_profile`을 정의해 `permission denied for schema tests`(42501)로
// 파일 전체가 실패하던 결함)을 일반화해 고정한다. 현재는 그 헬퍼가 00_helpers.sql로
// 옮겨져 수정됐지만(00_helpers.sql:131, 10_profiles_rls.sql:59 호출만 남음), 같은 패턴이
// 이후 20~60 파일이나 새로 추가될 파일에서 재발하지 않도록 6개 파일 전부를 스캔한다.
//
// Docker/Supabase CLI가 없는 환경에서는 `supabase test db`(실제 42501 재현)를 실행할 수
// 없으므로, 이 정적 검사가 유일한 자동 게이트다 — 이 테스트가 실패하면 실제로 DB에서도
// 같은 이유로 실패할 것이다(role 다운그레이드는 tests.authenticate_as*가 유일한 진입점이고,
// tests 스키마에 authenticated/anon에게 부여된 권한은 USAGE뿐 CREATE가 아니다 —
// 00_helpers.sql의 `grant usage on schema tests` 참조).

const REPO_ROOT = fileURLToPath(new URL("../../../", import.meta.url));
const DB_TESTS_DIR = path.join(REPO_ROOT, "supabase", "tests", "database");

const AUTH_CALL_RE = /tests\.authenticate_as(?:_anon)?\s*\(/i;
const CREATE_RE = /create\s+(or\s+replace\s+)?function\b/gi;

function sqlTestFiles(): string[] {
  return readdirSync(DB_TESTS_DIR)
    .filter((f) => f.endsWith(".sql") && f !== "00_helpers.sql")
    .sort();
}

describe("pgTAP role 다운그레이드 순서 (supabase/tests/database)", () => {
  it("00_helpers.sql 이외의 회귀 파일이 최소 1개는 존재한다(스캔 대상 누락 방지)", () => {
    expect(sqlTestFiles().length).toBeGreaterThan(0);
  });

  it.each(sqlTestFiles())(
    "%s: tests.authenticate_as*() 호출 이후에는 새 함수를 create하지 않는다",
    (fileName) => {
      const sql = readFileSync(path.join(DB_TESTS_DIR, fileName), "utf-8");
      const authMatch = AUTH_CALL_RE.exec(sql);

      if (!authMatch) {
        // 이 파일이 role을 낮추지 않는다면(현재는 없지만 향후 추가될 수 있다) 이 검사는
        // 해당 없음 — CREATE 자체가 문제가 아니라 "낮아진 role 하에서의 CREATE"가 문제다.
        return;
      }

      const afterAuth = sql.slice(authMatch.index + authMatch[0].length);
      const offendingCreates = [...afterAuth.matchAll(CREATE_RE)];

      expect(
        offendingCreates.length,
        `${fileName}: tests.authenticate_as*() 호출(${authMatch.index}) 이후에 ` +
          `${offendingCreates.length}건의 CREATE FUNCTION이 있다. role이 이미 낮아진 상태라 ` +
          `tests 스키마 CREATE 권한이 없어 42501로 파일 전체가 실패한다. 새 헬퍼는 ` +
          `00_helpers.sql(role 다운그레이드 전)로 옮겨라.`,
      ).toBe(0);
    },
  );
});
