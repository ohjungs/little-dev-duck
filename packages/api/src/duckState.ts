import type { SupabaseClient } from "@supabase/supabase-js";
import {
  FEED_MAX,
  FEED_PER_XP,
  deriveLevel,
  duckStateSchema,
  xpAfterAward,
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

// XP 원천 보상을 적용하고 레벨 재계산 + 먹이 적립 후 갱신된 상태를 반환.
// 주의: read-modify-write라 여러 원천에서 거의 동시에 획득하면 일부가 언더카운트될 수 있다
// (1인 저동시성 전제상 허용, 정확성이 필요해지면 Postgres 원자 증가 rpc로 교체 — 후속 과제).
export async function applyXpAward(
  supabase: SupabaseClient,
  source: XpSource,
): Promise<DuckState> {
  const current = await getDuckState(supabase);
  const newXp = xpAfterAward(current.xp, source);
  const gained = newXp - current.xp;
  const newLevel = deriveLevel(newXp);
  const newFeed = Math.min(FEED_MAX, current.feed + Math.round(gained * FEED_PER_XP));

  const { data, error } = await supabase
    .from("duck_state")
    .update({
      xp: newXp,
      level: newLevel,
      feed: newFeed,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", current.userId)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return fromRow(data as DuckStateRow);
}
