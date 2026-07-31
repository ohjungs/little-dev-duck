import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  collectDeclaredColumns,
  collectFunctionNames,
  collectSchemaFacts,
  findMissingRollbacks,
  findMessageSenderGuardMissing,
  findTablesMissingRoomIdGuard,
  findUndeclaredWrites,
  findUnknownRpcs,
  findUnknownTables,
  findUnrevokedDefiners,
  findViolations,
  isProfilesAdminColumnGuardMissing,
  purgeReachable,
  stripComments,
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

  it("코드가 참조하는 테이블이 전부 마이그레이션에 있다", () => {
    // 테이블명 오타는 런타임에만 터지고, 가짜 클라이언트 테스트는 이름을 검사하지 않는다.
    expect(findUnknownTables(loadApiSources(), collectDeclaredColumns(migrations))).toEqual([]);
  });

  it("코드가 호출하는 RPC가 전부 마이그레이션에 있다", () => {
    const fns = collectFunctionNames(migrations);
    expect(fns.size).toBeGreaterThan(3); // 실제로 읽었는지 먼저 확인
    expect(findUnknownRpcs(loadApiSources(), fns)).toEqual([]);
  });

  it("모든 마이그레이션에 짝이 되는 롤백 스크립트가 있다", () => {
    // CLAUDE.md 5절. 2026-07-24 배치에서 5건이 조용히 빠졌던 규칙이라 검사로 잠근다.
    expect(
      findMissingRollbacks(sqlFiles(MIGRATIONS_DIR), sqlFiles(ROLLBACK_DIR)),
    ).toEqual([]);
  });

  it("profiles의 role/disabled_features는 관리자만 바꿀 수 있도록 잠겨 있다", () => {
    // 2026-07-30 감사 발견(S1): profiles_update_own은 행 단위만 봐서 이 두 컬럼도 본인이
    // 자유롭게 바꿀 수 있었다(권한상승). 20260730160000의 BEFORE UPDATE 트리거가 막는다.
    expect(isProfilesAdminColumnGuardMissing(migrations)).toBe(false);
  });

  it("room_members·messages의 room_id가 양쪽 다 불변으로 잠겨 있다", () => {
    // 2026-07-30 감사 발견(S1): 소유자 검사만 하는 UPDATE 정책 때문에 자기 행의 room_id를
    // 바꿔 멤버십을 위조(→ 남의 대화 열람)하거나 메시지를 다른 방으로 옮길 수 있었다.
    expect(findTablesMissingRoomIdGuard(migrations)).toEqual([]);
  });

  it("messages의 sender_type·sender_user_id가 불변으로 잠겨 있다", () => {
    // 2026-07-30 : messages_insert_member는 보낸이 불변조건을 INSERT에서만 지키고
    // messages_update_sender는 sender_type을 전혀 제약하지 않았다. UPDATE로
    // sender_type='agent'로 바꾸면 core messageSchema의 refine을 위반하는 행이 남아
    // **그 방의 메시지 적재가 통째로 실패한다**(사칭이 아니라 무결성·가용성 문제다).
    // 20260730180000의 BEFORE UPDATE 트리거가 막는다.
    expect(findMessageSenderGuardMissing(migrations)).toBe(false);
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

  // 2026-07-31 : 삭제된 테이블은 검사 대상이 아니다 (메신저 제거 B-9)
  // 이 검사는 마이그레이션 **파일**을 읽는데, 테이블을 지워도 그것을 만든 옛 파일은 남는다
  // (적용 이력이자 복구 경로다). drop을 못 보면 이미 없는 테이블을 두고 "RLS가 없다·파기에서
  // 빠졌다"고 영원히 실패한다 — 메신저 4개를 내린 직후 실제로 그렇게 실패했다.
  describe("삭제된 테이블", () => {
    const withDrop = (dropSql: string): MigrationFile[] => [
      ...base(),
      { name: "0002_drop.sql", sql: dropSql },
    ];

    it("drop 뒤에는 그 테이블을 검사하지 않는다", () => {
      // 파기 함수에서 빠진 채로 두어도(=아래 base에서 notes를 지우지 않아도) 통과해야 한다.
      const files = withDrop("drop table if exists public.notes cascade;");
      expect(collectSchemaFacts(files).tables.has("notes")).toBe(false);
      expect(findViolations(collectSchemaFacts(files)).purgeMissing).toEqual([]);
    });

    it("drop이 없으면 여전히 검사한다 (검사가 공짜로 통과하지 않는다)", () => {
      // 위 통과가 "drop을 봤기 때문"임을 증명한다 — 안 그러면 규칙이 죽어도 초록이다.
      const files = withDrop("-- 아무것도 지우지 않는다");
      expect(collectSchemaFacts(files).tables.has("notes")).toBe(true);
    });

    it("나중에 다시 만들면 되살아난다", () => {
      // 파일 순서대로 처리한다는 계약. 복구 마이그레이션이 뒤에 오면 그게 이긴다.
      const files: MigrationFile[] = [
        ...withDrop("drop table public.notes;"),
        {
          name: "0003_restore.sql",
          sql: "create table public.notes ( id uuid primary key, user_id uuid );",
        },
      ];
      expect(collectSchemaFacts(files).tables.has("notes")).toBe(true);
    });
  });

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

  // 2026-07-30 : 보안 - 정적검사 - 함수경계 오귀속
  // 위 픽스처는 모두 **한 파일에 함수 하나**다. 한 파일에 여러 함수가 있으면
  // `[\s\S]*?security definer`가 앞 함수 선언부에서 시작해 **뒤 함수의** `security definer`까지
  // 삼킨다. 그 결과 ①앞 함수가 definer로 오인되고 ②정규식 lastIndex가 뒤 함수 선언을 지나쳐
  // **진짜 definer가 검사에서 사라진다**. 즉 노출된 함수를 조용히 통과시킨다 —
  // 이 파일이 findTablesMissingRoomIdGuard 주석에서 경고한 것과 같은 실패 모양이다.
  // 지금 저장소에는 이 조건을 만족하는 파일이 하나뿐이고 두 함수가 모두 definer라 우연히
  // 드러나지 않았다(20260727030000_messenger_rooms.sql). 우연에 기대지 않도록 못박는다.
  it("한 파일에 여러 함수가 있어도 뒤쪽 definer를 놓치지 않는다", () => {
    const files = [
      {
        name: "9999_two_functions.sql",
        sql: `
          create or replace function public.harmless_first()
          returns trigger
          language plpgsql
          as $$ begin return new; end $$;

          create or replace function public.exposed_second(p_id uuid)
          returns void
          language plpgsql
          security definer
          set search_path = public
          as $$ begin end; $$;
        `,
      },
    ];
    // 회수가 없으니 exposed_second가 반드시 잡혀야 한다.
    expect(findUnrevokedDefiners(files)).toContain("exposed_second");
    // 그리고 definer가 아닌 앞 함수를 끌어들이지 않아야 한다(오탐도 검사를 무력화한다).
    expect(findUnrevokedDefiners(files)).not.toContain("harmless_first");
  });
});

