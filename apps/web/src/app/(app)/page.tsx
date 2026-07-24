import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { DuckWidget } from "@/components/DuckWidget";
import { DuckChatPanel } from "@/components/DuckChatPanel";
import { TodoWidget } from "@/components/TodoWidget";
import { MemoWidget } from "@/components/MemoWidget";
import { CalendarWidget } from "@/components/CalendarWidget";
import { HabitWidget } from "@/components/HabitWidget";
import { PomodoroWidget } from "@/components/PomodoroWidget";
import { GithubContributionWidget } from "@/components/GithubContributionWidget";
import { OnboardingOverlay } from "@/components/OnboardingOverlay";

export const dynamic = "force-dynamic";

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 6) return "좋은 새벽이에요";
  if (h < 12) return "좋은 아침이에요";
  if (h < 18) return "좋은 오후예요";
  return "좋은 저녁이에요";
}

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
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(new Date());

  const greeting = getGreeting();

  return (
    <div className="mx-auto w-full max-w-7xl px-4 pb-16 pt-6 md:px-6 lg:px-8">
      <OnboardingOverlay />
      <div className="mb-6 flex flex-col gap-1">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          {dateLabel}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {greeting}! 오늘도 화이팅 🦆
        </h1>
        <p className="text-sm text-muted-foreground">
          안녕하세요, {displayName}님. 오늘도 오리와 함께 차근차근 시작해볼까요.
        </p>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        <Link href="/pages" className="px-3 py-1.5 text-xs rounded-full border hover:bg-accent">
          페이지 작성
        </Link>
        <Link href="/office" className="px-3 py-1.5 text-xs rounded-full border hover:bg-accent">
          오피스 방문
        </Link>
        <Link href="/news" className="px-3 py-1.5 text-xs rounded-full border hover:bg-accent">
          뉴스 확인
        </Link>
        <Link href="/insights" className="px-3 py-1.5 text-xs rounded-full border hover:bg-accent">
          통계 보기
        </Link>
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

        <div className="md:col-span-2 lg:col-span-3">
          <GithubContributionWidget />
        </div>
      </div>
    </div>
  );
}
