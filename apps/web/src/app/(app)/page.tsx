import { createClient } from "@/lib/supabase/server";
import { DuckWidget } from "@/components/DuckWidget";
import { DuckChatPanel } from "@/components/DuckChatPanel";
import { TodoWidget } from "@/components/TodoWidget";
import { MemoWidget } from "@/components/MemoWidget";
import { CalendarWidget } from "@/components/CalendarWidget";
import { HabitWidget } from "@/components/HabitWidget";
import { PomodoroWidget } from "@/components/PomodoroWidget";
import { NewsTopWidget } from "@/components/NewsTopWidget";
import { OnboardingOverlay } from "@/components/OnboardingOverlay";
import { DashboardGrid } from "@/components/DashboardGrid";
import { LastPageLink } from "@/components/LastPageLink";
import { getGreeting, getTimeEmoji } from "@/lib/greeting";
import { getMyAccess } from "@ldd/api";
import {
  EMPTY_LAYOUT,
  canUseFeature,
  visibleWidgets,
  resolveDisplayName,
} from "@ldd/core";
import { DASHBOARD_WIDGETS } from "@/lib/dashboardWidgets";

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

// 배치가 고른 id 순서대로, 준비된 위젯 정의를 꺼내 DashboardGrid가 받는 모양으로 만든다.
// 정의가 없는 id(예전 배치에 남은 위젯)는 조용히 건너뛴다 — core resolveOrder가 이미 걸러내지만
// 여기서도 막아 두면 정의와 목록이 어긋났을 때 화면이 죽지 않는다.
type WidgetDef = { label: string; className?: string; children: React.ReactNode };
function pickWidgets(ids: string[], defs: Record<string, WidgetDef>) {
  return ids
    .filter((id) => defs[id])
    .map((id) => ({ id, ...defs[id] }));
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 배치·권한을 서버에서 한 번 읽는다. 실패해도 대시보드는 기본 배치로 뜬다 —
  // 설정을 못 읽었다고 화면 전체가 비면 안 된다.
  const access = await getMyAccess(supabase).catch(() => null);
  const allowedIds = DASHBOARD_WIDGETS.filter(
    (w) =>
      w.feature === null ||
      !access ||
      canUseFeature(
        { role: access.role, disabledFeatures: access.disabledFeatures },
        w.feature,
      ),
  ).map((w) => w.id);
  const shownIds = visibleWidgets(allowedIds, access?.dashboardLayout ?? EMPTY_LAYOUT);

  // 2026-07-27 (2차 피드백 1-2): 인사말이 **프로필에서 바꾼 이름을 무시**하고 있었다.
  // 사이드바는 같은 값을 이미 프로필 우선으로 계산했는데 여기만 안 읽었다 — 두 벌이라 갈렸다.
  // 이 화면은 위 70행에서 `access`를 이미 받아 두고 권한 판정에만 쓰고 있었다(데이터는 있었다).
  // 계산은 core `resolveDisplayName` 한 벌로 옮겼다.
  const displayName = resolveDisplayName({
    profileName: access?.displayName,
    metadataFullName: user?.user_metadata.full_name,
    metadataName: user?.user_metadata.name,
  });

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

      {/* 2026-07-26 (피드백 1-2·1-5·6-2): 어떤 카드를 어떤 순서로 그릴지는 사용자 배치와
          관리자 기능 토글이 함께 정한다. 판정은 core 순수 함수에 있고 여기서는 고르기만 한다.
          비어 있으면(전부 숨김) DashboardGrid가 안내를 띄운다. */}
      <DashboardGrid
        widgets={pickWidgets(shownIds, {
          duck: {
            label: "오리",
            className: "md:col-span-1 xl:col-start-3 xl:row-start-1",
            children: <DuckWidget />,
          },
          chat: {
            label: "오리 채팅",
            className: "md:col-span-2 xl:col-start-1 xl:col-span-2 xl:row-start-1",
            children: <DuckChatPanel />,
          },
          todo: { label: "할 일", children: <TodoWidget /> },
          habit: { label: "습관", children: <HabitWidget /> },
          pomodoro: { label: "뽀모도로", children: <PomodoroWidget /> },
          memo: { label: "메모", className: "md:col-span-2", children: <MemoWidget /> },
          calendar: { label: "캘린더", children: <CalendarWidget /> },
          "news-top": { label: "오늘의 뉴스", children: <NewsTopWidget /> },
        })}
      />
    </div>
  );
}
