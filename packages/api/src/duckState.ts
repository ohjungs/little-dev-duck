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
