import type { SupabaseClient, RealtimeChannel } from "@supabase/supabase-js";

// Subscribe to INSERT/UPDATE/DELETE on a table, filtered by user_id.
// Returns cleanup function.
export function subscribeTable(
  supabase: SupabaseClient,
  table: string,
  userId: string,
  onChange: () => void,
): () => void {
  const channel: RealtimeChannel = supabase
    .channel(`${table}-${userId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table,
        filter: `user_id=eq.${userId}`,
      },
      () => {
        onChange();
      },
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
