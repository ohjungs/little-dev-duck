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
import { DashboardGrid } from "@/components/DashboardGrid";
import { LastPageLink } from "@/components/LastPageLink";

export const dynamic = "force-dynamic";

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 6) return "좋은 새벽이에요";
  if (h < 12) return "좋은 아침이에요";
  if (h < 18) return "좋은 오후예요";
  return "좋은 저녁이에요";
}

function getTimeEmoji(): string {
  const h = new Date().getHours();
  if (h >= 6 && h < 12) return "\u{1F324}\uFE0F"; // 🌤 morning sun
  if (h >= 12 && h < 18) return "\u2600\uFE0F";   // ☀ afternoon sun
  if (h >= 18 && h < 22) return "\u{1F307}";      // 🌇 sunset
  return "\u{1F319}";                              // 🌙 moon (22-5)
}

// 날짜 기반으로 하루 동안 일관된 동기부여 메시지를 고른다(무작위 아님).
const MOTIVATIONS = [
  "오늘도 화이팅",
  "좋은 하루 보내세요",
  "오늘은 뭘 만들어볼까요",
  "한 걸음씩 나아가요",
  "작은 것부터 시작해봐요",
  "오늘의 목표를 세워봐요",
  "멋진 하루가 될 거예요",
];

function getDailyMotivation(): string {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor(
    (now.getTime() - startOfYear.getTime()) / 86_400_000,
  );
  return MOTIVATIONS[dayOfYear % MOTIVATIONS.length];
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
  const timeEmoji = getTimeEmoji();
  const motivation = getDailyMotivation();

  return (
    <div className="mx-auto w-full max-w-7xl px-4 pb-16 pt-6 md:px-6 lg:px-8">
      <OnboardingOverlay />
      <div className="mb-6 flex flex-col gap-1">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          {dateLabel}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {timeEmoji} {greeting}! {motivation}
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

      <LastPageLink />

      <DashboardGrid
        widgets={[
          {
            id: "duck",
            label: "오리",
            className: "md:col-span-1 xl:col-start-3 xl:row-start-1",
            children: <DuckWidget />,
          },
          {
            id: "chat",
            label: "오리 채팅",
            className: "md:col-span-2 xl:col-start-1 xl:col-span-2 xl:row-start-1",
            children: <DuckChatPanel />,
          },
          {
            id: "todo",
            label: "할 일",
            children: <TodoWidget />,
          },
          {
            id: "habit",
            label: "습관",
            children: <HabitWidget />,
          },
          {
            id: "pomodoro",
            label: "뽀모도로",
            children: <PomodoroWidget />,
          },
          {
            id: "memo",
            label: "메모",
            className: "md:col-span-2",
            children: <MemoWidget />,
          },
          {
            id: "calendar",
            label: "캘린더",
            children: <CalendarWidget />,
          },
          {
            id: "github",
            label: "GitHub 잔디",
            className: "md:col-span-2 xl:col-span-3",
            children: <GithubContributionWidget />,
          },
        ]}
      />
    </div>
  );
}
