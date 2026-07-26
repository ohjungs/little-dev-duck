import type { SupabaseClient } from "@supabase/supabase-js";
import {
  habitSchema,
  habitCheckSchema,
  type Habit,
  type HabitCheck,
} from "@ldd/core";
import { applyXpAward } from "./duckState";

type HabitRow = {
  id: string;
  user_id: string;
  title: string;
  frequency: "daily" | "weekly";
  times_per_week: number | null;
  created_at: string;
  updated_at: string;
};

type HabitCheckRow = {
  id: string;
  habit_id: string;
  user_id: string;
  checked_date: string;
  created_at: string;
};

function fromHabitRow(row: HabitRow): Habit {
  return habitSchema.parse({
    id: row.id,
    userId: row.user_id,
    title: row.title,
    frequency: row.frequency,
    timesPerWeek: row.times_per_week,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

function fromCheckRow(row: HabitCheckRow): HabitCheck {
  return habitCheckSchema.parse({
    id: row.id,
    habitId: row.habit_id,
    userId: row.user_id,
    checkedDate: row.checked_date,
    createdAt: row.created_at,
  });
}

export async function listHabits(supabase: SupabaseClient): Promise<Habit[]> {
  const { data, error } = await supabase
    .from("habits")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) throw new Error(error.message);
  return (data as HabitRow[]).map(fromHabitRow);
}

export type CreateHabitInput = {
  title: string;
  frequency: "daily" | "weekly";
  timesPerWeek?: number | null;
};

export async function createHabit(
  supabase: SupabaseClient,
  input: CreateHabitInput,
): Promise<Habit> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("로그인이 필요합니다.");

  const { data, error } = await supabase
    .from("habits")
    .insert({
      user_id: user.id,
      title: input.title,
      frequency: input.frequency,
      times_per_week: input.timesPerWeek ?? null,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return fromHabitRow(data as HabitRow);
}

export async function deleteHabit(
  supabase: SupabaseClient,
  id: string,
): Promise<void> {
  const { error } = await supabase.from("habits").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// limit은 선택 — 주지 않으면 종전대로 상한 없이 조회한다(기존 호출부 동작 불변).
// 내보내기만 상한을 명시한다: 상한을 걸어야 "돌아온 개수 == 상한"으로 잘림을 감지할 수 있고,
// 상한이 없으면 PostgREST 서버 기본값에서 **조용히** 잘려도 알 방법이 없다.
export async function listHabitChecks(
  supabase: SupabaseClient,
  limit?: number,
): Promise<HabitCheck[]> {
  let query = supabase
    .from("habit_checks")
    .select("*")
    .order("checked_date", { ascending: false });
  if (limit !== undefined) query = query.limit(limit);
  const { data, error } = await query;

  if (error) throw new Error(error.message);
  return (data as HabitCheckRow[]).map(fromCheckRow);
}

// 습관 체크는 하루 × 습관 수로 빠르게 쌓여 500건은 1년도 못 간다. 행이 작아 상한을 높게 잡는다.
export const HABIT_CHECK_EXPORT_LIMIT = 5000;

export async function checkHabit(
  supabase: SupabaseClient,
  habitId: string,
  checkedDate: string,
): Promise<HabitCheck> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("로그인이 필요합니다.");

  const { data, error } = await supabase
    .from("habit_checks")
    .insert({
      habit_id: habitId,
      user_id: user.id,
      checked_date: checkedDate,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  // 습관 체크가 확정된 뒤에만 XP를 지급한다(먹이·레벨 반영). 삽입된 체크를 반환.
  await applyXpAward(supabase, user.id, "habitCheck");
  return fromCheckRow(data as HabitCheckRow);
}

export async function listHabitChecksInRange(
  supabase: SupabaseClient,
  from: string,
  to: string,
): Promise<HabitCheck[]> {
  const { data, error } = await supabase
    .from("habit_checks")
    .select("*")
    .gte("checked_date", from)
    .lte("checked_date", to)
    .order("checked_date", { ascending: true });
  if (error) throw new Error(error.message);
  return (data as HabitCheckRow[]).map(fromCheckRow);
}

export async function uncheckHabit(
  supabase: SupabaseClient,
  habitId: string,
  checkedDate: string,
): Promise<void> {
  const { error } = await supabase
    .from("habit_checks")
    .delete()
    .eq("habit_id", habitId)
    .eq("checked_date", checkedDate);
  if (error) throw new Error(error.message);
}
