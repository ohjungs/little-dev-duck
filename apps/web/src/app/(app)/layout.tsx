import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppSidebar, AppMobileBar } from "@/components/AppNav";
import { DesktopCollectorSync } from "@/components/DesktopCollectorSync";

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
      <AppSidebar displayName={displayName} email={email} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppMobileBar />
        <main className="flex-1">{children}</main>
      </div>
      <DesktopCollectorSync />
    </div>
  );
}
