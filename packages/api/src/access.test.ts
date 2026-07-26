import { describe, expect, it } from "vitest";
import {
  getMyAccess,
  listAccessProfiles,
  saveMyDashboardLayout,
  setUserDisabledFeatures,
  setUserRole,
  updateMyProfile,
} from "./access";

const ME = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";

type Row = Record<string, unknown>;

function fake(opts: { rows?: Row[]; user?: { id: string } | null; error?: string } = {}) {
  const state = { updates: [] as { payload: Row; id: string }[] };
  const rows = opts.rows ?? [];
  const supabase = {
    auth: {
      getUser: async () => ({
        data: { user: opts.user === undefined ? { id: ME } : opts.user },
      }),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () =>
            opts.error
              ? { data: null, error: { message: opts.error } }
              : { data: rows[0] ?? null, error: null },
        }),
        order: async () =>
          opts.error
            ? { data: null, error: { message: opts.error } }
            : { data: rows, error: null },
      }),
      update: (payload: Row) => ({
        eq: async (_col: string, id: string) => {
          state.updates.push({ payload, id });
          return opts.error ? { error: { message: opts.error } } : { error: null };
        },
      }),
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
  return { supabase, state };
}

function row(over: Row = {}): Row {
  return {
    id: ME,
    email: "me@example.com",
    display_name: "오리주인",
    avatar_url: null,
    role: "user",
    disabled_features: [],
    dashboard_layout: null,
    ...over,
  };
}

describe("getMyAccess", () => {
  it("행이 있으면 그대로 해석한다", async () => {
    const { supabase } = fake({
      rows: [row({ role: "admin", disabled_features: ["news"] })],
    });
    const a = await getMyAccess(supabase);
    expect(a.role).toBe("admin");
    expect(a.disabledFeatures).toEqual(["news"]);
    expect(a.displayName).toBe("오리주인");
  });

  // 2026-07-26 : 이 저장소가 한 번 밟은 함정 — 미적용 마이그레이션의 컬럼을 전제하면
  // 그 기능만이 아니라 해당 테이블 전체가 죽는다. 여기서는 **읽기가 조용히 기본값으로 떨어져야** 한다.
  it("마이그레이션 적용 전(컬럼 없음)에도 안전한 기본값을 준다", async () => {
    const { supabase } = fake({
      rows: [{ id: ME, email: "me@example.com", display_name: "오리주인" }],
    });
    const a = await getMyAccess(supabase);
    expect(a.role).toBe("user");
    expect(a.disabledFeatures).toEqual([]);
    expect(a.dashboardLayout).toEqual({ order: [], hidden: [] });
  });

  it("프로필 행이 아예 없어도 null이 아니라 기본값을 준다", async () => {
    // null을 주면 호출부마다 '없을 때'를 다시 정해야 하고 한 곳만 빠뜨려도 화면이 죽는다.
    const { supabase } = fake({ rows: [] });
    const a = await getMyAccess(supabase);
    expect(a.id).toBe(ME);
    expect(a.role).toBe("user");
  });

  it("저장된 역할이 이상한 값이면 가장 낮은 권한으로 떨어진다", async () => {
    const { supabase } = fake({ rows: [row({ role: "superadmin" })] });
    expect((await getMyAccess(supabase)).role).toBe("user");
  });

  it("로그인 안 하면 예외", async () => {
    const { supabase } = fake({ user: null });
    await expect(getMyAccess(supabase)).rejects.toThrow("로그인이 필요합니다.");
  });
});

describe("listAccessProfiles", () => {
  it("여러 행을 해석한다", async () => {
    const { supabase } = fake({ rows: [row(), row({ id: OTHER, role: "customer" })] });
    const list = await listAccessProfiles(supabase);
    expect(list).toHaveLength(2);
    expect(list[1].role).toBe("customer");
  });

  it("조회 실패는 예외로 올린다", async () => {
    const { supabase } = fake({ error: "boom" });
    await expect(listAccessProfiles(supabase)).rejects.toThrow("boom");
  });
});