// ---------------------------------------------------------------------------
// profiles 관리자전용 컬럼가드 검사도 위반을 실제로 잡는지 (메타 검증)
// ---------------------------------------------------------------------------
describe("profiles 관리자전용 컬럼가드 검사가 위반을 잡는다", () => {
  const guardMigration = (fnBody: string): MigrationFile[] => [
    {
      name: "9999_guard.sql",
      sql: `
        create or replace function public.guard_profiles_admin_columns()
        returns trigger
        language plpgsql
        set search_path = public
        as $$
        begin
          ${fnBody}
          return new;
        end;
        $$;

        create trigger profiles_guard_admin_columns
          before update on public.profiles
          for each row execute function public.guard_profiles_admin_columns();
      `,
    },
  ];

  it("트리거 자체가 없으면 잡는다", () => {
    expect(isProfilesAdminColumnGuardMissing([{ name: "0001.sql", sql: "" }])).toBe(true);
  });

  it("role만 보고 disabled_features는 안 보면 잡는다", () => {
    const files = guardMigration(`
      if new.role is distinct from old.role and not public.is_admin() then
        raise exception 'nope';
      end if;
    `);
    expect(isProfilesAdminColumnGuardMissing(files)).toBe(true);
  });

  it("is_admin() 체크 없이 그냥 막기만 하면 잡는다", () => {
    // 관리자 자신의 role 변경(관리자 화면에서 남을 승격)까지 막아버리는 퇴행.
    const files = guardMigration(`
      if new.role is distinct from old.role or new.disabled_features is distinct from old.disabled_features then
        raise exception 'nope';
      end if;
    `);
    expect(isProfilesAdminColumnGuardMissing(files)).toBe(true);
  });

  it("role·disabled_features 둘 다 is_admin()으로 지키면 통과한다", () => {
    const files = guardMigration(`
      if (new.role is distinct from old.role or new.disabled_features is distinct from old.disabled_features)
         and not public.is_admin() then
        raise exception 'nope';
      end if;
    `);
    expect(isProfilesAdminColumnGuardMissing(files)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// room_id 불변가드 검사도 위반을 실제로 잡는지 (메타 검증)
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// messages 보낸이 불변가드 검사도 위반을 실제로 잡는지 (메타 검증)
// ---------------------------------------------------------------------------
describe("messages 보낸이 불변가드 검사가 위반을 잡는다", () => {
  const fn = (body: string) => `
    create or replace function public.guard_message_sender_immutable()
    returns trigger language plpgsql set search_path = public as $$
    begin
      ${body}
      return new;
    end;
    $$;
  `;
  const BOTH = `
    if new.sender_type is distinct from old.sender_type then
      raise exception 'nope';
    end if;
    if new.sender_user_id is distinct from old.sender_user_id then
      raise exception 'nope';
    end if;
  `;
  const TRIGGER = `
    create trigger messages_guard_sender
      before update on public.messages
      for each row execute function public.guard_message_sender_immutable();
  `;
  const files = (sql: string): MigrationFile[] => [{ name: "9999_s.sql", sql }];

  it("가드가 아예 없으면 잡는다", () => {
    expect(findMessageSenderGuardMissing(files(""))).toBe(true);
  });

  it("함수만 있고 트리거를 안 걸면 잡는다", () => {
    // 함수를 만들어 두고 붙이는 걸 잊는 것이 흔한 실패다 — 그때 조용히 통과하면 안 된다.
    expect(findMessageSenderGuardMissing(files(fn(BOTH)))).toBe(true);
  });

  it("트리거는 있지만 sender_type을 안 보면 잡는다", () => {
    const weak = fn(`
      if new.sender_user_id is distinct from old.sender_user_id then
        raise exception 'nope';
      end if;
    `);
    expect(findMessageSenderGuardMissing(files(weak + TRIGGER))).toBe(true);
  });

  it("트리거는 있지만 sender_user_id를 안 보면 잡는다", () => {
    const weak = fn(`
      if new.sender_type is distinct from old.sender_type then
        raise exception 'nope';
      end if;
    `);
    expect(findMessageSenderGuardMissing(files(weak + TRIGGER))).toBe(true);
  });

  it("room_members에만 걸면 잡는다 (테이블을 잘못 지정한 경우)", () => {
    const wrongTable = `
      create trigger messages_guard_sender
        before update on public.room_members
        for each row execute function public.guard_message_sender_immutable();
    `;
    expect(findMessageSenderGuardMissing(files(fn(BOTH) + wrongTable))).toBe(true);
  });

  it("둘 다 보고 messages에 걸면 통과한다", () => {
    expect(findMessageSenderGuardMissing(files(fn(BOTH) + TRIGGER))).toBe(false);
  });
});

describe("room_id 불변가드 검사가 위반을 잡는다", () => {
  const GUARD_FN = `
    create or replace function public.guard_room_id_immutable()
    returns trigger language plpgsql set search_path = public as $$
    begin
      if new.room_id is distinct from old.room_id then
        raise exception 'nope';
      end if;
      return new;
    end;
    $$;
  `;
  const trigger = (table: string) => `
    create trigger ${table}_guard_room_id
      before update on public.${table}
      for each row execute function public.guard_room_id_immutable();
  `;
  const files = (sql: string): MigrationFile[] => [{ name: "9999_g.sql", sql }];

  it("가드가 아예 없으면 두 테이블 모두 잡는다", () => {
    expect(findTablesMissingRoomIdGuard(files(""))).toEqual([
      "messages",
      "room_members",
    ]);
  });

  it("한쪽만 막으면 다른 쪽을 잡는다", () => {
    // 한쪽만 막으면 다른 쪽 공격 경로가 그대로 남는다 — 이게 이 검사의 존재 이유다.
    expect(
      findTablesMissingRoomIdGuard(files(GUARD_FN + trigger("room_members"))),
    ).toEqual(["messages"]);
  });

  it("트리거는 있지만 함수가 room_id를 안 보면 잡는다", () => {
    const weak = `
      create or replace function public.guard_room_id_immutable()
      returns trigger language plpgsql as $$
      begin
        return new;
      end;
      $$;
    `;
    expect(
      findTablesMissingRoomIdGuard(
        files(weak + trigger("room_members") + trigger("messages")),
      ),
    ).toEqual(["messages", "room_members"]);
  });

  it("양쪽 다 막으면 통과한다", () => {
    expect(
      findTablesMissingRoomIdGuard(
        files(GUARD_FN + trigger("room_members") + trigger("messages")),
      ),
    ).toEqual([]);
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

// ---------------------------------------------------------------------------
// 테이블·RPC 이름 검사와 주석 처리 (메타 검증)
// ---------------------------------------------------------------------------
describe("테이블·RPC 이름 검사", () => {
  const migration: MigrationFile[] = [
    {
      name: "0001.sql",
      sql: `
        create table public.notes (id uuid primary key, body text);
        create function public.do_thing() returns void language sql as $$ select 1; $$;
      `,
    },
  ];
  const declared = collectDeclaredColumns(migration);
  const fns = collectFunctionNames(migration);
  const src = (code: string): SourceFile[] => [{ name: "x.ts", code }];

  it("선언된 테이블은 통과한다", () => {
    expect(findUnknownTables(src(`supabase.from("notes").select()`), declared)).toEqual([]);
  });

  it("테이블명 오타를 잡는다", () => {
    expect(findUnknownTables(src(`supabase.from("notess").select()`), declared)).toEqual([
      { file: "x.ts", table: "notess" },
    ]);
  });

  it("선언된 RPC는 통과한다", () => {
    expect(findUnknownRpcs(src(`supabase.rpc("do_thing")`), fns)).toEqual([]);
  });

  it("RPC 이름 오타를 잡는다", () => {
    expect(findUnknownRpcs(src(`supabase.rpc("do_thingg", {})`), fns)).toEqual([
      { file: "x.ts", rpc: "do_thingg" },
    ]);
  });

  it("주석 안의 예시는 실제 호출로 보지 않는다", () => {
    // 이 파일 자신의 주석이 실제로 오탐을 만들었다 — 없는 위반을 내는 검사는 곧 무시된다.
    const files = src(`
      // 각 변이를 바로 앞의 .from("table")에 묶는다
      /* supabase.rpc("legacy_thing") 은 예전 방식 */
      supabase.from("notes").select();
    `);
    expect(findUnknownTables(files, declared)).toEqual([]);
    expect(findUnknownRpcs(files, fns)).toEqual([]);
  });
});

describe("stripComments", () => {
  it("한 줄 주석을 지운다", () => {
    expect(stripComments('const a = 1; // from("x")').trim()).toBe("const a = 1;");
  });

  it("여러 줄에 걸친 블록 주석을 지운다", () => {
    const code = ["a;", "/* from(\"x\")", "여러 줄 */", "b;"].join("\n");
    expect(stripComments(code).replace(/\s+/g, " ").trim()).toBe("a; b;");
  });

  it("URL의 //는 건드리지 않는다", () => {
    const code = 'const u = "https://example.com/a";';
    expect(stripComments(code)).toBe(code);
  });
});
