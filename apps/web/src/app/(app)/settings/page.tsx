import Image from "next/image";
import {
  Activity,
  Bell,
  CalendarClock,
  Keyboard,
  LogOut,
  Mail,
  Moon,
  Palette,
  Trash2,
  User,
} from "lucide-react";
import { getGithubTokens, getGmailTokens, getGoogleTokens } from "@ldd/api";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AppearanceSetting } from "@/components/AppearanceSetting";
import { QuietHoursSetting } from "@/components/QuietHoursSetting";
import { NotifySetting } from "@/components/NotifySetting";
import { HealthStatus } from "@/components/HealthStatus";
import { GoogleCalendarLink } from "@/components/GoogleCalendarLink";
import { GitHubIssuesLink } from "@/components/GitHubIssuesLink";
import { GitHubMark } from "@/components/ui/github-mark";
import { GmailLink } from "@/components/GmailLink";
import { DangerZone } from "@/components/DangerZone";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const googleLinked = user ? !!(await getGoogleTokens(supabase, user.id)) : false;
  const githubLinked = user ? !!(await getGithubTokens(supabase, user.id)) : false;
  const gmailLinked = user ? !!(await getGmailTokens(supabase, user.id)) : false;

  const displayName =
    (user?.user_metadata.full_name as string | undefined) ??
    (user?.user_metadata.name as string | undefined) ??
    user?.email ??
    "사용자";
  const email = user?.email ?? "";
  const provider = user?.app_metadata.provider ?? "이메일";

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-16 pt-6 md:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">설정</h1>
        <p className="text-sm text-muted-foreground">
          외관과 계정을 개인화하세요.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader className="flex-col items-start gap-1">
            <CardTitle>
              <Palette className="size-4 text-primary-accent" />
              외관
            </CardTitle>
            <CardDescription>테마를 선택합니다.</CardDescription>
          </CardHeader>
          <CardContent>
            <AppearanceSetting />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-col items-start gap-1">
            <CardTitle>
              <Moon className="size-4 text-primary-accent" />
              방해금지 시간대
            </CardTitle>
            <CardDescription>
              지정한 시간대엔 오리가 혼잣말을 하지 않고 조용히 있습니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <QuietHoursSetting />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-col items-start gap-1">
            <CardTitle>
              <Bell className="size-4 text-primary-accent" />
              브라우저 알림
            </CardTitle>
            <CardDescription>
              레벨 업 같은 순간을 브라우저 알림으로 받습니다(방해금지 시간대엔 조용, 하루 상한 있음).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <NotifySetting />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-col items-start gap-1">
            <CardTitle>
              <User className="size-4 text-primary-accent" />
              프로필
            </CardTitle>
            <CardDescription>{provider} 계정으로 로그인됨.</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-3">
            <span className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary ring-1 ring-border">
              <Image
                src="/duck-logo.png"
                alt=""
                width={48}
                height={48}
                className="size-12 object-cover"
              />
            </span>
            <div className="min-w-0">
              <p className="truncate font-medium">{displayName}</p>
              <p className="truncate text-sm text-muted-foreground">{email}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-col items-start gap-1">
            <CardTitle>
              <CalendarClock className="size-4 text-primary-accent" />
              Google Calendar 연동
            </CardTitle>
            <CardDescription>
              로그인 방법과 무관하게 오리가 캘린더 일정을 조회·생성할 수 있게 합니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <GoogleCalendarLink linked={googleLinked} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-col items-start gap-1">
            <CardTitle>
              <GitHubMark className="size-4 text-primary-accent" />
              GitHub 이슈 연동
            </CardTitle>
            <CardDescription>
              로그인 방법과 무관하게 오리가 GitHub 이슈를 조회·생성할 수 있게 합니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <GitHubIssuesLink linked={githubLinked} isPrimaryGithub={provider === "github"} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-col items-start gap-1">
            <CardTitle>
              <Mail className="size-4 text-primary-accent" />
              Gmail 연동
            </CardTitle>
            <CardDescription>
              오리가 최근 이메일을 조회하고 휴지통으로 이동할 수 있게 합니다. 영구삭제는 설계상
              지원하지 않아요 — 항상 복구 가능한 휴지통 이동만 하고, 이동 전 승인을 거칩니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <GmailLink linked={gmailLinked} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-col items-start gap-1">
            <CardTitle>
              <Activity className="size-4 text-primary-accent" />
              서비스 상태
            </CardTitle>
            <CardDescription>
              연결된 서비스가 정상인지 확인합니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <HealthStatus />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-col items-start gap-1">
            <CardTitle>
              <LogOut className="size-4 text-primary-accent" />
              계정
            </CardTitle>
            <CardDescription>
              이 기기에서 로그아웃합니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action="/auth/logout" method="post">
              <Button type="submit" variant="outline">
                <LogOut />
                로그아웃
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-col items-start gap-1">
            <CardTitle>
              <Keyboard className="size-4 text-primary-accent" />
              키보드 단축키
            </CardTitle>
            <CardDescription>자주 쓰는 단축키 목록입니다.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              {[
                { label: "명령 팔레트", key: "Ctrl+K" },
                { label: "페이지 검색", key: "Ctrl+K" },
                { label: "오피스 이동", key: "방향키 / WASD" },
                { label: "오피스 상호작용", key: "E" },
                { label: "오피스 경영 패널", key: "Tab" },
                { label: "오피스 미니맵", key: "M" },
                { label: "오피스 사운드", key: "N" },
                { label: "오피스 도움말", key: "?" },
              ].map(({ label, key }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-muted-foreground">{label}</span>
                  <kbd className="inline-flex items-center rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-xs font-medium text-foreground shadow-[0_1px_0_0] shadow-border">
                    {key}
                  </kbd>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {user && (
          <Card className="border-destructive/30">
            <CardHeader className="flex-col items-start gap-1">
              <CardTitle>
                <Trash2 className="size-4 text-destructive" />
                위험 구역
              </CardTitle>
              <CardDescription>
                내 모든 콘텐츠를 영구 삭제합니다. 되돌릴 수 없어요.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DangerZone userId={user.id} />
            </CardContent>
          </Card>
        )}
      </div>

      <p className="mt-8 text-xs text-muted-foreground">Little Dev Duck v1.0.0</p>
    </div>
  );
}