describe("setUserRole", () => {
  it("다른 사용자의 역할을 바꾼다", async () => {
    const { supabase, state } = fake();
    await setUserRole(supabase, OTHER, "admin");
    expect(state.updates[0]).toMatchObject({ id: OTHER, payload: { role: "admin" } });
  });

  it("자기 관리자 권한은 스스로 내릴 수 없다", async () => {
    // 내리면 관리자 화면에 다시 못 들어가 되돌릴 방법이 사라진다.
    const { supabase, state } = fake();
    await expect(setUserRole(supabase, ME, "user")).rejects.toThrow("자신의 관리자 권한");
    expect(state.updates).toHaveLength(0);
  });

  it("자기 자신을 admin으로 두는 것은 막지 않는다(변화 없음)", async () => {
    const { supabase } = fake();
    await expect(setUserRole(supabase, ME, "admin")).resolves.toBeUndefined();
  });
});

describe("setUserDisabledFeatures", () => {
  it("아는 기능 key만 저장한다", async () => {
    const { supabase, state } = fake();
    const saved = await setUserDisabledFeatures(supabase, OTHER, [
      "news",
      "없는기능",
      "news",
      "office",
    ]);
    expect(saved).toEqual(["news", "office"]);
    expect(state.updates[0].payload).toEqual({ disabled_features: ["news", "office"] });
  });

  it("빈 목록도 저장한다(전부 다시 켜기)", async () => {
    const { supabase, state } = fake();
    await setUserDisabledFeatures(supabase, OTHER, []);
    expect(state.updates[0].payload).toEqual({ disabled_features: [] });
  });
});

describe("updateMyProfile", () => {
  it("이름을 다듬어 저장한다", async () => {
    const { supabase, state } = fake();
    await updateMyProfile(supabase, { displayName: "  꽥꽥  " });
    expect(state.updates[0].payload).toEqual({ display_name: "꽥꽥" });
    expect(state.updates[0].id).toBe(ME);
  });

  it.each(["", "   ", "가".repeat(51)])("이름 길이가 규칙에 안 맞으면 거부(%s)", async (bad) => {
    const { supabase, state } = fake();
    await expect(updateMyProfile(supabase, { displayName: bad })).rejects.toThrow("이름은");
    expect(state.updates).toHaveLength(0);
  });

  it("아무것도 안 넘기면 요청을 보내지 않는다", async () => {
    const { supabase, state } = fake();
    await updateMyProfile(supabase, {});
    expect(state.updates).toHaveLength(0);
  });

  it("역할이나 기능 토글은 이 경로로 바꿀 수 없다", async () => {
    // 열어 두면 사용자가 스스로 관리자가 된다. payload에 그런 키가 실리지 않음을 못박는다.
    const { supabase, state } = fake();
    await updateMyProfile(supabase, {
      displayName: "이름",
      // @ts-expect-error 계약에 없는 필드를 넣어도 저장되지 않아야 한다
      role: "admin",
      disabledFeatures: [],
    });
    expect(state.updates[0].payload).toEqual({ display_name: "이름" });
  });

  it("아바타를 지울 수 있다(null 전달)", async () => {
    const { supabase, state } = fake();
    await updateMyProfile(supabase, { avatarUrl: null });
    expect(state.updates[0].payload).toEqual({ avatar_url: null });
  });
});

describe("saveMyDashboardLayout", () => {
  it("본인 행에만 저장한다", async () => {
    const { supabase, state } = fake();
    await saveMyDashboardLayout(supabase, { order: ["todo"], hidden: ["memo"] });
    expect(state.updates[0].id).toBe(ME);
    expect(state.updates[0].payload).toEqual({
      dashboard_layout: { order: ["todo"], hidden: ["memo"] },
    });
  });

  it("저장 실패는 예외로 올린다(조용히 성공한 척하지 않는다)", async () => {
    const { supabase } = fake({ error: "column does not exist" });
    await expect(
      saveMyDashboardLayout(supabase, { order: [], hidden: [] }),
    ).rejects.toThrow("column does not exist");
  });
});
