import type { SupabaseClient } from "@supabase/supabase-js";
import { calendarEventSchema, type CalendarEvent } from "@ldd/core";

type CalendarEventRow = {
  id: string;
  user_id: string;
  title: string;
  start_at: string;
  end_at: string | null;
  created_at: string;
  updated_at: string;
};

function fromRow(row: CalendarEventRow): CalendarEvent {
  return calendarEventSchema.parse({
    id: row.id,
    userId: row.user_id,
    title: row.title,
    startAt: row.start_at,
    endAt: row.end_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

export async function listCalendarEvents(
  supabase: SupabaseClient,
): Promise<CalendarEvent[]> {
  const { data, error } = await supabase
    .from("calendar_events")
    .select("*")
    .order("start_at", { ascending: true })
    .limit(500);

  if (error) throw new Error(error.message);
  return (data as CalendarEventRow[]).map(fromRow);
}

export type CreateCalendarEventInput = {
  title: string;
  startAt: string;
  endAt?: string | null;
};

export async function createCalendarEvent(
  supabase: SupabaseClient,
  input: CreateCalendarEventInput,
): Promise<CalendarEvent> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("로그인이 필요합니다.");

  const { data, error } = await supabase
    .from("calendar_events")
    .insert({
      user_id: user.id,
      title: input.title,
      start_at: input.startAt,
      end_at: input.endAt ?? null,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return fromRow(data as CalendarEventRow);
}

export type UpdateCalendarEventInput = Partial<{
  title: string;
  startAt: string;
  endAt: string | null;
}>;

export async function updateCalendarEvent(
  supabase: SupabaseClient,
  id: string,
  patch: UpdateCalendarEventInput,
): Promise<CalendarEvent> {
  const { data, error } = await supabase
    .from("calendar_events")
    .update({
      ...(patch.title !== undefined ? { title: patch.title } : {}),
      ...(patch.startAt !== undefined ? { start_at: patch.startAt } : {}),
      ...(patch.endAt !== undefined ? { end_at: patch.endAt } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return fromRow(data as CalendarEventRow);
}

export async function deleteCalendarEvent(
  supabase: SupabaseClient,
  id: string,
): Promise<void> {
  const { error } = await supabase
    .from("calendar_events")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);
}

// 2026-07-26 : 백업 - 가져오기 - 일정복원
// restoreTodo와 같은 계약: 같은 id로 되살리고, 인자의 userId는 무시하고 로그인 사용자로
// 채우며, 이미 있으면 멱등 성공으로 본다.
export async function restoreCalendarEvent(
  supabase: SupabaseClient,
  event: CalendarEvent,
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("로그인이 필요합니다.");

  const { error } = await supabase.from("calendar_events").insert({
    id: event.id,
    user_id: user.id,
    title: event.title,
    start_at: event.startAt,
    end_at: event.endAt,
    created_at: event.createdAt,
    updated_at: event.updatedAt,
  });

  if (error && (error as { code?: string }).code !== "23505") {
    throw new Error(error.message);
  }
}
