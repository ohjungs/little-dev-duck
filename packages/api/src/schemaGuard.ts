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

// 2026-07-30 : 보안 - 정적검사 - 함수경계 오귀속
// 각 함수 정의를 **자기 선언부**로 잘라 낸다. 예전에는 한 정규식으로
// `create function public.(\w+)\([\s\S]*?security definer`를 썼는데, 한 파일에 함수가 둘 이상이면
// 앞 함수 선언부에서 시작한 lazy 매치가 **뒤 함수의** `security definer`까지 삼켰다. 결과가 둘 다 나쁘다 —
// ①앞 함수를 definer로 오탐하고, ②정규식 lastIndex가 뒤 함수 선언을 지나쳐 **진짜 definer가
// 검사에서 사라진다**(노출된 함수를 조용히 통과시킨다). 저장소에 그 조건인 파일이 하나뿐이고
// 두 함수가 모두 definer라 우연히 드러나지 않았을 뿐이다.
// 본문(`as $$ ... $$`)은 선언부가 아니므로 잘라 낸다 — 본문 주석·문자열의 "security definer"에
// 걸리면 반대 방향 오탐이 된다.
function functionHeaders(sql: string): { name: string; header: string }[] {
  const starts: { name: string; at: number }[] = [];
  for (const m of sql.matchAll(
    /create\s+(?:or\s+replace\s+)?function\s+public\.(\w+)\s*\(/gi,
  )) {
    starts.push({ name: m[1], at: m.index });
  }
  return starts.map(({ name, at }, i) => {
    const region = sql.slice(at, i + 1 < starts.length ? starts[i + 1].at : sql.length);
    const bodyAt = region.search(/\bas\s+\$\$/i);
    return { name, header: bodyAt >= 0 ? region.slice(0, bodyAt) : region };
  });
}

export function findUnrevokedDefiners(files: MigrationFile[]): string[] {
  const defined = new Set<string>();
  const revoked = new Set<string>();

  for (const { sql } of files) {
    for (const { name, header } of functionHeaders(sql)) {
      if (/security\s+definer/i.test(header)) defined.add(name);
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

// 2026-07-26 : 스키마 - 코드↔마이그레이션 - 컬럼대조
// 이 저장소의 api 테스트는 가짜 supabase 클라이언트를 쓴다 — **컬럼 이름 오타를 원리적으로
// 못 잡는다.** 없는 컬럼을 payload에 담으면 PostgREST가 요청 전체를 거부하므로, 오타 하나가
// 그 테이블 쓰기를 통째로 죽인다(2026-07-26 todos.recurrence 사고와 같은 실패 모양).
// 코드가 쓰는 컬럼이 마이그레이션에 선언돼 있는지 정적으로 대조한다.

function balanced(src: string, openIndex: number): string {
  let depth = 0;
  for (let i = openIndex; i < src.length; i += 1) {
    if (src[i] === "{" || src[i] === "(") depth += 1;
    else if (src[i] === "}" || src[i] === ")") {
      depth -= 1;
      if (depth === 0) return src.slice(openIndex, i + 1);
    }
  }
  return src.slice(openIndex);
}

// create table 본문의 컬럼 + alter table ... add column.
export function collectDeclaredColumns(
  files: MigrationFile[],
): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>();
  const add = (table: string, col: string) => {
    const set = out.get(table) ?? new Set<string>();
    set.add(col);
    out.set(table, set);
  };

  for (const { sql } of files) {
    for (const m of sql.matchAll(RE_CREATE_TABLE)) {
      const table = m[1];
      out.set(table, out.get(table) ?? new Set());
      const body = tableBody(sql, m.index + m[0].length - 1);
      let depth = 0;
      for (const line of body.split("\n")) {
        if (depth === 0) {
          // 테이블 제약(primary/unique/check/...)이 아니라 "컬럼명 타입" 형태만 취한다.
          const cm = /^\s*([a-z_][a-z0-9_]*)\s+\S/.exec(line);
          if (cm && !/^(primary|unique|check|constraint|foreign|exclude)$/i.test(cm[1])) {
            add(table, cm[1]);
          }
        }
        depth += (line.match(/\(/g)?.length ?? 0) - (line.match(/\)/g)?.length ?? 0);
      }
    }
    for (const m of sql.matchAll(/alter\s+table\s+(?:only\s+)?public\.(\w+)([\s\S]*?);/gi)) {
      for (const a of m[2].matchAll(/add\s+column\s+(?:if\s+not\s+exists\s+)?(\w+)/gi)) {
        add(m[1], a[1]);
      }
    }
  }
  return out;
}

export type SourceFile = { name: string; code: string };

// 주석을 지운 뒤에 훑는다. 주석 안의 예시 코드(`.from("table")` 같은)를 실제 호출로 착각하면
// 없는 위반이 생기고, 없는 위반을 내는 검사는 곧 무시된다 — 실제로 이 파일 자신의 주석이
// 그 오탐을 만들었다. 문자열 리터럴 안의 `//`는 URL 등에서 흔하므로 건드리지 않는다.
export function stripComments(code: string): string {
  return code
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:"'`\\])\/\/[^\n]*/g, "$1");
}

// 마이그레이션이 만들지 않은 테이블을 참조하면 런타임에만 터진다(오타 한 글자면 그 기능이
// 통째로 죽는다). 가짜 클라이언트 테스트는 테이블명을 검사하지 않으므로 여기서 잡는다.
export function findUnknownTables(
  sources: SourceFile[],
  declared: Map<string, Set<string>>,
): { file: string; table: string }[] {
  const found: { file: string; table: string }[] = [];
  for (const { name, code } of sources) {
    for (const m of stripComments(code).matchAll(/\.from\((["'`])(\w+)\1\)/g)) {
      if (!declared.has(m[2])) found.push({ file: name, table: m[2] });
    }
  }
  return found;
}

// RPC도 마찬가지 — 이름이 틀리면 호출이 통째로 실패한다.
export function findUnknownRpcs(
  sources: SourceFile[],
  functions: Set<string>,
): { file: string; rpc: string }[] {
  const found: { file: string; rpc: string }[] = [];
  for (const { name, code } of sources) {
    for (const m of stripComments(code).matchAll(/\.rpc\((["'`])(\w+)\1/g)) {
      if (!functions.has(m[2])) found.push({ file: name, rpc: m[2] });
    }
  }
  return found;
}

export function collectFunctionNames(files: MigrationFile[]): Set<string> {
  const out = new Set<string>();
  for (const { sql } of files) {
    for (const m of sql.matchAll(/function\s+public\.(\w+)\s*\(/gi)) out.add(m[1]);
  }
  return out;
}
export type UndeclaredWrite = {
  file: string;
  table: string;
  op: string;
  columns: string[];
};

// payload 객체에서 컬럼으로 쓰이는 키를 모은다. 최상위 키와, 조건부 스프레드
// `...(x ? { col: v } : {})` 안의 키를 함께 본다(두 형태 모두 실제 컬럼으로 나간다).
// 값이 객체인 경우의 내부 키(예: JSON 컬럼 내용)는 컬럼이 아니므로 제외된다.
function payloadColumns(obj: string): Set<string> {
  const keys = new Set<string>();

  // 중괄호 깊이는 위치별로 따로 센다. 깊이와 키를 한 정규식의 교대(alternation)로 잡으면
  // 여는 `{`가 소비돼 **바로 뒤 첫 키를 놓친다**(처음 짤 때 실제로 그랬다 — 검사가 조용히
  // 약해지는 부류의 실수라 특히 위험하다).
  const collectTop = (src: string) => {
    const depthAt: number[] = [];
    let depth = 0;
    for (let i = 0; i < src.length; i += 1) {
      if (src[i] === "{") depth += 1;
      depthAt[i] = depth;
      if (src[i] === "}") depth -= 1;
    }
    for (const m of src.matchAll(/([a-z_][a-z0-9_]*)\s*:/g)) {
      if (depthAt[m.index] === 1) keys.add(m[1]);
    }
  };

  collectTop(obj);
  for (const s of obj.matchAll(/\.\.\.\(/g)) {
    const spread = balanced(obj, s.index + 3);
    for (const inner of spread.matchAll(/\{/g)) {
      collectTop(balanced(spread, inner.index));
    }
  }
  return keys;
}

// 각 변이 호출을 **바로 앞의** `.from("table")`에 묶는다. 파일을 앞에서부터 훑어
// 마지막으로 본 테이블을 쓴다 — 창(window)으로 앞을 내다보면 뒤에 오는 다른 테이블의
// 삽입을 엉뚱한 테이블로 오귀속한다(실제로 처음 짤 때 그렇게 틀렸다).
export function findUndeclaredWrites(
  sources: SourceFile[],
  declared: Map<string, Set<string>>,
): UndeclaredWrite[] {
  const found: UndeclaredWrite[] = [];
  for (const { name, code: raw } of sources) {
    const code = stripComments(raw);
    const events: { at: number; kind: string; value: string | number }[] = [];
    for (const m of code.matchAll(/\.from\((["'`])(\w+)\1\)/g)) {
      events.push({ at: m.index, kind: "from", value: m[2] });
    }
    for (const m of code.matchAll(/\.(insert|update|upsert)\(\s*\{/g)) {
      events.push({ at: m.index, kind: m[1], value: m.index + m[0].length - 1 });
    }
    events.sort((a, b) => a.at - b.at);

    let table: string | null = null;
    for (const e of events) {
      if (e.kind === "from") {
        table = e.value as string;
        continue;
      }
      const known = table ? declared.get(table) : undefined;
      if (!table || !known) continue; // 마이그레이션이 만들지 않은 테이블(외부 스키마 등)은 대상 밖
      const columns = [...payloadColumns(balanced(code, e.value as number))]
        .filter((c) => !known.has(c))
        .sort();
      if (columns.length > 0) {
        found.push({ file: name, table, op: e.kind, columns });
      }
    }
  }
  return found;
}

// 2026-07-30 : 보안 - profiles - role/disabled_features 관리자전용 컬럼가드 검사
// profiles_update_own은 행 단위만 봐서 role·disabled_features도 자유롭게 바뀐다 — 로그인한
// 사용자가 PATCH로 스스로 관리자가 되거나 자기 기능제한을 풀 수 있었다(2026-07-30 감사 발견,
// S1). BEFORE UPDATE 트리거(20260730160000)가 막는데, 이 검사는 그 가드가 나중에 실수로
// 지워지거나 조건이 약해지면(예: is_admin() 체크 누락) 실패해야 한다.
const RE_PROFILES_GUARD_TRIGGER =
  /create\s+trigger\s+\S+\s+before\s+update\s+on\s+public\.profiles[\s\S]*?execute\s+function\s+public\.(\w+)/i;

// 반환값이 true면 위반(가드 없음/불완전). false면 통과.
export function isProfilesAdminColumnGuardMissing(files: MigrationFile[]): boolean {
  const combined = files.map((f) => f.sql).join("\n");
  const trigger = RE_PROFILES_GUARD_TRIGGER.exec(combined);
  if (!trigger) return true;

  const fnName = trigger[1];
  // `create|replace` 앵커 필수 — 없으면 `execute function public.<fnName>()`(트리거 정의)에
  // 먼저 걸려 엉뚱한 구간을 본문으로 읽는다(findTablesMissingRoomIdGuard와 같은 함정).
  const fnBody = new RegExp(
    `(?:create|replace)\\s+function\\s+public\\.${fnName}\\s*\\([\\s\\S]*?\\$\\$([\\s\\S]*?)\\$\\$`,
    "i",
  ).exec(combined)?.[1];
  if (!fnBody) return true;

  const guardsRole = /\brole\b/i.test(fnBody);
  const guardsDisabledFeatures = /disabled_features/i.test(fnBody);
  const checksAdmin = /is_admin\s*\(\s*\)/i.test(fnBody);
  return !(guardsRole && guardsDisabledFeatures && checksAdmin);
}

// 2026-07-30 : 보안 - 메신저 - room_id 불변가드 검사 (감사 발견 S1)
// room_members_update_self·messages_update_sender는 행 소유자만 봐서 room_id까지 바꿀 수
// 있었다 — 멤버십을 위조해 남의 대화를 읽거나 메시지를 다른 방으로 옮길 수 있다.
// BEFORE UPDATE 트리거(20260730170000)가 막는데, 두 테이블 **양쪽 모두**에 걸려 있어야
// 한다(한쪽만 막으면 다른 쪽 공격이 그대로 남는다).
export function findTablesMissingRoomIdGuard(files: MigrationFile[]): string[] {
  const combined = files.map((f) => f.sql).join("\n");

  // room_id를 OLD와 비교해 거부하는 트리거 함수 이름들을 모은다.
  // `create|replace`로 앵커한다 — 이걸 빼면 `create trigger ... execute function public.X()`도
  // 함수 정의로 잡히고, 그 매칭이 lazy하게 다음 `$$`까지 삼켜 **뒤에 오는 진짜 정의를 건너뛴다**
  // (처음 짤 때 실제로 그래서 실기 검사만 조용히 실패했다). findUnrevokedDefiners와 같은 관례.
  const guardFns = new Set<string>();
  for (const m of combined.matchAll(
    /(?:create|replace)\s+function\s+public\.(\w+)\s*\([\s\S]*?\$\$([\s\S]*?)\$\$/gi,
  )) {
    const body = m[2];
    if (/new\.room_id\s+is\s+distinct\s+from\s+old\.room_id/i.test(body)) {
      guardFns.add(m[1]);
    }
  }

  const guarded = new Set<string>();
  for (const m of combined.matchAll(
    /create\s+trigger\s+\S+\s+before\s+update\s+on\s+public\.(\w+)[\s\S]*?execute\s+function\s+public\.(\w+)/gi,
  )) {
    if (guardFns.has(m[2])) guarded.add(m[1]);
  }

  return ["room_members", "messages"].filter((t) => !guarded.has(t)).sort();
}

// 2026-07-30 : 보안 - 메신저 - 보낸이 불변가드 검사 (Status backlog)
// `messages_insert_member`는 보낸이 불변조건을 INSERT에서만 지키고 `messages_update_sender`는
// sender_type을 전혀 제약하지 않았다. UPDATE로 sender_type='agent'로 바꾸면 core messageSchema의
// refine을 위반하는 행이 남아 **그 방의 메시지 적재가 통째로 실패한다**(사칭이 아니라 무결성·
// 가용성 문제 — WITH CHECK가 sender_user_id를 auth.uid()로 묶어 NULL로는 못 바꾸기 때문).
// BEFORE UPDATE 트리거(20260730180000)가 막는데, 이 검사는 그 가드가 지워지거나 두 컬럼 중
// 하나만 보게 약해지면 실패해야 한다.
//
// 반환값이 true면 위반(가드 없음/불완전). false면 통과.
export function findMessageSenderGuardMissing(files: MigrationFile[]): boolean {
  const combined = files.map((f) => f.sql).join("\n");

  // 두 컬럼을 **모두** OLD와 비교해 거부하는 함수 이름들. `create|replace` 앵커는 필수 —
  // 없으면 `execute function public.X()`(트리거 정의)가 함수 정의로 잡혀 뒤의 진짜 정의를
  // 삼킨다(findTablesMissingRoomIdGuard·findUnrevokedDefiners와 같은 관례).
  const guardFns = new Set<string>();
  for (const m of combined.matchAll(
    /(?:create|replace)\s+function\s+public\.(\w+)\s*\([\s\S]*?\$\$([\s\S]*?)\$\$/gi,
  )) {
    const body = m[2];
    const guardsType = /new\.sender_type\s+is\s+distinct\s+from\s+old\.sender_type/i.test(body);
    const guardsUser =
      /new\.sender_user_id\s+is\s+distinct\s+from\s+old\.sender_user_id/i.test(body);
    if (guardsType && guardsUser) guardFns.add(m[1]);
  }

  // 그 함수가 **messages**의 BEFORE UPDATE에 실제로 걸려 있어야 한다(테이블을 잘못 지정하면 무효).
  for (const m of combined.matchAll(
    /create\s+trigger\s+\S+\s+before\s+update\s+on\s+public\.(\w+)[\s\S]*?execute\s+function\s+public\.(\w+)/gi,
  )) {
    if (m[1] === "messages" && guardFns.has(m[2])) return false;
  }
  return true;
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
