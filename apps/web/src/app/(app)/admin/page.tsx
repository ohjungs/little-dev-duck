import { Database, ShieldCheck } from "lucide-react";
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
import { createClient } from "@/lib/supabase/server";
import { getMyAccess } from "@ldd/api";
import { canAdminister, roleLabel } from "@ldd/core";

export const dynamic = "force-dynamic";

// 2026-07-26 : 관리자 - 실체화 (피드백 6-2·6-3) + 경계 정리 (피드백 6-1)
// 여기는 "준비 중" 껍데기였다가 네 가지를 담았는데, 그중 둘(대시보드 구성·내 프로필)은
// **내 것**이라 설정으로 옮겼다. 사용자는 자기 이름을 고치려고 관리자 화면을 열지 않는다.
//
//   경계 규칙 — **설정 = 내 것(개인화) · 관리자 = 남의 것(권한 부여)·워크스페이스 전체**
//
// 남은 것:
//   · 사용자 관리(역할·기능 토글) — 관리자만
//   · 데이터 관리(재색인) — 워크스페이스 전체에 영향
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
          사용자 권한과 워크스페이스 전체 데이터를 관리합니다. 내 역할: {roleLabel(role)}
          {" · "}내 프로필·대시보드 구성은 설정에 있습니다.
        </p>
      </div>

      <div className="flex flex-col gap-4">
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
