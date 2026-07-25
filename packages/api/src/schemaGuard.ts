// 2026-07-26 : 스키마 - 안전계약 - 정적검사
// 마이그레이션 SQL만 읽고 결정적으로 판정할 수 있는 안전 규칙들. Supabase 어드바이저가
// 액세스 토큰 없이는 못 도는 동안(manual-verification 13번) 그중 정적으로 확인 가능한
// 부분만이라도 CI에서 계속 지킨다.
//
// 판정 로직은 파일 입출력과 분리한다 — 가짜 입력을 넣어 "규칙을 어기면 정말 실패하는지"를
// 확인할 수 있어야 한다. 아무것도 잡지 못하는 검사가 통과로 위장하는 게 최악이다.

export type MigrationFile = { name: string; sql: string };

export type SchemaFacts = {
  /** 테이블명 → 정의된 마이그레이션 파일명 */
  tables: Map<string, string>;
  /** RLS를 켠 테이블 */
  rlsEnabled: Set<string>;
  /** 테이블명 → 정책 수 */
  policyCount: Map<string, number>;
  /** user_id 컬럼을 가진 테이블 */
  withUserId: Set<string>;
  /** 자식 테이블 → on delete cascade로 물린 public 부모 테이블들 */
  cascadeParents: Map<string, Set<string>>;
  /** 계정 데이터 파기 함수가 직접 지우는 테이블 */
  purgedDirectly: Set<string>;
};

const RE_CREATE_TABLE = /create\s+table\s+(?:if\s+not\s+exists\s+)?public\.(\w+)\s*\(/gi;
const RE_ENABLE_RLS = /alter\s+table\s+public\.(\w+)\s+enable\s+row\s+level\s+security/gi;
const RE_POLICY = /create\s+policy\s+"[^"]+"\s+on\s+public\.(\w+)/gi;
const RE_PURGE_FN = /function\s+public\.delete_all_my_data/i;
const RE_DELETE_FROM = /delete\s+from\s+(?:public\.)?(\w+)/gi;

// create table public.X ( ... ) 본문만 잘라낸다. 괄호 깊이를 세어 닫는 위치를 찾는다
// (컬럼 정의 안에 함수 호출 괄호가 들어 있어 첫 ')'로 자르면 잘린다).
function tableBody(sql: string, openIndex: number): string {
  let depth = 0;
  for (let i = openIndex; i < sql.length; i += 1) {
    if (sql[i] === "(") depth += 1;
    else if (sql[i] === ")") {
      depth -= 1;
      if (depth === 0) return sql.slice(openIndex + 1, i);
    }
  }
  return sql.slice(openIndex + 1);
}

export function collectSchemaFacts(files: MigrationFile[]): SchemaFacts {
  const facts: SchemaFacts = {
    tables: new Map(),
    rlsEnabled: new Set(),
    policyCount: new Map(),
    withUserId: new Set(),
    cascadeParents: new Map(),
    purgedDirectly: new Set(),
  };

  // 파기 함수는 여러 마이그레이션에서 재정의된다 — 파일명 순서상 마지막 정의가 현재 모습이다.
  let latestPurgeSql: string | null = null;

  for (const { name, sql } of [...files].sort((a, b) => a.name.localeCompare(b.name))) {
    for (const m of sql.matchAll(RE_CREATE_TABLE)) {
      const table = m[1];
      facts.tables.set(table, name);
      const body = tableBody(sql, m.index + m[0].length - 1);
      if (/\buser_id\b/i.test(body)) facts.withUserId.add(table);

      for (const fk of body.matchAll(
        /references\s+public\.(\w+)\s*\([^)]*\)\s*on\s+delete\s+cascade/gi,
      )) {
        const parents = facts.cascadeParents.get(table) ?? new Set<string>();
        parents.add(fk[1]);
        facts.cascadeParents.set(table, parents);
      }
    }

    for (const m of sql.matchAll(RE_ENABLE_RLS)) facts.rlsEnabled.add(m[1]);
    for (const m of sql.matchAll(RE_POLICY)) {
      facts.policyCount.set(m[1], (facts.policyCount.get(m[1]) ?? 0) + 1);
    }
    if (RE_PURGE_FN.test(sql)) latestPurgeSql = sql;
  }

  if (latestPurgeSql) {
    for (const m of latestPurgeSql.matchAll(RE_DELETE_FROM)) {
      facts.purgedDirectly.add(m[1]);
    }
  }
  return facts;
}

