import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppSidebar, AppMobileBar } from "@/components/AppNav";
import { DesktopCollectorSync } from "@/components/DesktopCollectorSync";
import { CommandPalette } from "@/components/CommandPalette";
import { ShortcutsHelp } from "@/components/ShortcutsHelp";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ScrollToTop } from "@/components/ScrollToTop";

export const dynamic = "force-dynamic";

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

  const displayName =
    (user.user_metadata.full_name as string | undefined) ??
    (user.user_metadata.name as string | undefined) ??
    user.email ??
    "사용자";
  const email = user.email ?? "";

  return (
    <div className="flex min-h-screen bg-background">
      {/* Phase 13 T2: 키보드 사용자가 사이드바를 건너뛰고 본문으로 바로 가는 스킵 링크(포커스 시에만 노출). */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground focus:shadow-lg"
      >
        본문으로 건너뛰기
      </a>
      <AppSidebar displayName={displayName} email={email} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppMobileBar />
        <main id="main" className="flex-1 pb-16 md:pb-0">
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>
      </div>
      <ScrollToTop />
      <DesktopCollectorSync />
      <CommandPalette />
      <ShortcutsHelp />
    </div>
  );
}
