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
