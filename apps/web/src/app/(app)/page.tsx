import { createClient } from "@/lib/supabase/server";
import { DuckWidget } from "@/components/DuckWidget";
import { DuckChatPanel } from "@/components/DuckChatPanel";
import { TodoWidget } from "@/components/TodoWidget";
import { MemoWidget } from "@/components/MemoWidget";
import { CalendarWidget } from "@/components/CalendarWidget";
import { HabitWidget } from "@/components/HabitWidget";
import { PomodoroWidget } from "@/components/PomodoroWidget";
import { GithubContributionWidget } from "@/components/GithubContributionWidget";
import { AgentChatPanel } from "@/components/AgentChatPanel";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const displayName =
    (user?.user_metadata.full_name as string | undefined) ??
    (user?.user_metadata.name as string | undefined) ??
    user?.email ??
    "사용자";

  const dateLabel = new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(new Date());

  return (
    <div className="mx-auto w-full max-w-7xl px-4 pb-16 pt-6 md:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-1">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          {dateLabel}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          안녕하세요, {displayName}님
        </h1>
        <p className="text-sm text-muted-foreground">
          오늘도 오리와 함께 차근차근 시작해볼까요.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="md:col-span-1 lg:col-span-1">
          <DuckWidget />
        </div>
        <div className="md:col-span-1 lg:col-span-2">
          <DuckChatPanel />
        </div>

        <TodoWidget />
        <HabitWidget />
        <PomodoroWidget />
        <div className="md:col-span-2 lg:col-span-2">
          <MemoWidget />
        </div>
        <CalendarWidget />
        <div className="md:col-span-1 lg:col-span-1">
          <AgentChatPanel />
        </div>

        <div className="md:col-span-2 lg:col-span-3">
          <GithubContributionWidget />
        </div>
      </div>
    </div>
  );
}
