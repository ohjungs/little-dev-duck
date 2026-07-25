import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  collectDeclaredColumns,
  collectSchemaFacts,
  findMissingRollbacks,
  findUndeclaredWrites,
  findUnrevokedDefiners,
  findViolations,
  purgeReachable,
  type MigrationFile,
  type SourceFile,
} from "./schemaGuard";

// 경로는 cwd가 아니라 이 파일 기준으로 잡는다. cwd에 의존하면 실행 위치가 바뀌는 순간
// 조용히 0개 파일을 읽고 "전부 통과"가 된다 — 검사가 통과를 가장하는 최악의 실패다.
const REPO_ROOT = fileURLToPath(new URL("../../../", import.meta.url));
const MIGRATIONS_DIR = path.join(REPO_ROOT, "supabase", "migrations");
const ROLLBACK_DIR = path.join(REPO_ROOT, "supabase", "rollback");
const API_SRC_DIR = fileURLToPath(new URL("./", import.meta.url));

function loadApiSources(): SourceFile[] {
  return readdirSync(API_SRC_DIR)
    .filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"))
    .map((name) => ({
      name,
      code: readFileSync(path.join(API_SRC_DIR, name), "utf-8"),
    }));
}

function sqlFiles(dir: string): string[] {
  return readdirSync(dir).filter((f) => f.endsWith(".sql"));
}

function loadMigrations(): MigrationFile[] {
  return sqlFiles(MIGRATIONS_DIR).map((name) => ({
    name,
    sql: readFileSync(path.join(MIGRATIONS_DIR, name), "utf-8"),
  }));
}

