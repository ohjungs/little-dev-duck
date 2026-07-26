import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppSidebar, AppMobileBar } from "@/components/AppNav";
import { DesktopCollectorSync } from "@/components/DesktopCollectorSync";
import { WeeklyDigestTrigger } from "@/components/WeeklyDigestTrigger";
import { CommandPalette } from "@/components/CommandPalette";
import { ShortcutsHelp } from "@/components/ShortcutsHelp";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ScrollToTop } from "@/components/ScrollToTop";
import { getMyAccess } from "@ldd/api";
import { canAdminister, canUseFeature, type FeatureKey } from "@ldd/core";

export const dynamic = "force-dynamic";

// 사이드바 메뉴 중 기능 토글에 묶인 것. href는 AppNav의 NAV와 같아야 한다 —
// 여기서 숨겨도 AppNav에 없는 href면 아무 일도 일어나지 않는다.
const NAV_FEATURES: { href: string; feature: FeatureKey }[] = [
  { href: "/pages", feature: "pages" },
  { href: "/insights", feature: "insights" },
  { href: "/news", feature: "news" },
  { href: "/office", feature: "office" },
];

// 앱 셸: 인증 가드 + 사이드바/모바일바 네비. /login은 이 그룹 밖이라 가드에 안 걸린다.
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // 2026-07-26 (피드백 6-2·6-4): 이름은 사용자가 프로필에서 바꾼 값이 먼저다.
  // OAuth 메타데이터는 로그인 제공자가 준 것이라 사용자가 고칠 수 없다 — 고친 값이 있으면 그게 우선.
  // 설정을 못 읽어도(마이그레이션 전 등) 종전대로 동작한다.
  const access = await getMyAccess(supabase).catch(() => null);

  const displayName =
    access?.displayName ??
    (user.user_metadata.full_name as string | undefined) ??
    (user.user_metadata.name as string | undefined) ??
    user.email ??
    "사용자";
  const email = user.email ?? "";

  // 끈 기능의 메뉴는 아예 보여주지 않는다. 실제 차단은 각 화면·RLS가 하고 여기선 숨기기만 한다 —
  // 메뉴만 남겨 두면 눌렀을 때 빈 화면이 나와 고장난 것처럼 보인다.
  const hiddenNav = NAV_FEATURES.filter(
    (n) =>
      access !== null &&
      !canUseFeature(
        { role: access.role, disabledFeatures: access.disabledFeatures },
        n.feature,
      ),
  ).map((n) => n.href);
  // 관리자 메뉴는 기능 토글이 아니라 역할이 정한다(자기 권한을 꺼서 잠기는 일이 없게).
  if (access && !canAdminister({ role: access.role })) hiddenNav.push("/admin");

  return (
    <div className="flex min-h-screen bg-background">
      {/* Phase 13 T2: 키보드 사용자가 사이드바를 건너뛰고 본문으로 바로 가는 스킵 링크(포커스 시에만 노출). */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground focus:shadow-lg"
      >
        본문으로 건너뛰기
      </a>
      <AppSidebar displayName={displayName} email={email} hiddenHrefs={hiddenNav} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppMobileBar hiddenHrefs={hiddenNav} />
        <main id="main" className="flex-1 pb-16 md:pb-0">
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>
      </div>
      <ScrollToTop />
      <DesktopCollectorSync />
      {/* Phase 18 T4: 화면 없는 배경 트리거 — 지난 주 다이제스트가 없으면 한 번 만든다. */}
      <WeeklyDigestTrigger />
      <CommandPalette />
      <ShortcutsHelp />
    </div>
  );
}
