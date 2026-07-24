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

// 서버 컴포넌트(force-dynamic)는 Vercel의 UTC 시간을 쓰므로, 인사·아이콘·날짜를 반드시
// KST(Asia/Seoul) 기준으로 계산한다. 안 그러면 한국 밤에도 UTC 오후가 잡혀 "오후 ☀️"가 뜬다.
function kstHour(): number {
  return Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Seoul",
      hour: "2-digit",
      hourCycle: "h23",
    }).format(new Date()),
  );
}

function getGreeting(h: number): string {
  if (h < 6) return "좋은 새벽이에요";
  if (h < 12) return "좋은 아침이에요";
  if (h < 18) return "좋은 오후예요";
  return "좋은 저녁이에요";
}

function getTimeEmoji(h: number): string {
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
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(new Date());

  const h = kstHour();
  const greeting = getGreeting(h);
  const timeEmoji = getTimeEmoji(h);
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