// 파기 함수가 직접 지우는 테이블에서 출발해, on delete cascade로 딸려 사라지는 테이블까지
// 넓힌다. auth.users 참조 cascade는 세지 않는다 — 파기 함수는 계정(profiles)을 남기고
// 데이터만 지우는 설계라 auth.users는 삭제되지 않고, 그 cascade는 발동하지 않는다.
export function purgeReachable(facts: SchemaFacts): Set<string> {
  const reachable = new Set(facts.purgedDirectly);
  let grew = true;
  while (grew) {
    grew = false;
    for (const [child, parents] of facts.cascadeParents) {
      if (reachable.has(child)) continue;
      for (const parent of parents) {
        if (reachable.has(parent)) {
          reachable.add(child);
          grew = true;
          break;
        }
      }
    }
  }
  return reachable;
}

export type Violations = {
  /** RLS를 켜지 않은 테이블 */
  rlsMissing: string[];
  /** RLS는 켰는데 정책이 하나도 없는 테이블(본인 데이터도 못 읽는다) */
  policyMissing: string[];
  /** 계정 데이터 파기로 사라지지 않는, user_id를 가진 테이블 */
  purgeMissing: string[];
};

export function findViolations(facts: SchemaFacts): Violations {
  const reachable = purgeReachable(facts);
  const tables = [...facts.tables.keys()].sort();
  return {
    rlsMissing: tables.filter((t) => !facts.rlsEnabled.has(t)),
    policyMissing: tables.filter(
      (t) => facts.rlsEnabled.has(t) && (facts.policyCount.get(t) ?? 0) === 0,
    ),
    // profiles는 계정 자체를 나타내는 행이라 파기 대상이 아니다(계정은 유지하고 데이터만 지운다).
    purgeMissing: tables.filter(
      (t) => t !== "profiles" && facts.withUserId.has(t) && !reachable.has(t),
    ),
  };
}

// 2026-07-26 : 보안 - SECURITY DEFINER - anon노출검사
// Supabase는 public 스키마에 만든 함수에 anon·authenticated 실행 권한을 **기본으로** 준다.
// `REVOKE ALL ... FROM public`(의사 롤)만 써도 anon에게 직접 부여된 권한은 남는다 —
// award_xp가 정확히 이 함정에 빠져 로그인 없이 남의 XP를 바꿀 수 있는 상태였다(Phase 24).
// SECURITY DEFINER는 RLS를 우회하므로 anon 노출은 특히 위험하다. 롤을 명시해 회수했는지 본다.
//
// 의도적으로 공개하는 함수는 여기 적고 근거를 남긴다. 목록에 없는 채로 anon에 열리면 실패한다.
export const PUBLIC_BY_DESIGN = new Map<string, string>([
  [
    "get_public_page",
    "Phase 12 T1: 비로그인 방문자가 공개 페이지를 읽는 통로. 열거를 막으려고 slug 하나당 한 건만 돌려준다.",
  ],
]);

export function findUnrevokedDefiners(files: MigrationFile[]): string[] {
  const defined = new Set<string>();
  const revoked = new Set<string>();

  for (const { sql } of files) {
    for (const m of sql.matchAll(
      /(?:create|replace)\s+function\s+public\.(\w+)\s*\([\s\S]*?security\s+definer/gi,
    )) {
      defined.add(m[1]);
    }
    // anon을 이름으로 지목해 회수했는가. `FROM public`만으로는 부족하다.
    for (const m of sql.matchAll(
      /revoke\s+[\s\S]*?on\s+function\s+public\.(\w+)\s*\([^)]*\)\s+from\s+([^;]+);/gi,
    )) {
      if (/\banon\b/i.test(m[2])) revoked.add(m[1]);
    }
  }

  return [...defined]
    .filter((fn) => !revoked.has(fn) && !PUBLIC_BY_DESIGN.has(fn))
    .sort();
}

// 마이그레이션마다 짝이 되는 롤백 스크립트가 있어야 한다(CLAUDE.md 5절).
export function findMissingRollbacks(
  migrationNames: string[],
  rollbackNames: string[],
): string[] {
  const have = new Set(rollbackNames);
  return migrationNames
    .filter((n) => !have.has(`${n.replace(/\.sql$/, "")}_down.sql`))
    .sort();
}