// ---------------------------------------------------------------------------
// 실제 마이그레이션 검사
// ---------------------------------------------------------------------------
describe("스키마 안전 계약 (실제 마이그레이션)", () => {
  const migrations = loadMigrations();
  const facts = collectSchemaFacts(migrations);

  it("검사가 실제로 파일을 읽었다", () => {
    // 0개를 읽고 아래 검사들이 전부 통과하는 상황을 먼저 배제한다.
    expect(migrations.length).toBeGreaterThan(10);
    expect(facts.tables.size).toBeGreaterThan(10);
  });

  it("모든 테이블에 RLS가 켜져 있다", () => {
    expect(findViolations(facts).rlsMissing).toEqual([]);
  });

  it("RLS를 켠 테이블에는 정책이 최소 1건 있다", () => {
    // 정책 없이 RLS만 켜면 본인 데이터조차 읽지 못한다(조용히 빈 목록이 된다).
    expect(findViolations(facts).policyMissing).toEqual([]);
  });

  it("user_id를 가진 모든 테이블이 계정 데이터 파기로 사라진다", () => {
    // 직접 delete되거나, delete되는 테이블로 향하는 on delete cascade 경로가 있어야 한다.
    expect(findViolations(facts).purgeMissing).toEqual([]);
  });

  it("page_links는 직접 목록엔 없지만 pages 연쇄로 파기된다", () => {
    // 이 사실이 깨지면(예: FK를 set null로 바꾸면) 위 검사가 실패해야 한다는 걸 못박는다.
    expect(facts.purgedDirectly.has("page_links")).toBe(false);
    expect(purgeReachable(facts).has("page_links")).toBe(true);
  });

  it("SECURITY DEFINER 함수는 anon 실행 권한을 명시적으로 회수한다", () => {
    // Supabase는 public 스키마 함수에 anon 권한을 기본 부여한다. `FROM public`만 회수하면
    // anon에게 직접 부여된 권한이 남는다 — award_xp가 이 함정에 빠져 로그인 없이 남의 XP를
    // 바꿀 수 있었다(Phase 24). 의도적 공개는 PUBLIC_BY_DESIGN에 근거와 함께 둔다.
    expect(findUnrevokedDefiners(migrations)).toEqual([]);
  });

  it("api 코드가 쓰는 컬럼이 전부 마이그레이션에 선언돼 있다", () => {
    // 이 패키지의 테스트는 가짜 supabase 클라이언트를 써서 **컬럼 오타를 원리적으로 못 잡는다.**
    // 없는 컬럼이 payload에 있으면 PostgREST가 요청 전체를 거부하므로 오타 하나가 그 테이블
    // 쓰기를 통째로 죽인다(2026-07-26 todos.recurrence 사고와 같은 실패 모양).
    const sources = loadApiSources();
    expect(sources.length).toBeGreaterThan(5); // 실제로 읽었는지 먼저 확인
    expect(findUndeclaredWrites(sources, collectDeclaredColumns(migrations))).toEqual([]);
  });

  it("컬럼 선언 파서가 주요 테이블을 실제로 읽어낸다", () => {
    // 0개를 읽고 위 검사가 공짜로 통과하는 상황을 배제한다.
    const declared = collectDeclaredColumns(migrations);
    expect(declared.get("todos")).toContain("due_date");
    expect(declared.get("pages")).toContain("is_trashed");
    expect(declared.get("pages")).toContain("cover_url"); // alter table add column 경로
  });

  it("모든 마이그레이션에 짝이 되는 롤백 스크립트가 있다", () => {
    // CLAUDE.md 5절. 2026-07-24 배치에서 5건이 조용히 빠졌던 규칙이라 검사로 잠근다.
    expect(
      findMissingRollbacks(sqlFiles(MIGRATIONS_DIR), sqlFiles(ROLLBACK_DIR)),
    ).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// 검사 자체가 위반을 잡아내는지 (메타 검증)
// 통과만 확인하고 넘어가면 "아무것도 안 잡는 검사"가 통과로 위장한다.
// ---------------------------------------------------------------------------
describe("검사가 위반을 실제로 잡는다", () => {
  const base = (extra = ""): MigrationFile[] => [
    {
      name: "0001_base.sql",
      sql: `
        create table public.notes (
          id uuid primary key,
          user_id uuid not null references auth.users (id) on delete cascade,
          body text
        );
        alter table public.notes enable row level security;
        create policy "notes_own" on public.notes for select using (user_id = auth.uid());
        create function public.delete_all_my_data() as $$
        begin
          delete from notes where user_id = uid;
        end;
        $$;
        ${extra}
      `,
    },
  ];

  it("기준 입력은 위반이 없다", () => {
    expect(findViolations(collectSchemaFacts(base()))).toEqual({
      rlsMissing: [],
      policyMissing: [],
      purgeMissing: [],
    });
  });

  it("RLS를 안 켠 테이블을 잡는다", () => {
    const files = base(`
      create table public.secrets (id uuid primary key, user_id uuid not null);
    `);
    const v = findViolations(collectSchemaFacts(files));
    expect(v.rlsMissing).toEqual(["secrets"]);
  });

  it("RLS만 켜고 정책이 없는 테이블을 잡는다", () => {
    const files = base(`
      create table public.locked (id uuid primary key, user_id uuid not null);
      alter table public.locked enable row level security;
    `);
    const v = findViolations(collectSchemaFacts(files));
    expect(v.policyMissing).toEqual(["locked"]);
  });

  it("파기에서 빠진 테이블을 잡는다", () => {
    const files = base(`
      create table public.orphan (id uuid primary key, user_id uuid not null);
      alter table public.orphan enable row level security;
      create policy "orphan_own" on public.orphan for select using (true);
    `);
    const v = findViolations(collectSchemaFacts(files));
    expect(v.purgeMissing).toEqual(["orphan"]);
  });

  it("연쇄 삭제로 덮이면 파기 위반이 아니다", () => {
    const files = base(`
      create table public.note_tags (
        id uuid primary key,
        user_id uuid not null,
        note_id uuid not null references public.notes (id) on delete cascade
      );
      alter table public.note_tags enable row level security;
      create policy "note_tags_own" on public.note_tags for select using (true);
    `);
    expect(findViolations(collectSchemaFacts(files)).purgeMissing).toEqual([]);
  });

  it("연쇄가 없으면(set null) 파기 위반으로 잡는다", () => {
    const files = base(`
      create table public.note_tags (
        id uuid primary key,
        user_id uuid not null,
        note_id uuid references public.notes (id) on delete set null
      );
      alter table public.note_tags enable row level security;
      create policy "note_tags_own" on public.note_tags for select using (true);
    `);
    expect(findViolations(collectSchemaFacts(files)).purgeMissing).toEqual([
      "note_tags",
    ]);
  });

  it("auth.users 연쇄는 파기 근거로 인정하지 않는다", () => {
    // 파기 함수는 계정을 남기고 데이터만 지운다 — auth.users는 삭제되지 않으므로
    // 그 cascade는 발동하지 않는다. 인정해 버리면 모든 테이블이 무조건 통과한다.
    const files = base(`
      create table public.leftover (
        id uuid primary key,
        user_id uuid not null references auth.users (id) on delete cascade
      );
      alter table public.leftover enable row level security;
      create policy "leftover_own" on public.leftover for select using (true);
    `);
    expect(findViolations(collectSchemaFacts(files)).purgeMissing).toEqual([
      "leftover",
    ]);
  });

  it("user_id가 없는 테이블은 파기 대상으로 보지 않는다", () => {
    const files = base(`
      create table public.app_config (id uuid primary key, key text);
      alter table public.app_config enable row level security;
      create policy "cfg" on public.app_config for select using (true);
    `);
    expect(findViolations(collectSchemaFacts(files)).purgeMissing).toEqual([]);
  });

  it("파기 함수가 여러 번 재정의되면 마지막 정의를 쓴다", () => {
    const files: MigrationFile[] = [
      ...base(),
      {
        name: "0002_later.sql",
        sql: `
          create table public.later (id uuid primary key, user_id uuid not null);
          alter table public.later enable row level security;
          create policy "later_own" on public.later for select using (true);
          create or replace function public.delete_all_my_data() as $$
          begin
            delete from notes where user_id = uid;
            delete from later where user_id = uid;
          end;
          $$;
        `,
      },
    ];
    expect(findViolations(collectSchemaFacts(files)).purgeMissing).toEqual([]);
  });

  it("롤백 스크립트 누락을 잡는다", () => {
    expect(
      findMissingRollbacks(
        ["0001_a.sql", "0002_b.sql"],
        ["0001_a_down.sql"],
      ),
    ).toEqual(["0002_b.sql"]);
  });

  it("롤백이 다 있으면 통과한다", () => {
    expect(
      findMissingRollbacks(
        ["0001_a.sql", "0002_b.sql"],
        ["0002_b_down.sql", "0001_a_down.sql"],
      ),
    ).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// SECURITY DEFINER anon 노출 검사도 위반을 실제로 잡는지 (메타 검증)
// ---------------------------------------------------------------------------
describe("SECURITY DEFINER 검사가 위반을 잡는다", () => {
  const fn = (name: string, tail = "") => ({
    name: `9999_${name}.sql`,
    sql: `
      create function public.${name}(p_id uuid)
      returns void
      language plpgsql
      security definer
      set search_path = public
      as $$ begin end; $$;
      ${tail}
    `,
  });

  it("회수가 없으면 잡는다", () => {
    expect(findUnrevokedDefiners([fn("risky")])).toEqual(["risky"]);
  });

  it("FROM public만 회수한 건 부족하다고 본다", () => {
    // 실제로 award_xp가 이렇게 돼 있었고, anon 권한이 그대로 남아 있었다.
    const files = [
      fn("risky", "revoke all on function public.risky(uuid) from public;"),
    ];
    expect(findUnrevokedDefiners(files)).toEqual(["risky"]);
  });

  it("anon을 지목해 회수하면 통과한다", () => {
    const files = [
      fn("safe", "revoke all on function public.safe(uuid) from public, anon;"),
    ];
    expect(findUnrevokedDefiners(files)).toEqual([]);
  });

  it("의도적 공개 함수는 allowlist로 통과한다", () => {
    expect(findUnrevokedDefiners([fn("get_public_page")])).toEqual([]);
  });

  it("SECURITY INVOKER 함수는 대상이 아니다", () => {
    const files = [
      {
        name: "9999_invoker.sql",
        sql: `create function public.plain(p_id uuid) returns void
              language sql as $$ select 1; $$;`,
      },
    ];
    expect(findUnrevokedDefiners(files)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// 컬럼 대조 검사도 위반을 실제로 잡는지 (메타 검증)
// ---------------------------------------------------------------------------
describe("컬럼 대조 검사가 위반을 잡는다", () => {
  const migration: MigrationFile[] = [
    {
      name: "0001.sql",
      sql: `
        create table public.notes (
          id uuid primary key,
          user_id uuid not null,
          body text,
          unique (user_id, body)
        );
        alter table public.notes add column if not exists pinned boolean;
      `,
    },
  ];
  const declared = collectDeclaredColumns(migration);
  const src = (code: string): SourceFile[] => [{ name: "x.ts", code }];

  it("선언된 컬럼만 쓰면 통과한다", () => {
    const files = src(`supabase.from("notes").insert({ user_id: u, body: b, pinned: true })`);
    expect(findUndeclaredWrites(files, declared)).toEqual([]);
  });

  it("오타 난 컬럼을 잡는다", () => {
    const files = src(`supabase.from("notes").insert({ user_id: u, bodyy: b })`);
    expect(findUndeclaredWrites(files, declared)).toEqual([
      { file: "x.ts", table: "notes", op: "insert", columns: ["bodyy"] },
    ]);
  });

  it("조건부 스프레드 안의 컬럼도 검사한다", () => {
    // `...(x ? { col: v } : {})`도 실제 컬럼으로 나간다 — 여기 숨은 오타를 놓치면 안 된다.
    const files = src(`supabase.from("notes").update({ ...(x ? { boddy: v } : {}) })`);
    expect(findUndeclaredWrites(files, declared)[0].columns).toEqual(["boddy"]);
  });

  it("값이 객체인 경우 그 내부 키는 컬럼으로 보지 않는다", () => {
    const files = src(`supabase.from("notes").insert({ body: { nested: 1 } })`);
    expect(findUndeclaredWrites(files, declared)).toEqual([]);
  });

  it("변이는 바로 앞의 from에 묶인다 (뒤 테이블로 오귀속 금지)", () => {
    // 창(window)으로 앞을 내다보면 뒤에 오는 다른 테이블의 삽입을 엉뚱한 테이블에 붙인다.
    const files = src(`
      supabase.from("notes").select("*");
      supabase.from("other").insert({ whatever: 1 });
    `);
    // other는 마이그레이션에 없는 테이블이라 대상 밖 — notes 위반으로 잡히면 안 된다.
    expect(findUndeclaredWrites(files, declared)).toEqual([]);
  });

  it("제약 정의를 컬럼으로 착각하지 않는다", () => {
    expect(declared.get("notes")).not.toContain("unique");
    expect(declared.get("notes")).not.toContain("primary");
  });
});
