import { Database, LayoutDashboard, ShieldCheck, UserCog } from "lucide-react";
import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ReindexButton } from "@/components/ReindexButton";
import { AdminUserPanel } from "@/components/AdminUserPanel";
import { DashboardLayoutPanel } from "@/components/DashboardLayoutPanel";
import { ProfileSettings } from "@/components/ProfileSettings";
import { createClient } from "@/lib/supabase/server";
import { getMyAccess } from "@ldd/api";
import { canAdminister, roleLabel } from "@ldd/core";

export const dynamic = "force-dynamic";

// 2026-07-26 : 관리자 - 실체화 (피드백 6-1·6-2·6-3·6-4·1-2·1-5)
// 여기는 "준비 중" 껍데기였다. 이제 네 가지를 담는다:
//   · 대시보드 구성(카드 순서·표시) — 본인 개인화
//   · 프로필 — 본인
//   · 사용자 관리(역할·기능 토글) — 관리자만
//   · 데이터 관리(재색인)
//
// 실제 차단은 DB의 RLS가 한다. 이 화면의 역할 검사는 **보여주지 않기** 위한 것이다 —
// 화면만 숨기면 주소를 직접 치는 사람에겐 열려 있는 것과 같기 때문이다.

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // 설정을 못 읽어도 화면이 죽지 않게 한다(마이그레이션 적용 전 등) — 가장 낮은 권한으로 본다.
  const access = await getMyAccess(supabase).catch(() => null);
  const role = access?.role ?? "user";
  const isAdmin = canAdminister({ role });

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-16 pt-6 md:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">관리자</h1>
        <p className="text-sm text-muted-foreground">
          워크스페이스 구성과 사용자 권한을 관리합니다. 내 역할: {roleLabel(role)}
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader className="flex-col items-start gap-1">
            <CardTitle>
              <LayoutDashboard className="size-4 text-primary-accent" />
              대시보드 구성
            </CardTitle>
            <CardDescription>
              대시보드 카드의 순서를 바꾸고, 쓰지 않는 카드는 숨깁니다. 이 설정은 내
              계정에만 적용됩니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DashboardLayoutPanel />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-col items-start gap-1">
            <CardTitle>
              <UserCog className="size-4 text-primary-accent" />
              내 프로필
            </CardTitle>
            <CardDescription>
              이름을 바꾸면 사이드바와 오리 인사말에 함께 반영됩니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ProfileSettings />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-col items-start gap-1">
            <CardTitle>
              <ShieldCheck className="size-4 text-primary-accent" />
              사용자 관리
              {!isAdmin && <Badge variant="muted">관리자 전용</Badge>}
            </CardTitle>
            <CardDescription>
              사용자마다 역할(관리자·일반·열람 전용)을 정하고, 기능을 하나씩 켜고 끕니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AdminUserPanel myRole={role} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-col items-start gap-1">
            <CardTitle>
              <Database className="size-4 text-primary-accent" />
              데이터 관리
            </CardTitle>
            <CardDescription>
              저장된 메모·할일·습관·일정을 오리가 검색할 수 있도록 임베딩을 일괄
              재생성합니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ReindexButton />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
