import Image from "next/image";
import {
  Activity,
  Bell,
  CalendarClock,
  Download,
  Info,
  Keyboard,
  Link2,
  LogOut,
  Mail,
  Moon,
  Palette,
  RotateCcw,
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
import { GithubContributionWidget } from "@/components/GithubContributionWidget";
import { DangerZone } from "@/components/DangerZone";
import { ExportDataButton } from "@/components/ExportDataButton";
import { LocalResetButton } from "@/components/LocalResetButton";

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
    <div className="mx-auto w-full max-w-5xl px-4 pb-16 pt-6 md:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">설정</h1>
        <p className="text-sm text-muted-foreground">
          외관과 계정을 개인화하세요.
        </p>
      </div>

      {/* 좁은 단일 컬럼 → 다단(masonry)으로 좌우를 꽉 채운다. 카드는 열 사이에서 잘리지 않게 break-inside-avoid. */}
      <div className="columns-1 gap-4 md:columns-2 [&>*]:mb-4 [&>*]:break-inside-avoid">
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

        {/* 외부 연동을 한 카드로 통합 — 서비스별로 흩어진 카드를 한곳에서 바로바로 연동. */}
        <Card>
          <CardHeader className="flex-col items-start gap-1">
            <CardTitle>
              <Link2 className="size-4 text-primary-accent" />
              외부 연동
            </CardTitle>
            <CardDescription>
              오리가 여러분의 서비스에 실제 작업을 수행하도록 연동합니다. 로그인 방법과 무관합니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col divide-y divide-border">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3">
              <div className="flex items-start gap-3">
                <CalendarClock className="mt-0.5 size-5 shrink-0 text-primary-accent" />
                <div>
                  <p className="text-sm font-medium">Google Calendar</p>
                  <p className="text-xs text-muted-foreground">일정 조회·생성</p>
                </div>
              </div>
              <GoogleCalendarLink linked={googleLinked} />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="flex items-start gap-3">
                <GitHubMark className="mt-0.5 size-5 shrink-0 text-primary-accent" />
                <div>
                  <p className="text-sm font-medium">GitHub 이슈</p>
                  <p className="text-xs text-muted-foreground">이슈 조회·생성</p>
                </div>
              </div>
              <GitHubIssuesLink linked={githubLinked} isPrimaryGithub={provider === "github"} />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3">
              <div className="flex items-start gap-3">
                <Mail className="mt-0.5 size-5 shrink-0 text-primary-accent" />
                <div>
                  <p className="text-sm font-medium">Gmail</p>
                  <p className="text-xs text-muted-foreground">이메일 조회·휴지통 이동(영구삭제 없음)</p>
                </div>
              </div>
              <GmailLink linked={gmailLinked} />
            </div>
          </CardContent>
        </Card>

        {/* GitHub 잔디(기여 캘린더) — 대시보드에서 설정으로 이동. GitHub 로그인 시 표시. */}
        <Card>
          <CardHeader className="flex-col items-start gap-1">
            <CardTitle>
              <GitHubMark className="size-4 text-primary-accent" />
              GitHub 잔디
            </CardTitle>
            <CardDescription>
              GitHub 계정으로 로그인하면 최근 1년 기여 잔디를 볼 수 있어요.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <GithubContributionWidget />
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
                { label: "할 일 추가", key: "Ctrl+Shift+T" },
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

        <Card>
          <CardHeader className="flex-col items-start gap-1">
            <CardTitle>
              <Download className="size-4 text-primary-accent" />
              데이터 내보내기
            </CardTitle>
            <CardDescription>
              할 일·메모·습관·페이지 메타데이터를 JSON 파일로 내보냅니다. 페이지 본문은 용량 상
              제외됩니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ExportDataButton />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-col items-start gap-1">
            <CardTitle>
              <RotateCcw className="size-4 text-primary-accent" />
              로컬 데이터 초기화
            </CardTitle>
            <CardDescription>
              브라우저에 저장된 테마·즐겨찾기·최근 페이지 등 로컬 설정을 초기화합니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LocalResetButton />
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
        <Card>
          <CardHeader className="flex-col items-start gap-1">
            <CardTitle>
              <Info className="size-4 text-primary-accent" />
              앱 정보
            </CardTitle>
            <CardDescription>Little Dev Duck v1.0.0</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <p className="text-muted-foreground">
                Next.js 16 + Supabase + Gemini AI
              </p>
              <ul className="space-y-1 text-muted-foreground">
                <li>블록 에디터 (BlockNote)</li>
                <li>AI 오리 비서 (Gemini)</li>
                <li>픽셀 오피스</li>
                <li>뉴스 피드</li>
                <li>GitHub 기여 잔디</li>
                <li>뽀모도로 타이머</li>
                <li>습관 트래커</li>
                <li>캘린더 연동</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      <p className="mt-8 text-xs text-muted-foreground">Little Dev Duck v1.0.0</p>
    </div>
  );
}
