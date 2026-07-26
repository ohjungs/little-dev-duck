import type { SupabaseClient } from "@supabase/supabase-js";
import {
  activityDailyEntrySchema,
  type ActivityDailyEntry,
  type ActivitySource,
} from "@ldd/core";

type ActivityDailyRow = {
  date: string;
  source: string;
  count: number;
};

export type UpsertActivityDailyInput = {
  date: string;
  count: number;
};

export async function upsertActivityDaily(
  supabase: SupabaseClient,
  source: ActivitySource,
  entries: UpsertActivityDailyInput[],
): Promise<ActivityDailyEntry[]> {
  if (entries.length === 0) return [];

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("로그인이 필요합니다.");

  // updated_at을 명시적으로 세팅한다 - DB에 자동 갱신 트리거가 없어(todos/memos와 동일 패턴),
  // upsert의 UPDATE 경로에서 이 값을 넣지 않으면 updated_at이 최초 INSERT 시각에 고정된다.
  const now = new Date().toISOString();
  const rows = entries.map((entry) => {
    // 신뢰 경계 입력 검증 - 잘못된 date/음수·상한초과 count가 DB에 직행하지 않도록.
    const validated = activityDailyEntrySchema.parse({
      date: entry.date,
      source,
      count: entry.count,
    });
    return { user_id: user.id, ...validated, updated_at: now };
  });

  const { data, error } = await supabase
    .from("activity_daily")
    .upsert(rows, { onConflict: "user_id,date,source" })
    .select();

  if (error) throw new Error(error.message);

  return (data as ActivityDailyRow[]).map((row) =>
    activityDailyEntrySchema.parse({
      date: row.date,
      source: row.source,
      count: row.count,
    }),
  );
}

// 2026-07-26 : 백업 - 활동 기록 (Phase 31 T2)
// github 잔디는 다시 수집되지만 **claude_code는 로컬 수집기가 올린 값이라 재수집이 어렵다** —
// 이 표는 그쪽의 유일본이다. 행이 작아 담는 비용도 거의 없다.
export async function listActivityDaily(
  supabase: SupabaseClient,
  limit = ACTIVITY_EXPORT_LIMIT,
): Promise<ActivityDailyEntry[]> {
  const { data, error } = await supabase
    .from("activity_daily")
    .select("date, source, count")
    .order("date", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) =>
    activityDailyEntrySchema.parse({
      date: (r as ActivityDailyRow).date,
      source: (r as ActivityDailyRow).source,
      count: (r as ActivityDailyRow).count,
    }),
  );
}

// 하루 × 소스라 1년이면 730행 남짓. 넉넉히 잡되 상한은 둔다(잘림을 감지할 수 있게).
export const ACTIVITY_EXPORT_LIMIT = 3000;

// **이미 있으면 건드리지 않는다.** (user_id, date, source) 유일 제약이 있어 중복은 멱등이고,
// 덮어쓰면 지금 집계가 백업 시점 값으로 후퇴한다(가져오기의 "바꾸지 않는다" 계약).
export async function restoreActivityDaily(
  supabase: SupabaseClient,
  entry: ActivityDailyEntry,
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("로그인이 필요합니다.");

  const { error } = await supabase.from("activity_daily").insert({
    user_id: user.id,
    date: entry.date,
    source: entry.source,
    count: entry.count,
  });
  if (error && (error as { code?: string }).code !== "23505") {
    throw new Error(error.message);
  }
}
