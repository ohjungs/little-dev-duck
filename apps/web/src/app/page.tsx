import Image from "next/image";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { DuckWidget } from "@/components/DuckWidget";
import { DuckChatPanel } from "@/components/DuckChatPanel";
import { TodoWidget } from "@/components/TodoWidget";
import { MemoWidget } from "@/components/MemoWidget";
import { CalendarWidget } from "@/components/CalendarWidget";
import { HabitWidget } from "@/components/HabitWidget";
import { PomodoroWidget } from "@/components/PomodoroWidget";
import { GithubContributionWidget } from "@/components/GithubContributionWidget";
import { DesktopCollectorSync } from "@/components/DesktopCollectorSync";
import { WalkingModeToggle } from "@/components/WalkingModeToggle";

export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const displayName =
    (user.user_metadata.full_name as string | undefined) ??
    (user.user_metadata.name as string | undefined) ??
    user.email;

  const dateLabel = new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(new Date());

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between px-4 md:px-6 lg:px-8">
          <div className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center overflow-hidden rounded-lg bg-primary/12 ring-1 ring-primary/15">
              <Image
                src="/duck-logo.png"
                alt=""
                width={24}
                height={24}
                className="size-6 object-contain"
              />
            </span>
            <span className="text-sm font-semibold tracking-tight">
              Little Dev Duck
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <ThemeToggle />
            <WalkingModeToggle />
            <form action="/auth/logout" method="post">
              <Button variant="ghost" size="sm" type="submit">
                로그아웃
              </Button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 pb-16 pt-6 md:px-6 lg:px-8">
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

          <div className="md:col-span-2 lg:col-span-3">
            <GithubContributionWidget />
          </div>
        </div>
      </main>

      <DesktopCollectorSync />
    </div>
  );
}
