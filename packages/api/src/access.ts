import type { SupabaseClient } from "@supabase/supabase-js";
import {
  DEFAULT_ROLE,
  EMPTY_LAYOUT,
  isFeatureKey,
  parseDashboardLayout,
  parseDisabledFeatures,
  parseRole,
  type DashboardLayout,
  type FeatureKey,
  type Role,
} from "@ldd/core";

// 2026-07-26 : 권한 - 조회·변경 (피드백 6-1·6-2·6-3·6-4·1-2·1-5)
//
// **이 파일의 가장 중요한 성질: 마이그레이션이 아직 적용되지 않아도 앱이 그대로 동작한다.**
// 이 저장소는 정확히 그 함정을 한 번 밟았다 — 미적용 컬럼을 insert payload에 무조건 실어
// 그 테이블 쓰기가 통째로 죽은 채 배포됐다(lessons-learned).
// 그래서 여기서는
//   · 읽기: `select *`로 받아 **있는 값만** 해석한다(컬럼이 없으면 기본값으로 떨어진다)
//   · 쓰기: 그 컬럼을 쓰는 함수만 실패한다(다른 프로필 갱신은 영향 없음)
// 로 갈라 둔다.

export type AccessProfile = {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  role: Role;
  disabledFeatures: FeatureKey[];
  dashboardLayout: DashboardLayout;
};

// 컬럼이 아직 없을 수 있으므로 zod 전체 parse가 아니라 필드별 관용 해석을 쓴다.
// (엄격 parse는 마이그레이션 적용 전에 로그인 직후 화면을 통째로 죽인다.)
function toAccessProfile(row: Record<string, unknown>): AccessProfile {
  return {
    id: String(row.id ?? ""),
    email: typeof row.email === "string" ? row.email : "",
    displayName:
      typeof row.display_name === "string" && row.display_name.length > 0
        ? row.display_name
        : "사용자",
    avatarUrl: typeof row.avatar_url === "string" ? row.avatar_url : null,
    role: parseRole(row.role),
    disabledFeatures: parseDisabledFeatures(row.disabled_features),
    dashboardLayout: parseDashboardLayout(row.dashboard_layout),
  };
}

async function requireUserId(supabase: SupabaseClient): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("로그인이 필요합니다.");
  return user.id;
}

// 로그인 사용자의 프로필 + 권한. 행이 없으면(트리거 실패 등) null이 아니라 안전한 기본값을 준다 —
// 여기서 null을 돌려주면 호출부마다 "없으면 어떻게 할지"를 다시 정해야 하고, 한 곳만 빠뜨려도
// 화면이 죽는다. 기본값은 가장 낮은 권한 + 모든 기능 켜짐(기존 동작과 동일)이다.
export async function getMyAccess(supabase: SupabaseClient): Promise<AccessProfile> {
  const userId = await requireUserId(supabase);
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) {
    return {
      id: userId,
      email: "",
      displayName: "사용자",
      avatarUrl: null,
      role: DEFAULT_ROLE,
      disabledFeatures: [],
      dashboardLayout: EMPTY_LAYOUT,
    };
  }
  return toAccessProfile(data as Record<string, unknown>);
}

// 관리자용 전체 사용자 목록. RLS가 판정하므로 여기서 role을 다시 검사하지 않는다 —
// 검사를 두 곳에 두면 갈라지고, **권한의 단일 출처는 RLS여야 한다**(화면만 숨기면 API는 열려 있다).
// 관리자가 아니면 정책상 자기 행만 돌아온다(에러가 아니라 1건).
export async function listAccessProfiles(
  supabase: SupabaseClient,
): Promise<AccessProfile[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => toAccessProfile(r as Record<string, unknown>));
}

// 역할 변경(관리자). 실제 허용 여부는 RLS가 판정한다.
export async function setUserRole(
  supabase: SupabaseClient,
  targetUserId: string,
  role: Role,
): Promise<void> {
  const myId = await requireUserId(supabase);
  // 자기 역할을 스스로 내리면 관리자 화면에 다시 못 들어간다 — 되돌릴 방법이 없어진다.
  // RLS로는 막을 수 없는 규칙이라(정책은 "누가 쓰는가"만 본다) 여기서 막는다.
  if (targetUserId === myId && role !== "admin") {
    throw new Error("자신의 관리자 권한은 해제할 수 없어요. 다른 관리자가 변경해야 합니다.");
  }
  const { error } = await supabase
    .from("profiles")
    .update({ role })
    .eq("id", targetUserId);
  if (error) throw new Error(error.message);
}

// 기능 토글(관리자). 아는 key만 저장한다 — 모르는 값이 들어가면 화면에 이름 없는 항목이 뜬다.
export async function setUserDisabledFeatures(
  supabase: SupabaseClient,
  targetUserId: string,
  features: readonly string[],
): Promise<FeatureKey[]> {
  const clean: FeatureKey[] = [];
  for (const f of features) {
    if (isFeatureKey(f) && !clean.includes(f)) clean.push(f);
  }
  const { error } = await supabase
    .from("profiles")
    .update({ disabled_features: clean })
    .eq("id", targetUserId);
  if (error) throw new Error(error.message);
  return clean;
}

// 본인 프로필 수정(피드백 6-4). 역할·기능 토글은 여기서 못 바꾼다 —
// 같은 함수로 열어 두면 사용자가 스스로 관리자가 될 수 있다.
export async function updateMyProfile(
  supabase: SupabaseClient,
  input: { displayName?: string; avatarUrl?: string | null },
): Promise<void> {
  const userId = await requireUserId(supabase);
  const payload: Record<string, unknown> = {};
  if (input.displayName !== undefined) {
    const name = input.displayName.trim();
    // DB CHECK(1~50자)와 같은 규칙. 여기서 먼저 막아야 사용자가 무슨 문제인지 알 수 있다
    // (PostgREST 오류 문구는 사람이 읽을 것이 못 된다).
    if (name.length < 1 || name.length > 50) {
      throw new Error("이름은 1자 이상 50자 이하여야 해요.");
    }
    payload.display_name = name;
  }
  if (input.avatarUrl !== undefined) {
    payload.avatar_url = input.avatarUrl;
  }
  if (Object.keys(payload).length === 0) return;
  const { error } = await supabase.from("profiles").update(payload).eq("id", userId);
  if (error) throw new Error(error.message);
}

// 본인 대시보드 배치 저장(피드백 1-2·1-5).
export async function saveMyDashboardLayout(
  supabase: SupabaseClient,
  layout: DashboardLayout,
): Promise<void> {
  const userId = await requireUserId(supabase);
  const { error } = await supabase
    .from("profiles")
    .update({ dashboard_layout: { order: layout.order, hidden: layout.hidden } })
    .eq("id", userId);
  if (error) throw new Error(error.message);
}
