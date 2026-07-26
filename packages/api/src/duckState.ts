import type { SupabaseClient } from "@supabase/supabase-js";
import {
  FEED_MAX,
  FEED_PER_XP,
  XP_PER_LEVEL_BASE,
  XP_REWARDS,
  duckStateSchema,
  type DuckState,
  type XpSource,
} from "@ldd/core";

type DuckStateRow = {
  user_id: string;
  xp: number;
  level: number;
  feed: number;
  costume: string;
  updated_at: string;
};

function fromRow(row: DuckStateRow): DuckState {
  return duckStateSchema.parse({
    userId: row.user_id,
    xp: row.xp,
    level: row.level,
    feed: row.feed,
    costume: row.costume,
    updatedAt: row.updated_at,
  });
}

// duck_state는 사용자당 1행. 없으면 기본값 행을 만들어 반환(최초 접속 시).
export async function getDuckState(
  supabase: SupabaseClient,
): Promise<DuckState> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("로그인이 필요합니다.");

  const { data, error } = await supabase
    .from("duck_state")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (data) return fromRow(data as DuckStateRow);

  const { data: created, error: insertError } = await supabase
    .from("duck_state")
    .insert({ user_id: user.id })
    .select()
    .single();
  if (insertError) throw new Error(insertError.message);
  return fromRow(created as DuckStateRow);
}

// XP 원천 보상을 Postgres RPC로 원자적으로 증가시킨다.
// 단일 UPDATE로 xp·level·feed를 동시에 갱신해 read-modify-write race condition을 제거한다.
export async function applyXpAward(
  supabase: SupabaseClient,
  userId: string,
  source: XpSource,
): Promise<void> {
  const amount = XP_REWARDS[source] ?? 0;
  if (amount <= 0) return;

  const { error } = await supabase.rpc("award_xp", {
    p_user_id: userId,
    p_xp_amount: amount,
    p_xp_per_level: XP_PER_LEVEL_BASE,
    p_feed_per_xp: FEED_PER_XP,
    p_feed_max: FEED_MAX,
  });
  if (error) throw new Error(error.message);
}

// 2026-07-26 : 백업 - 가져오기 - 오리상태복원
// **이미 있으면 건드리지 않는다.** duck_state는 user_id가 기본키라 행이 하나뿐이고, 덮어쓰면
// 지금 레벨이 백업 시점으로 **후퇴한다** — 가져오기의 "지금 데이터를 바꾸지 않는다" 계약 위반이다.
// 그래서 insert만 하고 23505(이미 있음)는 성공으로 본다. 계정을 갈아탄 뒤 처음 복원할 때만
// 실제로 값이 들어간다.
export async function restoreDuckState(
  supabase: SupabaseClient,
  state: DuckState,
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("로그인이 필요합니다.");

  const { error } = await supabase.from("duck_state").insert({
    // 인자의 userId는 쓰지 않는다(남의 행을 만들 수 없어야 한다).
    user_id: user.id,
    xp: state.xp,
    level: state.level,
    feed: state.feed,
    costume: state.costume,
    updated_at: state.updatedAt,
  });
  if (error && (error as { code?: string }).code !== "23505") {
    throw new Error(error.message);
  }
}
