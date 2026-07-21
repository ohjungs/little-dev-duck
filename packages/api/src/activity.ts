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

  const rows = entries.map((entry) => ({
    user_id: user.id,
    date: entry.date,
    source,
    count: entry.count,
  }));

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
